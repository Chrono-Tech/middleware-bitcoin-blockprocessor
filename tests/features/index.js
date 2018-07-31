/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const models = require('../../models'),
  config = require('../../config'),
  bcoin = require('bcoin'),
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
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const generatedBlockNumbers = [];

    await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.block`);
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

        await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);
      })()
    ]);
  });

  it('validate transaction event for registered user', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const address = keyring.getAddress().toString();
    await new models.accountModel({address}).save();

    let tx;

    return await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.transaction`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_features.transaction`, async data => {

            if(!data)
              return;

            const message = JSON.parse(data.content.toString());
            expect(message).to.have.all.keys('index', 'timestamp', 'blockNumber', 'hash', 'inputs', 'outputs', 'confirmations');

            if (tx && message.hash !== tx.txid())
              return;

            await ctx.amqp.channel.deleteQueue(`app_${config.rabbit.serviceName}_test_features.transaction`);
            res();
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
        await Promise.delay(10000);
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
      })()
    ]);
  });


  it('generate some coins for accountB', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair2, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    return await instance.execute('generatetoaddress', [100, keyring.getAddress().toString()])
  });

  it('generate some coins for accountA (in order to unlock coins for accountB)', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    return await instance.execute('generatetoaddress', [100, keyring.getAddress().toString()])
  });

  it('validate transaction event for not registered user', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    let keyring2 = new bcoin.keyring(ctx.keyPair2, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const address2 = keyring2.getAddress().toString();
    let tx;

    return await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test_features.transaction`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test_features.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address2}`);
        await new Promise((res, rej) => {
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test_features.transaction`, (data)=>{
            if(data)
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

        let coins = await instance.execute('getcoinsbyaddress', [keyring.getAddress().toString()]);

        let inputCoins = _.chain(coins)
          .transform((result, coin) => {
            result.coins.push(bcoin.coin.fromJSON(coin));
            result.amount += coin.value;
          }, {amount: 0, coins: []})
          .value();

        const mtx = new bcoin.mtx();

        mtx.addOutput({
          address: keyring2.getAddress(),
          value: Math.round(inputCoins.amount * 0.7)
        });

        await mtx.fund(inputCoins.coins, {
          rate: 10000,
          changeAddress: keyring.getAddress()
        });

        mtx.sign(keyring);
        tx = mtx.toTX();
        await instance.execute('sendrawtransaction', [tx.toRaw().toString('hex')]);
      })()
    ]);
  });

  after('kill environment', async () => {
    ctx.blockProcessorPid.kill();
  });


};