/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const httpExec = require('../utils/httpExec'),
  ipcExec = require('../utils/ipcExec');

const isHttpProvider = (httpUri) => {
  return new RegExp(/(http|https):\/\//).test(httpUri);
};


class ExecService {
  constructor(providerService) {
    this.providerService = providerService;
  }

  async execMethod(method, params) {
    const provider = await this.providerService.getProvider();
    const httpUri = provider.getHttp();

    return isHttpProvider(httpUri) ? await httpExec(httpUri, method, params) :
      await ipcExec(httpUri, method, params);
  }
} 

module.exports = ExecService;