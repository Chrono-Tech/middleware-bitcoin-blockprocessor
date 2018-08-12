/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const requireAll = require('require-all'),
  _ = require('lodash'),
  networks = requireAll({
    dirname: __dirname,
    filter: /(.+Network)\.js$/
  });

/**
 * @factory
 * @description modify bcoin networks, by adding bcc and test bcc networks definitions
 * specified routing key - i.e. event param
 * @param currentNetworkType - network name
 * @returns {Promise.<void>}
 */

module.exports = _.chain(networks)
  .values()
  .transform((result, item) => result[item.type] = item, {})
  .value();
