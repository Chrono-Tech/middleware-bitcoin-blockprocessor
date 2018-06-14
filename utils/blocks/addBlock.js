/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  sem = require('semaphore')(3),
  crypto = require('crypto'),
  providerService = require('../../services/providerService'),
  buildCoins = require('../../utils/coins/buildCoins'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addBlock'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - prepared block with full txs
 * @param removePending - remove pending transactions
 * @returns {Promise.<*>}
 */

const addBlock = async (block, removePending = false) => {

  return await new Promise((res, rej) => {

    sem.take(async () => {
      try {
        await updateDbStateWithBlock(block, removePending);
        res();
      } catch (err) {
        log.error(err);
        await rollbackStateFromBlock(block);
        rej(err);
      }

      sem.leave();
    });

  });

};

const rollbackStateFromBlock = async (block) => {

  let txs = block.txs.map(tx => ({
      _id: tx.hash,
      index: tx.index,
      blockNumber: block.number,
      timestamp: block.time || Date.now(),
      inputs: tx.inputs,
      outputs: tx.outputs
    })
  );

  const inputs = _.chain(txs)
    .map(tx =>
      _.chain(tx.inputs)
        .map((inCoin, index) => ({
            _id: crypto.createHash('md5').update(`${inCoin.prevout.index}x${inCoin.prevout.hash}`).digest('hex'),
            inputBlock: block.number,
            inputTxIndex: tx.index,
            inputIndex: index,
            address: inCoin.address
          })
        )
        .filter(coin => coin.address)
        .value()
    )
    .flattenDeep()
    .value();

  const outputs = _.chain(txs)
    .map(tx =>
      _.chain(tx.outputs)
        .map((outCoin, index) => ({
          _id: crypto.createHash('md5').update(`${index}x${tx._id}`).digest('hex'),
          outputBlock: block.number,
          outputTxIndex: tx.index,
          outputIndex: index,
          value: outCoin.value,
          address: outCoin.address
        }))
        .filter(coin => coin.address)
        .value()
    )
    .flattenDeep()
    .value();

  log.info('rolling back coins state');
  if (inputs.length)
    await Promise.mapSeries(inputs, async input => {
      const isFullCoin = await models.coinModel.count({
        _id: input._id,
        outputTxIndex: {$ne: null},
        inputTxIndex: {$ne: null}
      });
      isFullCoin ?
        await models.coinModel.update({_id: input._id}, {
          $set: {
            inputTxIndex: null,
            inputIndex: null,
            inputBlock: null
          }
        }) :
        await models.coinModel.remove({_id: input._id});
    });

  if (outputs.length)
    await Promise.mapSeries(outputs, async output => {
      const isFullCoin = await models.coinModel.count({id: output.id, inputHash: {neq: null}});
      isFullCoin ?
        await models.coinModel.update({_id: output._id}, {
          $set: {
            outputTxIndex: null,
            outputIndex: null,
            outputBlock: null,
            value: null
          }
        }) :
        await models.coinModel.remove({_id: output._id});
    });


  log.info('rolling back txs state');
  await models.txModel.remove({blockNumber: block.number});

  log.info('rolling back blocks state');
  await models.blockModel.remove({_id: block.hash});
};

const updateDbStateWithBlock = async (block, removePending = false) => {

  let txs = block.txs.map(tx => ({
      _id: tx.hash,
      index: tx.index,
      blockNumber: block.number,
      timestamp: block.time || Date.now(),
      inputs: tx.inputs,
      outputs: tx.outputs
    })
  );

  const coins = buildCoins(txs);

  txs = txs.map(tx => _.omit(tx, ['inputs', 'outputs']));

  log.info(`inserting ${txs.length} txs`);
  if (txs.length) {
    let bulkOps = txs.map(tx => ({
      updateOne: {
        filter: {_id: tx._id},
        update: tx,
        upsert: true
      }
    }));

    await models.txModel.bulkWrite(bulkOps);
  }

  log.info(`inserting ${coins.length} coins`);
  if (coins.length) {
    let bulkOps = coins.map(coin => ({
      updateOne: {
        filter: {_id: coin._id},
        update: {$set: coin},
        upsert: true
      }
    }));

    await models.coinModel.bulkWrite(bulkOps);
  }

  if (removePending) {
    log.info('removing confirmed / rejected txs');
    await removeOutDated();
  }

  if (block.hash) {
    let blockHash = block.hash;
    block = _.omit(block, ['txs', 'hash']);
    block = new models.blockModel(block);
    block._id = blockHash;
    await models.blockModel.update({_id: blockHash}, block.toObject(), {upsert: true});
  }

};

const removeOutDated = async () => {

  const provider = await providerService.get();
  const mempool = await provider.instance.execute('getrawmempool', []);

  log.info('removing confirmed / rejected txs');
  if (!mempool.length)
    return;

  let outdatedTxs = await models.txModel.find({_id: {$nin: mempool}, blockNumber: -1});

  if (!outdatedTxs.length)
    return;


  let bulkOps = outdatedTxs.map(tx => ({
    updateOne: {
      filter: {inputBlock: -1, inputTxIndex: tx.index}
    },
    update: {
      $unset: {inputBlock: 1, inputTxIndex: 1, inputIndex: 1},
      upsert: true
    }
  }));

  await models.coinModel.bulkWrite(bulkOps);


  await models.coinModel.remove({
    $or: outdatedTxs.map(tx => ({
        outputBlock: -1,
        outputTxIndex: tx.index
      })
    )
  });

  await models.txModel.remove({_id: {$nin: mempool}, blockNumber: -1});

};

module.exports = addBlock;