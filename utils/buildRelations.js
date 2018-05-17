const _ = require('lodash'),
  crypto = require('crypto');

module.exports = coins => {

  return _.chain(coins).transform((result, coin) => {
    let txIndex = _.isNumber(coin.inputTxIndex) ? coin.inputTxIndex : coin.outputTxIndex;
    let blockNumber = _.isNumber(coin.inputTxIndex) ? coin.inputBlock : coin.outputBlock;

    let id = crypto.createHash('md5').update(`${coin.address}x${blockNumber}x${txIndex}`).digest('hex');

    if (result[id] && result[id].type === 2)
      return;

    if (result[id] && ((result[id].type === 1 && coin.inputTxIndex) || (result[id].type === 0 && coin.value))) {
      result[id].type = 2;
      return;
    }

    if (!result[id]) {
      let type = _.isNumber(coin.inputTxIndex) && _.isNumber(coin.inputTxIndex) ? 2 : _.isNumber(coin.inputTxIndex) ? 0 : 1;
      result[id] = {
        address: coin.address,
        txIndex: txIndex,
        type: type,
        blockNumber: blockNumber,
        _id: id
      };
    }
  }, [])
    .values()
    .value();
};