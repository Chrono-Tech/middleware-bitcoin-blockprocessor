const Network = require('bcoin/lib/protocol/network');

class AbstractNetworkClass extends Network {

  constructor(options) {
    options.deploys = [];
    options.checkpointMap = [];
    super(options);
  }

  getAllAddressForms(address) {
    return {
      legacy: null,
      new: address
    };
  }

}


module.exports = AbstractNetworkClass;