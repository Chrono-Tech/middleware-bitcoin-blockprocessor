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
  sock = zmq.socket('sub'),
  httpExec = require('../utils/httpExec'),
  ipcExec = require('../utils/ipcExec'),
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
    await this.connector.reset();
    this.switchConnector();
    this.events.emit('disconnected');
  }


  getConnectorFromURI(providerURI) {
    const isHttpProvider = new RegExp(/(http|https):\/\//).test(providerURI);
    return isHttpProvider ? httpExec : new ipcExec(providerURI); //todo replace http provider
  }

  async switchConnector() {

    let providerURIByZMQ = await Promise.mapSeries(config.node.providers, async providerURI => {
      sock.connect(providerURI.zmq);
      try {
        await Promise.resolve((res, rej) =>
          sock.on('connected', (err) => err ? rej() : res())
        ).timeout(1000);

        sock.disconnect(providerURI.zmq);
        return providerURI;
      } catch (e) {
        return null;
      }
    });

    providerURIByZMQ = _.compact(providerURIByZMQ);

    if (!providerURIByZMQ.length) {
      log.error('no available connection!');
      process.exit(0);
    }

    const providerURI = await Promise.any(providerURIByZMQ.map(async providerURI => {
      const instance = this.getConnectorFromURI(providerURI.uri);
      await instance.execute('getblockcount', []);
      return providerURI;
    })).catch(() => {
      log.error('no available connection!');
      process.exit(0);
    });

    const currentProviderURI = this.connector ? this.connector.currentProvider.uri : '';

    if (currentProviderURI === providerURI.uri)
      return;

    this.connector = {
      instance: this.getConnectorFromURI(providerURI.uri),
      currentProvider: providerURI
    };

    sock.monitor(500, 0);
    sock.connect(providerURI.zmq);
    sock.subscribe('rawtx');
    sock.on('close', () => this.resetConnector());

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

    sock.on('message', result =>
      this.events.emit('unconfirmedTx', result)
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
    return this.connector && this.connector.isConnected() ? this.connector : await this.switchConnectorSafe();
  }

}

module.exports = providerServiceInterface(new providerService());
