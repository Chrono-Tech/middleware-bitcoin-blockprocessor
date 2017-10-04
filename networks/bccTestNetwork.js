const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');


const bcctestnet = {};

bcctestnet.type = 'bcctest';

let block = Block.fromJSON({
  version: 1,
  hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
  prevBlock: '0000000000000000000000000000000000000000000000000000000000000000',
  merkleRoot: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
  time: 1231006505,
  bits: 486604799,
  nonce: 2083236893,
  height: 0,
  txs: [
    {
      hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      witnessHash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      size: 204,
      virtualSize: 204,
      value: '50.0',
      fee: '0.0',
      rate: '0.0',
      minFee: '0.00000204',
      height: -1,
      block: null,
      time: 0,
      date: null,
      index: 0,
      version: 1,
      inputs: [{
        prevout: {
          hash: '0000000000000000000000000000000000000000000000000000000000000000',
          index: 4294967295
        },
        script: '04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73',
        witness: '00',
        sequence: 4294967295,
        address: null,
        coin: undefined
      }],
      outputs: [{
        value: 5000000000,
        script: '4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      }],
      locktime: 0
    }
  ]
});

bcctestnet.seeds = [
  'testnet-seed.bitcoinabc.org',
  'testnet-seed-abc.bitcoinforks.org',
  'testnet-seed.bitcoinunlimited.info',
  'testnet-seed.bitprim.org',
  'testnet-seed.deadalnix.me',
  'testnet-seeder.criptolayer.net'

];

bcctestnet.magic = 0x0709110b;
bcctestnet.port = 18333;
bcctestnet.checkpointMap = {
  546: util.revHex('000000002a936ca763904c3c35fce2f3556c559c0214345d31b1bcebf76acb70'),
  1155876: util.revHex('00000000000e38fef93ed9582a7df43815d5c2ba9fd37ef70c9a0ea4a285b8f5')
};

bcctestnet.lastCheckpoint = 1155876;

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
