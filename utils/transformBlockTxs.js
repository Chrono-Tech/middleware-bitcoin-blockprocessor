const config = require('../config'),
  Promise = require('bluebird'),
  ipcExec = require('../services/ipcExec'),
  Network = require('bcoin/lib/protocol/network'),
  network = Network.get(config.node.network);

/**
 * @service
 * @description transform tx to full object
 * @param txs - original block's array of tx objects
 * @returns {Promise.<*>}
 */


module.exports = async (txs) => {

  txs = txs.map(tx => tx.getJSON(network));

  return await Promise.mapSeries(txs, async tx => {
    tx.outputs = await Promise.mapSeries(tx.outputs, async (output, index)=>{
      const coin = await ipcExec('gettxout', [tx.hash, index, true]).catch(() => null);
      return {
        address: output.address,
        value: output.value,
        spent: !coin
      };
    });

    return {
      value: tx.value,
      hash: tx.hash,
      fee: tx.fee,
      minFee: tx.minFee,
      inputs: tx.inputs,
      outputs: tx.outputs
    };

  });
};
