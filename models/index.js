const requireAll = require('require-all'),
  models = requireAll({
    dirname: __dirname,
    filter: /(.+Model)\.js$/
  });

const init = () => {

  for (let modelName of Object.keys(models))
    ctx[modelName] = models[modelName]();

};

const ctx = {
  init: init
};

module.exports = ctx;
