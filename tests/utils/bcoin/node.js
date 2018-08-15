const bcoin = require('bcoin'),
  bzmq = require('bzmq'),
  IPC = require('./plugins/IPC');

module.exports = (async () => {
  const node = new bcoin.FullNode({
    network: 'regtest',
    db: 'memory',
    indexTX: true,
    indexAddress: true,
    logLevel: 'error',
    'http-port': 18332,
    'zmq-hashblock': 'tcp://127.0.0.1:43332',
    'zmq-rawblock': 'tcp://127.0.0.1:43332',
    'zmq-hashtx': 'tcp://127.0.0.1:43332',
    'zmq-rawtx': 'tcp://127.0.0.1:43332'
  });

  const ipc = new IPC({
    ipcName: 'bitcoin',
    ipcPath: '/tmp/',
    appSpace: 'app.'
  });

  node.use(ipc);
  node.use(bzmq);
  await node.open();
  await node.connect();
  node.startSync();
})();