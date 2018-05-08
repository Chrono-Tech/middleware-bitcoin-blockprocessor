/** 
 *  @class ProviderService
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Promise = require('bluebird'),
  Provider = require('../models/provider'),
  EventEmitter = require('events'),
  _  = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'shared.services.providerService'});

const MIN_HEIGHT = 0,
  DISABLE_TIME = 10000;


class ProviderService {
  /**
   * Creates an instance of ProviderService.
   * @param {Array of Object {ws, http} configProviders 
   * @param {Function} getHeightForProvider (String providerUri) => Number height
   * 
   * @memberOf ProviderService
   */
  constructor (configProviders, getHeightForProvider) {
    this._configProviders = configProviders;
    this._disableProviders = [];
    this.events = new EventEmitter();
    this.getHeightForProvider = getHeightForProvider;
  }

  /**
   * @param {Provider} provider 
   * 
   * @memberOf ProviderService
   */
  disableProvider (provider) {
    this._provider = undefined;
    log.info('disable provider ' + provider.getHttp());    
    this._disableProviders.push(provider);
    setTimeout(this.enableProvider.bind(this, provider), DISABLE_TIME);
  }



  /**
   * 
   * @memberOf ProviderService
   */
  async selectProvider () {
    const providers = await this._getEnabledProvidersWithNewHeights();
    if (providers.length === 0) {
      log.error('not found enabled http/ws providers');
      process.exit(0);
    }

    const maxProvider = _.maxBy(providers, provider => provider.getHeight());
    if (this._isNewProvider(maxProvider))  
      this._replaceProvider(maxProvider);
  }


  /**
   * 
   * 
   * @returns {Promise return Provider}
   * 
   * @memberOf ProviderService
   */
  async getProvider () {
    if (this._provider === undefined)
      await this.selectProvider();
    return this._provider;
  }

  async _getEnabledProvidersWithNewHeights () {
    return _.filter(
      await Promise.map(this._getEnableConfigProviders(), this._createProviderWithHeight.bind(this)),
      provider => provider.getHeight() > 0
    );
  }

  async _createProviderWithHeight (configProvider) {
    const height = await this.getHeightForProvider(configProvider.http).catch(() => -1);
    return this._createProvider(configProvider, height);
  }

  _createProvider (configProvider, height = MIN_HEIGHT) {
    return new Provider(configProvider.ws, configProvider.http, height);
  }

  _isNewProvider (provider) {
    return (this._provider === undefined || provider.getHeight() !== this._provider.getHeight());
  }

  _replaceProvider (provider) {
    this._provider = provider;
    this.events.emit('change', provider);
    log.info('select provider ' + provider.getHttp());    
  }

  _enableProvider (provider) {
    _.pull(this._disableProviders, provider);
  }

  _isEnableConfigProvider (configProvider) {
    return _.find(this._disableProviders, provider => {
      return (provider.getWs() === configProvider.ws && provider.getHttp() === configProvider.http);
    }) === undefined;
  }

  _getEnableConfigProviders () {
    return _.filter(this._configProviders, this._isEnableConfigProvider.bind(this));
  }
}

module.exports = ProviderService;
