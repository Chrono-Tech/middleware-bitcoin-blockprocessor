/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const requireAll = require('require-all'),
  _ = require('lodash'),
  bcoinNetworks = require('bcoin/lib/protocol/networks'),
  networks = requireAll({
    dirname: __dirname,
    filter: /(.+Network)\.js$/,
    recursive: true
  });

/**
 * @factory
 * @description modify bcoin networks, by adding bcc and test bcc networks definitions
 * specified routing key - i.e. event param
 * @param currentNetworkType - network name
 * @returns {Promise.<void>}
 */

module.exports = (currentNetworkType) => {

  let customNetwork = _.chain(networks)
    .values()
    .find({type: currentNetworkType})
    .value();

  if (!customNetwork)
    return;

  bcoinNetworks.types = _.union([currentNetworkType], bcoinNetworks.types);
  bcoinNetworks[currentNetworkType] = customNetwork;

};
