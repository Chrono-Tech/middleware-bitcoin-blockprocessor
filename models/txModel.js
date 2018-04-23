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
      hash: {type: String},
      index: {type: Number}
    },
    address: {type: String, index: true},
    value: {type: Number},
  }],
  outputs: [{
    spent: {type: Boolean, default: false},
    value: {type: Number},
    address: {type: String, index: true}
  }],
  fee: {type: Number},
  timestamp: {type: Number, required: true, index: true, default: Date.now}
});

TX.index({'inputs.prevout.hash': 1, 'inputs.prevout.index': 1});
TX.index({'outputs.address': 1, 'outputs.spent': 1});


module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}TX`, TX);
