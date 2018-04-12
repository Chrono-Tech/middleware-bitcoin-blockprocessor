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
  blockModel = require('../models/blockModel'),
  getUTXO = require('../utils/getUTXO'),
  utxoModel = require('../models/utxoModel'),
  txModel = require('../models/txModel'),
  ipcExec = require('../services/ipcExec'),
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

  const toRemove = _.chain(block.txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout)
    .value();

  const toCreate = _.chain(block.txs)
    .map(tx =>
      tx.outputs.map((output, index) =>
        _.merge(output, {hash: tx.hash, index: index, blockNumber: block.number})
      )
    )
    .flattenDeep()
    .reject(output =>
      _.find(toRemove, {hash: output.hash, index: output.index})
    )
    .value();

  log.info('updating utxos for block: ', block.number);

  await utxoModel.insertMany(toCreate, {ordered: false}).catch(err => {
    if (err && err.code !== 11000)
      return Promise.reject(err);
  });

  const mempool = await ipcExec('getrawmempool', []);

  await utxoModel.remove({$or: toRemove});

  await Promise.mapSeries(_.chunk(mempool, 100), async mempoolChunk => {
    await txModel.remove({blockNumber: -1, hash: {$nin: mempoolChunk}});
  });

  await txModel.insertMany(block.txs, {ordered: false}).catch(err => {
    if (err && err.code !== 11000)
      return Promise.reject(err);
  });
  await blockModel.update({number: block.number}, block, {upsert: true});

};

const rollbackStateFromBlock = async (block) => {

  const blocksToDelete = await blockModel.find({
    $or: [
      {hash: {$lte: block.number, $gte: block.number - config.consensus.lastBlocksValidateAmount}},
      {number: {$gte: block.number}}
    ]
  });

  const toCreate = _.chain(blocksToDelete)
    .map(block => block.toObject().txs)
    .flattenDeep()
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => _.merge(input.prevout, {address: input.address, value: input.value, blockNumber: block.number}))
    .uniqWith(_.isEqual)
    .value();

  log.info('rollback utxos from block: ', block.number);

  const chunks = _.chunk(toCreate, 50);

  let processed = 0;
  await Promise.mapSeries(chunks, async input => {
      await utxoModel.remove({
        $or: input.map(item => ({
          hash: item.hash,
          index: item.index,
          blockNumber: block.number
        }))
      });
      await utxoModel.insertMany(input, {ordered: false});
      processed += input.length;
      log.info(`processed utxo: ${parseInt(processed / toCreate.length * 100)}%`);
    }
  );

  await utxoModel.remove({blockNumber: {$gte: block.number}});
  await txModel.remove({blockNumber: {$gte: block.number}});
  await blockModel.remove({
    $or: [
      {hash: {$lte: block.number, $gte: block.number - config.consensus.lastBlocksValidateAmount}},
      {number: {$gte: block.number}}
    ]
  });
};

const updateDbStateWithBlockDOWN = async (block) => {

  let utxo = await getUTXO(block);

  if (utxo.length)
    await utxoModel.insertMany(utxo, {ordered: false}).catch(err => {
      if (err && err.code !== 11000)
        return Promise.reject(err);
    });

  await txModel.insertMany(block.txs, {ordered: false}).catch(err => {
    if (err && err.code !== 11000)
      return Promise.reject(err);
  });
  await blockModel.findOneAndUpdate({number: block.number}, {$set: block}, {upsert: true});

};

module.exports = addBlock;