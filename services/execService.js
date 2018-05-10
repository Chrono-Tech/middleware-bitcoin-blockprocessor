/**
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const httpExec = require('../utils/httpExec'),
  IpcExec = require('../utils/ipcExec');

const isHttpProvider = (httpUri) => {
  return new RegExp(/(http|https):\/\//).test(httpUri);
};


class ExecService {
  constructor(providerService) {
    this.providerService = providerService;
    this.providerService.events.on('change', this.start.bind(this));
  }

  async start () {
    const provider = await this.providerService.getProvider();
    const httpUri = provider.getHttp();

    if (!isHttpProvider(httpUri)) {
      this.ipcExec = new IpcExec(httpUri);
    }
  }

  async doIpcExec(httpUri, method, params) {
    if (!isHttpProvider(httpUri)) {
      this.ipcExec = new IpcExec(httpUri);
    }

    return await this.ipcExec.execMethod(method, params);
  }

  async execMethod(method, params) {
    const provider = await this.providerService.getProvider();
    const httpUri = provider.getHttp();

    return isHttpProvider(httpUri) ? await httpExec(httpUri, method, params) :
      await this.doIpcExec(httpUri, method, params);
  }
} 

module.exports = ExecService;