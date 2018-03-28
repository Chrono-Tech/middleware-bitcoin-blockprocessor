const Promise = require('bluebird'),
  blockModel = require('../models/blockModel'),
  _ = require('lodash');

module.exports = async (block) => {

  const toCreate = _.chain(block.txs)
    .map(tx =>
      tx.outputs.map((output, index) =>
        _.merge(output, {hash: tx.hash, index: index, blockNumber: block.number})
      )
    )
    .flattenDeep()
    .value();

  let outs = await Promise.map(toCreate, async output => {
    let isSpent = await blockModel.count({
      number: output.blockNumber,
      'txs.inputs.prevout.hash': output.hash,
      'txs.inputs.prevout.index': output.index
    });
    return isSpent ? null : output;
  });

  return _.compact(outs);

};
