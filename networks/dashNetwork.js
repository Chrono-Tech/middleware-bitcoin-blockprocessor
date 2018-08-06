/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */
const dash = {};

dash.type = 'dash';

dash.keyPrefix = {
  privkey: 204,
  xpubkey: 0x0488B21E,
  xprivkey: 0x0488ADE4,
  xpubkey58: 'tpub',
  xprivkey58: 'tprv',
  coinType: 1
};

dash.addressPrefix = {
  pubkeyhash: 76,
  scripthash: 16,
  witnesspubkeyhash: 0x03,
  witnessscripthash: 0x28,
  bech32: 'tb'
};

dash.deploys = [];

dash.checkpointMap = [];

module.exports = dash;
