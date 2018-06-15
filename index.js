/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const mongoose = require('mongoose'),
  config = require('./config'),
  models = require('./models'),
  MasterNodeService = require('middleware-common-components/services/blockProcessor/MasterNodeService'),
  customNetworkRegistrator = require('./networks'),
  Promise = require('bluebird');

customNetworkRegistrator(config.node.network);

const filterTxsByAccountsService = require('./services/filterTxsByAccountsService'),
  amqp = require('amqplib'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  BlockWatchingService = require('./services/blockWatchingService'),
  SyncCacheService = require('./services/syncCacheService'),
  log = bunyan.createLogger({name: 'core.blockProcessor'});

/**
 * @module entry point
 * @description process blocks, and notify, through rabbitmq, other
 * services about new block or tx, where we meet registered address
 */


mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});


const init = async function () {

  [mongoose.accounts, mongoose.connection].forEach(connection =>
    connection.on('disconnected', () => {
      throw new Error('mongo disconnected!');
    })
  );

  models.init();


  let amqpInstance = await amqp.connect(config.rabbit.url);

  let channel = await amqpInstance.createChannel();

  channel.on('close', () => {
    throw new Error('rabbitmq process has finished!');
  });


  await channel.assertExchange('events', 'topic', {durable: false});

  const masterNodeService = new MasterNodeService(channel, config.rabbit.serviceName);
  await masterNodeService.start();


  const syncCacheService = new SyncCacheService();

  let blockEventCallback = async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    await channel.publish('events', `${config.rabbit.serviceName}_block`, new Buffer(JSON.stringify({block: block.number})));
    let filtered = await filterTxsByAccountsService(block.txs);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  };

  let txEventCallback = async tx => {
    let filtered = await filterTxsByAccountsService([tx]);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: -1}))))
    ));
  };


  syncCacheService.events.on('block', blockEventCallback);

  let endBlock = await syncCacheService.start();

  await new Promise((res) => {
    if (config.sync.shadow)
      return res();

    syncCacheService.events.on('end', () => {
      log.info(`cached the whole blockchain up to block: ${endBlock}`);
      res();
    });
  });

  const blockWatchingService = new BlockWatchingService(endBlock);

  blockWatchingService.events.on('block', blockEventCallback);
  blockWatchingService.events.on('tx', txEventCallback);

  await blockWatchingService.startSync();

};

module.exports = init().catch(err => {
  if (_.get(err, 'code') === 0) {
    log.info('nodes are down or not synced!');
  } else {
    log.error(err);
  }
  process.exit(0);
});
