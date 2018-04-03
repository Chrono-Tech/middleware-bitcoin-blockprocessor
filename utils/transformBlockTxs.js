const config = require('../config'),
  blockModel = require('../models/blockModel'),
  txModel = require('../models/txModel'),
  Promise = require('bluebird'),
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

  const inputHashesChunks = _.chain(txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout.hash)
    .uniq()
    .chunk(100)
    .value();

  let txsWithInputs = await Promise.map(inputHashesChunks, async inputHashesChunk => {
    return await txModel.find({hash: {$in: inputHashesChunk}}, {
      'outputs.value': 1,
      'hash': 1
    })
  });

  txsWithInputs = _.flattenDeep(txsWithInputs);

  return txs.map(tx => {
    tx.outputs = tx.outputs.map(output => {
      return {
        address: output.address,
        value: output.value,
      };
    });

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
