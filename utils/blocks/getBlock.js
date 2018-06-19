/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../../config'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network),
  providerService = require('../../services/providerService'),
  BlockModel = require('bcoin/lib/primitives/block');

/**
 * @function
 * @description get block from the node
 * @param blockNumber
 * @return {Promise<{number: *, hash: *, txs: *, timestamp: *, bits: *, merkleRoot: *}>}
 */
module.exports = async (blockNumber) => {

  const provider = await providerService.get();

  let hash = await provider.instance.execute('getblockhash', [blockNumber]);
  let blockRaw = await provider.instance.execute('getblock', [hash, false]);
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
