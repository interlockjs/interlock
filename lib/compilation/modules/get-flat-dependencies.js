var _ = require("lodash");

module.exports = function (options, cache, applyPlugins) {
  return function getFlatDependencies(module) {
    return _.flattenDeep([
      module.hash,
      _.map(module.dependencies, getFlatDependencies)
    ]);
  };
};
