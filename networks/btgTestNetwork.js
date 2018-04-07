/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');


const btgtestnet = {};

btgtestnet.type = 'btgtest';

let block = Block.fromRaw('0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3' +
  '888a51323a9fb8aa4b1e5e4adae5494dffff001d1aa4ae180101000000010000000000000000000000000000000000000000000000000000000000000000' +
  'ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f' +
  '6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962' +
  'e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000', 'hex');

btgtestnet.seeds = [
  'testnet-seed.bitcoin.jonasschnelli.ch',
  'seed.tbtc.petertodd.org',
  'testnet-seed.bluematt.me',
  'testnet-seed.bitcoin.schildbach.de'

];

btgtestnet.magic = 0x0709110b;
btgtestnet.port = 18333;
btgtestnet.checkpointMap = {
  546: util.revHex('000000002a936ca763904c3c35fce2f3556c559c0214345d31b1bcebf76acb70')
};

btgtestnet.lastCheckpoint = 546;

btgtestnet.halvingInterval = 210000;

btgtestnet.genesis = block.toHeaders();
btgtestnet.genesisBlock = block.toRaw().toString('hex');
btgtestnet.pow = {
  limit: new BN(
    '00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 486604799,
  chainwork: new BN(
    '0000000000000000000000000000000000000000000000287612691ad473cdd2',
    'hex'
  ),
  targetTimespan: 14 * 24 * 60 * 60,
  targetSpacing: 10 * 60,
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: false
};

btgtestnet.block = {
  bip34height: 21111,
  bip34hash: 'f88ecd9912d00d3f5c2a8e0f50417d3e415c75b3abe584346da9b32300000000',
  bip65height: 581885,
  bip65hash: 'b61e864fbec41dfaf09da05d1d76dc068b0dd82ee7982ff255667f0000000000',
  bip66height: 330776,
  bip66hash: '82a14b9e5ea81d4832b8e2cd3c2a6092b5a3853285a8995ec4c8042100000000',
  pruneAfterHeight: 1000,
  keepBlocks: 10000,
  maxTipAge: 24 * 60 * 60,
  slowHeight: 950000
};

btgtestnet.bip30 = {};

btgtestnet.activationThreshold = 1512; // 75% for testchains

btgtestnet.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

btgtestnet.deployments = {
  csv: {
    name: 'csv',
    bit: 0,
    startTime: 1456790400, // March 1st, 2016
    timeout: 1493596800, // May 1st, 2017
    threshold: -1,
    window: -1,
    required: false,
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: 1462060800, // May 1st 2016
    timeout: 1493596800, // May 1st 2017
    threshold: -1,
    window: -1,
    required: true,
    force: false
  },
  segsignal: {
    name: 'segsignal',
    bit: 4,
    startTime: 0xffffffff,
    timeout: 0xffffffff,
    threshold: 269,
    window: 336,
    required: false,
    force: false
  },
  testdummy: {
    name: 'testdummy',
    bit: 28,
    startTime: 1199145601, // January 1, 2008
    timeout: 1230767999, // December 31, 2008
    threshold: -1,
    window: -1,
    required: false,
    force: true
  }
};

btgtestnet.deploys = [
  btgtestnet.deployments.csv,
  btgtestnet.deployments.segwit,
  btgtestnet.deployments.segsignal,
  btgtestnet.deployments.testdummy
];

btgtestnet.keyPrefix = {
  privkey: 0xef,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

btgtestnet.addressPrefix = {
  pubkeyhash: 0x6f,
  scripthash: 0xc4,
  witnesspubkeyhash: 0x03,
  witnessscripthash: 0x28,
  bech32: 'tb'
};

btgtestnet.requireStandard = false;

btgtestnet.rpcPort = 18332;

btgtestnet.minRelay = 1000;

btgtestnet.feeRate = 20000;

btgtestnet.maxFeeRate = 60000;

btgtestnet.selfConnect = false;

btgtestnet.requestMempool = false;

module.exports = btgtestnet;
