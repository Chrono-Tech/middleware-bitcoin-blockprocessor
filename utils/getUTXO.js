/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  txModel = require('../models/txModel'),
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
    let isSpent = await txModel.count({
      'inputs.prevout.hash': output.hash,
      'inputs.prevout.index': output.index
    });
    return isSpent ? null : output;
  });

  return _.compact(outs);

};
