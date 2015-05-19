var path = require("path");

var esquery = require("esquery");
var _ = require("lodash");

module.exports = function (options, cache, applyPlugins) {
  var resolveAsset = require("./resolve-asset")(options, cache, applyPlugins);
  var loadModule = require("./load-module")(options, cache, applyPlugins);

  return function discoverDependencies(unhashedModule) {
    var contextPath;

    if (unhashedModule.path in cache.modules) { return cache.modules[unhashedModule.path]; }
    cache.modules[unhashedModule.path] = unhashedModule;

    contextPath = path.dirname(unhashedModule.path);

    unhashedModule.requireNodes = esquery(unhashedModule.ast, "CallExpression[callee.name=require]");
    unhashedModule.dependencies = _.map(unhashedModule.requireNodes, function (requireNode) {
      var requireStr = requireNode.arguments[0].value;
      var asset = resolveAsset(requireStr, contextPath);
      requireNode.resolved = asset.path;
      return loadModule(asset, contextPath, unhashedModule.ns, unhashedModule.nsRoot);
    }, this);

    _.each(unhashedModule.dependencies, function (unhashedDep) {
      discoverDependencies(unhashedDep);
    }, this);

    return unhashedModule;
  };

};
