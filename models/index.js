const requireAll = require('require-all'),
  models = requireAll({
    dirname: __dirname,
    filter: /(.+Model)\.js$/
  });

/** @function
 * @description prepare (init) the mongoose models
 *
 */

const init = () => {
  for (let modelName of Object.keys(models))
    ctx[modelName] = models[modelName]();
};

const ctx = {
  init: init
};

/** @factory
 * @return {{init: init, ...Models}}
 */

module.exports = ctx;
