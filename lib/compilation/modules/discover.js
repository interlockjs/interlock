var path = require("path");

var esquery = require("esquery");
var _ = require("lodash");

module.exports = function (options, applyPlugins, cache) {
  var resolve = require("./resolve")(options, applyPlugins, cache);
  var load = require("./load")(options, applyPlugins);

  return function discoverModules(modules, unhashedModule) {
    var contextPath;

    if (unhashedModule.path in modules) { return modules[unhashedModule.path]; }
    modules[unhashedModule.path] = unhashedModule;

    contextPath = path.dirname(unhashedModule.path);

    unhashedModule.requireNodes = esquery(unhashedModule.ast, "CallExpression[callee.name=require]");
    unhashedModule.dependencies = _.map(unhashedModule.requireNodes, function (requireNode) {
      var requireStr = requireNode.arguments[0].value;
      var asset = resolve(requireStr, contextPath);
      requireNode.resolved = asset.path;
      return load(asset, contextPath, unhashedModule.ns, unhashedModule.nsRoot);
    });

    _.each(unhashedModule.dependencies, function (unhashedDep) {
      discoverModules(modules, unhashedDep);
    });

    return modules;
  };

};
