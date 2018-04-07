/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  ipcExec = require('../services/ipcExec'),
  transformBlockTxs = require('./transformBlockTxs'),
  BlockModel = require('bcoin/lib/primitives/block');

module.exports = async (blockNumber) => {

  /**
   * Get raw block
   * @type {Object}
   */
  let hash = await ipcExec('getblockhash', [blockNumber]);
  let blockRaw = await ipcExec('getblock', [hash, false]);
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
