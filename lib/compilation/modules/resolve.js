var _ = require("lodash");

var resolve = require("../../resolve");

module.exports = function (options, cache, applyPlugins) {
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

  return function resolveModule(requireStr, contextPath, ns, nsRoot) {
    var asset, resolved;
    cache.modulesByPath = cache.modulesByPath || {};

    contextPath = contextPath || options.root;
    requireStr = applyPlugins("preresolve", requireStr, contextPath);

    resolved = resolve(
      requireStr,
      contextPath || options.root,
      ns || options.namespace,
      nsRoot || options.root,
      options.extensions
    );

    if (!resolved) {
      throw new Error("Cannot resolve '" + requireStr + "' from '" + contextPath + "'.");
    }

    asset = cache.modulesByPath[resolved.path] || createModule(resolved);
    asset = applyPlugins("postresolve", asset, requireStr);
    return cache.modulesByPath[resolved.path] = asset;
  };
};
