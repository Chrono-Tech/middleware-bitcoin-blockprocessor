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
  blockModel = require('../models').models.blockModel,
  txModel = require('../models').models.txModel,
  txInputsModel = require('../models').models.txInputsModel,
  txOutputsModel = require('../models').models.txOutputsModel,
  txAddressRelationsModel = require('../models').models.txAddressRelationsModel,
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

  const prevouts = _.chain(block.txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout)
    .value();

  let txs = transformBlockTxs(block.txs);
  txs = txs.map(tx => {
    tx.outputs = tx.outputs.map((output, index) => {
      output.spent = !!_.find(prevouts, {hash: tx.hash, index: index});
      return output;
    });

    tx.blockNumber = block.number;
    tx.timestamp = block.time || Date.now();
    return tx;
  });

  const inputs = _.chain(txs)
    .map(tx =>
      tx.inputs.map(input => ({
        txHash: tx.hash,
        index: input.index,
        prevoutIndex: input.prevout.index,
        prevoutHash: input.prevout.hash,
        value: input.value,
        address: input.address
      }))
    )
    .flattenDeep()
    .value();

  const outputs = _.chain(txs)
    .map(tx =>
      tx.outputs.map(output => ({
        txHash: tx.hash,
        spent: output.spent,
        index: output.index,
        value: output.value,
        address: output.address
      }))
    )
    .flattenDeep()
    .value();

  const addressRelationsInput = _.chain(inputs)
    .map(input => ({address: input.address, hash: input.txHash, type: 0, blockNumber: block.number}))
    .uniqWith(_.isEqual)
    .value();

  const addressRelationsOutput = _.chain(outputs)
    .map(input => ({address: input.address, hash: input.txHash, type: 1, blockNumber: block.number}))
    .uniqWith(_.isEqual)
    .value();

  const addressRelations = _.transform(_.union(addressRelationsInput, addressRelationsOutput), (result, item) => {
    let foundItem = _.find(result, {address: item.address, hash: item.hash});
    foundItem ?
      foundItem.type = 2 : result.push(item);
  }, []);

  txs = txs.map(tx => _.omit(tx, ['inputs', 'outputs', 'value']));

  log.info('updating utxos for block: ', block.number);

  await txOutputsModel.updateAll({
    or: prevouts.map(prevout => ({txHash: prevout.hash, index: prevout.index}))
  }, {spent: true});

  const mempool = await exec('getrawmempool', []);

  log.info('removing pulled txs from mempool');
  await txModel.destroyAll({blockNumber: -1, hash: {nin: mempool}});

  log.info(`inserting ${inputs.length} inputs`);
  if (inputs.length)
    await txInputsModel.create(inputs);

  log.info(`inserting ${outputs.length} outputs`);
  if (outputs.length)
    await txOutputsModel.create(outputs);

  log.info(`inserting ${addressRelations.length} relations`);
  if (addressRelations.length)
    await txAddressRelationsModel.create(addressRelations);

  log.info(`inserting ${txs.length} txs`);
  if (txs.length)
    await txModel.create(txs);

  block = _.omit(block, 'txs');
  block.id = block.number;
};

const rollbackStateFromBlock = async (block) => {

  let txsToDelete = await blockModel.find({
    where: {
      blockNumber: {gte: block.number - 2}
    }
  });

  txsToDelete = txsToDelete.map(tx => tx.hash);

  const inputs = models.txInputsModel.find({
    where: {
      txHash: {inq: txsToDelete}
    }
  });

  log.info('rollback utxos from block: ', block.number);

  await txOutputsModel.updateAll({
    or: inputs.map(input => ({txHash: input.prevoutHash, index: input.prevoutIndex}))
  }, {spent: true});

  await models.txInputsModel.destroyAll({txHash: {inq: txsToDelete}});
  await models.txOutputsModel.destroyAll({txHash: {inq: txsToDelete}});
  await models.txAddressRelationsModel.destroyAll({hash: {inq: txsToDelete}});
  await models.txModel.destroyAll({hash: {inq: txsToDelete}});
  await models.blockModel.destroyAll({number: {gte: block.number - 2}});

};

const updateDbStateWithBlockDOWN = async (block) => {

  let txs = transformBlockTxs(block.txs);
  txs = await Promise.map(txs, async tx => {
    tx.outputs = await Promise.mapSeries(tx.outputs, async (output, index) => {

      output.spent = (await txInputsModel.count({
          prevoutHash: tx.hash,
          prevoutIndex: index
        })) !== 0;
      return output;
    });

    tx.blockNumber = block.number;
    tx.timestamp = block.time || Date.now();

    return tx;
  });

  const inputs = _.chain(txs)
    .map(tx =>
      tx.inputs.map(input => ({
        txHash: tx.hash,
        index: input.index,
        prevoutIndex: input.prevout.index,
        prevoutHash: input.prevout.hash,
        value: input.value,
        address: input.address
      }))
    )
    .flattenDeep()
    .value();

  const outputs = _.chain(txs)
    .map(tx =>
      tx.outputs.map(output => ({
        txHash: tx.hash,
        spent: output.spent,
        index: output.index,
        value: output.value,
        address: output.address
      }))
    )
    .flattenDeep()
    .value();

  const addressRelationsInput = _.chain(inputs)
    .map(input => ({address: input.address, hash: input.txHash, type: 0, blockNumber: block.number}))
    .uniqWith(_.isEqual)
    .value();

  const addressRelationsOutput = _.chain(outputs)
    .map(input => ({address: input.address, hash: input.txHash, type: 1, blockNumber: block.number}))
    .uniqWith(_.isEqual)
    .value();

  const addressRelations = _.transform(_.union(addressRelationsInput, addressRelationsOutput), (result, item) => {
    let foundItem = _.find(result, {address: item.address, hash: item.hash});
    foundItem ?
      foundItem.type = 2 : result.push(item);
  }, []);

  txs = txs.map(tx => _.omit(tx, ['inputs', 'outputs', 'value']));

  log.info(`inserting ${inputs.length} inputs`);
  if (inputs.length)
    await txInputsModel.create(inputs);

  log.info(`inserting ${outputs.length} outputs`);
  if (outputs.length)
    await txOutputsModel.create(outputs);

  log.info(`inserting ${addressRelations.length} relations`);
  if (addressRelations.length)
    await txAddressRelationsModel.create(addressRelations);

  log.info(`inserting ${txs.length} txs`);
  if (txs.length)
    await txModel.create(txs);

  block = _.omit(block, 'txs');
  block.id = block.number;

  await blockModel.create(block);

};

module.exports = addBlock;