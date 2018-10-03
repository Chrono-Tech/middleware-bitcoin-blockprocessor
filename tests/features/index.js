/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const models = require('../../models'),
  config = require('../../config'),
  MTX = require('bcoin/lib/primitives/mtx'),
  Coin = require('bcoin/lib/primitives/coin'),
  keyring = require('bcoin/lib/primitives/keyring'),
  _ = require('lodash'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  spawn = require('child_process').spawn,
  providerService = require('../../services/providerService');

module.exports = (ctx) => {

  before(async () => {
    await models.blockModel.remove({});
    await models.txModel.remove({});
    await models.coinModel.remove({});
    await models.accountModel.remove({});

    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);
  });

  it('validate block event', async () => {
    let key = new keyring(ctx.keyPair);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const generatedBlockNumbers = [];

    await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.block`, {autoDelete: true});
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_features.block`, 'events', `${config.rabbit.serviceName}_block`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_features.block`, async data => {

            if (!data)
              return;

            const message = JSON.parse(data.content.toString());
            expect(message).to.have.all.keys('block');

            _.pull(generatedBlockNumbers, message.block);

            if (generatedBlockNumbers.length)
              return;

            await ctx.amqp.channel.deleteQueue(`app_${config.rabbit.serviceName}_test_features.block`);
            res();
          }, {noAck: true})
        );
      })(),
      (async () => {
        for (let number = 1; number <= 1000; number++)
          generatedBlockNumbers.push(number);

        await instance.execute('generatetoaddress', [1000, key.getAddress('base58', ctx.network)]);
      })()
    ]);
  });

  it('validate transaction event for registered user', async () => {
    let key = new keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const address = key.getAddress('base58', ctx.network);
    await new models.accountModel({address}).save();

    let tx;

    return await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, {autoDelete: true});
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_features.transaction`, async data => {

            if (!data)
              return;

            const message = JSON.parse(data.content.toString());
            expect(message).to.have.all.keys('index', 'timestamp', 'blockNumber', 'hash', 'inputs', 'outputs', 'confirmations', 'size');

            if (tx && message.hash !== tx.txid())
              return;

            await ctx.amqp.channel.deleteQueue(`app_${config.rabbit.serviceName}_test_features.transaction`);
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
        await Promise.delay(10000);
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
      })()
    ]);
  });


  it('generate some coins for accountB', async () => {
    let key = new keyring(ctx.keyPair2);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    return await instance.execute('generatetoaddress', [100, key.getAddress('base58', ctx.network)])
  });

  it('generate some coins for accountA (in order to unlock coins for accountB)', async () => {
    let key = new keyring(ctx.keyPair);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    return await instance.execute('generatetoaddress', [100, key.getAddress('base58', ctx.network)])
  });

  it('validate transaction event for not registered user', async () => {
    let key = new keyring(ctx.keyPair);
    let key2 = new keyring(ctx.keyPair2);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const address = key.getAddress('base58', ctx.network);
    const address2 = key2.getAddress('base58', ctx.network);
    let tx;

    return await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, {autoDelete: true});
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address2}`);
        await new Promise((res, rej) => {
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_features.transaction`, (data) => {
            if (data)
              rej();
          }, {noAck: true});

          let checkInterval = setInterval(async () => {

            if (!tx)
              return;

            let txExist = await models.txModel.count({_id: tx.txid()});

            if (!txExist)
              return;

            clearInterval(checkInterval);
            await ctx.amqp.channel.deleteQueue(`app_${config.rabbit.serviceName}_test_features.transaction`);
            res();

          }, 2000);

        });
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
          address: address2,
          value: Math.round(inputCoins.amount * 0.7)
        });

        await mtx.fund(inputCoins.coins, {
          rate: 10000,
          changeAddress: address
        });

        mtx.sign(key);
        tx = mtx.toTX();
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
      })()
    ]);
  });

  after('kill environment', async () => {
    ctx.blockProcessorPid.kill();
  });


};
