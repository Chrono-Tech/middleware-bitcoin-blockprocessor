const config = require('../config'),
  exec = require('../services/exec'),
  transformBlockTxs = require('./transformBlockTxs'),
  BlockModel = require('bcoin/lib/primitives/block');

module.exports = async (blockNumber) => {

  /**
   * Get raw block
   * @type {Object}
   */
  let hash = await exec('getblockhash', [blockNumber]);
  let blockRaw = await exec('getblock', [hash, false]);
  let block = BlockModel.fromRaw(blockRaw, 'hex');

  let txs = await transformBlockTxs(block.txs);
  txs = txs.map(tx => {
    tx.blockNumber = blockNumber;
    tx.timestamp = block.time || Date.now();
    return tx;
  });

  return {
    network: config.node.network,
    number: blockNumber,
    hash: block.rhash(),
    txs: txs,
    timestamp: block.time || Date.now(),
  };
};
