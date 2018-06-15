/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const _ = require('lodash'),
  models = require('../models');

/**
 * @service
 * @description filter txs by registered addresses
 * @param txs - an array of txs
 * @returns {Promise.<*>}
 */


module.exports = async txs => {

  let addresses = _.chain(txs)
    .map(tx =>
      _.union(tx.inputs, tx.outputs)
    )
    .flattenDeep()
    .map(i => i.address || '')
    .compact()
    .uniq()
    .chunk(100)
    .value();

  let filteredByChunks = await Promise.all(addresses.map(chunk =>
    models.accountModel.find({
      address: {
        $in: chunk
      },
      isActive: {
        $ne: false
      }
    })
  ));

  return _.chain(filteredByChunks)
    .flattenDeep()
    .map(account => ({
      address: account.address,
      txs: _.chain(txs)
        .filter(tx =>
          _.chain(tx.inputs)
            .union(tx.outputs)
            .flattenDeep()
            .map(i => (i.address || '').toString())
            .includes(account.address)
            .value()
        )
        .map(tx => tx.hash)
        .value()
    })
    )
    .value();

};
