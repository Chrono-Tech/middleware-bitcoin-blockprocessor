'use strict';

const Promise = require('bluebird'),
  config = require('../config'),  
  webSocket = require('ws');

module.exports = async (method, params) => {
  const client = new webSocket(`ws://localhost:${config.node.httpPort}/ws`);  

  let response = await new Promise((res, rej) => {

    client.onmessage = async (data) => {
      let result = JSON.parse(data.data); 
      if(!result.error)
        return res(result.result);
      
      await Promise.delay(500);
      client.close();
      rej(result.error.message);
    };

    client.onopen = () => {
      client.send(JSON.stringify({method: method, params: params}));
    };

    client.onerror = async (error) => {
      client.close();
      await Promise.delay(500);
      rej(error.message);
    };
  });

  client.close();
  return response;
};