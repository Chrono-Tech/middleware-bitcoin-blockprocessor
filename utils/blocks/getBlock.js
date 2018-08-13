/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../../config'),
  networks = require('middleware-common-components/factories/btcNetworks'),
  network = networks[config.node.network],
  providerService = require('../../services/providerService'),
  _ = require('lodash'),
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

  block.txs = block.txs.map(tx => {
    tx.timestamp = tx.time || block.time;
    tx = _.pick(tx, ['hash', 'inputs', 'outputs', 'index', 'timestamp']);
    tx.inputs = tx.inputs.map(input => _.pick(input, ['prevout', 'address']));
    tx.outputs = tx.outputs.map(output => _.pick(output, ['value', 'address']));
    return tx;
  });

  return {
    number: blockNumber,
    hash: hash,
    txs: block.txs,
    timestamp: block.time,
    bits: block.bits,
    merkleRoot: block.merkleRoot
  };
};
