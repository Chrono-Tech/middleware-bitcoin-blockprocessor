require('dotenv').config();
const _ = require('lodash');

/**
 * @factory config
 * @description base app's configuration
 * @returns {{
 *  mongo: {
 *    uri: string
 *    },
 *  rabbit: {
 *    url: string,
 *    serviceName: string
 *    },
 *  bitcoin: {
 *    dbpath: string,
 *    network: string,
 *    db: string,
 *    ipcName: string,
 *    ipcPath: string,
 *    coinbase: [string]
 *    }
 *  }}
 */

module.exports = {
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/data'
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_bitcoin'
  },
  bitcoin: {
    dbpath: process.env.BITCOIN_DB_PATH || '',
    network: process.env.BITCOIN_NETWORK || 'regtest',
    db: process.env.BITCOIN_DB || 'memory',
    ipcName: process.env.BITCOIN_IPC || 'bitcoin',
    ipcPath: process.env.BITCOIN_IPC_PATH || '/tmp/',
    coinbase: _.chain(process.env.BITCOIN_ETHERBASE || '')
      .split(',')
      .map(i => i.trim())
      .value()
  }
};
