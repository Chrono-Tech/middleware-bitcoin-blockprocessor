/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  buildCoins = require('../../utils/coins/buildCoins'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addUnconfirmedTx'});

/**
 * @function
 * @description add unconfirmed tx to cache
 * @param tx - unconfirmed transaction
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

  tx = _.omit(tx, ['inputs', 'outputs']);

  log.info(`inserting unconfirmed tx ${tx._id}`);
  await models.txModel.create(tx);

  log.info(`inserting unconfirmed ${coins.length} coins`);
  if (coins.length) {
    let bulkOps = coins.map(coin => ({
      updateOne: {
        filter: {_id: coin._id},
        update: {$set: coin},
        upsert: true
      }
    }));

    await models.coinModel.bulkWrite(bulkOps);
  }

};
