const BN = require('bcoin/lib/crypto/bn'),
  Block = require('bcoin/lib/primitives/block'),
  util = require('bcoin/lib/utils/util');


const bccnet = {};

bccnet.type = 'bcc';

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

bccnet.seeds = [
  'seed.bitcoinabc.org',
  'seed-abc.bitcoinforks.org',
  'btccash-seeder.bitcoinunlimited.info',
  'seed.bitprim.org',
  'seed.deadalnix.me',
  'seeder.criptolayer.net'

];

bccnet.magic = 0xd9b4bef9;
bccnet.port = 8333;
bccnet.checkpointMap = {
  11111: util.revHex('0000000069e244f73d78e8fd29ba2fd2ed618bd6fa2ee92559f542fdb26e7c1d'),
  33333: util.revHex('000000002dd5588a74784eaa7ab0507a18ad16a236e7b1ce69f00d7ddfb5d0a6'),
  74000: util.revHex('0000000000573993a3c9e41ce34471c079dcf5f52a0e824a81e7f953b8661a20'),
  105000: util.revHex('00000000000291ce28027faea320c8d2b054b2e0fe44a773f3eefb151d6bdc97'),
  134444: util.revHex('00000000000005b12ffd4cd315cd34ffd4a594f430ac814c91184a0d42d2b0fe'),
  168000: util.revHex('000000000000099e61ea72015e79632f216fe6cb33d7899acb35b75c8303b763'),
  193000: util.revHex('0x000000000000059f452a5f7340de6682a977387c17010ff6e6c3bd83ca8b1317'),
  210000: util.revHex('000000000000048b95347e83192f69cf0366076336c639f9b7228e9ba171342e'),
  216116: util.revHex('00000000000001b4f4b433e81ee46494af945cf96014816a4e2370f11b23df4e'),
  225430: util.revHex('00000000000001c108384350f74090433e7fcf79a606b8e797f065b130575932'),
  250000: util.revHex('000000000000003887df1f29024b06fc2200b55f8af8f35453d7be294df2d214'),
  279000: util.revHex('0000000000000001ae8c72a0b0c301f67e3afca10e819efa9041e458e9bd7e40'),
  295000: util.revHex('00000000000000004d9b4ef50f0f9d686fd69db2e03af35a100370c64632a983'),
  478559: util.revHex('000000000000000000651ef99cb9fcbe0dadde1d424bd9f15ff20136191a5eec')
};

bccnet.lastCheckpoint = 478559;

bccnet.halvingInterval = 210000;

bccnet.genesis = block.toHeaders();
bccnet.genesisBlock = block.toRaw().toString('hex');

