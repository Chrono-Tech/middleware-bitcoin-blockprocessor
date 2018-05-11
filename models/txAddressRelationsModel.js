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
    hash: {type: String},
    type: {type: Number},
    blockNumber: {type: Number}
  }, {
    indexes: {
      tx_address_relation_address_index: {address: 1},
      tx_address_relation_hash_address_index: {keys: {hash: 1, address: 1}, options: {unique: true}},
      tx_address_relation_type_index: {type: 1},
      tx_address_relation_block_number_index: {blockNumber: 1}
    }
  });
};