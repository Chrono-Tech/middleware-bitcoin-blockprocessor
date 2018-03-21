const config = require('../config'),
  blockModel = require('../models/blockModel'),
  Network = require('bcoin/lib/protocol/network'),
  _ = require('lodash'),
  network = Network.get(config.node.network);

/**
 * @service
 * @description transform tx to full object
 * @param txs - original block's array of tx objects
 * @returns {Promise.<*>}
 */


module.exports = async (txs) => {

  txs = txs.map(tx => tx.getJSON(network));

  const inputHashes = _.chain(txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout.hash)
    .uniq()
    .value();

  const blocksWithInputs = await blockModel.find({'txs.hash': {$in: inputHashes}}, {
    'txs.outputs.value': 1,
    'txs.hash': 1
  });

  return txs.map(tx => {
    tx.outputs = tx.outputs.map(output => {
      return {
        address: output.address,
        value: output.value,
      };
    });

    const txsWithInputs = _.chain(blocksWithInputs)
      .map(block => block.txs)
      .flattenDeep()
      .value();

    tx.inputs = tx.inputs.map(input => {

      input.value = _.chain(txsWithInputs)
        .find({hash: input.prevout.hash})
        .get(`outputs.${input.prevout.index}.value`, 0)
        .value();

      return input;
    });

    return {
      value: tx.value,
      hash: tx.hash,
      fee: tx.fee,
      minFee: tx.minFee,
      inputs: tx.inputs,
      outputs: tx.outputs
    };

  });
};
