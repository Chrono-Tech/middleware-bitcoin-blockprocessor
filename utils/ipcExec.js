/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  path = require('path'),
  uniqid = require('uniqid'),
  ipc = require('node-ipc');

class ipcExec {
  constructor(uri) {
    this.ipcInstance = new ipc.IPC;
  
    this.callbacks = {};
    this.ipcPath = path.parse(uri);
  
    Object.assign(this.ipcInstance.config, {
      id: uniqid(),
      socketRoot: `${this.ipcPath.dir}/`,
      retry: 1500,
      sync: false,
      silent: true,
      unlink: true
    });
    
    this.ipcInstance.connectTo(this.ipcPath.base);
    
    this.ipcInstance.of[this.ipcPath.base].on('message', async data => {
      if (!data.error) {
        this.callbacks[data.id](null, data.result);
        delete this.callbacks[data.id];
        return;
      }
    
      this.callbacks[data.id](data.error);
      delete this.callbacks[data.id];
    });
    
    this.ipcInstance.of[this.ipcPath.base].on('error', async err => {
      for (let key of Object.keys(this.callbacks)) {
        this.callbacks[key](err);
        delete this.callbacks[key];
      }
    });
  }

  async execMethod(method, params) {
    return new Promise((res, rej) => {
      const requestId = uniqid();
      this.callbacks[requestId] = (err, result) => err ? rej(err) : res(result);
  
      this.ipcInstance.of[this.ipcPath.base].emit('message', JSON.stringify({
        method: method,
        params: params,
        id: requestId
      }));
    });
  }
}

module.exports = ipcExec;
