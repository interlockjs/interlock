const most = require("most");

const resolveAsset = require("../modules/resolve");
const loadModule = require("../modules/load");

module.exports = function (compilation) {
  function bootstrapBundle (bundleOpts) {
    const asset = resolveAsset.call(compilation, bundleOpts.src);
    const module = loadModule.call(compilation, asset);
    return {
      module: module,
      dest: bundleOpts.dest,
      entry: !!bundleOpts.entry,
      includeRuntime: bundleOpts.includeRuntime === false ? false : true
    };
  }

  return most
    .from(compilation.opts.bundles)
    .map(bootstrapBundle);
};
