const bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  ipcExec = require('../services/ipcExec'),
  getUTXO = require('../utils/getUTXO'),
  allocateBlockBuckets = require('../utils/allocateBlockBuckets'),
  blockModel = require('../models/blockModel'),
  utxoModel = require('../models/utxoModel'),
  getBlock = require('../utils/getBlock'),
  log = bunyan.createLogger({name: 'app.services.syncCacheService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class SyncCacheService {

  constructor () {
    this.events = new EventEmitter();
    this.isSyncing = true;
  }

  async start () {
    let data = await allocateBlockBuckets();
    this.doJob(data.missedBuckets);
    return data.height;
  }

  async doJob (buckets) {

    while (this.isSyncing)
      try {
        let locker = {stack: {}, lock: false};

        while (buckets.length)
          await this.runPeer(buckets, locker, 1);

        this.isSyncing = false;
        this.events.emit('end');

      } catch (err) {
        log.error(err);
      }

  }

  async runPeer (buckets, locker, index) {

    while (buckets.length) {
      if (locker.lock) {
        await Promise.delay(1000);
        continue;
      }

      locker.lock = true;
      let lockerChunks = _.values(locker.stack);
      let newChunkToLock = _.chain(buckets).reject(item =>
        _.find(lockerChunks, lock => lock[0] === item[0])
      ).head().value();

      let lastBlock = await await ipcExec('getblockhash', [_.last(newChunkToLock)]).catch(() => null);
      locker.lock = false;

      if (!newChunkToLock || !lastBlock) {
        delete locker.stack[index];
        await Promise.delay(10000);
        continue;
      }

      log.info(`bitcoin provider ${index} took chuck of blocks ${newChunkToLock[0]} - ${_.last(newChunkToLock)}`);
      locker.stack[index] = newChunkToLock;
      await Promise.mapSeries(newChunkToLock, async (blockNumber) => {
        let block = await getBlock(blockNumber);
        let utxo = await getUTXO(block);
        await utxoModel.insertMany(utxo);
        await blockModel.findOneAndUpdate({number: block.number}, block, {upsert: true});
        _.pull(newChunkToLock, blockNumber);
        this.events.emit('block', block);
      }).catch((e) => {
        console.log(e)
        if (e && e.code === 11000)
          _.pull(newChunkToLock, newChunkToLock[0]);
      });

      if (!newChunkToLock.length)
        _.pull(buckets, newChunkToLock);

      delete locker.stack[index];

    }
  }
}

module.exports = SyncCacheService;
