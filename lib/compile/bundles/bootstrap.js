import most from "most";

import * as Pluggable from "../../pluggable";
import resolveAsset from "../modules/resolve";
import loadAst from "../modules/load-ast";

import { entries } from "../../util";

const bootstrapBundle = Pluggable.sync(function bootstrapBundle (srcPath, definition, isEntryPt) {
  const asset = this.resolveAsset(srcPath);
  const module = this.loadAst(asset);
  return {
    module: module,
    dest: definition.dest,
    entry: isEntryPt,
    includeRuntime: !!definition.entry && !definition.excludeRuntime
  };
}, { resolveAsset, loadAst });

function bootstrapBundles (entryPointDefs, splitPointDefs) {
  const entryPointBundles = most.generate(entries, entryPointDefs)
    .map(([srcPath, bundleDef]) => this.bootstrapBundle(srcPath, bundleDef, true));
  const splitPointBundles = most.generate(entries, splitPointDefs)
    .map(([srcPath, splitDef]) => this.bootstrapBundle(srcPath, splitDef, false));

  return most.merge(entryPointBundles, splitPointBundles);
}

export default Pluggable.stream(bootstrapBundles, { bootstrapBundle });
