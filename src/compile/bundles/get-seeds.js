import _ from "lodash";

import pluggable from "../../pluggable";

export const initBundle = pluggable(function initBundle (bundleDef, module, isEntryPt) {
  return {
    module,
    dest: bundleDef.dest,
    isEntry: isEntryPt,
    includeRuntime: isEntryPt && !bundleDef.excludeRuntime
  };
});

export default pluggable(function getBundleSeeds (moduleSeeds, modulesByPath) {
  return Promise.all([].concat(
    _.map(this.opts.entry, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], true)),
    _.map(this.opts.split, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], false))
  ));
}, { initBundle });
