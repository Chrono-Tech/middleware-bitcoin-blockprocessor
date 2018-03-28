const config = require('../config'),
  Promise = require('bluebird'),
  ipcExec = require('../services/ipcExec'),
  transformBlockTxs = require('./transformBlockTxs'),
  BlockModel = require('bcoin/lib/primitives/block'),
  _ = require('lodash');

module.exports = async (blockNumber) => {

  /**
   * Get raw block
   * @type {Object}
   */
  let hash = await ipcExec('getblockhash', [blockNumber]);
  let blockRaw = await ipcExec('getblock', [hash, false]);
  let block = BlockModel.fromRaw(blockRaw, 'hex');

  const txs = await transformBlockTxs(block.txs);

  return {
    network: config.node.network,
    number: blockNumber,
    hash: block.rhash(),
    txs: txs,
    timestamp: block.time || Date.now(),
  };
};
