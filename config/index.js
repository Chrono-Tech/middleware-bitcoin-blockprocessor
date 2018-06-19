/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv').config();
const _ = require('lodash');


/** @function
 * @description build default connection URI
 * @returns {string}
 */

const getDefault = () => {
  return (
    (process.env.CONNECTION_URI || `${process.env.IPC_PATH || '/tmp/'}${process.env.IPC_NAME || 'bitcoin'}`) + '@' +
    (process.env.ZMQ || 'tcp://127.0.0.1:43332')
  );
};

/**
 * @function
 * @description return the array of providers
 * @param providers - the string of providers
 * @returns Array<{uri: String, zmq: String}>
 */

const createConfigProviders = (providers) => {
  return _.chain(providers)
    .split(',')
    .map(provider => {
      const data = provider.split('@');
      return {
        uri: data[0].trim(),
        zmq: data[1].trim()
      };
    })
    .value();
};


/**
 * @factory config
 * @description base app's configuration
 * @returns {{
 *  mongo: {
 *    uri: String,
 *    collectionPrefix: String
 *    },
 *  rabbit: {
 *    url: String,
 *    serviceName: String
 *    },
 *  node: {
 *    network: string,
 *    providers: Array
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
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'app_bitcoin'
  },
  sync: {
    shadow: parseInt(process.env.SYNC_SHADOW) || true
  },
  node: {
    network: process.env.NETWORK || 'regtest',
    providers: createConfigProviders(process.env.PROVIDERS || getDefault())
  }
};
