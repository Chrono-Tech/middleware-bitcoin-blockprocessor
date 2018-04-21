/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  exec = require('../services/exec'),
  transformBlockTxs = require('./transformBlockTxs'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network),
  BlockModel = require('bcoin/lib/primitives/block');

module.exports = async (blockNumber) => {

  /**
   * Get raw block
   * @type {Object}
   */
  let hash = await exec('getblockhash', [blockNumber]);
  let blockRaw = await exec('getblock', [hash, false]);
  let block = BlockModel.fromRaw(blockRaw, 'hex').getJSON(network);


  let txs = await transformBlockTxs(block.txs);
  txs = txs.map(tx => {
    tx.blockNumber = blockNumber;
    tx.timestamp = block.time || Date.now();
    return tx;
  });

  return {
    network: config.node.network,
    number: blockNumber,
    hash: block.hash,
    txs: txs,
    timestamp: block.time,
    bits: block.bits,
    merkleRoot: block.merkleRoot
  };
};
