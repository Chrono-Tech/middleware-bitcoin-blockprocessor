const bunyan = require('bunyan'),
  providerService = require('../../services/providerService'),
  models = require('../../models'),
  log = bunyan.createLogger({name: 'app.utils.addBlock'});

/**
 * @function
 * @description remove unconfirmed transactions, which has been pulled from mempool
 * @return {Promise<void>}
 */
module.exports = async () => {

  const provider = await providerService.get();

  const mempool = await provider.instance.execute('getrawmempool', []);

  log.info('removing confirmed / rejected txs');
  if (!mempool.length)
    return;

  let outdatedTxs = await models.txModel.find({_id: {$nin: mempool}, blockNumber: -1});

  if (!outdatedTxs.length)
    return;


  let bulkOps = outdatedTxs.map(tx => ({
    updateOne: {
      filter: {inputBlock: -1, inputTxIndex: tx.index},
      update: {$unset: {inputBlock: 1, inputTxIndex: 1, inputIndex: 1}}
    }
  }));

  await models.coinModel.bulkWrite(bulkOps);


  await models.coinModel.remove({
    $or: outdatedTxs.map(tx => ({
      outputBlock: -1,
      outputTxIndex: tx.index
    })
    )
  });

  await models.txModel.remove({_id: {$nin: mempool}, blockNumber: -1});

};