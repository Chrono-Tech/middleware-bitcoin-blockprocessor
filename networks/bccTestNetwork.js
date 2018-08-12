/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const AbstractNetworkClass = require('./abstract/AbstractNetworkClass'),
  bcc = require('bitcoincashjs');



class BCCTEST extends AbstractNetworkClass {

  constructor() {
    super({
      type: 'bcctest',
      keyPrefix: {
        privkey: 0xef,
        xpubkey: 0x043587cf,
        xprivkey: 0x04358394,
        xpubkey58: 'tpub',
        xprivkey58: 'tprv',
        coinType: 1
      },
      addressPrefix: {
        pubkeyhash: 0x6f,
        scripthash: 0xc4,
        witnesspubkeyhash: 0x03,
        witnessscripthash: 0x28,
        bech32: 'tb'
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

module.exports = new BCCTEST();
