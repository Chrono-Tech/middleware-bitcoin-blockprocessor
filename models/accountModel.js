const mongoose = require('mongoose'),
  config = require('../config'),
  messages = require('../factories/messages/addressMessageFactory');

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
  lastBlockCheck: {type: Number, default: 0, required: true},
  lastTxs: {type: mongoose.Schema.Types.Mixed, default: [], required: true},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = mongoose.model(`${config.mongo.accounts.collectionPrefix}Account`, Account);
