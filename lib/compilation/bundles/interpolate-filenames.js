var _ = require("lodash");

module.exports = function interpolateFilenames(bundles) {
  return _.map(bundles, function (bundle) {
    bundle.dest = bundle.dest
      .replace("[setHash]", bundle.setHash)
      .replace("[bundleHash]", bundle.bundleHash);
    if (bundle.module) {
      bundle.dest = bundle.dest.replace("[primaryModuleHash]", bundle.module.hash);
    }
    return bundle;
  });
};
