/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const mongoose = require('mongoose'),
  config = require('../config'),
  messages = require('middleware-common-components/factories/messages/addressMessageFactory');

/** @model accountModel
 *  @description account model - represents an bitcoin account
 */
const Account = new mongoose.Schema({
  address: {
    type: String,
    unique: true,
    required: true,
    validate: [a => /^[a-km-zA-HJ-NP-Z1-9]{25,36}$/.test(a), messages.wrongAddress]
  },
  balances: {
    confirmations0: {type: Number, default: 0, required: true},
    confirmations3: {type: Number, default: 0, required: true},
    confirmations6: {type: Number, default: 0, required: true}
  },
  isActive: {type: Boolean, required: true, default: true},
  lastBlockCheck: {type: Number, default: 0, required: true},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = ()=>
  mongoose.accounts.model(`${config.mongo.accounts.collectionPrefix}Account`, Account);
