/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const _ = require('lodash'),
  Promise = require('bluebird'),
  config = require('../config'),
  networks = require('middleware-common-components/factories/btcNetworks'),
  network = networks[config.node.network],
  getFullTxFromCache = require('../utils/txs/getFullTxFromCache'),
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
    .map(address =>
      _.chain(network.getAllAddressForms(address))
        .values()
        .compact()
        .value()
    )
    .flattenDeep()
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

  let relations = _.chain(filteredByChunks)
    .flattenDeep()
    .map(account => ({
        address: account.address,
        txs: _.chain(txs)
          .filter(tx =>
            _.chain(tx.inputs)
              .union(tx.outputs)
              .flattenDeep()
              .map(i => i.address || '')
              .compact()
              .uniq()
              .map(address =>
                _.chain(network.getAllAddressForms(address))
                  .values()
                  .compact()
                  .value()
              )
              .flattenDeep()
              .includes(account.address)
              .value()
          )
          .map(tx => tx.hash)
          .value()
      })
    )
    .value();


  for (let relation of relations)
    relation.txs = await Promise.map(relation.txs, async txHash => await getFullTxFromCache(txHash));

  return relations;

};
