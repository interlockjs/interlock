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

  contextPath = contextPath || this.opts.root;
  requireStr = this.applyPlugins("preresolve", requireStr, contextPath);

  resolved = resolve(
    requireStr,
    contextPath || this.opts.root,
    ns || this.opts.ns,
    nsRoot || this.opts.root,
    this.opts.extensions
  );

  if (!resolved) {
    throw new Error("Cannot resolve '" + requireStr + "' from '" + contextPath + "'.");
  }

  asset = this.applyPlugins("postresolve", createModule(resolved), requireStr);
  return asset;
};
