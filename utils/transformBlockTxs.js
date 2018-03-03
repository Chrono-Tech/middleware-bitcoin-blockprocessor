const _ = require('lodash'),
  config = require('../config'),
  Promise = require('bluebird'),
  Network = require('bcoin/lib/protocol/network'),
  blockModel = require('../models/blockModel'),
  network = Network.get(config.node.network);

/**
 * @service
 * @description transform tx to full object
 * @param node - bcoin full node
 * @param txs - original block's array of tx objects
 * @returns {Promise.<*>}
 */


module.exports = async (node, txs) => {

  txs = txs.map(tx => tx.getJSON(network));

  let fetchedInputs = _.chain(txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => _.get(input, 'prevout.hash'))
    .compact()
    .uniq()
    .chunk(200)
    .value();

  fetchedInputs = await Promise.map(fetchedInputs, async inputs =>
    await blockModel.aggregate([
      {$match: {'txs.hash': {$in: inputs}}},
      {$unwind: '$txs'},
      {$match: {'txs.hash': {$in: inputs}}},
      {$group: {_id: 'a', txs: {$addToSet: '$txs'}}}
    ]), {concurrency: 4});

  fetchedInputs = _.chain(fetchedInputs).map(inputs => _.get(inputs, '0.txs', [])).flattenDeep().value();
  fetchedInputs = _.union(fetchedInputs, txs);

  return await Promise.map(txs, async tx => {

    let inputs = await Promise.map(tx.inputs, async input => {

      if (!_.has(input, 'prevout.hash') || !_.has(input, 'prevout.index') || !input.address)
        return {
          prevout: input.prevout,
          address: input.address,
          value: 0
        };

      const fetchedInput = _.find(fetchedInputs, {hash: input.prevout.hash});

      if (!fetchedInput) {
        const tx = await node.rpc.getRawTransaction([input.prevout.hash, true]).catch(() => null);
        if (!tx)
          return null;

        const block = await node.rpc.getBlock([tx.blockhash]).catch(() => null);
        return {block: {number: block.height}};
      }

      return {
        prevout: input.prevout,
        address: input.address,
        value: _.get(fetchedInput, `outputs.${input.prevout.index}.value`, 0)
      };
    });

    if (inputs.includes(null) || _.find(inputs, input=>_.has(input, 'block.number')))
      return Promise.reject({code: 1});

    inputs = _.chain(tx.inputs)
      .map(txInput =>
        _.find(inputs, input => _.isEqual(input.prevout, txInput.prevout))
      )
      .value();

    return {
      value: tx.value,
      hash: tx.hash,
      fee: tx.fee,
      minFee: tx.minFee,
      inputs: _.compact(inputs),
      outputs: tx.outputs.map(output => ({
        address: output.address,
        value: output.value
      }))
    };

  })

};
