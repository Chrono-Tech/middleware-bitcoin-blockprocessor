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
  return ds.data.define(`${config.storage.data.collectionPrefix}TxInputs`, {
    txHash: {type: String},
    index: {type: Number},
    prevoutIndex: {type: Number},
    prevoutHash: {type: String},
    value: {type: String},
    address: {type: String}
  }, {
    indexes: {
      tx_inputs_tx_hash_index: {txHash: 1},
      tx_inputs_prevout_index: {keys: {prevoutIndex: 1, prevoutHash: 1}, options: {unique: true}},
      tx_inputs_address_index: {address: 1}
    }
  });
};