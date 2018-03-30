const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  TX = require('bcoin/lib/primitives/tx'),
  addBlock = require('../utils/addBlock'),
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
        await new Promise.promisify(addBlock.bind(null, block, 1));

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
          let lastCheckpointBlock = await blockModel.findOne(this.lastBlocks[0] ? {hash: this.lastBlocks[0]} : {number: this.currentHeight - 1});
          log.info(`wrong sync state!, rollback to ${lastCheckpointBlock.number - 1} block`);
          await this.rollbackStateFromBlock(lastCheckpointBlock);
          const currentBlocks = await blockModel.find({
            network: config.node.network,
            timestamp: {$ne: 0},
            number: {$lt: lastCheckpointBlock.number}
          }).sort('-number').limit(config.consensus.lastBlocksValidateAmount);
          this.lastBlocks = _.chain(currentBlocks).map(block => block.hash).reverse().value();
          this.currentHeight = lastCheckpointBlock.number;
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);
      }
    }

  }

  async updateDbStateWithBlock (block) {

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

  async validateUTXO () {
    let blocks = await blockModel.find({$where: 'obj.txs.length > 0'}, {number: 1}).sort({number: -1}).limit(config.consensus.lastBlocksValidateAmount);
    blocks = _.map(blocks, block => block.number);
    const UTXOcount = await utxoModel.count({blockNumber: {$in: blocks}});
    return UTXOcount >= blocks.length;
  }

}

module.exports = blockWatchingService;
