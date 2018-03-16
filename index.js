const mongoose = require('mongoose'),
  config = require('./config'),
  customNetworkRegistrator = require('./networks'),
  Promise = require('bluebird');

customNetworkRegistrator(config.node.network);

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});

const filterTxsByAccountsService = require('./services/filterTxsByAccountsService'),
  amqp = require('amqplib'),
  bunyan = require('bunyan'),
  zmq = require('zeromq'),
  sock = zmq.socket('sub'),
  blockCacheService = require('./services/blockCacheService'),
  log = bunyan.createLogger({name: 'core.blockProcessor'});

/**
 * @module entry point
 * @description process blocks, and notify, through rabbitmq, other
 * services about new block or tx, where we meet registered address
 */


sock.connect(config.node.zmq);
sock.subscribe('rawtx');

const cacheService = new blockCacheService(sock);

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

  await cacheService.startSync().catch(e => {
    log.error(`error starting cache service: ${e}`);
    process.exit(0);
  });

  cacheService.events.on('block', async block => {
    log.info('%s (%d) added to cache.', block.hash, block.number);
    let filtered = await filterTxsByAccountsService(block.txs);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: block.number}))))
    ));
  });

  cacheService.events.on('tx', async (tx) => {
    if (!await cacheService.isSynced())
      return;

    let filtered = await filterTxsByAccountsService([tx]);
    await Promise.all(filtered.map(item =>
      channel.publish('events', `${config.rabbit.serviceName}_transaction.${item.address}`, new Buffer(JSON.stringify(Object.assign(item, {block: -1}))))
    ));
  });

};

module.exports = init();
