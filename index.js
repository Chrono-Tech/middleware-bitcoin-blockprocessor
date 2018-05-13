/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const models = require('./models'),
  config = require('./config'),
  customNetworkRegistrator = require('./networks'),
  Promise = require('bluebird'),
  filterTxsByAccountsService = require('./services/filterTxsByAccountsService'),
  amqp = require('amqplib'),
  bunyan = require('bunyan'),
  zmq = require('zeromq'),
  _ = require('lodash'),
  BlockWatchingService = require('./services/blockWatchingService'),
  SyncCacheService = require('./services/syncCacheService'),
  sock = zmq.socket('sub'),
  log = bunyan.createLogger({name: 'core.blockProcessor'});

customNetworkRegistrator(config.node.network);

/**
 * @module entry point
 * @description process blocks, and notify, through rabbitmq, other
 * services about new block or tx, where we meet registered address
 */

sock.monitor(500, 0);
sock.connect(config.node.zmq);
sock.subscribe('rawtx');

sock.on('close', () => {
  log.error('zmq disconnected!');
  process.exit(0);
});

[models.storages.accounts, models.storages.data].forEach((connector, id) => {

  connector.on('disconnected', () => {
    log.error(`the ${id === 1 ? 'accounts' : 'data'} connector has been disconnected!`);
    process.exit(0);
  });
});

const init = async function () {

  await models.init();

  let amqpConn = await amqp.connect(config.rabbit.url)
    .catch(() => {
      log.error('rabbitmq is not available!');
      process.exit(0);
    });

  let channel = await amqpConn.createChannel();

  channel.on('close', () => {
    log.error('rabbitmq process has finished!');
    process.exit(0);
  });

  try {
    await channel.assertExchange('events', 'topic', {durable: false});
  } catch (e) {
    log.error(e);
    channel = await amqpConn.createChannel();
  }

  const syncCacheService = new SyncCacheService();

  syncCacheService.events.on('block', async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    await channel.publish('events', `${config.rabbit.serviceName}_block`, new Buffer(JSON.stringify({block: block.number})));
    let filtered = await filterTxsByAccountsService(block.txs);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  let endBlock = await syncCacheService.start()
    .catch((err) => {
      if (_.get(err, 'code') === 0) {
        log.info('nodes are down or not synced!');
      } else {
        log.error(err);
      }

      process.exit(0);
    });

  await new Promise((res) => {
    if (config.sync.shadow)
      return res();

    syncCacheService.events.on('end', () => {
      log.info(`cached the whole blockchain up to block: ${endBlock}`);
      res();
    });
  });

  return;

  const blockWatchingService = new BlockWatchingService(sock, endBlock);

  await blockWatchingService.startSync().catch(e => {
    log.error(`error starting cache service: ${e}`);
    process.exit(0);
  });

  blockWatchingService.events.on('block', async block => {
    log.info(`${block.hash} (${block.number}) added to cache.`);
    await channel.publish('events', `${config.rabbit.serviceName}_block`, new Buffer(JSON.stringify({block: block.number})));
    let filtered = await filterTxsByAccountsService(block.txs);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  blockWatchingService.events.on('tx', async (tx) => {
    let filtered = await filterTxsByAccountsService([tx]);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: -1}))))
    ));
  });

};

module.exports = init();
