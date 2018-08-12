/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const AbstractNetworkClass = require('./abstract/AbstractNetworkClass'),
  bcc = require('bitcoincashjs');

class BCC extends AbstractNetworkClass {

  constructor() {
    super({
      type: 'bcc',
      keyPrefix: {
        privkey: 0x80,
        xpubkey: 0x0488b21e,
        xprivkey: 0x0488ade4,
        xpubkey58: 'xpub',
        xprivkey58: 'xprv',
        coinType: 0
      },
      addressPrefix: {
        pubkeyhash: 0x00,
        scripthash: 0x05,
        witnesspubkeyhash: 0x06,
        witnessscripthash: 0x0a,
        bech32: 'bc'
      }
    });

  }

  getAllAddressForms(address) {
    const types = {
      bitpay: null,
      cash: address,
      legacy: null
    };

    try {
      const decoded = bcc.Address.fromString(address);
      types.bitpay = decoded.toString(bcc.Address.BitpayFormat);
      types.cash = decoded.toString(bcc.Address.CashAddrFormat);
      types.legacy = decoded.toString();

      return types;
    } catch (e) {
      return types;
    }
  }

}

module.exports = new BCC();
