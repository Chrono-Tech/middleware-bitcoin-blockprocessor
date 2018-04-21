/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  exec = require('../services/exec'),
  allocateBlockBuckets = require('../utils/allocateBlockBuckets'),
  blockModel = require('../models/blockModel'),
  utxoModel = require('../models/utxoModel'),
  txModel = require('../models/txModel'),
  getBlock = require('../utils/getBlock'),
  addBlock = require('../utils/addBlock'),
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
  }

  async start () {
    await this.indexCollection();
    let data = await allocateBlockBuckets();
    this.doJob(data.missedBuckets);
    return data.height;
  }

  async indexCollection () {
    log.info('indexing...');
    await blockModel.init();
    await utxoModel.init();
    await txModel.init();
    log.info('indexation completed!');
  }

  async doJob (buckets) {

    while (buckets.length)
      try {
        for (let bucket of buckets) {
          await this.runPeer(bucket);
          if (!bucket.length)
            _.pull(buckets, bucket);
        }

        this.events.emit('end');

      } catch (err) {

        if (err && err.code === 'ENOENT') {
          log.error('ipc is not available');
          process.exit(0);
        }

        log.error(err);
      }

  }

  async runPeer (bucket) {

    let lastBlock = await exec('getblockhash', [_.last(bucket)]).catch(() => null);

    if (!lastBlock)
      return await Promise.delay(10000);

    log.info(`bitcoin provider took chuck of blocks ${bucket[0]} - ${_.last(bucket)}`);

    await Promise.mapSeries(bucket, async (blockNumber) => {
      let block = await getBlock(blockNumber);
      await addBlock(block, 0);

      _.pull(bucket, blockNumber);
      this.events.emit('block', block);
    }).catch((e) => {
      if (e && e.code === 11000)
        return _.pull(bucket, bucket[0]);
      log.error(e);
    });
  }
}

module.exports = SyncCacheService;
