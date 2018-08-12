/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const AbstractNetworkClass = require('./abstract/AbstractNetworkClass');

class BTGTEST extends AbstractNetworkClass {

  constructor() {
    super('btgtest');

    this.setKeyPrefix({
      privkey: 0xef,
      xpubkey: 0x043587cf,
      xprivkey: 0x04358394,
      xpubkey58: 'tpub',
      xprivkey58: 'tprv',
      coinType: 1
    });

    this.setAddressPrefix({
      pubkeyhash: 0x6f,
      scripthash: 0xc4,
      witnesspubkeyhash: 0x03,
      witnessscripthash: 0x28,
      bech32: 'tb'
    });

  }

}

module.exports = new BTGTEST();
