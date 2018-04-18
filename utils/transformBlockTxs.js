/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  txModel = require('../models/txModel'),
  Promise = require('bluebird'),
  ipcExec = require('../services/ipcExec'),
  Network = require('bcoin/lib/protocol/network'),
  TX = require('bcoin/lib/primitives/tx'),
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
    });
  });

  txsWithInputs = _.flattenDeep(txsWithInputs);


  let missedInputs = _.chain(txs)
    .map(tx => tx.inputs)
    .flattenDeep()
    .map(input => input.prevout.hash)
    .uniq()
    .reject(hash=> _.find(txsWithInputs, input=>input.hash === hash) || hash === '0000000000000000000000000000000000000000000000000000000000000000')
    .value();

  missedInputs = await Promise.map(missedInputs, async missedInputHash=>{
    let rawtx = await ipcExec('getrawtransaction', [missedInputHash]);
    return TX.fromRaw(rawtx, 'hex').toJSON();
  });

  txs = txs.map(tx => {
    tx.outputs = tx.outputs.map(output => {
      return {
        address: output.address,
        value: output.value,
      };
    });

    tx.inputs = tx.inputs.map(input => {
      input.value = _.chain(txsWithInputs)
        .union(missedInputs)
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

  return txs;

};
