/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  _ = require('lodash'),
  config = require('../config'),
  sem = require('semaphore')(1),
  zmq = require('zeromq'),
  httpExec = require('../utils/api/httpExec'),
  ipcExec = require('../utils/api/ipcExec'),
  providerServiceInterface = require('middleware-common-components/interfaces/blockProcessor/providerServiceInterface'),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'app.services.providerService'});

/**
 * @service
 * @description filter txs by registered addresses
 * @param block - an array of txs
 * @returns {Promise.<*>}
 */

class providerService {

  constructor() {
    this.events = new EventEmitter();
    this.connector = null;

    if (config.node.providers.length > 1)
      this.findBestNodeInterval = setInterval(() => {
        this.switchConnectorSafe();
      }, 60000 * 5);
  }

  async resetConnector() {
    try {
      this.connector.zmq.disconnect(this.connector.currentProvider.zmq);
    } catch (e) {
    }
    this.connector.instance.disconnect();
    this.switchConnectorSafe();
    this.events.emit('disconnected');
  }


  getConnectorFromURI(providerURI) {
    const isHttpProvider = new RegExp(/(http|https):\/\//).test(providerURI);
    return isHttpProvider ? httpExec : new ipcExec(providerURI); //todo replace http provider
  }

  async switchConnector() {

    const providerURI = await Promise.any(config.node.providers.map(async providerURI => {

      const sock = zmq.socket('sub');
      sock.connect(providerURI.zmq);

      await Promise.resolve((res, rej) =>
        sock.on('connected', (err) => err ? rej() : res())
      ).timeout(1000);
      sock.disconnect(providerURI.zmq);

      const instance = this.getConnectorFromURI(providerURI.uri);
      await instance.execute('getblockcount', []);
      instance.disconnect();
      return providerURI;
    })).catch(() => {
      log.error('no available connection!');
      process.exit(0);
    });

    const currentProviderURI = this.connector ? this.connector.currentProvider.uri : '';

    if (currentProviderURI === providerURI.uri) {
      return this.connector;
    }

    this.connector = {
      instance: this.getConnectorFromURI(providerURI.uri),
      currentProvider: providerURI,
      zmq: zmq.socket('sub')
    };

    this.connector.zmq.monitor(500, 0);
    this.connector.zmq.connect(providerURI.zmq);
    this.connector.zmq.subscribe('rawtx');
    this.connector.zmq.on('close', () => this.resetConnector());

    if (_.get(this.connector.instance, 'events')) {
      this.connector.instance.events.on('disconnect', () => this.resetConnector());
    } else
      this.pingIntervalId = setInterval(async () => {

        const isConnected = await new Promise((res, rej) => {
          this.connector.currentProvider.sendAsync({ //todo replace with httpexec
            id: 9999999999,
            jsonrpc: '2.0',
            method: 'net_listening',
            params: []
          }, (err, result) => err ? rej(err) : res(result.result));
        });

        if (!isConnected) {
          clearInterval(this.pingIntervalId);
          this.resetConnector();
        }
      }, 5000);

    this.connector.zmq.on('message', (topic, tx) =>
      this.events.emit('unconfirmedTx', tx)
    );


    return this.connector;
  }

  async switchConnectorSafe() {

    return new Promise(res => {
      sem.take(async () => {
        await this.switchConnector();
        res(this.connector);
        sem.leave();
      });
    });
  }

  async get() {
    return this.connector || await this.switchConnectorSafe();
  }

}

module.exports = providerServiceInterface(new providerService());
