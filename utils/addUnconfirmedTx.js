/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  buildCoins = require('../utils/buildCoins'),
  txModel = require('../models/txModel'),
  coinModel = require('../models/coinModel'),
  buildRelations = require('../utils/buildRelations'),
  txAddressRelationsModel = require('../models/txAddressRelationsModel'),
  log = bunyan.createLogger({name: 'app.utils.addUnconfirmedTx'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - prepared block with full txs
 * @param type - type of arrived block (is block from cache or it's the last block)
 * @returns {Promise.<*>}
 */

module.exports = async (tx) => {

  tx = {
    _id: tx.hash,
    index: tx.index,
    blockNumber: -1,
    timestamp: Date.now(),
    inputs: tx.inputs,
    outputs: tx.outputs
  };

  const coins = buildCoins([tx]);
  const addressRelations = buildRelations(coins);

  tx = _.omit(tx, ['inputs', 'outputs']);

  log.info('inserting unconfirmed tx');
  await txModel.insertMany([tx]);

  log.info(`inserting unconfirmed ${coins.length} coins`);
  if (coins.length)
    await coinModel.insertMany(coins, {ordered: false});

  log.info(`inserting unconfirmed ${addressRelations.length} relations`);
  if (addressRelations.length)
    await txAddressRelationsModel.insertMany(addressRelations, {ordered: false});

};
