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
  return ds.data.define(`${config.storage.data.collectionPrefix}TxAddressRelations`, {
    address: {type: String},
    txHash: {type: String},
    type: {type: Number},
    blockNumber: {type: Number}
  }, {
    indexes: {
      tx_address_relation_hash_address_index: {keys: {address: 1, txHash: 1}, options: {unique: true}},
      tx_address_relation_block_number_index: {blockNumber: 1}
    }
  });
};