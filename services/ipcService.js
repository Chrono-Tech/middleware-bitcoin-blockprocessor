const ipc = require('node-ipc'),
  config = require('../config'),
  path = require('path'),
  fs = require('fs'),
  RPCBase = require('bcoin/lib/http/rpcbase');

Object.assign(ipc.config, {
  id: config.node.ipcName,
  socketRoot: config.node.ipcPath,
  retry: 1500,
  maxConnections: 100,
  sync: false,
  silent: true,
  unlink: false
});

/**
 * @service
 * @description expose ipc RPC interface for other services
 * @param node - bitcoin node's instance
 * @returns {Promise.<*>}
 */


const init = async node => {

  let pathIpc = path.join(config.node.ipcPath, `${ipc.config.appspace}${config.node.ipcName}`);

  if (fs.existsSync(pathIpc)) {
    fs.unlinkSync(pathIpc);
  }

  node.rpc.add('gettxbyaddress', async (...args) => {
    const metas = await node.getMetaByAddress(...args);
    const result = [];

    for (const meta of metas) {
      const view = await node.getMetaView(meta);
      result.push(meta.getJSON(config.node.network, view));
    }

    return result;
  });

  node.rpc.add('getcoinsbyaddress', async (...args) => {
    let coins = await node.getCoinsByAddress(...args);
    return coins.map(coin =>
      coin.getJSON(config.node.network)
    );
  });
  node.rpc.add('getmetabyaddress', node.getMetaByAddress.bind(node));

  node.rpc.add('sendrawtransactionnotify', (...args) => {
    return node.rpc.sendRawTransaction.call(node.rpc, ...args);
  });

  ipc.serve(() => {
    ipc.server.on('message', async (data, socket) => {
      try {
        data = JSON.parse(data);
        const json = await node.rpc.execute(data);

        ipc.server.emit(socket, 'message', {result: json, id: data.id});
      } catch (e) {
        ipc.server.emit(socket, 'message', {
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

  ipc.server.start();
};

module.exports = init;
