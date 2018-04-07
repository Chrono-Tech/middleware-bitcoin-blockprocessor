/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');

const litecointest = {};

litecointest.type = 'litecointest';

let block = Block.fromRaw('010000000000000000000000000000000000000000000000000000000000000000000'
  + '000d9ced4ed1130f7b7faad9be25323ffafa33232a17c3edf6cfd97bee6bafbdd97f6'
  + '0ba158f0ff0f1ee179040001010000000100000000000000000000000000000000000'
  + '00000000000000000000000000000ffffffff4804ffff001d0104404e592054696d65'
  + '732030352f4f63742f32303131205374657665204a6f62732c204170706c65e280997'
  + '320566973696f6e6172792c2044696573206174203536ffffffff0100f2052a010000'
  + '004341040184710fa689ad5023690c80f3a49c8f13f8d45b8c857fbcbc8bc4a8e4d3e'
  + 'b4b10f4d4604fa08dce601aaf0f470216fe1b51850b4acf21b179c45070ac7b03a9ac'
  + '00000000', 'hex');

litecointest.seeds = [
  'testnet-seed.litecointools.com',
  'seed-b.litecoin.loshan.co.uk',
  'dnsseed-testnet.thrasher.io'
];

litecointest.magic = 0xf1c8d2fd;
litecointest.port = 18333;
litecointest.checkpointMap = {
  2056: util.revHex('17748a31ba97afdc9a4f86837a39d287e3e7c7290a08a1d816c5969c78a83289')
};

litecointest.lastCheckpoint = 2056;

litecointest.halvingInterval = 840000;

litecointest.genesis = block.toHeaders();
litecointest.genesisBlock = block.toRaw().toString('hex');
litecointest.pow = {
  limit: new BN(
    '00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 486604799,
  chainwork: new BN(
    '00000000000000000000000000000000000000000000000000000000872d04d7',
    'hex'
  ),
  targetTimespan: 3.5 * 24 * 60 * 60,
  targetSpacing: 2.5 * 60,
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: false
};

litecointest.block = {
  bip34height: 0xffffffff,
  bip34hash: null,
  bip65height: 76,
  bip65hash: '73058ccc33da8b5479e3548c3cce4fb32a705fa9803994fd5f498bed71c77580',
  bip66height: 76,
  bip66hash: '73058ccc33da8b5479e3548c3cce4fb32a705fa9803994fd5f498bed71c77580',
  pruneAfterHeight: 1000,
  keepBlocks: 10000,
  maxTipAge: 24 * 60 * 60,
  slowHeight: 950000
};

litecointest.bip30 = {};

litecointest.activationThreshold = 1512; // 75% for testchains

litecointest.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

litecointest.deployments = {
  testdummy: {
    name: 'testdummy',
    bit: 28,
    startTime: 1199145601, // January 1, 2008
    timeout: 1230767999, // December 31, 2008
    force: true
  },
  csv: {
    name: 'csv',
    bit: 0,
    startTime: 1483228800, // January 1, 2017
    timeout: 1517356801, // January 31st, 2018
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: 1483228800, // January 1, 2017
    timeout: 1517356801, // January 31st, 2018
    force: false
  }
};

litecointest.deploys = [
  litecointest.deployments.csv,
  litecointest.deployments.segwit,
  litecointest.deployments.testdummy
];

litecointest.keyPrefix = {
  privkey: 0xef,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

litecointest.addressPrefix = {
  pubkeyhash: 0x6f,
  scripthash: 0xc4,
  witnesspubkeyhash: 0x03,
  witnessscripthash: 0x28,
  bech32: 'tb'
};

litecointest.requireStandard = false;

litecointest.rpcPort = 18332;

litecointest.minRelay = 1000;

litecointest.feeRate = 20000;

litecointest.maxFeeRate = 60000;

litecointest.selfConnect = false;

litecointest.requestMempool = false;

module.exports = litecointest;
