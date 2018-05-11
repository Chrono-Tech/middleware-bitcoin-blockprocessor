const requireAll = require('require-all'),
  config = require('../config'),
  DataSource = require('loopback-datasource-juggler').DataSource;

const storages = {
  accounts: new DataSource(config.storage.accounts.type, {url: config.storage.accounts.uri}),
  data: new DataSource(config.storage.data.type, {url: config.storage.data.uri})
};

const models = requireAll({
  dirname: __dirname,
  filter: /(.+Model)\.js$/,
  resolve: model => model(storages)
});

const init = async () => {

  for (let model of [models.accountModel.definition.name])
    await storages.accounts.autoupdate([model]).catch(async () => {
      await storages.accounts.automigrate([model]);
    });

  for (let model of [models.txModel.definition.name, models.blockModel.definition.name,
    models.txInputsModel.definition.name, models.txOutputsModel.definition.name,
    models.txAddressRelationsModel.definition.name])
    await storages.data.autoupdate([model]).catch(async () => {
      await storages.data.automigrate([model]);
    });

};

module.exports = {
  models: models,
  storages: storages,
  init: init
};
