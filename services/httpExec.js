'use strict';

const jayson = require('jayson'),
  config = require('../config'),
  Promise = require('bluebird');

module.exports = async (method, params) => {
  let client = jayson.client.http({
    port: config.http.httpPort,
    auth: config.http.auth
  });

  let response = await new Promise((res, rej) => {
    client.request(method, params, (err, data) => {
      if(err)
        return rej(err);
      return res(data);
    });
  }).catch((err) => err);
  return response;
};