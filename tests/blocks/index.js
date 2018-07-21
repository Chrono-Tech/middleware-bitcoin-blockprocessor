/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Network = require('bcoin/lib/protocol/network'),
  models = require('../../models'),
  config = require('../../config'),
  bcoin = require('bcoin'),
  _ = require('lodash'),
  network = Network.get(config.node.network),
  TxModel = require('bcoin/lib/primitives/tx'),
  filterTxsByAccountsService = require('../../services/filterTxsByAccountsService'),
  getBlock = require('../../utils/blocks/getBlock'),
  addBlock = require('../../utils/blocks/addBlock'),
  getFullTxFromCache = require('../../utils/txs/getFullTxFromCache'),
  buildCoins = require('../../utils/coins/buildCoins'),
  allocateBlockBuckets = require('../../utils/blocks/allocateBlockBuckets'),
  addUnconfirmedTx = require('../../utils/txs/addUnconfirmedTx'),
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
  });


  it('generate some coins for account', async () => {
    let keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    return await instance.execute('generatetoaddress', [1000, keyring.getAddress().toString()])
  });


  it('get block', async () => {
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const height = await instance.execute('getblockcount', []);
    const hash = await instance.execute('getblockhash', [height - 1]);

    const block = await getBlock(height - 1);

    expect(block).to.have.keys('number', 'hash', 'txs', 'timestamp', 'bits', 'merkleRoot');
    expect(block.hash).to.equal(hash);

    for (let tx of block.txs) {
      expect(tx).to.have.keys('hash', 'inputs', 'outputs', 'index', 'timestamp');

      for (let input of tx.inputs)
        expect(input).to.have.keys('prevout', 'address');

      for (let output of tx.outputs)
        expect(output).to.have.keys('value', 'address');
    }

  });

  it('add block', async () => {

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const height = await instance.execute('getblockcount', []);

    const block = await getBlock(height - 1);
    const blockCopy = _.cloneDeep(block);
    await addBlock(block);

    expect(_.isEqual(block, blockCopy)).to.equal(true); //check that object hasn't been modified

    const isBlockExists = await models.blockModel.count({_id: block.hash});
    expect(isBlockExists).to.equal(1);


  });

  it('find missed blocks', async () => {

    ctx.blockProcessorPid = spawn('node', ['index.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(30000);
    ctx.blockProcessorPid.kill();

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const height = await instance.execute('getblockcount', []);

    const blockCount = await models.blockModel.count({});

    expect(blockCount).to.equal(height + 1);

    let blocks = [];

    for (let i = 0; i < height; i++)
      blocks.push(i);

    blocks = _.shuffle(blocks);

    const blocksToRemove = _.take(blocks, 50);

    await models.blockModel.remove({number: {$in: blocksToRemove}});

    const buckets = await allocateBlockBuckets();

    expect(buckets.height).to.equal(height - 1);


    let blocksToFetch = [];

    for (let bucket of buckets.missedBuckets) {

      if (bucket.length === 1) {
        blocksToFetch.push(...bucket);
        continue;
      }

      for (let blockNumber = _.last(bucket); blockNumber >= bucket[0]; blockNumber--)
        blocksToFetch.push(blockNumber);
    }

    expect(_.isEqual(_.sortBy(blocksToRemove), _.sortBy(blocksToFetch))).to.equal(true);

  });

  it('build coins', async () => {

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    const height = await instance.execute('getblockcount', []);

    const block = await getBlock(height - 1);

    let txs = block.txs.map(tx => ({
        _id: tx.hash,
        index: tx.index,
        blockNumber: block.number,
        timestamp: block.time || Date.now(),
        inputs: tx.inputs,
        outputs: tx.outputs
      })
    );

    const coins = buildCoins(txs);

    for (let coin of coins) {
      let tx = _.find(txs, {index: coin.inputBlock ? coin.inputTxIndex : coin.outputTxIndex});
      expect(tx).to.not.be.null;
    }
  });

  it('add unconfirmed tx', async () => {

    const keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    await instance.execute('generatetoaddress', [1, keyring.getAddress().toString()]);

    const height = await instance.execute('getblockcount', []);
    const block = await getBlock(height);

    const txHash = block.txs[0].hash;

    const rawTx = await instance.execute('getrawtransaction', [txHash]);

    const tx = TxModel.fromRaw(rawTx, 'hex').getJSON(network);
    tx.index = 0;

    const txCopy = _.cloneDeep(tx);
    await addUnconfirmedTx(tx);
    expect(_.isEqual(tx, txCopy)).to.equal(true); //check that object hasn't been modified

    const isTxExists = await models.txModel.count({_id: tx.hash});
    expect(isTxExists).to.equal(1);

    const isCoinExist = await models.coinModel.count({outputBlock: -1, outputTxIndex: 0});
    expect(isCoinExist).to.equal(1);
  });

  it('get full tx', async () => {

    const keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    await instance.execute('generatetoaddress', [1, keyring.getAddress().toString()]);

    const height = await instance.execute('getblockcount', []);
    const block = await getBlock(height - 1);

    const txHash = block.txs[0].hash;
    const tx = await getFullTxFromCache(txHash);

    expect(tx).to.have.all.keys('index', 'timestamp', 'blockNumber', 'hash', 'inputs', 'outputs', 'confirmations');
  });

  it('check filterTxsByAccountsService', async () => {

    const keyring = new bcoin.keyring(ctx.keyPair, ctx.network);
    const keyring2 = new bcoin.keyring(ctx.keyPair2, ctx.network);

    await models.accountModel.create({address: keyring.getAddress().toString()});

    const instance = providerService.getConnectorFromURI(config.node.providers[0].uri);
    await instance.execute('generatetoaddress', [1, keyring.getAddress().toString()]);
    await instance.execute('generatetoaddress', [1, keyring2.getAddress().toString()]);

    const height = await instance.execute('getblockcount', []);

    for (let i = 0; i < 2; i++) {
     let block = await getBlock(height - i);
     await addBlock(block);
    }

    await models.coinModel.update({outputBlock: height - 1, outputTxIndex: 0}, {
      $set: {
        inputBlock: height,
        inputTxIndex: 0,
        inputIndex: 0
      }
    });

    const block = await getBlock(height);
    const txHash = block.txs[0].hash;
    const tx = await getFullTxFromCache(txHash);
    const filtered = await filterTxsByAccountsService([tx]);

    expect(!!_.find(filtered, {address: keyring.getAddress().toString()})).to.eq(true);
    expect(!!_.find(filtered, {address: keyring2.getAddress().toString()})).to.eq(false);
  });

};
