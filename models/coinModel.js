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

const Coin = new mongoose.Schema({
  _id: {type: String},
  outputBlock: {type: Number},
  outputTxIndex: {type: Number},
  outputIndex: {type: Number},
  inputBlock: {type: Number},
  inputTxIndex: {type: Number},
  inputIndex: {type: Number},
  value: {type: String},
  address: {type: String}
}, {_id: false});

Coin.index({outputBlock: 1, outputTxIndex: 1, outputIndex: 1});
Coin.index({inputBlock: 1, inputTxIndex: 1, inputIndex: 1});
Coin.index({address: 1});


module.exports = mongoose.model(`${config.mongo.data.collectionPrefix}Coin`, Coin);
