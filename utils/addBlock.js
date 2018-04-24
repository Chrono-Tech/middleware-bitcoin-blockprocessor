/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  sem = require('semaphore')(1),
  transformBlockTxs = require('../utils/transformBlockTxs'),
  blockModel = require('../models/blockModel'),
  txModel = require('../models/txModel'),
  exec = require('../services/execService'),
  log = bunyan.createLogger({name: 'app.services.blockWatchingService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - prepared block with full txs
 * @param type - type of arrived block (is block from cache or it's the last block)
 * @returns {Promise.<*>}
 */

const addBlock = async (block, type) => {

  return await new Promise((res, rej) => {

    sem.take(async () => {
      try {
        type === 0 ?
          await updateDbStateWithBlockDOWN(block) :
          await updateDbStateWithBlockUP(block);

        res();
      } catch (err) {
        if (type === 1 && [1, 11000].includes(_.get(err, 'code'))) {
          let lastCheckpointBlock = await blockModel.findOne({
            number: {
              $lte: block.number - 1,
              $gte: block.number - 1 + config.consensus.lastBlocksValidateAmount
            }
          }).sort({number: -1});
          log.info(`wrong sync state!, rollback to ${lastCheckpointBlock.number - 1} block`);
          await rollbackStateFromBlock(lastCheckpointBlock);
        }

        rej(err);

      }

      sem.leave();
    });

  });

};

const updateDbStateWithBlockUP = async (block) => {

  const inputs = _.chain(block.txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout)
    .value();

  let txs = await transformBlockTxs(block.txs);
  txs = txs.map(tx => {
    tx.outputs = tx.outputs.map((output, index) => {
      output.spent = !!_.find(inputs, {hash: tx.hash, index: index});
      return output;
    });

    tx.blockNumber = block.number;
    tx.timestamp = block.time || Date.now();
    return tx;
  });

  log.info('updating utxos for block: ', block.number);

  await Promise.map(inputs, async input => {
    await txModel.update({hash: input.hash}, {$set: {[`outputs.${input.index}.spent`]: true}});
  });

  const mempool = await exec('getrawmempool', []);

  await Promise.mapSeries(_.chunk(mempool, 100), async mempoolChunk => {
    await txModel.remove({blockNumber: -1, hash: {$nin: mempoolChunk}});
  });

  await txModel.insertMany(txs, {ordered: false}).catch(err => {
    if (err && err.code !== 11000)
      return Promise.reject(err);
  });

  block.txs = block.txs.map(tx => tx.hash);

  await blockModel.update({number: block.number}, block, {upsert: true});

};

const rollbackStateFromBlock = async (block) => {

  const blocksToDelete = await blockModel.find({
    $or: [
      {hash: {$lte: block.number, $gte: block.number - config.consensus.lastBlocksValidateAmount}},
      {number: {$gte: block.number}}
    ]
  });

  const inputs = _.chain(blocksToDelete)
    .map(block => block.toObject().txs)
    .flattenDeep()
    .map(tx => tx.inputs)
    .flattenDeep()
    .uniqWith(_.isEqual)
    .value();

  log.info('rollback utxos from block: ', block.number);

  await Promise.map(inputs, async input => {
    await txModel.update({hash: input.hash}, {$set: {[`outputs.${input.index}.spent`]: false}});
  });

  await txModel.remove({blockNumber: {$gte: block.number}});
  await blockModel.remove({
    $or: [
      {hash: {$lte: block.number, $gte: block.number - config.consensus.lastBlocksValidateAmount}},
      {number: {$gte: block.number}}
    ]
  });
};

const updateDbStateWithBlockDOWN = async (block) => {

  let txs = await transformBlockTxs(block.txs);
  txs = await Promise.map(txs, async tx => {
    tx.outputs = await Promise.mapSeries(tx.outputs, async (output, index) => {
      output.spent = await txModel.count({
        'inputs.prevout.hash': tx.hash,
        'inputs.prevout.index': index
      });
      return output;
    });

    tx.blockNumber = block.number;
    tx.timestamp = block.time || Date.now();

    return tx;
  });

  await txModel.insertMany(txs, {ordered: false}).catch(err => {
    if (err && err.code !== 11000)
      return Promise.reject(err);
  });

  block.txs = block.txs.map(tx => tx.hash);

  await blockModel.findOneAndUpdate({number: block.number}, {$set: block}, {upsert: true});

};

module.exports = addBlock;