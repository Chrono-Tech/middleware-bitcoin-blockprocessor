/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  path = require('path'),
  EventEmitter = require('events'),
  uniqid = require('uniqid'),
  ipc = require('node-ipc');


class IPCExec {

  constructor(providerURI) {
    this.callbacks = {};
    this.events = new EventEmitter();
    this.ipcInstance = new ipc.IPC;
    this.ipcPath = path.parse(providerURI);
    Object.assign(this.ipcInstance.config, {
      id: uniqid(),
      socketRoot: `${this.ipcPath.dir}/`,
      stopRetrying: true,
      sync: false,
      silent: true,
      unlink: true
    });
    this.connect();
  }


  connect() {
    this.ipcInstance.connectTo(this.ipcPath.base);

    this.ipcInstance.of[this.ipcPath.base].on('disconnect', () => {
      this.events.emit('disconnect');
    });

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

  disconnect() {
    this.ipcInstance.disconnect(this.ipcPath.base);
  }

  async execute(method, params) {

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

module.exports = IPCExec;