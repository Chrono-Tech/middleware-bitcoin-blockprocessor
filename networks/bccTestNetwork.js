/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');


const bcctestnet = {};

bcctestnet.type = 'bcctest';

let block = Block.fromRaw('0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3' +
  '888a51323a9fb8aa4b1e5e4adae5494dffff001d1aa4ae180101000000010000000000000000000000000000000000000000000000000000000000000000' +
  'ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f' +
  '6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962' +
  'e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000', 'hex');

bcctestnet.seeds = [
  'testnet-seed.bitcoinabc.org',
  'testnet-seed-abc.bitcoinforks.org',
  'testnet-seed.bitprim.org',
  'testnet-seed.deadalnix.me',
  'testnet-seeder.criptolayer.net'
];

bcctestnet.magic = 0x0709110b;
bcctestnet.port = 18333;
bcctestnet.checkpointMap = {
  546: util.revHex('000000002a936ca763904c3c35fce2f3556c559c0214345d31b1bcebf76acb70'),
  100000: util.revHex('00000000009e2958c15ff9290d571bf9459e93b19765c6801ddeccadbb160a1e'),
  200000: util.revHex('0000000000287bffd321963ef05feab753ebe274e1d78b2fd4e2bfe9ad3aa6f2'),
  400000: util.revHex('000000000598cbbb1e79057b79eef828c495d4fc31050e6b179c57d07d00367c'),
  600000: util.revHex('000000000000624f06c69d3a9fe8d25e0a9030569128d63ad1b704bbb3059a16'),
  800000: util.revHex('0000000000209b091d6519187be7c2ee205293f25f9f503f90027e25abf8b503'),
  1000000: util.revHex('0000000000478e259a3eda2fafbeeb0106626f946347955e99278fe6cc848414'),
  1050000: util.revHex('00000000001aa0b431dc7f8fa75179b8440bdb671db5ca79e1087faff00c19d8'),
  1094000: util.revHex('000000000000004bd1cd7237679fd2c8a992bba837675c9da4269d135cab43dd'),
  1112000: util.revHex('0000000000023216fd9377d50fcd45caaca5009a1837e021eb949d6a80a3384e'),
  1138771: util.revHex('00000000004d7205e1f210dc0ea4cf2c4785ebb2cf9c806cd74f3e55bbdb5aea'),
  1148771: util.revHex('00000000000003956aa841663139940fcb9fed8e6e96f30769907c0e2dd4171b'),
  1158771: util.revHex('00000000229876beca70eecec33b2ccd59c2d13fe5500ec2a20af44a62649724'),
  1168771: util.revHex('0000000028b5bc965010ed92b410784415c66da601314d879f135a54d8c3d599'),
  1178771: util.revHex('00000000343dc349997425935030f281936ddd5d0f183f69712204e92e76354f')
};

bcctestnet.lastCheckpoint = 1178771;

bcctestnet.halvingInterval = 210000;

bcctestnet.genesis = block.toHeaders();
bcctestnet.genesisBlock = block.toRaw().toString('hex');
bcctestnet.pow = {
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

bcctestnet.block = {
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

bcctestnet.bip30 = {};

bcctestnet.activationThreshold = 1512; // 75% for testchains

bcctestnet.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

bcctestnet.deployments = {
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

bcctestnet.deploys = [
  bcctestnet.deployments.csv,
  bcctestnet.deployments.segwit,
  bcctestnet.deployments.segsignal,
  bcctestnet.deployments.testdummy
];

bcctestnet.keyPrefix = {
  privkey: 0xef,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

bcctestnet.addressPrefix = {
  pubkeyhash: 0x6f,
  scripthash: 0xc4,
  witnesspubkeyhash: 0x03,
  witnessscripthash: 0x28,
  bech32: 'tb'
};

bcctestnet.requireStandard = false;

bcctestnet.rpcPort = 18332;

bcctestnet.minRelay = 1000;

bcctestnet.feeRate = 20000;

bcctestnet.maxFeeRate = 60000;

bcctestnet.selfConnect = false;

bcctestnet.requestMempool = false;

module.exports = bcctestnet;
