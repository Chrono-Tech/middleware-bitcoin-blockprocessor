/** 
 *  @class Provider
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
module.exports = class {
  /**
   * 
   * @param {String} wsUri 
   * @param {String} httpUri 
   * @param {Number} height 
   */
  constructor (wsUri, httpUri, height)
  {
    this._ws = wsUri;
    this._http = httpUri;
    this._height = height;
  }

  /**
   * @returns {String}
   */
  getWs () {
    return this._ws;
  }

  /**
   * @returns {Number}
   */
  getHeight () {
    return this._height;
  }

  /**
   * @returns {String}
   */
  getHttp () {
    return this._http;
  }
};
