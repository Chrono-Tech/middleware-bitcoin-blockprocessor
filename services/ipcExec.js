const Promise = require('bluebird'),
  config = require('../config'),
  _ = require('lodash'),
  ipc = require('node-ipc');

const ipcInstance = new ipc.IPC;

Object.assign(ipcInstance.config, {
  id: `${Date.now()}${_.random(Math.pow(2, 32))}`,
  socketRoot: config.node.ipcPath,
  retry: 1500,
  sync: true,
  silent: true,
  unlink: true,
  maxRetries: 3
});

async function createConnection() {
  return await new Promise((res, rej) => {
    ipcInstance.connectTo(config.node.ipcName, () => {
      ipcInstance.of[config.node.ipcName].on('connect', () => res(this));
      ipcInstance.of[config.node.ipcName].on('error', ()=>rej(new Error('CONNECTION ERROR')));
    });
  });
}

async function executor(method, params) {
  let response = await new Promise((res, rej) => {
    ipcInstance.of[config.node.ipcName].on('message', async data => {
      if (!data.error)
        return res(data.result);

      ipcInstance.disconnect(config.node.ipcName);
      await Promise.delay(500);
      rej(data.error);

    });
    ipcInstance.of[config.node.ipcName].emit('message', JSON.stringify({method: method, params: params}));
    ipcInstance.of[config.node.ipcName].on('error', async err => {
      ipcInstance.disconnect(config.node.ipcName);
      await Promise.delay(500);
      rej(err);
    });
  });

  ipcInstance.disconnect(config.node.ipcName);

  return response;
}

function closeConnection() {
  ipcInstance.disconnect(config.node.ipcName);
}

module.exports = {
  createConnection,
  executor,
  closeConnection
};