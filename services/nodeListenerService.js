/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const zmq = require('zeromq');

/**
 * 
 * @class NodeListenerService
 */
class NodeListenerService {

  constructor (providerService) {
    this.providerService = providerService;
    this.sock = zmq.socket('sub');
    this.providerService.events.on('change', this.start.bind(this));
  }


  async start () {
    this.sock.monitor(500, 0);
    const provider = await this.providerService.getProvider();
    this.sock.connect(provider.getWs());
    this.sock.subscribe('rawtx');

    this.sock.on('close', () => {
      this.providerService.selectProvider();
    });
  }

  /**
   * 
   * @param {any} callback function (tx)
   * 
   * @memberOf NodeListenerService
   */
  async onMessage (callback) {
    this.pendingTxCallback = (topic, tx) => callback(tx);
    this.sock.on('message', this.pendingTxCallback);
  }


  async stop () {
    this.node.pool.removeListener('tx', this.pendingTxCallback);
  }

}

module.exports = NodeListenerService;
