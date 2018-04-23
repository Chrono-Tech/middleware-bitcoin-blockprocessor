const config = require('../config'),
  httpExec = require('../utils/httpExec'),
  ipcExec = require('../utils/ipcExec'),
  isHttpProvider = new RegExp(/(http|https):\/\//).test(config.node.connectionURI);

module.exports = async (method, params) => {
  return isHttpProvider ? await httpExec(method, params) :
    await ipcExec(method, params);
};