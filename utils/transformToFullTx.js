const _ = require('lodash'),
  config = require('../config'),
  Promise = require('bluebird'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network);

/**
 * @service
 * @description transform tx to full object
 * @param node - bcoin full node
 * @param tx - original tx object
 * @returns {Promise.<*>}
 */


module.exports = async (node, tx) => {

  tx = tx.getJSON(network);
  const inputs = await Promise.map(tx.inputs, async input => {

    if (!_.has(input, 'prevout.hash') || !_.has(input, 'prevout.index'))
      return;


    const txInputs = input.type !== 'coinbase' ? await node.rpc.getRawTransaction([input.prevout.hash, true])
      .catch(()=>{}) : {}; //catch the case, when tx is not a transfer, but generated coin


    return {
      prevout: input.prevout,
      address: input.address,
      value: _.get(txInputs, `vout.${input.prevout.index}.value`, 0) * Math.pow(10, 8)
    };
  }, {concurrency: 4});

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

};
