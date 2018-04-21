const Promise = require('bluebird'),
  _ = require('lodash'),
  ipc = require('node-ipc');

module.exports = async (method, params, name) => {

  const ipcInstance = new ipc.IPC;

  Object.assign(ipcInstance.config, {
    id: `${Date.now()}${_.random(Math.pow(2, 32))}`,
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
