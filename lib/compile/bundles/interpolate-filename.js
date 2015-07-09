var _ = require("lodash");

module.exports = function interpolateFilename (bundle) {
  let dest = bundle.dest
    .replace("[setHash]", bundle.setHash)
    .replace("[bundleHash]", bundle.bundleHash);
  if (bundle.module) {
    dest = dest.replace("[primaryModuleHash]", bundle.module.hash);
  }

  return _.extend({}, bundle, { dest });
};
