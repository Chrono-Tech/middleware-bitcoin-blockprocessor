/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  models = require('../../models'),
  config = require('../../config'),
  log = bunyan.createLogger({name: 'app.utils.addBlock', level: config.logs.level});

/**
 * @function
 * @description rollback the cache to previous block
 * @param blockNumber - block number
 * @return {Promise<void>}
 */
module.exports = async (blockNumber) => {

  const isBlockExists = await models.blockModel.count({number: blockNumber});

  if (!isBlockExists)
    return;

  log.info('rolling back coins state');

  await models.coinModel.update({outputBlock: blockNumber, inputBlock: {$ne: null}}, {
    $unset: {
      outputBlock: 1,
      outputTxIndex: 1,
      outputIndex: 1
    }
  }, {multi: true});

  await models.coinModel.update({inputBlock: blockNumber, outputBlock: {$ne: null}}, {
    $unset: {
      inputBlock: 1,
      inputTxIndex: 1,
      inputIndex: 1
    }
  }, {multi: true});


  await models.coinModel.remove({
    $or: [
      {outputBlock: blockNumber, inputBlock: null},
      {outputBlock: null, inputBlock: blockNumber},
      {outputBlock: blockNumber, inputBlock: blockNumber},
      {outputBlock: null, inputBlock: null}
    ]
  });

  log.info('rolling back txs state');
  await models.txModel.remove({blockNumber: blockNumber});

  log.info('rolling back blocks state');
  await models.blockModel.remove({number: blockNumber});
};
