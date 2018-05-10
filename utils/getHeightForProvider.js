/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const httpExec = require('./httpExec'),
  ipcExec = require('./ipcExec');

const isHttpProvider = (httpUri) => {
  return new RegExp(/(http|https):\/\//).test(httpUri);
};

const exec =async (httpUri, method, params) => {
  return isHttpProvider(httpUri) ? await httpExec(httpUri, method, params) :
    await ipcExec(httpUri, method, params);
};

module.exports =  async (httpUri) => {
  return await exec(httpUri, 'getblockcount', []);

};