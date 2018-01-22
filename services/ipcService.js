const ipc = require('node-ipc'),
  config = require('../config'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  Promise = require('bluebird'),
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

  node.rpc.add('getblockrangetxbyaddress', async (...args) => {
    args = args[0];
    const address = args[0];
    const delta = args[1];

    const height = await node.rpc.getBlockCount([]);

    let lastBlocks = await Promise.map(_.map(new Array(delta), (item, iter) => iter), async (iter) => {
      return await node.rpc.getBlockByHeight([height - iter]);
    });

    let txs = _.chain(lastBlocks)
      .map(block => block.tx)
      .flattenDeep()
      .value();

    let lastTxs = await Promise.map(txs, async (txid) => {
      let tx = await node.rpc.getRawTransaction([txid, true]);

      tx.vin = _.filter(tx.vin, vin => vin.vout);

      tx.inputs = await Promise.map(tx.vin, async vin => {
        let tx = await node.rpc.getRawTransaction([vin.txid, true]);
        return tx.vout[vin.vout];
      });

      tx.inputs = _.compact(tx.inputs);

      tx.outputs = tx.vout.map(v => ({
        value: Math.floor(v.value * Math.pow(10, 8)),
        scriptPubKey: v.scriptPubKey,
        addresses: v.scriptPubKey.addresses
      }));

      for (let i = 0; i < tx.inputs.length; i++) {
        tx.inputs[i] = {
          addresses: tx.inputs[i].scriptPubKey.addresses,
          prev_hash: tx.vin[i].txid, //eslint-disable-line
          script: tx.inputs[i].scriptPubKey,
          value: Math.floor(tx.inputs[i].value * Math.pow(10, 8)),
          output_index: tx.vin[i].vout //eslint-disable-line
        };
      }



      let inputIncludes = _.find(tx.inputs, input=> _.get(input, 'addresses', []).includes(address));
      let outputIncludes = _.find(tx.outputs, input=> _.get(input, 'addresses', []).includes(address));

      return inputIncludes || outputIncludes ? tx : null;
    });

    return _.compact(lastTxs);

  });

  node.rpc.add('getmetabyaddress', node.getMetaByAddress.bind(node));

  node.rpc.add('getcoin', async (...args)=>{
    args = args[0];
    return await node.getCoin(...args);
  });

  node.rpc.add('getmeta', async (...args)=>{
    args = args[0];
    return await node.getMeta(...args);
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
