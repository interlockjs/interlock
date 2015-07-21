import most from "most";

import * as Pluggable from "../../pluggable";

import resolveAsset from "../modules/resolve";
import loadAst from "../modules/load-ast";

function bootstrapBundles (bundleDefs) {
  const self = this;
  return most.from(bundleDefs)
    .filter(def => def.entry || def.split)
    .map(function bootstrapBundle (bundleDef) {
      const src = bundleDef.entry || bundleDef.split;
      const asset = self.resolveAsset(src);
      const module = self.loadAst(asset);
      return {
        module: module,
        dest: bundleDef.dest,
        entry: !!bundleDef.entry,
        includeRuntime: !!bundleDef.entry && !bundleDef.excludeRuntime
      };
    });
}

export default Pluggable.stream(bootstrapBundles, { resolveAsset, loadAst });
