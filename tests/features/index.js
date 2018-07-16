/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const Network = require('bcoin/lib/protocol/network'),
  models = require('../../models'),
  config = require('../../config'),
  bcoin = require('bcoin'),
  _ = require('lodash'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  spawn = require('child_process').spawn,
  providerService = require('../../services/providerService'),
  amqp = require('amqplib'),
  ctx = {
    network: null,
    accounts: [],
    amqp: {
      instance: null
    }
  };

module.exports = () => {

  it('init environment', async () => {
    ctx.network = Network.get('regtest');
    ctx.keyPair = bcoin.hd.generate(ctx.network);
    ctx.keyPair2 = bcoin.hd.generate(ctx.network);

    ctx.amqp.instance = await amqp.connect(config.rabbit.url);
    ctx.amqp.channel = await ctx.amqp.instance.createChannel();
    await ctx.amqp.channel.assertExchange('events', 'topic', {durable: false});

    ctx.nodePid = spawn('node', ['tests/utils/bcoin/node.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);

    await models.blockModel.remove({});
    await models.txModel.remove({});
    await models.coinModel.remove({});
    await models.accountModel.remove({});

    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);
  });

  it('validate block event', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const generatedBlockNumbers = [];

    await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test.block`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test.block`, 'events', `${config.rabbit.serviceName}_block`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test.block`, async data => {
            const message = JSON.parse(data.content.toString());
            expect(message).to.have.all.keys('block');

            _.pull(generatedBlockNumbers, message.block);

            if (!generatedBlockNumbers.length)
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
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test.transaction`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test.transaction`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise(res =>
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test.transaction`, async data => {
            const message = JSON.parse(data.content.toString());
            expect(message).to.have.all.keys('index', 'timestamp', 'blockNumber', 'hash', 'inputs', 'outputs', 'confirmations');

            if (message.hash === tx.txid())
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
    let keyring = new bcoin.keyring(ctx.keyPair2, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    const address = keyring.getAddress().toString();

    let tx;

    return await Promise.all([
      (async () => {
        await ctx.amqp.channel.assertQueue(`app_${config.rabbit.serviceName}_test.transaction2`);
        await ctx.amqp.channel.bindQueue(`app_${config.rabbit.serviceName}_test.transaction2`, 'events', `${config.rabbit.serviceName}_transaction.${address}`);
        await new Promise((res, rej) => {
          ctx.amqp.channel.consume(`app_${config.rabbit.serviceName}_test.transaction2`, rej, {noAck: true});

          let checkInterval = setInterval(async () => {

            if(!tx)
              return;

            let txExist = await models.txModel.count({_id: tx.txid()});

            if(!txExist)
              return;

            clearInterval(checkInterval);
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
      })()
    ]);
  });

  it('kill environment', async () => {
    ctx.blockProcessorPid.kill();
    await Promise.delay(10000);
    ctx.nodePid.kill();
    await ctx.amqp.instance.close();
  });


};
