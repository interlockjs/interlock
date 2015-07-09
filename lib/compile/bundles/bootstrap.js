import most from "most";

import resolveAsset from "../modules/resolve";
import loadAst from "../modules/load-ast";

export default function (compilation) {
  return most
    .from(compilation.opts.emit)
    .filter(def => def.entry || def.split)
    .map(function bootstrapBundle (bundleDef) {
      const src = bundleDef.entry || bundleDef.split;
      const asset = resolveAsset.call(compilation, src);
      const module = loadAst.call(compilation, asset);
      return {
        module: module,
        dest: bundleDef.dest,
        entry: !!bundleDef.entry,
        includeRuntime: !!bundleDef.entry && !bundleDef.excludeRuntime
      };
    });
}
