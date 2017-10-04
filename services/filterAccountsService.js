const _ = require('lodash'),
  accountModel = require('../models/accountModel'),
  config = require('../config'),
  Network = require('bcoin/lib/protocol/network');

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */


module.exports = async block => {

  let network = Network.get(config.bitcoin.network);

  let addresses = _.chain(block.txs)
    .map(tx => {
      tx = tx.getJSON(network);
      return _.union(tx.inputs, tx.outputs);
    })
    .flattenDeep()
    .map(i => i.address || '')
    .compact()
    .uniq()
    .chunk(100)
    .value();

  let filteredByChunks = await Promise.all(addresses.map(chunk =>
    accountModel.find({address: {$in: chunk}})
  ));

  return _.chain(filteredByChunks)
    .flattenDeep()
    .map(account => ({
      address: account.address,
      txs: _.chain(block.txs)
        .filter(tx => {
          tx = tx.getJSON(network);
          return _.chain(tx.inputs)
            .union(tx.outputs)
            .flattenDeep()
            .map(i => (i.address || '').toString())
            .includes(account.address)
            .value();
        })
        .map(tx => tx.toJSON().hash)
        .value()
    })
    )
    .value();

};
