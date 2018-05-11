/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const config = require('../config');

module.exports = (ds) => {
  return ds.accounts.define(`${config.storage.accounts.collectionPrefix}Accounts`, {
    address: {type: String, unique: true, required: true},
    balance0: {type: Number, default: 0},
    balance3: {type: Number, default: 0},
    balance6: {type: Number, default: 0},
    isActive: {type: Boolean, required: true, default: true},
    lastBlockCheck: {type: Number, default: 0, required: true},
    created: {type: Date, required: true, default: Date.now}
  });

};