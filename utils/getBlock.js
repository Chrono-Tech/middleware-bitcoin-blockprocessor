/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  exec = require('../services/execService'),
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

  return {
    number: blockNumber,
    hash: block.hash,
    txs: block.txs,
    timestamp: block.time,
    bits: block.bits,
    merkleRoot: block.merkleRoot
  };
};
