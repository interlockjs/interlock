var path = require("path");

var esquery = require("esquery");
var _ = require("lodash");

var resolve = require("./resolve");
var load = require("./load");

module.exports = function discoverModules(modules, unhashedModule) {
  var contextPath;

  if (unhashedModule.path in modules) { return modules; }
  modules[unhashedModule.path] = unhashedModule;

  contextPath = path.dirname(unhashedModule.path);

  unhashedModule.requireNodes = esquery(unhashedModule.ast, "CallExpression[callee.name=require]");
  unhashedModule.dependencies = _.map(unhashedModule.requireNodes, function (requireNode) {
    var requireStr = requireNode.arguments[0].value;
    var asset = resolve.call(this, requireStr, contextPath);
    requireNode.resolved = asset.path;
    return load.call(this, asset, contextPath, unhashedModule.ns, unhashedModule.nsRoot);
  }, this);

  _.each(unhashedModule.dependencies, function (unhashedDep) {
    discoverModules.call(this, modules, unhashedDep);
  }, this);

  return modules;
};
