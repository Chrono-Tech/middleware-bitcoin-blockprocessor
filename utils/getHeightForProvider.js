/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const httpExec = require('./httpExec'),
  IpcExec = require('./ipcExec');

const isHttpProvider = (httpUri) => {
  return new RegExp(/(http|https):\/\//).test(httpUri);
};


const doIpcExec = async(httpUri, method, params) => {
  let ipcExec; 
  if (!isHttpProvider(httpUri)) {
    ipcExec = new IpcExec(httpUri);
  }
  return await ipcExec.execMethod(method, params);
};

const exec =async (httpUri, method, params) => {
  return isHttpProvider(httpUri) ? await httpExec(httpUri, method, params) :
    await doIpcExec(httpUri, method, params);
};

module.exports =  async (httpUri) => {
  return await exec(httpUri, 'getblockcount', []);

};