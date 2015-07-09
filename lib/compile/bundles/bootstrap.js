import most from "most";

import resolveAsset from "../modules/resolve";
import loadAst from "../modules/load-ast";

export default function (compilation) {
  return most
    .from(compilation.opts.bundles)
    .map(function bootstrapBundle (bundleOpts) {
      const asset = resolveAsset.call(compilation, bundleOpts.src);
      const module = loadAst.call(compilation, asset);
      return {
        module: module,
        dest: bundleOpts.dest,
        entry: !!bundleOpts.entry,
        includeRuntime: bundleOpts.includeRuntime === false ? false : true
      };
    });
}
