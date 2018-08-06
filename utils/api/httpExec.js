const request = require('request-promise'),
  uniqid = require('uniqid');

/**
 * @service
 * @param providerURI - the endpoint URI
 * @description http provider for bitcoin node
 */

class HTTPExec {

  constructor(providerURI) {
    const data = providerURI.split('@');
    this.httpPath = data[0];
    if(data[1]){
      const creds = data[1].split(':');
      this.httpCreds = {
        user: creds[0],
        pass: creds[1]
      };
    }

    this._isConnected = true;
  }

  /**
   * @function
   * @description execute the request
   * @param method - the rpc method
   * @param params - the params for the method
   * @return {Promise<*>}
   */
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

    if(this.httpCreds)
      requestBody.auth = {
        user: this.httpCreds.user,
        pass: this.httpCreds.pass
      };

    try {
      const data = await request(requestBody);
      return data.result;
    } catch (e) {
      this._isConnected = false;
      return Promise.reject(e);
    }

  }

  /**
   * @function
   * @description is connection active
   * @return {boolean}
   */
  connected() {
    return this._isConnected;
  }

}

module.exports = HTTPExec;