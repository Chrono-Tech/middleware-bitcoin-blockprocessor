'use strict';

const Promise = require('bluebird'),
  request = require('request'),
  config = require('../config'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app.services.httpExec'});

module.exports = async (method, params) => {
  if(typeof(method) !== 'string') {
    throw new TypeError(method + ' must be a string');
  }

  if(typeof(params) !== 'object' && !Array.isArray(params)) {
    throw new TypeError(params + ' must be an object or array');
  }

  let result = await new Promise((res, rej) => {
    request({
      uri:`${config.http.uri}`,
      method:'POST',
      auth: {
        user: `${config.http.user}`,
        pass: `${config.http.password}`
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
        return rej(err);
      
      if(body.error)
        return rej(body.error);
    
      return res(body.result);
    });  
  }).catch((err) => {
    log.error(err);
    return [];
  });

  return result;
};