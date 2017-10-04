const require_all = require('require-all'),
  _ = require('lodash'),
  bcoinNetworks = require('bcoin/lib/protocol/networks'),
  networks = require_all({
    dirname: __dirname,
    filter: /(.+Network)\.js$/,
    recursive: true
  });

module.exports = (currentNetworkType) => {

  let customNetwork = _.chain(networks)
    .values()
    .find({type: currentNetworkType})
    .value();

  if (!customNetwork)
  {return;}

  bcoinNetworks.types = _.union([currentNetworkType], bcoinNetworks.types);
  bcoinNetworks[currentNetworkType] = customNetwork;

};
