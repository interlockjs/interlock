import pluggable from "../../pluggable";

export default pluggable(function initBundle (opts = {}) {
  const {
    dest = this.opts.implicitBundleDest,
    module,
    moduleHashes = [],
    modules = [],
    isEntryPt = false,
    type = "javascript",
    excludeRuntime = false
  } = opts;
  const includeRuntime = !excludeRuntime;

  if (type !== "javascript") {
    throw new Error("Cannot create JS bundle for non-JavaScript module. " +
      "Please configure appropriate plugin.");
  }

  return {
    module,
    moduleHashes,
    modules,
    dest,
    type,
    isEntryPt,
    includeRuntime
  };
});
