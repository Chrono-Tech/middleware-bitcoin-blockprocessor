/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  txModel = require('../models/txModel'),
  Promise = require('bluebird'),
  exec = require('../services/execService'),
  TX = require('bcoin/lib/primitives/tx'),
  _ = require('lodash');

/**
 * @service
 * @description transform tx to full object
 * @param txs - original block's array of tx objects
 * @returns {Promise.<*>}
 */


module.exports = async (txs) => {

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
    });
  });

  txsWithInputs = _.flattenDeep(txsWithInputs);

  let missedInputs = _.chain(txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout.hash)
    .uniq()
    .reject(hash => _.find(txsWithInputs, input => input.hash === hash) || hash === '0000000000000000000000000000000000000000000000000000000000000000')
    .value();

  missedInputs = await Promise.map(missedInputs, async missedInputHash => {
    let rawtx = await exec('getrawtransaction', [missedInputHash]);
    let tx = TX.fromRaw(rawtx, 'hex').toJSON();
    return _.pick(tx, ['hash', 'inputs', 'outputs']);
  }, {concurrency: 1000});

  txsWithInputs.push(...missedInputs);

  txs = txs.map(tx => {
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

    const inputAmount = _.chain(tx.inputs)
      .map(input => input.value)
      .sum()
      .defaults(0)
      .value();

    const outputAmount = _.chain(tx.outputs)
      .map(output => output.value)
      .sum()
      .value();

    return {
      value: tx.value,
      hash: tx.hash,
      fee: inputAmount <= 0 ? 0 : inputAmount - outputAmount,
      inputs: tx.inputs,
      outputs: tx.outputs
    };

  });

  return txs;

};
