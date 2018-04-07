/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  ipc = require('node-ipc'),
  config = require('../../config');

module.exports = async (method, params) => {

  Object.assign(ipc.config, {
    id: Date.now(),
    socketRoot: config.node.ipcPath,
    retry: 1500,
    sync: true,
    silent: true,
    unlink: false,
    maxRetries: 3
  });

  await new Promise((res, rej) => {
    ipc.connectTo(config.node.ipcName, () => {
      ipc.of[config.node.ipcName].on('connect', res);
      ipc.of[config.node.ipcName].on('disconnect', ()=>rej(new Error('CONNECTION ERROR')));
    });
  });

  let response = await new Promise((res, rej) => {
    ipc.of[config.node.ipcName].on('message', data => data.error ? rej(data.error) : res(data.result));
    ipc.of[config.node.ipcName].emit('message', JSON.stringify({method: method, params: params})
    );
  });

  ipc.disconnect(config.node.ipcName);

  return response;
};
