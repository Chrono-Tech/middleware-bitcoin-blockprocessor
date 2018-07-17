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

/**
 * @service
 * @param providerURI - the endpoint URI
 * @description http provider for bitcoin node
 */

class IPCExec extends EventEmitter{

  constructor(providerURI) {
    super();
    this._requests = {};
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

  /**
   * @function
   * @description establish the connection with node
   */

  connect() {
    this.ipcInstance.connectTo(this.ipcPath.base);

    this.ipcInstance.of[this.ipcPath.base].on('disconnect', () => {
      this.emit('disconnect');
    });

    this.ipcInstance.of[this.ipcPath.base].on('message', async data => {

      if (!this._requests[data.id])
        return;

      if (!data.error) {
        this._requests[data.id].callback(null, data.result);
        delete this._requests[data.id];
        return;
      }

      this._requests[data.id].callback(data.error);
      delete this._requests[data.id];
    });

    this.ipcInstance.of[this.ipcPath.base].on('error', async err => {
      for (let key of Object.keys(this._requests)) {
        this._requests[key].callback(err);
        delete this._requests[key];
      }
    });
  }

  /**
   * @function
   * @description disconnects the connection
   */
  disconnect() {
    this.ipcInstance.disconnect(this.ipcPath.base);
  }

  /**
   * @function
   * @description is connection active
   * @return {boolean}
   */
  connected() {
    return !!this.ipcInstance.of[this.ipcPath.base];
  }


  /**
   * @function
   * @description execute the request
   * @param method - the rpc method
   * @param params - the params for the method
   * @return {Promise<*>}
   */
  async execute(method, params) {

    return new Promise((res, rej) => {
      const requestId = uniqid();
      this._requests[requestId] = {
        callback: (err, result) => {
          clearTimeout(this._requests[requestId].timeoutId);
          err ? rej(err) : res(result);
        },
        timeoutId: setTimeout(() => rej({code: 4}), 30000)
      };

      this.ipcInstance.of[this.ipcPath.base].emit('message', JSON.stringify({
        method: method,
        params: params,
        id: requestId
      }));
    });
  }

}

module.exports = IPCExec;