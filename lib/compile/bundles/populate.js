var _ = require("lodash");

module.exports = function populateBundles(bundles, keyedModules) {
  return _.map(bundles, function (bundle) {
    bundle.modules = _.map(bundle.moduleHashes, function (hash) {
      return keyedModules[hash];
    });
    return bundle;
  });
};
