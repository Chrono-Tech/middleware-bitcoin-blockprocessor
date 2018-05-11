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
  return ds.data.define(`${config.storage.data.collectionPrefix}TxOutputs`, {
    txHash: {type: String, unique: true},
    index: {type: Number},
    spent: {type: Boolean, default: false},
    value: {type: String},
    address: {type: String}
  }, {
    indexes: {
      tx_outputs_tx_hash_index: {txHash: 1},
      tx_outputs_spent_index: {spent: 1},
      tx_outputs_address_index: {address: 1}
    }
  });
};