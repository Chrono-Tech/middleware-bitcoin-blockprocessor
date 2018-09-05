/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../../config'),
  models = require('../../models'),
  Coin = require('bcoin/lib/primitives/coin'),
  MTX = require('bcoin/lib/primitives/mtx'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network),
  spawn = require('child_process').spawn,
  keyring = require('bcoin/lib/primitives/keyring'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  BlockModel = require('bcoin/lib/primitives/block'),
  SyncCacheService = require('../../services/syncCacheService'),
  BlockWatchingService = require('../../services/blockWatchingService'),
  providerService = require('../../services/providerService'),
  _ = require('lodash');

module.exports = (ctx) => {

  before(async () => {
    await models.blockModel.remove({});
    await models.txModel.remove({});
    await models.coinModel.remove({});
    await models.accountModel.remove({});
    global.gc();
  });


  it('validate sync cache service performance', async () => {
    let key = new keyring(ctx.keyPair);

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    await instance.execute('generatetoaddress', [1000, key.getAddress('base58', ctx.network)]);

    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const syncCacheService = new SyncCacheService();
    await syncCacheService.start();
    await new Promise(res => syncCacheService.once('end', res));
    global.gc();
    await Promise.delay(10000);
    const memUsage2 = process.memoryUsage().heapUsed / 1024 / 1024;

    expect(memUsage2 - memUsage).to.be.below(3);
  });


  it('validate block watching service performance', async () => {
    let key = new keyring(ctx.keyPair);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    let currentNodeHeight = await instance.execute('getblockcount', []);
    await instance.execute('generatetoaddress', [1000, key.getAddress('base58', ctx.network)]);

    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    const blockWatchingService = new BlockWatchingService(currentNodeHeight);
    await blockWatchingService.startSync();
    await Promise.delay(20000);
    await blockWatchingService.stopSync();
    global.gc();
    await Promise.delay(60000);
    const memUsage2 = process.memoryUsage().heapUsed / 1024 / 1024;

    expect(memUsage2 - memUsage).to.be.below(3);
  });

  it('validate tx notification speed', async () => {
    let key = new keyring(ctx.keyPair);
    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const address = key.getAddress('base58', ctx.network);
    await new models.accountModel({address}).save();

    let tx;
    let start;
    let end;

    await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_performance.transaction`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_performance.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_performance.transaction`, async data => {

            if (!data)
              return;

            const message = JSON.parse(data.content.toString());

            if (tx && message.hash !== tx.txid())
              return;

            end = Date.now();
            await ctx.amqp.channel.deleteQueue(`app_${config.rabbit.serviceName}_test_performance.transaction`);
            res();

          }, {noAck: true})
        );
      })(),
      (async () => {

        let coins = await instance.execute('getcoinsbyaddress', [address]);

        let inputCoins = _.chain(coins)
          .transform((result, coin) => {
            result.coins.push(Coin.fromJSON(coin));
            result.amount += coin.value;
          }, {amount: 0, coins: []})
          .value();

        const mtx = new MTX();

        mtx.addOutput({
          address: address,
          value: Math.round(inputCoins.amount * 0.7)
        });

        await mtx.fund(inputCoins.coins, {
          rate: 10000,
          changeAddress: address
        });

        mtx.sign(key);
        tx = mtx.toTX();
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
        start = Date.now();
      })()
    ]);

    await instance.execute('generatetoaddress', [1, address]);
    expect(end - start).to.be.below(500);
    await Promise.delay(15000);
    ctx.blockProcessorPid.kill();
  });

  it('unconfirmed txs performance', async () => {

    let key = new keyring(ctx.keyPair);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    let currentNodeHeight = await instance.execute('getblockcount', []);
    const blockWatchingService = new BlockWatchingService(currentNodeHeight);

    let txCount = await models.txModel.count();
    let blocks = await instance.execute('generatetoaddress', [10000, key.getAddress('base58', ctx.network)]);

    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    let unconfirmedTxCount = 0;

    for (let blockHash of blocks) {
      let blockRaw = await instance.execute('getblock', [blockHash, false]);
      let block = BlockModel.fromRaw(blockRaw, 'hex').getJSON(network);

      block.txs.forEach(tx => {
        unconfirmedTxCount++;
        blockWatchingService.unconfirmedTxEvent(tx.hex).catch(() => null);
      });
    }

    await new Promise(res => {
      let pinInterval = setInterval(async () => {
        let newTxCount = await models.txModel.count();

        if (newTxCount !== txCount + unconfirmedTxCount)
          return;

        clearInterval(pinInterval);
        res();
      }, 3000);
    });


    global.gc();
    await Promise.delay(60000);
    const memUsage2 = process.memoryUsage().heapUsed / 1024 / 1024;
    expect(memUsage2 - memUsage).to.be.below(3);


  });




};
