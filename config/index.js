require('dotenv').config();

/**
 * @factory config
 * @description base app's configuration
 * @returns {{
 *  mongo: {
 *    uri: string,
 *    collectionPrefix: string
 *    },
 *  rabbit: {
 *    url: string,
 *    serviceName: string
 *    },
 *  node: {
 *    dbpath: string,
 *    network: string,
 *    dbDriver: string,
 *    ipcName: string,
 *    ipcPath: string
 *    }
 *  }}
 */

module.exports = {
  mongo: {
    accounts: {
      uri: process.env.MONGO_ACCOUNTS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_ACCOUNTS_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX ||'bitcoin'
    },
    data: {
      uri: process.env.MONGO_DATA_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/data',
      collectionPrefix: process.env.MONGO_DATA_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'bitcoin'
    }
  },
  consensus: {
    lastBlocksValidateAmount: parseInt(process.env.CONSENSUS_BLOCK_VALIDATE_AMOUNT) || 6
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_bitcoin'
  },
  sync: {
    shadow: parseInt(process.env.SYNC_SHADOW) || true
  },
  node: {
    zmq: process.env.ZMQ || 'tcp://127.0.0.1:43332',
    network: process.env.NETWORK || 'regtest',
    ipcName: process.env.IPC_NAME || 'bitcoin'
  },
  http: {
    uri: process.env.URI || 'http://localhost:8332',
    user: process.env.USER_NAME || '',
    password: process.env.PASSWORD || ''
  }
};
