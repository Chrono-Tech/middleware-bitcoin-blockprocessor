/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bitcoin = require('bitcoinjs-lib');
const AbstractNetworkClass = require('./abstract/AbstractNetworkClass');

class LITECOIN extends AbstractNetworkClass {

  constructor() {
    super({
      type: 'litecoin',
      keyPrefix: {
        privkey: 0xb0,
        xpubkey: 0x0488b21e,
        xprivkey: 0x0488ade4,
        xprivkey58: 'xprv',
        xpubkey58: 'xpub',
        coinType: 0
      },
      addressPrefix: {
        pubkeyhash: 0x30,
        scripthash: 0x32,
        witnesspubkeyhash: 0x06,
        witnessscripthash: 0x0a,
        bech32: 'lc'
      }
    });
  }

  getAllAddressForms(address) {
    const types = {
      legacy: null,
      new: address
    };

    try {
      const decoded = bitcoin.address.fromBase58Check(address);
      types.legacy = bitcoin.address.toBase58Check(decoded.hash, 50);
      types.new = bitcoin.address.toBase58Check(decoded.hash, 5);

      return types;
    } catch (e) {
      return types;
    }
  }

}

module.exports = new LITECOIN();
