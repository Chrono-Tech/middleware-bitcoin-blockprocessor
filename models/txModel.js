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

const TX = new mongoose.Schema({
  blockNumber: {type: Number, index: true, required: true, default: -1},
  hash: {type: String, index: true, unique: true},
  inputs: [{
    prevout: {
      hash: {type: String, index: true},
      index: {type: Number, index: true}
    },
    address: {type: String, index: true},
    value: {type: Number},
  }],
  outputs: [{
    value: {type: Number},
    address: {type: String, index: true}
  }],
  timestamp: {type: Number, required: true, index: true, default: Date.now},
  network: {type: String}
});

module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}TX`, TX);
