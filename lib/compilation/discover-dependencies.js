var path = require("path");

var esquery = require("esquery");
var _ = require("lodash");

module.exports = function (options, cache, applyPlugins) {
  return function discoverDependencies(unhashedModule) {
    var contextPath;

    if (unhashedModule.path in this.modules) { return this.modules[unhashedModule.path]; }
    this.modules[unhashedModule.path] = unhashedModule;

    contextPath = path.dirname(unhashedModule.path);

    unhashedModule.requireNodes = esquery(unhashedModule.ast, "CallExpression[callee.name=require]");
    unhashedModule.dependencies = _.map(unhashedModule.requireNodes, function (requireNode) {
      var requireStr = requireNode.arguments[0].value;
      var asset = this.resolveAsset(requireStr, contextPath);
      requireNode.resolved = asset.path;
      return this.loadModule(asset, contextPath, unhashedModule.ns, unhashedModule.nsRoot);
    }, this);

    _.each(unhashedModule.dependencies, function (unhashedDep) {
      this.discoverDependencies(unhashedDep);
    }, this);

    return unhashedModule;
  };

};
