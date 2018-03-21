/**
 * Mongoose model. Represents a block in eth
 * @module models/blockModel
 * @returns {Object} Mongoose model
 */

const mongoose = require('mongoose'),
  config = require('../config');

const UTXO = new mongoose.Schema({
  blockNumber: {type: Number, index: true},
  hash: {type: String, index: true},
  value: {type: Number},
  index: {type: Number,index: true},
  address: {type: String, index: true},
  network: {type: String},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}UTXO`, UTXO);
