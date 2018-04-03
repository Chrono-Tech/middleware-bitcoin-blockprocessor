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
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

const addBlock = async (block, type, callback) => {

  sem.take(async () => {
    try {
      type === 0 ?
        await updateDbStateWithBlockDOWN(block) :
        await updateDbStateWithBlockUP(block);

      callback();
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

      callback(err, null);

    }

    sem.leave();
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

  const chunks = _.chunk(toCreate, 50);

  let processed = 0;
  await Promise.mapSeries(chunks, async input => {
    await utxoModel.remove({
      $or: input.map(item => ({
        hash: item.hash,
        index: item.index
      }))
    });
    await utxoModel.insertMany(input);
    processed += input.length;
    log.info(`processed utxo: ${parseInt(processed / toCreate.length * 100)}%`);
  }
  );
  const mempool = await ipcExec('getrawmempool', []);

  await utxoModel.remove({$or: toRemove});
  await txModel.remove({
    $or: [
      {hash: {$in: block.txs.map(tx => tx.hash)}},
      {number: -1, hash: {$nin: mempool}}
    ]
  });

  await txModel.insertMany(block.txs);
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

  if (utxo.length) {
    await utxoModel.remove({
      $or: utxo.map(item => ({
        hash: item.hash,
        index: item.index
      }))
    });

    await utxoModel.insertMany(utxo);
  }

  await txModel.remove({hash: {$in: block.txs.map(tx => tx.hash)}});
  await txModel.insertMany(block.txs);
  await blockModel.findOneAndUpdate({number: block.number}, {$set: block}, {upsert: true});

};

module.exports = addBlock;