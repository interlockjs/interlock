var _ = require("lodash");

var resolve = require("../../resolve");

function createModule(overrides) {
  return _.extend({
    path: null,
    ns: null,
    nsPath: null,
    nsRoot: null,
    rawSource: null,
    ast: null,
    requireNodes: null,
    dependencies: null,
    hash: null
  }, overrides);
}

module.exports = function resolveModule(requireStr, contextPath, ns, nsRoot) {
  var asset, resolved;
  this.cache.modulesByPath = this.cache.modulesByPath || {};

  contextPath = contextPath || this.defaults.root;
  requireStr = this.applyPlugins("preresolve", requireStr, contextPath);

  resolved = resolve(
    requireStr,
    contextPath || this.defaults.root,
    ns || this.defaults.namespace,
    nsRoot || this.defaults.root,
    this.defaults.extensions
  );

  if (!resolved) {
    throw new Error("Cannot resolve '" + requireStr + "' from '" + contextPath + "'.");
  }

  asset = this.cache.modulesByPath[resolved.path] || createModule(resolved);
  asset = this.applyPlugins("postresolve", asset, requireStr);
  return this.cache.modulesByPath[resolved.path] = asset;
};
