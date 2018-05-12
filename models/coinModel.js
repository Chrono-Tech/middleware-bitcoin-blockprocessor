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
    outputHash: {type: String},
    outputIndex: {type: Number},
    inputHash: {type: String},
    inputIndex: {type: Number},
    value: {type: String},
    address: {type: String}
  }, {
    indexes: {
      coin_outputs_hash_index_index: {keys: {outputHash: 1, outputIndex: 1}, options: {unique: true}},
      coin_inputs_hash_index_index: {keys: {inputHash: 1, inputIndex: 1}},
      coin_address_index: {address: 1}
    }
  });
};