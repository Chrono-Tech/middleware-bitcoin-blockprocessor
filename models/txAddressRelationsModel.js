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
    id: {type: String, id: true, generated: false},
    address: {type: String},
    txIndex: {type: Number},
    type: {type: Number},
    blockNumber: {type: Number}
  }, {
    indexes: {
      tx_address_relation_address_index: {address: 1},
      tx_address_relation_block_number_index: {blockNumber: 1},
      tx_address_relation_tx_index_index: {txIndex: 1}
    }
  });
};