var _ = require("lodash");

module.exports = function (options, cache, applyPlugins) {
  return function updateRequires(module) {
    _.each(module.requireNodes, function (requireNode) {
      var requireHash = cache.modules[requireNode.resolved];
      requireNode.arguments[0].oldValue = requireNode.arguments[0].value;
      requireNode.arguments[0].value = requireHash;
    });
  };
};
