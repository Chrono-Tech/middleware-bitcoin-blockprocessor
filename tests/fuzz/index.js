/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const models = require('../../models'),
  config = require('../../config'),
  bcoin = require('bcoin'),
  _ = require('lodash'),
  uniqid = require('uniqid'),
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

  it('validate block processor caching ability', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const currentNodeHeight = await instance.execute('getblockcount', []);

    if (currentNodeHeight < 1000)
      await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);

    const newCurrentNodeHeight = await instance.execute('getblockcount', []);
    await Promise.delay(newCurrentNodeHeight === 1000 ? 60000 : newCurrentNodeHeight * 10);

    let blockCount = await models.blockModel.count();
    expect(blockCount).to.be.eq(newCurrentNodeHeight + 1);
  });


  it('kill and restart block processor', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    ctx.blockProcessorPid.kill();
    await Promise.delay(5000);
    let currentNodeHeight = await instance.execute('getblockcount', []);
    await instance.execute('generatetoaddress', [50, keyring.getAddress().toString()]);
    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(60000);
    let blockCount = await models.blockModel.count();
    expect(blockCount).to.be.eq(51 + currentNodeHeight);
  });


  it('kill again, push wrong blocks and restart block processor', async () => {

    ctx.blockProcessorPid.kill();

    let state = {};
    state.blocks = await models.blockModel.find({});
    state.txs = await models.txModel.find({});
    state.coins = await models.coinModel.find({});


    let lastBlocks = await models.blockModel.find({}).sort({number: -1}).limit(6);

    for (let block of lastBlocks) {
      await models.blockModel.remove({number: block.number});
      block = block.toObject();
      block._id = uniqid();
      await models.blockModel.create(block);

      let txs = await models.txModel.find({number: block.number});
      await models.txModel.remove({number: block.number});

      for (let tx of txs) {
        tx = tx.toObject();
        tx._id = uniqid();
        await models.txModel.create(tx);
      }

      let coins = await models.coinModel.find({outputBlock: block.number, inputBlock: null});

      for (let coin of coins) {
        if (_.random(0, 10) > 5 || coin.outputIndex === 0) {
          let prevOutBlock = _.random(block.number - _.random(50, 500));
          await models.coinModel.update({outputBlock: prevOutBlock}, {
            $set: {
              inputBlock: coin.outputBlock,
              inputTxIndex: 0,
              inputIndex: 0
            }
          });
        }
      }
    }

    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);

    let newBlocks = await models.blockModel.find({});
    state.blocks = _.chain(state.blocks).sortBy('_id').map(block => _.omit(block.toObject(), ['created', '__v'])).value();
    newBlocks = _.chain(newBlocks).sortBy('_id').map(block => _.omit(block.toObject(), ['created', '__v'])).value();

    for (let number = 0; number < state.blocks.length; number++)
      expect(_.isEqual(state.blocks[number], newBlocks[number])).to.eq(true);


    let newTxs = await models.txModel.find({});
    state.txs = _.chain(state.txs).sortBy('_id').map(tx => tx.toObject()).value();
    newTxs = _.chain(newTxs).sortBy('_id').map(tx => tx.toObject()).value();

    for (let number = 0; number < state.txs.length; number++)
      expect(_.isEqual(state.txs[number], newTxs[number])).to.eq(true);


    let newCoins = await models.coinModel.find({});
    state.coins = _.chain(state.coins).sortBy('_id').map(coin => coin.toObject()).value();
    newCoins = _.chain(newCoins).sortBy('_id').map(coin => coin.toObject()).value();

    for (let number = 0; number < state.coins.length; number++)
      expect(_.isEqual(state.coins[number], newCoins[number])).to.eq(true);


  });


  after(async () => {
    ctx.blockProcessorPid.kill();
  });


};
