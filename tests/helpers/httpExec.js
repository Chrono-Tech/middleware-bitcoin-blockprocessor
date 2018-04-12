'use strict';

const Promise = require('bluebird'),
  config = require('../../config'),  
  webSocket = require('ws');

let client; 

async function createConnection() {
  return new Promise((res, rej) => {
    client = new webSocket(`ws://localhost:${config.node.httpPort}/ws`);
    client.onopen = () => {
      res(this);
    };
    client.onerror = (err) => {
      rej(err);
    };
  });
}

async function executor(method, params) {
    let response = await new Promise((res, rej) => {
      client.send(JSON.stringify({method: method, params: params}));

      client.onmessage = async (data) => {
        let result = JSON.parse(data.data); 
        if(!result.error)
          return res(result.result);
      
        await Promise.delay(500);
        client.close();
        rej(result.error.message);
    };
  });

  client.close();
  return response;
}

module.exports = {
  createConnection,
  executor
}