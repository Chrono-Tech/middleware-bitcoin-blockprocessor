/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const models = require('../../models'),
  config = require('../../config'),
  bcoin = require('bcoin'),
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
    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);
  });

  it('validate block processor caching ability', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const currentNodeHeight = await instance.execute('getblockcount', []);

    await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);
    await Promise.delay(60000);
    let blockCount = await models.blockModel.count();
    expect(blockCount).to.be.eq(1001 + currentNodeHeight);
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

  after(async () => {
    ctx.blockProcessorPid.kill();
  });


};
