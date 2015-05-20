var _ = require("lodash");

module.exports = function getFlatDependencies(module) {
  return _.flattenDeep([
    module.hash,
    _.map(module.dependencies, getFlatDependencies)
  ]);
};
