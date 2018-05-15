/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  sem = require('semaphore')(2),
  crypto = require('crypto'),
  transformBlockTxs = require('../utils/transformBlockTxs'),
  blockModel = require('../models/blockModel'),
  txModel = require('../models/txModel'),
  coinModel = require('../models/coinModel'),
  txAddressRelationsModel = require('../models/txAddressRelationsModel'),
  log = bunyan.createLogger({name: 'app.utils.addBlock'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - prepared block with full txs
 * @param type - type of arrived block (is block from cache or it's the last block)
 * @returns {Promise.<*>}
 */

const addBlock = async (block) => {

  return await new Promise((res, rej) => {

    sem.take(async () => {
      try {
        await updateDbStateWithBlock(block);
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
      const isFullCoin = await coinModel.count({_id: input._id, outputTxIndex: {$ne: null}, inputTxIndex: {$ne: null}});
      isFullCoin ?
        await coinModel.update({_id: input._id}, {$set: {inputTxIndex: null, inputIndex: null, inputBlock: null}}) :
        await coinModel.remove({_id: input._id});
    });

  if (outputs.length)
    await Promise.mapSeries(outputs, async output => {
      const isFullCoin = await coinModel.count({id: output.id, inputHash: {neq: null}});
      isFullCoin ?
        await coinModel.update({_id: output._id}, {$set: {outputTxIndex: null, outputIndex: null, outputBlock: null, value: null}}) :
        await coinModel.remove({_id: output._id});
    });

  log.info('rolling back relations state');
  await txAddressRelationsModel.remove({blockNumber: block.number});

  log.info('rolling back txs state');
  await txModel.remove({blockNumber: block.number});

  log.info('rolling back blocks state');
  await blockModel.remove({_id: block.hash});
};

const updateDbStateWithBlock = async (block) => {

  let start = Date.now();

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

  console.log(`took0 : ${(Date.now() - start) / 1000} s`);

  let coins = _.chain(inputs).union(outputs).transform((result, coin) => {

    if (!result[coin._id])
      return result[coin._id] = coin;

    _.merge(result[coin._id], coin);
  }, {})
    .values()
    .value();

  console.log(`took1 : ${(Date.now() - start) / 1000} s`);

  const addressRelations = _.chain(coins).transform((result, coin) => {
    let txIndex = coin.inputTxIndex && coin.value ? coin.inputTxIndex : coin.inputTxIndex ? coin.inputTxIndex : coin.outputTxIndex;
    let id = crypto.createHash('md5').update(`${coin.address}x${block.number}x${txIndex}`).digest('hex');

    if (result[id] && result[id].type === 2)
      return;

    if (result[id] && ((result[id].type === 1 && coin.inputTxIndex) || (result[id].type === 0 && coin.value))) {
      result[id].type = 2;
      return;
    }

    if (!result[id]) {
      let type = coin.inputTxIndex && coin.value ? 2 : coin.inputTxIndex ? 0 : 1;
      result[id] = {
        address: coin.address,
        txIndex: txIndex,
        type: type,
        blockNumber: block.number,
        _id: id
      };
    }
  }, [])
    .values()
    .value();

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

    await txModel.bulkWrite(bulkOps);
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

    await coinModel.bulkWrite(bulkOps);
  }

  log.info(`inserting ${addressRelations.length} relations`);
  if (addressRelations.length) {
    let bulkOps = addressRelations.map(relation => ({
      updateOne: {
        filter: {_id: relation._id},
        update: relation,
        upsert: true
      }
    }));

    await txAddressRelationsModel.bulkWrite(bulkOps);
  }

  let blockHash = block.hash;
  block = _.omit(block, ['txs', 'hash']);
  block = new blockModel(block);
  block._id = blockHash;
  await block.save();
};

module.exports = addBlock;