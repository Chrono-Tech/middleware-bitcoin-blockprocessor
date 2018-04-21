'use strict';

const Promise = require('bluebird'),
  request = require('request'),
  config = require('../config'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app.services.httpExec'});

module.exports = async (method, params, uri) => {
  if(typeof(method) !== 'string') {
    throw new TypeError(method + ' must be a string.');
  }

  if(typeof(params) !== 'object' && !Array.isArray(params)) {
    throw new TypeError(params + ' must be an object or array.');
  }

  if(!(config.node.user && config.node.password))
    throw new Error('You are not authorized.');

  let result = await new Promise((res, rej) => {
    request({
      uri: uri,
      method: 'POST',
      auth: {
        user: `${config.node.user}`,
        pass: `${config.node.password}`
      },
      headers: {
        'content_type': 'text/plain'
      },
      json: {
        'method': method,
        'params': params
      }
    }, (err, response, body) => {
      if(err)
        rej(err);

      res(body.result);
    });
  });

  return result;
};
