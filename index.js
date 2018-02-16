const mongoose = require('mongoose'),
  config = require('./config'),
  Promise = require('bluebird');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});

const bcoin = require('bcoin'),
  filterAccountsService = require('./services/filterTxsByAccountsService'),
  ipcService = require('./services/ipcService'),
  amqp = require('amqplib'),
  memwatch = require('memwatch-next'),
  bunyan = require('bunyan'),
  transformToFullTx = require('./utils/transformToFullTx'),
  customNetworkRegistrator = require('./networks'),
  blockCacheService = require('./services/blockCacheService'),
  log = bunyan.createLogger({name: 'core.blockProcessor'});

/**
 * @module entry point
 * @description process blocks, and notify, through rabbitmq, other
 * services about new block or tx, where we meet registered address
 */

customNetworkRegistrator(config.node.network);

const node = new bcoin.fullnode({
  network: config.node.network,
  db: config.node.dbDriver,
  prefix: config.node.dbpath,
  spv: false,
  indexTX: true,
  indexAddress: true,
  coinCache: config.node.coinCache,
  cacheSize: config.node.cacheSize,
  logLevel: 'info'
});

const cacheService = new blockCacheService(node);

[mongoose.accounts, mongoose.connection].forEach(connection =>
  connection.on('disconnected', function () {
    log.error('mongo disconnected!');
    process.exit(0);
  })
);

const init = async function () {
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

  await node.open();
  await node.connect();

  await cacheService.startSync();

  memwatch.on('leak', async (info) => {
    log.info('leak', info);

    if (!node.pool.syncing)
      return;

    try {
      await node.stopSync();
      await cacheService.stopSync();
    } catch (e) {

    }

    await Promise.delay(6000);
    await node.startSync();
    await cacheService.startSync();

  });

  node.on('connect', async (entry) => {
    log.info('%s (%d) added to chain.', entry.rhash(), entry.height);
  });

  cacheService.events.on('block', async block => {
    log.info('%s (%d) added to cache.', block.hash, block.number);
    let filtered = await filterAccountsService(block.txs);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  node.pool.on('tx', async (tx) => {
    if (!await cacheService.isSynced())
      return;

    const fullTx = await transformToFullTx(node, tx);
    let filtered = await filterAccountsService([fullTx]);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: -1}))))
    ));
  });

  node.on('error', err => {
    log.error(err);
  });

  ipcService(node);
  node.startSync();
};

module.exports = init();
