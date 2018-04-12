const Promise = require('bluebird'),
  ipc = require('node-ipc'),
  config = require('../../config');

  Object.assign(ipc.config, {
    id: Date.now(),
    socketRoot: config.node.ipcPath,
    retry: 1500,
    sync: true,
    silent: true,
    unlink: false,
    maxRetries: 3
  });

async function createConnection() {
  return await new Promise((res, rej) => {
      ipc.connectTo(config.node.ipcName, () => {
      ipc.of[config.node.ipcName].on('connect', () => res(this));
      ipc.of[config.node.ipcName].on('disconnect', ()=>rej(new Error('CONNECTION ERROR')));
    });
  })
}

async function executor(method, params) {
    let response = await new Promise((res, rej) => {
    ipc.of[config.node.ipcName].on('message', data => data.error ? rej(data.error) : res(data.result));
    ipc.of[config.node.ipcName].emit('message', JSON.stringify({method: method, params: params})
    );
  })

  ipc.disconnect(config.node.ipcName);

  return response;
}

module.exports = {
  createConnection,
  executor
}
