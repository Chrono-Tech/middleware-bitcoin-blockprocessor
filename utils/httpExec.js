const request = require('request-promise'),
  uniqid = require('uniqid'),
  config = require('../config');

module.exports = async (uri, method, params) => {

  const requestBody = {
    uri: uri,
    method: 'POST',
    json: {
      method: method,
      params: params,
      id: uniqid()
    }
  };

  if (config.node.user)
    requestBody.auth = {
      user: config.node.user,
      pass: config.node.password
    };

  const data = await request(requestBody).catch(() => ({error: {code: 'ECONNECT'}}));

  if(data.error)
    return Promise.reject(data.error);

  return data.result;
};