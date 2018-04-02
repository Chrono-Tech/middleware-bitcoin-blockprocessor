const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  TX = require('bcoin/lib/primitives/tx'),
  addBlock = require('../utils/addBlock'),
  blockModel = require('../models/blockModel'),
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

class blockWatchingService {

  constructor (sock, currentHeight) {

    this.sock = sock;
    this.events = new EventEmitter();
    this.currentHeight = currentHeight;
    this.lastBlocks = [];
    this.isSyncing = false;
    this.pendingTxCallback = (topic, tx) => this.UnconfirmedTxEvent(tx);
  }

  async startSync () {

    if (this.isSyncing)
      return;

    this.isSyncing = true;

    const mempool = await ipcExec('getrawmempool', []);
    if (!mempool.length)
      await blockModel.remove({number: -1});

    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlocks = [];
    this.doJob();
    this.sock.on('message', this.pendingTxCallback);
  }

  async doJob () {

    while (this.isSyncing) {

      try {

        let block = await Promise.resolve(this.processBlock()).timeout(60000 * 5);
        await new Promise.promisify(addBlock.bind(null, block, 1))();

        this.currentHeight++;
        _.pullAt(this.lastBlocks, 0);
        this.lastBlocks.push(block.hash);
        this.events.emit('block', block);
      } catch (err) {

        if (err && err.code === 'ENOENT') {
          log.error('ipc is not available');
          process.exit(0);
        }

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight + 1}`);
          await Promise.delay(10000);
          continue;
        }

        if ([1, 11000].includes(_.get(err, 'code'))) {
          const currentBlocks = await blockModel.find({
            network: config.node.network,
            timestamp: {$ne: 0}
          }).sort({number: -1}).limit(config.consensus.lastBlocksValidateAmount);
          this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).reverse().value();
          this.currentHeight = _.get(currentBlocks, '0.number', 0);
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);
      }
    }

  }

  async UnconfirmedTxEvent (tx) {

    tx = TX.fromRaw(tx, 'hex');

    let currentUnconfirmedBlock = await blockModel.findOne({number: -1}) || new blockModel({
        number: -1,
        hash: null,
        timestamp: 0,
        txs: []
      });

    const fullTx = await transformBlockTxs([tx]);
    currentUnconfirmedBlock.txs = _.union(currentUnconfirmedBlock.txs, fullTx);
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

    if (validatedBlocks.length !== this.lastBlocks.length)
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

}

module.exports = blockWatchingService;
