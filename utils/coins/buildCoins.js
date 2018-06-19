const _ = require('lodash'),
  crypto = require('crypto');

/**
 * @function
 * @description extract coins from transaction
 * @param txs - the prepared transactions
 * @returns Array<CoinModel>
 */
module.exports = txs => {

  const inputs = _.chain(txs)
    .map(tx =>
      _.chain(tx.inputs)
        .map((inCoin, index) => ({
          _id: crypto.createHash('md5').update(`${inCoin.prevout.index}x${inCoin.prevout.hash}`).digest('hex'),
          inputBlock: tx.blockNumber,
          inputTxIndex: tx.index,
          inputIndex: index,
          address: inCoin.address
        })
        )
        .filter(coin => coin.address)
        .value()
    )
    .flattenDeep()
    .value();

  const outputs = _.chain(txs)
    .map(tx =>
      _.chain(tx.outputs)
        .map((outCoin, index) => ({
          _id: crypto.createHash('md5').update(`${index}x${tx._id}`).digest('hex'),
          outputBlock: tx.blockNumber,
          outputTxIndex: tx.index,
          outputIndex: index,
          value: outCoin.value,
          address: outCoin.address
        }))
        .filter(coin => coin.address)
        .value()
    )
    .flattenDeep()
    .value();

  return _.chain(inputs).union(outputs).transform((result, coin) => {

    if (!result[coin._id])
      return result[coin._id] = coin;

    _.merge(result[coin._id], coin);
  }, {})
    .values()
    .value();

};