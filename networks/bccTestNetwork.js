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
  17000: util.revHex('00000000000e4fdb058f054004e27b4712c7490ebb897875892b200d56258150'),
  210000: util.revHex('00000000cedea3912d480ed573fc7200ad8c44b0d98aff6b829af2b554543632'),
  300000: util.revHex('000000000000226f7618566e70a2b5e020e29579b46743f05348427239bf41a1'),
  390000: util.revHex('00000000000398b250017e40430902c324aea21fc79c6095d6b64f4883e117f2'),
  420000: util.revHex('000000000858123d57e82deb9a698a636b7da183856e034e01bb1fb9a3739ede'),
  500000: util.revHex('000000000001a7c0aaa2630fbb2c0e476aafffc60f82177375b2aaa22209f606'),
  630000: util.revHex('0000000000007c21a9190d3eb43517032ba0077229cbff4e6a2a43357011bebb'),
  700000: util.revHex('000000000000406178b12a4dea3b27e13b3c4fe4510994fd667d7c1e6a3f4dc1'),
  780000: util.revHex('000000000005510867e144713696551e523eb3e21328dc645975c3342e588103'),
  840000: util.revHex('00000000000aa89e175f6619b1cfb148b5426dc883407ee59443bd078164c1da'),
  900000: util.revHex('0000000000356f8d8924556e765b7a94aaebc6b5c8685dcfa2b1ee8b41acd89b'),
  1050000: util.revHex('00000000001aa0b431dc7f8fa75179b8440bdb671db5ca79e1087faff00c19d8'),
  1155875: util.revHex('00000000f17c850672894b9a75b63a1e72830bbd5f4c8889b5c1a80e7faef138'),
  1188697: util.revHex('0000000000170ed0918077bde7b4d36cc4c91be69fa09211f748240dabe047fb')
};

bcctestnet.lastCheckpoint = 1188697;

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
