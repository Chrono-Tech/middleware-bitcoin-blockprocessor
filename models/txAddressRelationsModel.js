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

const mongoose = require('mongoose'),
  config = require('../config');

const TxAddressRelation = new mongoose.Schema({
  _id: {type: String},
  address: {type: String},
  txIndex: {type: Number},
  type: {type: Number},
  blockNumber: {type: Number}
});

TxAddressRelation.index({address: 1});
TxAddressRelation.index({blockNumber: 1});
TxAddressRelation.index({txIndex: 1});


module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}TxAddressRelation`, TxAddressRelation);
