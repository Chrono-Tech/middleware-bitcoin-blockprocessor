const Promise = require('bluebird'),
  ipc = require('node-ipc'),
  config = require('../../config');

module.exports = async (method, params) => {

  Object.assign(ipc.config, {
    id: Date.now(),
    socketRoot: config.bitcoin.ipcPath,
    retry: 1500,
    sync: true,
    silent: true,
    unlink: false,
    maxRetries: 3
  });

  await new Promise(res => {
    ipc.connectTo(config.bitcoin.ipcName, () => {
      ipc.of[config.bitcoin.ipcName].on('connect', res);
    });
  });

  let response = await new Promise((res, rej) => {
    ipc.of[config.bitcoin.ipcName].on('message', data => data.error ? rej(data.error) : res(data.result));
    ipc.of[config.bitcoin.ipcName].emit('message', JSON.stringify({method: method, params: params})
    );
  });

  ipc.disconnect(config.bitcoin.ipcName);

  return response;
};
