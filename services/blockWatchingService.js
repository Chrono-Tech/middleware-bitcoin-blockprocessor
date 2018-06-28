/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  addBlock = require('../utils/blocks/addBlock'),
  models = require('../models'),
  TxModel = require('bcoin/lib/primitives/tx'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network),
  providerService = require('../services/providerService'),
  addUnconfirmedTx = require('../utils/txs/addUnconfirmedTx'),
  blockWatchingInterface = require('middleware-common-components/interfaces/blockProcessor/blockWatchingServiceInterface'),
  removeUnconfirmedTxs = require('../utils/txs/removeUnconfirmedTxs'),
  EventEmitter = require('events'),
  getBlock = require('../utils/blocks/getBlock'),
  log = bunyan.createLogger({name: 'app.services.blockWatchingService'});

/**
 * @service
 * @description the service is watching for the recent blocks and transactions (including unconfirmed)
 * @param currentHeight - the current blockchain's height
 * @returns Object<BlockWatchingService>
 */

class BlockWatchingService {

  constructor(currentHeight) {
    this.events = new EventEmitter();
    this.currentHeight = currentHeight;
    this.isSyncing = false;
    this.lastUnconfirmedTxIndex = -1;
  }

  /**function
   * @description start sync process
   * @return {Promise<void>}
   */

  async startSync() {

    if (this.isSyncing)
      return;

    this.isSyncing = true;
    let provider = await providerService.get();

    const mempool = await provider.instance.execute('getrawmempool', []);
    if (!mempool.length) {
      await removeUnconfirmedTxs();
    } else {
      let lastTx = await models.txModel.find({blockNumber: -1}).sort({index: -1}).limit(1);
      this.lastUnconfirmedTxIndex = _.get(lastTx, '0.index', -1);

      await Promise.mapSeries(mempool, async txHash => {
        const tx = await provider.instance.execute('getrawtransaction', [txHash, false]);
        await this.unconfirmedTxEvent(tx).catch(()=>{});
      });
    }

    log.info(`caching from block:${this.currentHeight} for network:${config.node.network}`);
    this.lastBlockHash = null;
    this.doJob();

    this.unconfirmedTxEventCallback = result => this.unconfirmedTxEvent(result).catch(() => {
    });
    providerService.events.on('unconfirmedTx', this.unconfirmedTxEventCallback);

  }

  /**
   * @function
   * start block watching
   * @return {Promise<void>}
   */
  async doJob() {

    while (this.isSyncing) {

      try {

        let block = await this.processBlock();
        await addBlock(block, true);

        let lastTx = await models.txModel.find({blockNumber: -1}).sort({index: -1}).limit(1);
        this.lastUnconfirmedTxIndex = _.get(lastTx, '0.index', -1);
        this.currentHeight++;
        this.lastBlockHash = block.hash;
        this.events.emit('block', block);
      } catch (err) {

        if (err.code === 0) {
          log.info(`await for next block ${this.currentHeight}`);
          await Promise.delay(10000);
          continue;
        }

        if (_.get(err, 'code') === 1) {
          const currentBlock = await models.blockModel.find({
            number: {$gte: 0}
          }).sort({number: -1}).limit(2);
          this.lastBlockHash = _.get(currentBlock, '1._id');
          this.currentHeight = _.get(currentBlock, '0.number', 0);
          continue;
        }

        if (![0, 1, 2, -32600].includes(_.get(err, 'code')))
          log.error(err);
      }
    }

  }

  /**
   * @function
   * @description process unconfirmed tx
   * @param tx - the encoded raw transaction
   * @return {Promise<void>}
   */
  async unconfirmedTxEvent(tx) {
    tx = TxModel.fromRaw(tx, 'hex').getJSON(network);
    tx.index = this.lastUnconfirmedTxIndex + 1;
    await addUnconfirmedTx(tx);
    this.lastUnconfirmedTxIndex++;
    this.events.emit('tx', tx);
  }

  /**
   * @function
   * @description stop the sync process
   * @return {Promise<void>}
   */
  async stopSync() {
    this.isSyncing = false;
    this.node.pool.removeListener('tx', this.pendingTxCallback);
  }

  /**
   * @function
   * @description process the next block from the current height
   * @return {Promise<*>}
   */
  async processBlock() {

    const provider = await providerService.get();

    let hash = await provider.instance.execute('getblockhash', [this.currentHeight]).catch(err =>
      err.code && err.code === -32600 ? null : Promise.reject(err)
    );

    if (!hash)
      return Promise.reject({code: 0});

    const lastBlockHash = this.currentHeight === 0 ? null : await provider.instance.execute('getblockhash', [this.currentHeight - 1]);
    let savedBlock = await models.blockModel.count({_id: lastBlockHash});

    if (!savedBlock && this.lastBlockHash)
      return Promise.reject({code: 1}); //head has been blown off

    return await getBlock(this.currentHeight);
  }

}

module.exports = function (...args) {
  return blockWatchingInterface(new BlockWatchingService(...args));
};