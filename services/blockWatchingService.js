/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  TX = require('bcoin/lib/primitives/tx'),
  addBlock = require('../utils/addBlock'),
  blockModel = require('../models/blockModel'),
  txModel = require('../models/txModel'),
  coinModel = require('../models/coinModel'),
  txAddressRelationsModel = require('../models/txAddressRelationsModel'),
  EventEmitter = require('events'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network),
  exec = require('../services/execService'),
  getBlock = require('../utils/getBlock'),
  log = bunyan.createLogger({name: 'app.services.blockWatchingService'});

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

    const mempool = await exec('getrawmempool', []);
    if (!mempool.length) {
      await txModel.remove({blockNumber: -1});
      await coinModel.remove({
        $or: [
          {inputBlock: -1},
          {outputBlock: -1}
        ]
      });
      await txAddressRelationsModel.remove({blockNumber: -1});

    }

    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlockHash = null;
    this.doJob();
    this.sock.on('message', this.pendingTxCallback);
  }

  async doJob () {

    while (this.isSyncing) {

      try {

        let block = await Promise.resolve(this.processBlock()).timeout(60000 * 5);
        await addBlock(block, true);

        this.currentHeight++;
        this.lastBlockHash = block.hash;
        this.events.emit('block', block);
      } catch (err) {

        if (err && (err.code === 'ENOENT' || err.code === 'ECONNECT')) {
          log.error('node is not available');
          process.exit(0);
        }

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight}`);
          await Promise.delay(10000);
          continue;
        }

        if (_.get(err, 'code') === 1) {
          const currentBlock = await blockModel.find({
            number: {$gte: 0}
          }).sort({number: -1}).limit(2);
          this.lastBlockHash = _.get(currentBlock, '1.hash');
          this.currentHeight = _.get(currentBlock, '0.number', 0);
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);
      }
    }

  }

  async UnconfirmedTxEvent (tx) {

    tx = TX.fromRaw(tx, 'hex').getJSON(network);
    tx.index = await txModel.count({blockNumber: -1});
    await addBlock({number: -1, txs: [tx]});

    this.events.emit('tx', tx);
  }

  async stopSync () {
    this.isSyncing = false;
    this.node.pool.removeListener('tx', this.pendingTxCallback);
  }

  async processBlock () {

    let hash = await exec('getblockhash', [this.currentHeight]).catch(err =>
      err.code && err.code === -32600 ? null : Promise.reject(err)
    );

    if (!hash)
      return Promise.reject({code: 0});

    const lastBlockHash = this.currentHeight === 0 ? null : await exec('getblockhash', [this.currentHeight - 1]);
    let savedBlock = await blockModel.count({_id: lastBlockHash});

    if (!savedBlock && this.lastBlockHash)
      return Promise.reject({code: 1}); //head has been blown off

    return getBlock(this.currentHeight);
  }

}

module.exports = blockWatchingService;
