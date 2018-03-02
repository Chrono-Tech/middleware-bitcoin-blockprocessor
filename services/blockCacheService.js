const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  blockModel = require('../models/blockModel'),
  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'app.services.blockCacheService'}),
  transformBlockTxs = require('../utils/transformBlockTxs');

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class BlockCacheService {

  constructor (node) {
    this.node = node;
    this.events = new EventEmitter();
    this.currentHeight = 0;
    this.lastBlocks = [];
    this.isSyncing = false;
    this.pendingTxCallback = (err, tx) => this.UnconfirmedTxEvent(err, tx);
  }

  async startSync () {
    if (this.isSyncing)
      return;

    await this.indexCollection();
    this.isSyncing = true;

    const mempool = await this.node.rpc.getRawMempool([]);
    if (!mempool.length)
      await blockModel.remove({number: -1});

    const currentBlocks = await blockModel.find({
      network: config.node.network,
      timestamp: {$ne: 0}
    }).sort('-number').limit(config.consensus.lastBlocksValidateAmount);
    this.currentHeight = _.chain(currentBlocks).get('0.number', -1).add(1).value();
    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).compact().reverse().value();
    this.doJob();
    this.node.pool.on('tx', this.pendingTxCallback);

  }

  async doJob () {

    while (this.isSyncing) {
      try {
        let block = await this.processBlock();
        await this.processUTXO(block);
        await blockModel.findOneAndUpdate({number: block.number}, block, {upsert: true});
        await blockModel.update({number: -1}, {
          $pull: {
            txs: {
              hash: {
                $in: block.txs.map(tx => tx.hash)
              }
            }
          }
        });

        this.currentHeight++;
        _.pullAt(this.lastBlocks, 0);
        this.lastBlocks.push(block.hash);
        this.events.emit('block', block);
      } catch (err) {

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight}`);
          await Promise.delay(10000);
        }

        if (_.get(err, 'code') === 1) {
          let lastCheckpointBlock = err.block || await blockModel.findOne({hash: this.lastBlocks[0]});
          log.info(`wrong sync state!, rollback to ${lastCheckpointBlock.number - 1} block`);
          const blocksToDelete = await blockModel.find({
            $or: [
              {hash: {$in: this.lastBlocks}},
              {number: {$gte: lastCheckpointBlock.number}}
            ]
          });

          for (let block of blocksToDelete)
            await this.processUTXO(block, true);

          await blockModel.remove({
            $or: [
              {hash: {$in: this.lastBlocks}},
              {number: {$gte: lastCheckpointBlock.number}}
            ]
          });
          const currentBlocks = await blockModel.find({
            network: config.node.network,
            timestamp: {$ne: 0},
            number: {$lt: lastCheckpointBlock.number}
          }).sort('-number').limit(config.consensus.lastBlocksValidateAmount);
          this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).reverse().value();
          this.currentHeight = lastCheckpointBlock.number - 1;
        }

        if (![0, 1].includes(_.get(err, 'code')))
          log.error(err);
      }
    }

  }

  async UnconfirmedTxEvent (tx) {

    if (!await this.isSynced())
      return;

    const mempool = await this.node.rpc.getRawMempool([]);
    let currentUnconfirmedBlock = await blockModel.findOne({number: -1}) || {
        number: -1,
        hash: null,
        timestamp: 0,
        txs: []
      };

    const fullTx = await transformBlockTxs(this.node, [tx]);
    let alreadyIncludedTxs = _.filter(currentUnconfirmedBlock.txs, tx => mempool.includes(tx.hash));
    currentUnconfirmedBlock.txs = _.union(alreadyIncludedTxs, [fullTx]);
    await blockModel.findOneAndUpdate({number: -1}, currentUnconfirmedBlock, {upsert: true});
  }

  async stopSync () {
    this.isSyncing = false;
    this.node.pool.removeListener('tx', this.pendingTxCallback);
  }

  async processBlock () {

    let hash = await this.node.chain.db.getHash(this.currentHeight);
    if (!hash) {
      return Promise.reject({code: 0});
    }

    const lastBlockHashes = await Promise.mapSeries(this.lastBlocks, async blockHash => await this.node.chain.db.getHash(blockHash));

    let savedBlocks = await blockModel.find({hash: {$in: lastBlockHashes}}, {number: 1}).limit(this.lastBlocks.length);
    savedBlocks = _.chain(savedBlocks).map(block => block.number).orderBy().value();

    const validatedBlocks = _.filter(savedBlocks, (s, i) => s === i + savedBlocks[0]);

    if (_.compact(lastBlockHashes).length !== this.lastBlocks.length || savedBlocks.length !== this.lastBlocks.length ||
      validatedBlocks.length !== this.lastBlocks.length)
      return Promise.reject({code: 1}); //head has been blown off

    let block = await this.node.chain.db.getBlock(hash);

    const txs = await transformBlockTxs(this.node, block.txs);

    return {
      network: config.node.network,
      number: this.currentHeight,
      hash: block.rhash(),
      txs: txs,
      timestamp: block.time || Date.now(),
    };
  }

  async processUTXO (block, fallback = false) {

    const inputs = _.chain(block.txs)
      .map(tx => tx.inputs)
      .flattenDeep()
      .map(input => input.prevout)
      .value();

    return await Promise.all(inputs.map(async input =>
        await blockModel.update({'txs.hash': input.hash}, {$set: {[`txs.$.outputs.${input.index}.spent`]: !fallback}})
      )
    )

  }

  async indexCollection () {
    log.info('indexing...');
    await blockModel.init();
    log.info('indexation completed!');
  }

  async isSynced () {
    const tip = await this.node.chain.db.getTip();
    return this.currentHeight >= tip.height - config.consensus.lastBlocksValidateAmount;
  }

}

module.exports = BlockCacheService;
