/**
 * Mongoose model. Represents a block in eth
 * @module models/blockModel
 * @returns {Object} Mongoose model
 */

const mongoose = require('mongoose'),
  config = require('../config');

const Block = new mongoose.Schema({
  number: {type: Number, unique: true, index: true},
  hash: {type: String, unique: true, index: true},
  timestamp: {type: Number, required: true, index: true},
  txs: [{
    hash: {type: String, index: true},
    inputs: [{
      prevout:  {
        hash: {type: String, index: true},
        index: {type: Number}
      },
      value: {type: Number},
      address: {type: String, index: true}
    }],
    outputs: [{
      value: {type: Number},
      address: {type: String, index: true}
    }]
  }],
  network: {type: String},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}Block`, Block);
