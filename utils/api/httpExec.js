const request = require('request-promise'),
  uniqid = require('uniqid');


class HTTPExec {

  constructor(providerURI) {
    this.httpPath = providerURI;
    this._isConnected = true;
  }

  async execute(method, params) {

    const requestBody = {
      uri: this.httpPath,
      method: 'POST',
      json: {
        method: method,
        params: params,
        id: uniqid()
      }
    };


    try {
      const data = await request(requestBody);
      return data.result;
    }catch (e) {
      this._isConnected = false;
      return Promise.reject(e);
    }

  }

  connected(){
    return this._isConnected;
  }

}

module.exports = HTTPExec;