import { assign, map } from "lodash";

import { pluggable } from "pluggable";
import initBundle from "./init";


/**
 * Given the set of early-stage modules (originally generated from the bundle definitions)
 * and the set of fully compiled modules (indexed by their absolute path), return an array
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
    map(this.opts.entry, (bundleDef, relPath) => this.initBundle(assign({}, bundleDef, {
      module: modulesByPath[moduleSeeds[relPath].path],
      isEntryPt: true
    }))),
    map(this.opts.split, (bundleDef, relPath) => this.initBundle(assign({}, bundleDef, {
      module: modulesByPath[moduleSeeds[relPath].path],
      isEntryPt: false
    })))
  ));
}, { initBundle });
