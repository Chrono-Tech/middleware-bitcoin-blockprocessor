/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const config = require('../../config'),
  Network = require('bcoin/lib/protocol/network'),
  models = require('../../models'),
  bcoin = require('bcoin'),
  spawn = require('child_process').spawn,
  memwatch = require('memwatch-next'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  SyncCacheService = require('../../services/syncCacheService'),
  BlockWatchingService = require('../../services/blockWatchingService'),
  providerService = require('../../services/providerService'),
  _ = require('lodash'),
  amqp = require('amqplib'),
  ctx = {
    network: null,
    keyPair: [],
    amqp: {
      instance: null
    }
  };

module.exports = () => {

  it('init environment', async () => {
    ctx.network = Network.get('regtest');
    ctx.keyPair = bcoin.hd.generate(ctx.network);

    ctx.amqp.instance = await amqp.connect(config.rabbit.url);
    ctx.amqp.channel = await ctx.amqp.instance.createChannel();
    await ctx.amqp.channel.assertExchange('events', 'topic', {durable: false});

    ctx.nodePid = spawn('node', ['tests/utils/bcoin/node.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);

    await models.blockModel.remove({});
    await models.txModel.remove({});
    await models.coinModel.remove({});
    await models.accountModel.remove({});
  });

  it('validate sync cache service performance', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);

    let hd = new memwatch.HeapDiff();
    const syncCacheService = new SyncCacheService();
    await syncCacheService.start();
    await Promise.delay(20000);

    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);
  });


  it('validate block watching service performance', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    let currentNodeHeight = await instance.execute('getblockcount', []);
    await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);

    let hd = new memwatch.HeapDiff();
    const blockWatchingService = new BlockWatchingService(currentNodeHeight);
    await blockWatchingService.startSync();
    await Promise.delay(20000);
    await blockWatchingService.stopSync();

    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);
  });


  it('validate tx notification speed', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const address = keyring.getAddress().toString();
    await new models.accountModel({address}).save();

    let tx;
    let start;
    let end;

    await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test.transaction`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test.transaction`, async data => {
            const message = JSON.parse(data.content.toString());

            if (message.hash === tx.txid()) {
              res();
              end = Date.now();
            }

          }, {noAck: true})
        );
      })(),
      (async () => {

        let coins = await instance.execute('getcoinsbyaddress', [keyring.getAddress().toString()]);

        let inputCoins = _.chain(coins)
          .transform((result, coin) => {
            result.coins.push(bcoin.coin.fromJSON(coin));
            result.amount += coin.value;
          }, {amount: 0, coins: []})
          .value();

        const mtx = new bcoin.mtx();

        mtx.addOutput({
          address: keyring.getAddress(),
          value: Math.round(inputCoins.amount * 0.7)
        });

        await mtx.fund(inputCoins.coins, {
          rate: 10000,
          changeAddress: keyring.getAddress()
        });

        mtx.sign(keyring);
        tx = mtx.toTX();
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
        start = Date.now();
      })()
    ]);

    expect(end - start).to.be.below(500);
  });


  it('kill environment', async () => {
    let provider = await providerService.get();
    provider.instance.removeAllListeners('disconnect');
    ctx.blockProcessorPid.kill();
    await Promise.delay(10000);
    ctx.nodePid.kill();
    await ctx.amqp.instance.close();
  });

};
