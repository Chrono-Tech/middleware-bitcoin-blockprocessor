/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  config = require('../config'),
  uniqid = require('uniqid'),
  ipc = require('node-ipc');

const callbacks = {};

const ipcInstance = new ipc.IPC;

Object.assign(ipcInstance.config, {
  id: uniqid(),
  socketRoot: config.node.ipcPath,
  retry: 1500,
  sync: false,
  silent: true,
  unlink: true
});

ipcInstance.connectTo(config.node.ipcName);

ipcInstance.of[config.node.ipcName].on('message', async data => {
  if (!data.error) {
    callbacks[data.id](null, data.result);
    delete callbacks[data.id];
    return;
  }

  callbacks[data.id](data.error);
  delete callbacks[data.id];
});

ipcInstance.of[config.node.ipcName].on('error', async err => {
  for (let key of Object.keys(callbacks)) {
    callbacks[key](err);
    delete callbacks[key];
  }
});

module.exports = async (method, params) => {
  return new Promise((res, rej) => {
    const requestId = uniqid();
    callbacks[requestId] = (err, result) => err ? rej(err) : res(result);

    ipcInstance.of[config.node.ipcName].emit('message', JSON.stringify({
      method: method,
      params: params,
      id: requestId
    }));
  })
};
