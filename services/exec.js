
'use strict';

const httpExec = require('./httpExec'),
  ipcExec = require('./ipcExec');

module.exports = async (method, params) => {

  let result = await Promise.all([
    ipcExec.createConnection().catch((err) => err),
    httpExec.createConnection().catch((err) => err)
  ]).then(([ipc, http]) => {
    if(ipc instanceof Error && http instanceof Error)
      return new Error('No connections!');

    if(ipc instanceof Error){
      return http.executor(method, params);
    }
    
    http.closeConnection();
    return ipc.executor(method, params);
  }).then((res) => {
    return res;
  }).catch((err) => err);

  return result;
};