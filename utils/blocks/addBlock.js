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
  removeUnconfirmedTxs = require('../txs/removeUnconfirmedTxs'),
  buildCoins = require('../../utils/coins/buildCoins'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addBlock'});

/**
 * @function
 * @description add block to the cache
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

/**
 * @function
 * @description rollback the cache to previous block
 * @param block - current block
 * @return {Promise<void>}
 */
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


/**
 * @function
 * @description add new block, txs and coins to the cache
 * @param block
 * @param removePending
 * @return {Promise<void>}
 */
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

  if (removePending)
    await removeUnconfirmedTxs();


  if (block.hash) {
    let blockHash = block.hash;
    block = _.omit(block, ['txs', 'hash']);
    block = new models.blockModel(block);
    block._id = blockHash;
    await models.blockModel.update({_id: blockHash}, block.toObject(), {upsert: true});
  }

};


module.exports = addBlock;