/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */
const dashtestnet = {};

dashtestnet.type = 'dashtest';

dashtestnet.keyPrefix = {
  privkey: 239,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

dashtestnet.addressPrefix = {
  pubkeyhash: 140,
  scripthash: 19,
  witnesspubkeyhash: 0x03,
  witnessscripthash: 0x28,
  bech32: 'tb'
};

dashtestnet.deploys = [];

dashtestnet.checkpointMap = [];

module.exports = dashtestnet;
