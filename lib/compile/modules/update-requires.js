var _ = require("lodash");

module.exports = function updateRequires(module, modules) {
  _.each(module.requireNodes, function (requireNode) {
    var requireHash = modules[requireNode.resolved].hash;
    requireNode.arguments[0].oldValue = requireNode.arguments[0].value;
    requireNode.arguments[0].value = requireHash;
    requireNode.arguments[0].raw = "\"" + requireHash + "\"";
  });
  return module;
};
