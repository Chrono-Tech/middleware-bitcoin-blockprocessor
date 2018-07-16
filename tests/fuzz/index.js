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
  expect = require('chai').expect,
  Promise = require('bluebird'),
  spawn = require('child_process').spawn,
  providerService = require('../../services/providerService'),
  ctx = {
    network: null,
    accounts: []
  };

module.exports = () => {

  it('init environment', async () => {
    ctx.network = Network.get('regtest');
    ctx.keyPair = bcoin.hd.generate(ctx.network);

    ctx.nodePid = spawn('node', ['tests/utils/bcoin/node.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(10000);

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

    await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()]);
    await Promise.delay(30000);
    let blockCount = await models.blockModel.count();
    expect(blockCount).to.be.eq(1001);
  });


  it('kill and restart block processor', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);

    ctx.blockProcessorPid.kill();
    await Promise.delay(5000);
    await instance.execute('generatetoaddress', [50, keyring.getAddress().toString()]);
    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'inherit'});
    await Promise.delay(30000);
    let blockCount = await models.blockModel.count();
    expect(blockCount).to.be.eq(1051);
  });

  it('kill environment', async () => {
    ctx.blockProcessorPid.kill();
    await Promise.delay(10000);
    ctx.nodePid.kill();
  });


};
