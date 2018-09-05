const ipc = require('node-ipc'),
  path = require('path'),
  fs = require('fs'),
  RPCBase = require('bcoin/lib/node/rpc');

class IPC {

  constructor (node, config) {
    this.node = node;
    this.config = config;
    Object.assign(ipc.config, {
      id: config.ipcName,
      socketRoot: config.ipcPath,
      appspace: config.appSpace,
      retry: 1500,
      maxConnections: 100,
      sync: true,
      silent: true
    });
    this.init();
  }

  init () {

    let pathIpc = path.join(this.config.ipcPath, `${ipc.config.appspace}${this.config.ipcName}`);

    if (fs.existsSync(pathIpc)) {
      fs.unlinkSync(pathIpc);
    }

    this.node.rpc.add('getcoinsbyaddress', async (...args) => {
      let coins = await this.node.getCoinsByAddress(...args);
      return coins.map(coin =>
        coin.getJSON(this.node.network.type)
      );
    });

    ipc.serve(() => {
        ipc.server.on('message', async (data, socket) => {
          data = JSON.parse(data);
          try {
            const json = await this.node.rpc.execute(data);
            ipc.server.emit(socket, 'message', {result: json, id: data.id});
          } catch (e) {
            ipc.server.emit(socket, 'message', {
                id: data.id,
                result: null,
                error: {
                  message: 'Invalid request.',
                  code: RPCBase.errors.INVALID_REQUEST
                }
              }
            );
          }
        });
      }
    );
  }

  open () {
    ipc.server.start();
  }

  close () {
    ipc.server.stop();
  }

}

module.exports = class IPCInitter {

  constructor (config) {
    return {
      id: 'ipc',
      init: node => new IPC(node, config)
    }
  }
};