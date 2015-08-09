import most from "most";

import * as Pluggable from "../../pluggable";
import resolveAsset from "../modules/resolve";
import loadAst from "../modules/load-ast";

import { entries } from "../../util/object";

const bootstrapBundle = Pluggable.promise(function bootstrapBundle (srcPath, bundlDef, isEntryPt) {
  return this.resolveAsset(srcPath)
    .then(asset => this.loadAst(asset))
    .then(module => {
      return {
        module: module,
        dest: bundlDef.dest,
        entry: isEntryPt,
        includeRuntime: isEntryPt && !bundlDef.excludeRuntime
      };
    });
}, { resolveAsset, loadAst });

function bootstrapBundles (entryPointDefs, splitPointDefs) {
  const entryPointBundles = most.generate(entries, entryPointDefs)
    .map(([srcPath, bundleDef]) => this.bootstrapBundle(srcPath, bundleDef, true))
    .await();
  const splitPointBundles = most.generate(entries, splitPointDefs)
    .map(([srcPath, splitDef]) => this.bootstrapBundle(srcPath, splitDef, false))
    .await();

  return most.merge(entryPointBundles, splitPointBundles);
}

export default Pluggable.stream(bootstrapBundles, { bootstrapBundle });
