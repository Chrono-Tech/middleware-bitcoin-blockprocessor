/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');

const litecoin = {};

litecoin.type = 'litecoin';

let block = Block.fromRaw('0100000000000000000000000000000000000000000000000000000000000000000000'
  + '00d9ced4ed1130f7b7faad9be25323ffafa33232a17c3edf6cfd97bee6bafbdd97b9aa'
  + '8e4ef0ff0f1ecd513f7c01010000000100000000000000000000000000000000000000'
  + '00000000000000000000000000ffffffff4804ffff001d0104404e592054696d657320'
  + '30352f4f63742f32303131205374657665204a6f62732c204170706c65e28099732056'
  + '6973696f6e6172792c2044696573206174203536ffffffff0100f2052a010000004341'
  + '040184710fa689ad5023690c80f3a49c8f13f8d45b8c857fbcbc8bc4a8e4d3eb4b10f4'
  + 'd4604fa08dce601aaf0f470216fe1b51850b4acf21b179c45070ac7b03a9ac00000000', 'hex');

litecoin.seeds = [
  'seed-a.litecoin.loshan.co.uk',
  'dnsseed.thrasher.io',
  'dnsseed.litecointools.com',
  'dnsseed.litecoinpool.org',
  'dnsseed.koin-project.com'
];

litecoin.magic = 0xdbb6c0fb;
litecoin.port = 18333;
litecoin.checkpointMap = {
  1500: util.revHex('841a2965955dd288cfa707a755d05a54e45f8bd476835ec9af4402a2b59a2967'),
  4032: util.revHex('9ce90e427198fc0ef05e5905ce3503725b80e26afd35a987965fd7e3d9cf0846'),
  8064: util.revHex('eb984353fc5190f210651f150c40b8a4bab9eeeff0b729fcb3987da694430d70'),
  16128: util.revHex('602edf1859b7f9a6af809f1d9b0e6cb66fdc1d4d9dcd7a4bec03e12a1ccd153d'),
  23420: util.revHex('d80fdf9ca81afd0bd2b2a90ac3a9fe547da58f2530ec874e978fce0b5101b507'),
  50000: util.revHex('69dc37eb029b68f075a5012dcc0419c127672adb4f3a32882b2b3e71d07a20a6'),
  80000: util.revHex('4fcb7c02f676a300503f49c764a89955a8f920b46a8cbecb4867182ecdb2e90a'),
  120000: util.revHex('bd9d26924f05f6daa7f0155f32828ec89e8e29cee9e7121b026a7a3552ac6131'),
  161500: util.revHex('dbe89880474f4bb4f75c227c77ba1cdc024991123b28b8418dbbf7798471ff43'),
  179620: util.revHex('2ad9c65c990ac00426d18e446e0fd7be2ffa69e9a7dcb28358a50b2b78b9f709'),
  240000: util.revHex('7140d1c4b4c2157ca217ee7636f24c9c73db39c4590c4e6eab2e3ea1555088aa'),
  383640: util.revHex('2b6809f094a9215bafc65eb3f110a35127a34be94b7d0590a096c3f126c6f364'),
  409004: util.revHex('487518d663d9f1fa08611d9395ad74d982b667fbdc0e77e9cf39b4f1355908a3'),
  456000: util.revHex('bf34f71cc6366cd487930d06be22f897e34ca6a40501ac7d401be32456372004'),
  638902: util.revHex('15238656e8ec63d28de29a8c75fcf3a5819afc953dcd9cc45cecc53baec74f38'),
  721000: util.revHex('198a7b4de1df9478e2463bd99d75b714eab235a2e63e741641dc8a759a9840e5')
};

litecoin.lastCheckpoint = 721000;

litecoin.halvingInterval = 840000;

litecoin.genesis = block.toHeaders();
litecoin.genesisBlock = block.toRaw().toString('hex');
litecoin.pow = {
  limit: new BN(
    '00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 486604799,
  chainwork: new BN(
    '000000000000000000000000000000000000000000000005c13f99f6d0b1a908',
    'hex'
  ),
  targetTimespan: 3.5 * 24 * 60 * 60,
  targetSpacing: 2.5 * 60,
  retargetInterval: 2016,
  targetReset: false,
  noRetargeting: false
};

litecoin.block = {
  bip34height: 710000,
  bip34hash: 'cf519deb9a32b4c72612ff0c42bf3a04f262fa41d4c8a7d58e763aa804d209fa',
  bip65height: 918684,
  bip65hash: '1a31cc64827cc248b2afefd849d41dde2bb907e73ff6ef3edce077891e04b3ba',
  bip66height: 811879,
  bip66hash: '941849dc7bbdd271a727db8fb06acd33e23a1b8b5d83f85289fa332801eece7a',
  pruneAfterHeight: 1000,
  keepBlocks: 288,
  maxTipAge: 24 * 60 * 60,
  slowHeight: 900000
};

litecoin.bip30 = {};

litecoin.activationThreshold = 6048; // 75% for testchains

litecoin.minerWindow = 8064; // nPowTargetTimespan / nPowTargetSpacing

litecoin.deployments = {
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
    startTime: 1485561600, // January 28, 2017
    timeout: 1517356801, // January 31st, 2018
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: 1485561600, // January 28, 2017
    timeout: 1517356801, // January 31st, 2018
    force: false
  }
};

litecoin.deploys = [
  litecoin.deployments.csv,
  litecoin.deployments.segwit,
  litecoin.deployments.testdummy
];

litecoin.keyPrefix = {
  privkey: 0xb0,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  xprivkey58: 'xprv',
  xpubkey58: 'xpub',
  coinType: 0
};

litecoin.addressPrefix = {
  pubkeyhash: 0x30,
  scripthash: 0x32,
  witnesspubkeyhash: 0x06,
  witnessscripthash: 0x0a,
  bech32: 'lc'
};

litecoin.requireStandard = true;

litecoin.rpcPort = 18332;

litecoin.minRelay = 1000;

litecoin.feeRate = 100000;

litecoin.maxFeeRate = 400000;

litecoin.selfConnect = false;

litecoin.requestMempool = false;

module.exports = litecoin;
