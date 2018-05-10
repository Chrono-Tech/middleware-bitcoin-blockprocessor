/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
require('dotenv').config();

const _ = require('lodash');

const getDefaultProvider = () => {
  const httpUri = process.env.CONNECTION_URI || `${process.env.IPC_PATH || '/tmp/'}${process.env.IPC_NAME || 'bitcoin'}`;
  const socketUri = process.env.ZMQ || 'tcp://127.0.0.1:43332';
  return `${httpUri}@${socketUri}`;
};

module.exports = () => {
  return _.chain(process.env.PROVIDERS || getDefaultProvider())
    .split(',')
    .map(provider => {
      const data = provider.split('@');
      return {
        http: data[0].trim(),
        ws: data[1].trim()
      };
    })
    .value();
};