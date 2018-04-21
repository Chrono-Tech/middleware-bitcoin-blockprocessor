/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  uniqid = require('uniqid'),
  sem = require('semaphore')(10),
  ipc = require('node-ipc');

const makeRequest = async (method, params, name) => {

  const ipcInstance = new ipc.IPC;

  Object.assign(ipcInstance.config, {
    id: uniqid(),
    retry: 1500,
    sync: true,
    silent: true,
    unlink: true,
    maxRetries: 3
  });

  await new Promise((res, rej) => {
    ipcInstance.connectTo(name, () => {
      ipcInstance.of[name].on('connect', res);
      ipcInstance.of[name].on('error', rej);
    });
  });

  let response = await new Promise((res, rej) => {
    ipcInstance.of[name].on('message', async data => {
      if (!data.error)
        return res(data.result);

      ipcInstance.disconnect(name);
      await Promise.delay(500);
      rej(data.error);

    });
    ipcInstance.of[name].emit('message', JSON.stringify({method: method, params: params}));
    ipcInstance.of[name].on('error', async err => {
      ipcInstance.disconnect(name);
      await Promise.delay(500);
      rej(err);
    });
  });

  ipcInstance.disconnect(name);

  return response;
};

module.exports = async (method, params) => {

  return new Promise((res, rej) => {
    sem.take(async () => {
      try {
        let response = await makeRequest(method, params);
        res(response);
      } catch (err) {
        rej(err);
      }
      sem.leave();
    });
  });

};