bccnet.pow = {
  limit: new BN(
    '00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),
  bits: 486604799,
  chainwork: '000000000000000000000000000000000000000000756697b2e44d3745086353',
  targetTimespan: 14 * 24 * 60 * 60,
  targetSpacing: 10 * 60,
  retargetInterval: 2016,
  targetReset: true,
  noRetargeting: false
};

bccnet.pow = {
  /**
   * Default target.
   * @const {BN}
   */

  limit: new BN(
    '00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'hex'
  ),

  /**
   * Compact pow limit.
   * @const {Number}
   * @default
   */

  bits: 486604799,

  /**
   * Minimum chainwork for best chain.
   * @const {BN}
   */

  chainwork: new BN(
    '000000000000000000000000000000000000000000756697b2e44d3745086353',
    'hex'
  ),

  /**
   * Desired retarget period in seconds.
   * @const {Number}
   * @default
   */

  targetTimespan: 14 * 24 * 60 * 60,

  /**
   * Average block time.
   * @const {Number}
   * @default
   */

  targetSpacing: 10 * 60,

  /**
   * Retarget interval in blocks.
   * @const {Number}
   * @default
   */

  retargetInterval: 2016,

  /**
   * Whether to reset target if a block
   * has not been mined recently.
   * @const {Boolean}
   * @default
   */

  targetReset: false,

  /**
   * Do not allow retargetting.
   * @const {Boolean}
   * @default
   */

  noRetargeting: false
};

/**
 * Block constants.
 * @enum {Number}
 * @default
 */

bccnet.block = {
  /**
   * Height at which bip34 was activated.
   * Used for avoiding bip30 checks.
   */

  bip34height: 227931,

  /**
   * Hash of the block that activated bip34.
   */

  bip34hash: 'b808089c756add1591b1d17bab44bba3fed9e02f942ab4894b02000000000000',

  /**
   * Height at which bip65 was activated.
   */

  bip65height: 388381,

  /**
   * Hash of the block that activated bip65.
   */

  bip65hash: 'f035476cfaeb9f677c2cdad00fd908c556775ded24b6c2040000000000000000',

  /**
   * Height at which bip66 was activated.
   */

  bip66height: 363725,

  /**
   * Hash of the block that activated bip66.
   */

  bip66hash: '3109b588941188a9f1c2576aae462d729b8cce9da1ea79030000000000000000',

  /**
   * Safe height to start pruning.
   */

  pruneAfterHeight: 100000,

  /**
   * Safe number of blocks to keep.
   */

  keepBlocks: 288,

  /**
   * Age used for the time delta to
   * determine whether the chain is synced.
   */

  maxTipAge: 24 * 60 * 60,

  /**
   * Height at which block processing is
   * slow enough that we can output
   * logs without spamming.
   */

  slowHeight: 325000
};

/**
 * Map of historical blocks which create duplicate transactions hashes.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0030.mediawiki
 * @const {Object}
 * @default
 */

bccnet.bip30 = {
  91842: 'eccae000e3c8e4e093936360431f3b7603c563c1ff6181390a4d0a0000000000',
  91880: '21d77ccb4c08386a04ac0196ae10f6a1d2c2a377558ca190f143070000000000'
};

/**
 * For versionbits.
 * @const {Number}
 * @default
 */

bccnet.activationThreshold = 1916; // 95% of 2016

/**
 * Confirmation window for versionbits.
 * @const {Number}
 * @default
 */

bccnet.minerWindow = 2016; // nPowTargetTimespan / nPowTargetSpacing

/**
 * Deployments for versionbits.
 * @const {Object}
 * @default
 */

bccnet.deployments = {
  csv: {
    name: 'csv',
    bit: 0,
    startTime: 1462060800, // May 1st, 2016
    timeout: 1493596800, // May 1st, 2017
    threshold: -1,
    window: -1,
    required: false,
    force: true
  },
  segwit: {
    name: 'segwit',
    bit: 1,
    startTime: 1479168000, // November 15th, 2016.
    timeout: 1510704000, // November 15th, 2017.
    threshold: -1,
    window: -1,
    required: true,
    force: false
  },
  segsignal: {
    name: 'segsignal',
    bit: 4,
    startTime: 1496275200, // June 1st, 2017.
    timeout: 1510704000, // November 15th, 2017.
    threshold: 269, // 80%
    window: 336, // ~2.33 days
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

/**
 * Deployments for versionbits (array form, sorted).
 * @const {Array}
 * @default
 */

bccnet.deploys = [
  bccnet.deployments.csv,
  bccnet.deployments.segwit,
  bccnet.deployments.segsignal,
  bccnet.deployments.testdummy
];

/**
 * Key prefixes.
 * @enum {Number}
 * @default
 */

bccnet.keyPrefix = {
  privkey: 0x80,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  xpubkey58: 'xpub',
  xprivkey58: 'xprv',
  coinType: 0
};

/**
 * {@link Address} prefixes.
 * @enum {Number}
 */

bccnet.addressPrefix = {
  pubkeyhash: 0x00,
  scripthash: 0x05,
  witnesspubkeyhash: 0x06,
  witnessscripthash: 0x0a,
  bech32: 'bc'
};

/**
 * Default value for whether the mempool
 * accepts non-standard transactions.
 * @const {Boolean}
 * @default
 */

bccnet.requireStandard = true;

/**
 * Default http port.
 * @const {Number}
 * @default
 */

bccnet.rpcPort = 8332;

/**
 * Default min relay rate.
 * @const {Rate}
 * @default
 */

bccnet.minRelay = 1000;

/**
 * Default normal relay rate.
 * @const {Rate}
 * @default
 */

bccnet.feeRate = 100000;

/**
 * Maximum normal relay rate.
 * @const {Rate}
 * @default
 */

bccnet.maxFeeRate = 400000;

/**
 * Whether to allow self-connection.
 * @const {Boolean}
 */

bccnet.selfConnect = false;

/**
 * Whether to request mempool on sync.
 * @const {Boolean}
 */

bccnet.requestMempool = false;

module.exports = bccnet;
