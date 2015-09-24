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

export default pluggable(function getBundleSeeds (moduleSeeds, modulesByPath) {
  return Promise.all([].concat(
    _.map(this.opts.entry, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], true)),
    _.map(this.opts.split, (bundleDef, relPath) =>
      this.initBundle(bundleDef, modulesByPath[moduleSeeds[relPath].path], false))
  ));
}, { initBundle });
