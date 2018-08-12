/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const AbstractNetworkClass = require('./abstract/AbstractNetworkClass');

class BTG extends AbstractNetworkClass {

  constructor() {
    super('btg');

    this.setKeyPrefix({
      privkey: 0x80,
      xpubkey: 0x0488b21e,
      xprivkey: 0x0488ade4,
      xpubkey58: 'xpub',
      xprivkey58: 'xprv',
      coinType: 0
    });

    this.setAddressPrefix({
      pubkeyhash: 0x00,
      scripthash: 0x05,
      witnesspubkeyhash: 0x06,
      witnessscripthash: 0x0a,
      bech32: 'bc'
    });

  }

}

module.exports = new BTG();
