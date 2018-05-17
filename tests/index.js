/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const config = require('../config'),
  Network = require('bcoin/lib/protocol/network'),
  txModel = require('../models/txModel'),
  coinModel = require('../models/coinModel'),
  bcoin = require('bcoin'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  exec = require('../services/execService'),
  _ = require('lodash'),
  ctx = {
    network: null,
    accounts: []
  },
  mongoose = require('mongoose');

mongoose.Promise = Promise;

describe('core/blockProcessor', function () {

  before(async () => {

    ctx.network = Network.get('regtest');

    let keyPair = bcoin.hd.generate(ctx.network);
    let keyPair2 = bcoin.hd.generate(ctx.network);
    let keyPair3 = bcoin.hd.generate(ctx.network);
    let keyPair4 = bcoin.hd.generate(ctx.network);

    ctx.accounts.push(keyPair, keyPair2, keyPair3, keyPair4);

    mongoose.connect(config.mongo.accounts.uri, {useMongoClient: true});
  });

  after(() => {
    return mongoose.disconnect();
  });

  it('generate blocks and initial coins', async () => {
    let keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    let response = await exec('generatetoaddress', [10, keyring.getAddress().toString()]);
    expect(response).to.not.be.undefined;
  });

  it('validate balance greater 0', async () => {
    await Promise.delay(20000);
    let keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    let coins = await coinModel.find({address: keyring.getAddress().toString()});

    let newSumm = _.chain(coins)
      .map(c => parseInt(c.value))
      .sum()
      .value();


    expect(newSumm).to.be.gt(0);

  });


});
