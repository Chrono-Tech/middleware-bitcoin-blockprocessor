/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../config'),
  httpExec = require('../../utils/httpExec'),
  IpcExec = require('../../utils/ipcExec');

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

module.exports =  async (method, params) => {
  return await exec(config.dev.connectionUri, method, params);

};