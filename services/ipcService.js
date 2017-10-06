const ipc = require('node-ipc'),
  config = require('../config'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  RPCBase = require('bcoin/lib/http/rpcbase');

Object.assign(ipc.config, {
  id: config.bitcoin.ipcName,
  socketRoot: config.bitcoin.ipcPath,
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

  let pathIpc = path.join(config.bitcoin.ipcPath, `${ipc.config.appspace}${config.bitcoin.ipcName}`);

  if (fs.existsSync(pathIpc)) {
    fs.unlinkSync(pathIpc);
  }

  node.rpc.add('gettxbyaddress', node.getTXByAddress.bind(node));
  node.rpc.add('getcoinsbyaddress', node.getCoinsByAddress.bind(node));
  node.rpc.add('getmetabyaddress', node.getMetaByAddress.bind(node));


  node.rpc.add('sendrawtransactionnotify', (...args)=>{
    node.emit('pushed_tx', _.get(args, '0.0'));
    return node.rpc.sendRawTransaction.call(node.rpc, ...args);
  });

  ipc.serve(() => {
    ipc.server.on('message', async (data, socket) => {
      try {
        data = JSON.parse(data);
        const json = await node.rpc.execute(data);

        ipc.server.emit(socket, 'message', {result: json, id: data.id});
      } catch (e) {
        console.log(e);
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
