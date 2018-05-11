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
  return ds.data.define(`${config.storage.data.collectionPrefix}Txs`, {
    blockNumber: {type: Number, required: true, default: -1},
    hash: {type: String},
    timestamp: {type: Date, required: true, default: Date.now},
    transactionIndex: {type: Number},
    created: {type: Date, required: true, default: Date.now}
  }, {
    indexes: {
      tx_block_number_index: {blockNumber: 1},
      tx_timestamp_index: {timestamp: 1},
      tx_hash_index: {keys: {hash: 1}, options: {unique: true}},

    }
  });
};