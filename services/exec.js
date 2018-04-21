'use strict';

const config = require('../config'),
  _ = require('lodash'),
  httpExec = require('./httpExec'),
  ipcExec = require('./ipcExec');

module.exports = async (method, params) => {
  if(_.includes(config.node.connectionName, 'http')) {
    return await httpExec(method, params, config.node.connectionName);
  }

  return await ipcExec(method, params, config.node.connectionName);
};

