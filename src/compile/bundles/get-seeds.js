import _ from "lodash";

import pluggable from "../../pluggable";

export const initBundle = pluggable(function initBundle (bundleDef, module, isEntryPt) {
  if (module.type !== "javascript") {
    throw new Error("Cannot create JS bundle for non-JavaScript module. " +
      "Please configure appropriate plugin.");
  }
  return {
    module,
    type: "javascript",
    dest: bundleDef.dest,
    isEntry: isEntryPt,
    includeRuntime: isEntryPt && !bundleDef.excludeRuntime
  };
});

/**
 * Given the set of early-stage modules (originally generated from the bundle definitions)
 * and the set of fully compiled modules (indexed by their absolute path), turn an array
 * of early-stage bundles.  These bundles do not yet know about which modules they contain,
 * but do hold a reference to the root module of their branch of the dependency graph.
 *
 * @param  {Object}   moduleSeeds     Early-stage modules, indexed by path relative to
 *                                    the compilation context.
 * @param  {Object}   modulesByPath   Fully compiled modules, indexed by absolute path.
 *
 * @return {Array}                    Early-stage bundles with `module` property.
 */
export default pluggable(function getBundleSeeds (moduleSeeds, modulesByPath) {
  return Promise.all([].concat(
    _.map(this.opts.entry, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], true)),
    _.map(this.opts.split, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], false))
  ));
}, { initBundle });
