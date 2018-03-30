const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  sem = require('semaphore')(1),
  TX = require('bcoin/lib/primitives/tx'),
  blockModel = require('../models/blockModel'),
  utxoModel = require('../models/utxoModel'),
  EventEmitter = require('events'),
  ipcExec = require('../services/ipcExec'),
  BlockModel = require('bcoin/lib/primitives/block'),
  log = bunyan.createLogger({name: 'app.services.blockWatchingService'}),
  transformBlockTxs = require('../utils/transformBlockTxs');

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class addBlockService {

  constructor () {

    this.events = new EventEmitter();
    this.lastBlocks = [];
  }

  async addBlock (block, type, callback) {

    sem.take(async () => {
      try {
        type === 0 ? this.updateDbStateWithBlockDOWN(block) :
          await this.updateDbStateWithBlockUP(block);
        callback();
      } catch (e) {
        callback(e)
      }
      res();
      sem.leave();
    });

  }

  async updateDbStateWithBlockUP (block) {

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

    await utxoModel.remove({$or: toRemove});
    const mempool = await ipcExec('getrawmempool', []);

    await blockModel.update({number: -1}, {
      $pull: {
        txs: {
          hash: {
            $nin: mempool
          }
        }
      }
    });

    await blockModel.update({number: block.number}, block, {upsert: true});

  }

  async rollbackStateFromBlock (block) {

    const blocksToDelete = await blockModel.find({
      $or: [
        {hash: {$in: this.lastBlocks}},
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
    await blockModel.remove({
      $or: [
        {hash: {$in: this.lastBlocks}},
        {number: {$gte: block.number}}
      ]
    });
  }

  async updateDbStateWithBlockDOWN (block) {

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

    await blockModel.findOneAndUpdate({number: block.number}, {$set: block}, {upsert: true});

  }

  /*  async processBlock () {

   let hash = await ipcExec('getblockhash', [this.currentHeight + 1]);
   if (!hash) {
   return Promise.reject({code: 0});
   }

   const lastBlocks = await Promise.mapSeries(this.lastBlocks, async blockHash => await ipcExec('getblock', [blockHash, true]));
   const lastBlockHashes = _.chain(lastBlocks).map(block => _.get(block, 'hash')).compact().value();

   let savedBlocks = await blockModel.find({hash: {$in: lastBlockHashes}}, {number: 1}).limit(this.lastBlocks.length);
   savedBlocks = _.chain(savedBlocks).map(block => block.number).orderBy().value();
   const validatedBlocks = _.filter(savedBlocks, (s, i) => s === i + savedBlocks[0]);

   if (validatedBlocks.length !== this.lastBlocks.length)
   return Promise.reject({code: 1}); //head has been blown off

   let blockRaw = await ipcExec('getblock', [hash, false]);
   let block = BlockModel.fromRaw(blockRaw, 'hex');
   const txs = await transformBlockTxs(block.txs);

   return {
   network: config.node.network,
   number: this.currentHeight + 1,
   hash: block.rhash(),
   txs: txs,
   timestamp: block.time || Date.now(),
   };
   }
   */

}

module.exports = addBlockService;
