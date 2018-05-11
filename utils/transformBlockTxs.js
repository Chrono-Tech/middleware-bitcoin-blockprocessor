/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config'),
  _ = require('lodash');

/**
 * @service
 * @description transform tx to full object
 * @param txs - original block's array of tx objects
 * @returns {Promise.<*>}
 */


module.exports = txs => {

  txs = txs.map(tx => {
    tx.outputs = tx.outputs.map((output, index) => {
      return {
        address: output.address,
        value: output.value,
        index: index
      };
    });

    tx.inputs = _.chain(tx.inputs)
      .reject(input=>input.prevout.hash === '0000000000000000000000000000000000000000000000000000000000000000')
      .map((input, index) => {
        input.index = index;
        return input;
      })
      .value();

    return {
      value: tx.value,
      hash: tx.hash,
      inputs: tx.inputs,
      outputs: tx.outputs
    };

  });

  return txs;

};
