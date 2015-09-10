import most from "most";

import * as Pluggable from "../../pluggable";
import resolveModule from "../modules/resolve";
import loadModule from "../modules/load";

import { entries } from "../../util/object";

const bootstrapBundle = Pluggable.promise(function bootstrapBundle (srcPath, bundlDef, isEntryPt) {
  return this.resolveModule(srcPath)
    .then(asset => this.loadModule(asset))
    .then(module => {
      return {
        module,
        dest: bundlDef.dest,
        isEntry: isEntryPt,
        includeRuntime: isEntryPt && !bundlDef.excludeRuntime
      };
    });
}, { resolveModule, loadModule });

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
