import pluggable from "../../pluggable";

export default pluggable(function initBundle (bundleDef, module, isEntryPt) {
  return {
    module,
    dest: bundleDef.dest,
    isEntry: isEntryPt,
    includeRuntime: isEntryPt && !bundleDef.excludeRuntime
  };
});
