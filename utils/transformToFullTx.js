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
 * @param tx - original tx object
 * @returns {Promise.<*>}
 */


module.exports = async (node, tx, unconfirmed = false) => {

  tx = tx.getJSON(network);

  let fetchedInputs = _.chain(tx).get('inputs', []).map(input => _.get(input, 'prevout.hash')).compact().value();
  fetchedInputs = await blockModel.aggregate([
    {$match: {'txs.hash': {$in: fetchedInputs}}},
    {$unwind: '$txs'},
    {$match: {'txs.hash': {$in: fetchedInputs}}},
    {$group: {_id: 'a', txs: {$addToSet: '$txs'}}}
  ]);
  fetchedInputs = _.get(fetchedInputs, '0.txs', []);

  let inputs = await Promise.map(tx.inputs, async input => {

    let txValue = 0;
    if (!_.has(input, 'prevout.hash') || !_.has(input, 'prevout.index'))
      return {
        prevout: input.prevout,
        address: input.address,
        value: txValue
      };

    const fetchedInput = _.find(fetchedInputs, {hash: input.prevout.hash});

    if (!fetchedInput) {
      const tx = await node.rpc.getRawTransaction([input.prevout.hash, true]).catch(() => null);
      if (!tx)
        return {
          prevout: input.prevout,
          address: input.address,
          value: 0
        };

      if (!unconfirmed) {
        const tip = await node.chain.db.getTip();
        const height = tip.height - tx.confirmations;
        const currentBlock = await blockModel.findOne({height: {$gt: height}});
        if (currentBlock) {
          console.log(tx.hash)
          console.log(currentBlock.number);
          return Promise.reject({code: 1, block: {height: height}});
        }
      }

      txValue = _.get(tx, `vout.${input.prevout.index}.value`, 0) * Math.pow(10, 8);
    } else {
      txValue = _.get(fetchedInput, `outputs.${input.prevout.index}.value`, 0);
    }

    return {
      prevout: input.prevout,
      address: input.address,
      value: txValue
    };
  }, {concurrency: 4});

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

};
