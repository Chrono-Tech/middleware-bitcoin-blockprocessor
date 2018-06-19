/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  models = require('../../models'),
  providerService = require('../../services/providerService'),
  log = bunyan.createLogger({name: 'app.utils.allocateBlockBuckets'});

/**
 * @function
 * @description validate that all blocks in the specified range are exist in db
 * @param minBlock - validate from block
 * @param maxBlock - validate to block
 * @param chunkSize - the chunk validation size
 * @return {Promise<Array>}
 */
const blockValidator = async (minBlock, maxBlock, chunkSize) => {

  const data = [];

  const calculate = async (minBlock, maxBlock, chunkSize) => {
    let blocks = [];

    for (let blockNumber = minBlock; blockNumber <= maxBlock; blockNumber++)
      blocks.push(blockNumber);

    return await Promise.mapSeries(_.chunk(blocks, chunkSize), async (chunk) => {
      const minBlock = _.head(chunk);
      const maxBlock = _.last(chunk);
      log.info(`validating blocks from: ${minBlock} to ${maxBlock}`);

      const count = await models.blockModel.count(minBlock === maxBlock ? {number: minBlock} : {
        $and: [
          {number: {$gte: minBlock}},
          {number: {$lte: maxBlock}}
        ]
      });

      if (maxBlock !== minBlock && count !== maxBlock - minBlock + 1 && count)
        await calculate(minBlock, maxBlock, chunkSize / 10);

      if (!count)
        return data.push(minBlock === maxBlock ? [minBlock] : [minBlock, maxBlock]);

      return [];
    });
  };

  await calculate(minBlock, maxBlock, chunkSize);

  return data;
};

module.exports = async function () {

  let provider = await providerService.get();

  let currentNodeHeight = await Promise.resolve(provider.instance.execute('getblockcount', [])).timeout(10000).catch(() => -1);

  if (currentNodeHeight === -1)
    return Promise.reject({code: 0});

  let missedBuckets = await blockValidator(0, currentNodeHeight - 2, 10000);
  missedBuckets = _.chain(missedBuckets).sortBy(item => item[0]).reverse().value();

  return {
    missedBuckets: missedBuckets,
    height: currentNodeHeight === 0 ? currentNodeHeight : currentNodeHeight - 1
  };

};
