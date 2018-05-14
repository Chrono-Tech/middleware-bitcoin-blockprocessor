/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

/**
 * Mongoose model. Represents a block in eth
 * @module models/blockModel
 * @returns {Object} Mongoose model
 */

const config = require('../config');

module.exports = (ds) => {
  return ds.data.define(`${config.storage.data.collectionPrefix}Coin`, {
    id: {type: String, id: true, generated: false},
    outputBlock: {type: Number},
    outputTxIndex: {type: Number},
    outputIndex: {type: Number},
    inputBlock: {type: Number},
    inputTxIndex: {type: Number},
    inputIndex: {type: Number},
    value: {type: String},
    address: {type: String}
  }, {
    indexes: {
      coin_outputs_block_tx_index_index_index: {keys: {outputBlock: 1, outputTxIndex: 1, outputIndex: 1}},
      coin_inputs_block_tx_index_index_index: {keys: {inputBlock: 1, inputTxIndex: 1, inputIndex: 1}},
      coin_inputs_hash_index_index: {keys: {inputHash: 1, inputIndex: 1}},
      coin_address_index: {address: 1}
    }
  });
};