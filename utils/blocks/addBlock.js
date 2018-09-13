/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  config = require('../../config'),
  Promise = require('bluebird'),
  sem = require('semaphore')(3),
  removeUnconfirmedTxs = require('../txs/removeUnconfirmedTxs'),
  buildCoins = require('../../utils/coins/buildCoins'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addBlock', level: config.logs.level});

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
        rej({code: 1});
      }

      sem.leave();
    });

  });

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
    size: tx.size,
    blockNumber: block.number,
    timestamp: tx.timestamp || Date.now(),
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