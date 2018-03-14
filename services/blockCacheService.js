const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  TX = require('bcoin/lib/primitives/tx'),
  blockModel = require('../models/blockModel'),
  EventEmitter = require('events'),
  zmq = require('zeromq'),
  sock = zmq.socket('sub'),
  ipcExec = require('../services/ipcExec'),
  networks = require('bcoin/lib/protocol/networks'),
  BlockModel = require('bcoin/lib/primitives/block'),
  log = bunyan.createLogger({name: 'app.services.blockCacheService'}),
  transformBlockTxs = require('../utils/transformBlockTxs');

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class BlockCacheService {

  constructor () {
    this.checkpointHeight = _.chain(networks[config.node.network].checkpointMap)
      .keys()
      .last()
      .parseInt()
      .value();

    sock.connect('tcp://127.0.0.1:43332');
    sock.subscribe('rawtx');

    this.isLocked = false;
    this.events = new EventEmitter();
    this.currentHeight = 0;
    this.lastBlocks = [];
    this.isSyncing = false;
    this.pendingTxCallback = (topic, tx) => this.UnconfirmedTxEvent(tx);
  }

  async startSync () {

    if (this.isSyncing)
      return;

    this.isSyncing = true;
    await this.indexCollection();

    const mempool = await ipcExec('getrawmempool', []);
    if (!mempool.length)
      await blockModel.remove({number: -1});

    const currentBlocks = await blockModel.find({
      network: config.node.network,
      timestamp: {$ne: 0}
    }).sort('-number').limit(config.consensus.lastBlocksValidateAmount);
    this.currentHeight = _.chain(currentBlocks).get('0.number', -1).add(1).value();
    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).compact().reverse().value();
    if (!this.isLocked)
      this.doJob();
    sock.on('message', this.pendingTxCallback);


  }

  async doJob () {

    while (this.isSyncing) {

      this.isLocked = true;

      try {

        if (!(await this.isCheckpointReached()))
          await Promise.reject({code: 2});

        let block = await Promise.resolve(this.processBlock()).timeout(60000 * 2);
        await this.updateDbStateWithBlock(block);

        this.currentHeight++;
        _.pullAt(this.lastBlocks, 0);
        this.lastBlocks.push(block.hash);
        this.events.emit('block', block);
        this.isLocked = false;
      } catch (err) {

        if (err && err.code === 'ENOENT') {
          log.error('ipc is not available');
          process.exit(0);
        }

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight}`);
          await Promise.delay(10000);
        }

        if ([1, 11000].includes(_.get(err, 'code'))) {
          let lastCheckpointBlock = err.block || await blockModel.findOne({hash: this.lastBlocks[0]});
          log.info(`wrong sync state!, rollback to ${lastCheckpointBlock.number - 1} block`);

          await this.rollbackStateFromBlock(lastCheckpointBlock);
          const currentBlocks = await blockModel.find({
            network: config.node.network,
            timestamp: {$ne: 0},
            number: {$lt: lastCheckpointBlock.number}
          }).sort('-number').limit(config.consensus.lastBlocksValidateAmount);
          this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).reverse().value();
          this.currentHeight = lastCheckpointBlock.number;

        }

        if (err.code === 2) {
          log.info(`await until blockchain will be synced till last checkpoint at height ${this.checkpointHeight}`);
          await Promise.delay(10000);
        }

        if (![0, 1, 2].includes(_.get(err, 'code')))
          log.error(err);

        this.isLocked = false;
      }
    }

  }

  async updateDbStateWithBlock (block) {

    const inputs = _.chain(block.txs)
      .map(tx => tx.inputs)
      .flattenDeep()
      .groupBy('prevout.hash')
      .toPairs()
      .map(pair => ({
        updateOne: {
          filter: {
            'txs.hash': pair[0], $or: _.chain(pair[1])
              .map(input => (
                {[`txs.$.outputs.${input.prevout.index}.spent`]: false}
              )
              )
              .value()
          },
          update: {
            $set: _.chain(pair[1])
              .map(input =>
                [`txs.$.outputs.${input.prevout.index}.spent`, true]
              )
              .fromPairs()
              .value()
          }
        }
      }))
      .union([
        {
          updateOne: {
            filter: {number: block.number},
            update: block,
            upsert: true
          }
        },
        {
          updateOne: {
            filter: {number: -1},
            update: {
              $pull: {
                txs: {
                  hash: {
                    $in: block.txs.map(tx => tx.hash)
                  }
                }
              }
            }
          }
        }

      ])
      .value();

    log.info('updating utxos for block: ', block.number);
    log.info('total records to be updated: ', inputs.length);

    const chunks = _.chunk(inputs, 50);

    let processed = 0;
    await Promise.mapSeries(chunks, async input => {
      await blockModel.bulkWrite(input, {ordered: false});
      processed += input.length;
      log.info(`processed utxo: ${parseInt(processed / inputs.length * 100)}%`);
    }
    );
  }

  async rollbackStateFromBlock (block) {

    const blocksToDelete = await blockModel.find({
      $or: [
        {hash: {$in: this.lastBlocks}},
        {number: {$gte: block.number}}
      ]
    });

    const inputs = _.chain(blocksToDelete)
      .map(block => block.txs)
      .flattenDeep()
      .map(tx => tx.inputs)
      .flattenDeep()
      .groupBy('prevout.hash')
      .toPairs()
      .map(pair => ({
        updateOne: {
          filter: {'txs.hash': pair[0]},
          update: {
            $set: _.chain(pair[1])
              .map(input =>
                [`txs.$.outputs.${input.prevout.index}.spent`, false]
              )
              .fromPairs()
              .value()
          }
        }
      }))
      .union([
        {
          deleteMany: {
            filter: {
              $or: [
                {hash: {$in: this.lastBlocks}},
                {number: {$gte: block.number}}
              ]
            }
          }
        }
      ])
      .value();

    log.info('rollback utxos from block: ', block.number);
    log.info('total records to be updated: ', inputs.length);

    const chunks = _.chunk(inputs, 50);

    let processed = 0;
    await Promise.mapSeries(chunks, async input => {
      await blockModel.bulkWrite(input, {ordered: false});
      processed += input.length;
      log.info(`processed utxo: ${parseInt(processed / inputs.length * 100)}%`);
    }
    );

  }

  async UnconfirmedTxEvent (tx) {

    // if (!await this.isSynced())
    //   return;

    tx = TX.fromRaw(tx, 'hex');

    const mempool = await ipcExec('getrawmempool', []);
    let currentUnconfirmedBlock = await
      blockModel.findOne({number: -1}) || new blockModel({
        number: -1,
        hash: null,
        timestamp: 0,
        txs: []
      });

    const fullTx = await transformBlockTxs([tx]);
    let alreadyIncludedTxs = _.filter(currentUnconfirmedBlock.txs, tx => mempool.includes(tx.hash));
    currentUnconfirmedBlock.txs = _.union(alreadyIncludedTxs, fullTx);
    await blockModel.findOneAndUpdate({number: -1}, _.omit(currentUnconfirmedBlock.toObject(), '_id', '__v'), {upsert: true});
    this.events.emit('tx', _.get(fullTx, 0));
  }

  async stopSync () {
    this.isSyncing = false;
    this.node.pool.removeListener('tx', this.pendingTxCallback);
  }

  async processBlock () {

    let hash = await ipcExec('getblockhash', [this.currentHeight]);
    if (!hash) {
      return Promise.reject({code: 0});
    }

    const lastBlocks = await Promise.mapSeries(this.lastBlocks, async blockHash => await ipcExec('getblock', [blockHash, true]));
    const lastBlockHashes = _.chain(lastBlocks).map(block => _.get(block, 'hash')).compact().value();

    let savedBlocks = await blockModel.find({hash: {$in: lastBlockHashes}}, {number: 1}).limit(this.lastBlocks.length);
    savedBlocks = _.chain(savedBlocks).map(block => block.number).orderBy().value();
    const validatedBlocks = _.filter(savedBlocks, (s, i) => s === i + savedBlocks[0]);

    if (_.compact(lastBlockHashes).length !== this.lastBlocks.length || savedBlocks.length !== this.lastBlocks.length ||
      validatedBlocks.length !== this.lastBlocks.length)
      return Promise.reject({code: 1}); //head has been blown off

    let blockRaw = await ipcExec('getblock', [hash, false]);
    let block = BlockModel.fromRaw(blockRaw, 'hex');

    const txs = await transformBlockTxs(block.txs);

    return {
      network: config.node.network,
      number: this.currentHeight,
      hash: block.rhash(),
      txs: txs,
      timestamp: block.time || Date.now(),
    };
  }

  async indexCollection () {
    log.info('indexing...');
    await blockModel.init();
    log.info('indexation completed!');
  }

  async isSynced () {
    const count = await ipcExec('getblockcount', []);
    return this.currentHeight >= count - config.consensus.lastBlocksValidateAmount;
  }

  async isCheckpointReached () {
    const count = await ipcExec('getblockcount', []);
    return this.checkpointHeight <= count;
  }

}

module.exports = BlockCacheService;
