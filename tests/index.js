require('dotenv/config');

const config = require('../config'),
  Network = require('bcoin/lib/protocol/network'),
  utxoModel = require('../models/utxoModel'),
  txModel = require('../models/txModel'),
  bcoin = require('bcoin'),
  expect = require('chai').expect,
  Promise = require('bluebird'),
  ipcExec = require('./helpers/ipcExec'),
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

  it('validate balance', async () => {
    let keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    let coins = await ipcExec('getcoinsbyaddress', [keyring.getAddress().toString()]);

    ctx.summ = _.chain(coins)
      .map(c => c.value)
      .sum()
      .value();

  });

  it('generate blocks and initial coins', async () => {
    let keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    let response = await ipcExec('generatetoaddress', [10, keyring.getAddress().toString()]);
    expect(response).to.not.be.undefined;
  });

  it('validate balance again', async () => {
    let keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    let coins = await ipcExec('getcoinsbyaddress', [keyring.getAddress().toString()]);

    let newSumm = _.chain(coins)
      .map(c => c.value)
      .sum()
      .value();

    expect(newSumm).to.be.gt(ctx.summ);

  });


  it('validate utxo', async () => {
    await Promise.delay(5000);
    const keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    const address = keyring.getAddress().toString();
    const coins = await ipcExec('getcoinsbyaddress', [address]);
    const utxo = await utxoModel.find({address: address});

    let coinSumm = _.chain(coins)
      .map(c => c.value)
      .sum()
      .value();

    let utxoSumm = _.chain(utxo)
      .map(item=>item.value)
      .sum()
      .value();

    expect(coinSumm).to.be.eq(utxoSumm);

  });


  it('validate transactions', async () => {
    const keyring = new bcoin.keyring(ctx.accounts[0].privateKey, ctx.network);
    const address = keyring.getAddress().toString();
    const utxo = await utxoModel.find({address: address});

    const hashes = _.chain(utxo)
      .map(item=>item.hash)
      .uniq()
      .value();

    const txsCount = await txModel.count({$or: [
      {'inputs.address': address},
      {'outputs.address': address}
    ]});
    let txsFilteredCount = await txModel.count({hash: {$in: hashes}});


    expect(txsCount).to.be.eq(txsFilteredCount);

  });


});
