var _ = require("lodash");

module.exports = function (options, cache, applyPlugins) {
  var getFlatDependencies = require("../modules/get-flat-dependencies")(options, cache, applyPlugins);

  return function settleExclusiveBundleModules(bundles) {
    // Generate flat dependency arrays.
    _.each(bundles, function (bundle) {
      bundle.moduleHashes = getFlatDependencies(bundle.module);
    });

    // Remove explicit bundle modules and their dependencies from other bundles.
    _.each(bundles, function (bundleA) {
      _.each(bundles, function (bundleB) {
        if (bundleA !== bundleB && _.contains(bundleA.moduleHashes, bundleB.module.hash)) {
          bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
        }
      });
    });

    // Create new bundles from the intersections of existing bundles.
    _.each(bundles, function (bundleA) {
      _.each(bundles, function (bundleB) {
        var intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);
        if (intersection) {
          bundleA.moduleHashes = _.difference(bundleA.moduleHashes, intersection);
          bundleB.moduleHashes = _.difference(bundleB.moduleHashes, intersection);
          bundles.push({
            moduleHashes: intersection,
            dest: options.implicitBundleDest
          });
        }
      });
    });

    return bundles;
  };
};

