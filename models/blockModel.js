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
  return ds.data.define(`${config.storage.data.collectionPrefix}Blocks`, {
    id: {type: Number, id: true, generated: false},
    number: {type: Number},
    hash: {type: String},
    timestamp: {type: Number, required: true},
    bits: {type: Number, required: true},
    merkleRoot: {type: String, required: true},
    created: {type: Date, required: true, default: Date.now}
  }, {
    indexes: {
      block_number_index: {number: 1},
      block_hash_index: {hash: 1},
      block_timestamp_index: {timestamp: 1}
    }
  });

};