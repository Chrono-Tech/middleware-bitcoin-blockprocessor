/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

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
      collectionPrefix: process.env.MONGO_ACCOUNTS_COLLECTION_PREFIX || process.env.MONGO_COLLECTION_PREFIX || 'bitcoin'
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
    connectionURI: process.env.CONNECTION_URI || `${process.env.IPC_PATH || '/tmp/'}${process.env.IPC_NAME || 'bitcoin'}`,
    user: process.env.NODE_USER_NAME,
    password: process.env.NODE_USER_PASSWORD

  }
};
