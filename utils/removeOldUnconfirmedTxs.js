const bunyan = require('bunyan'),
  exec = require('../services/execService'),
  txModel = require('../models/txModel'),
  coinModel = require('../models/coinModel'),
  log = bunyan.createLogger({name: 'app.utils.addBlock'});


module.exports = async () => {

  const mempool = await exec('getrawmempool', []);

  log.info('removing confirmed / rejected txs');
  if (!mempool.length)
    return;

  let outdatedTxs = await txModel.find({_id: {$nin: mempool}, blockNumber: -1});

  if (!outdatedTxs.length)
    return;


  let bulkOps = outdatedTxs.map(tx => ({
    updateOne: {
      filter: {inputBlock: -1, inputTxIndex: tx.index}
    },
    update: {
      $unset: {inputBlock: 1, inputTxIndex: 1, inputIndex: 1},
      upsert: true
    }
  }));

  await coinModel.bulkWrite(bulkOps);


  await coinModel.remove({
    $or: outdatedTxs.map(tx => ({
      outputBlock: -1,
      outputTxIndex: tx.index
    })
    )
  });

  await txModel.remove({_id: {$nin: mempool}, blockNumber: -1});

};