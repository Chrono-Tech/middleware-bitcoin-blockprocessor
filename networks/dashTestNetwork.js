/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const AbstractNetworkClass = require('./abstract/AbstractNetworkClass');

class DASHTEST extends AbstractNetworkClass {

  constructor() {
    super({
      type: 'dashtest',
      keyPrefix: {
        privkey: 239,
        xpubkey: 0x043587cf,
        xprivkey: 0x04358394,
        xpubkey58: 'tpub',
        xprivkey58: 'tprv',
        coinType: 1
      },
      addressPrefix: {
        pubkeyhash: 140,
        scripthash: 19,
        witnesspubkeyhash: 0x03,
        witnessscripthash: 0x28,
        bech32: 'tb'
      }
    });
  }

}

module.exports = new DASHTEST();
