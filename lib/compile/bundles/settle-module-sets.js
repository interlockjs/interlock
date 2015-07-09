const most = require("most");
const _ = require("lodash");

function* genBundlesWithImplicit (bundles, implicitBundleDest) {
  var a, b;
  bundles = bundles.slice();

  for (a = 0; a < bundles.length; a++) {
    let bundleA = bundles[a];

    for (b = a + 1; b < bundles.length; b++) {
      let bundleB = bundles[b];
      let intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);

      if (intersection.length) {
        let moduleHashesA = _.difference(bundleA.moduleHashes, intersection);
        let moduleHashesB = _.difference(bundleB.moduleHashes, intersection);
        bundles[a] = _.extend({}, bundleA, { moduleHashes: moduleHashesA });
        bundles[b] = _.extend({}, bundleB, { moduleHashes: moduleHashesB });

        yield {
          moduleHashes: intersection,
          dest: implicitBundleDest
        };
      }
    }
  }

  yield* bundles;
}

module.exports = function settleModuleSets (compilation, unsettledBundles) {

  let explicitBundles = unsettledBundles

    // Generate flat, naive dependency arrays.
    .map((bundle) => {
      bundle = _.clone(bundle);
      bundle.moduleHashes =
        [bundle.module.hash, ...bundle.module.deepDependencies.map((dep) => dep.hash)];
      return bundle;
    })

    // Collect all bundles into array.
    .reduce((bundles, bundle) => {
      bundles.push(bundle);
      return bundles;
    }, [])

    // For each explicitly-defined bundle, remove that bundle's entry module
    // and other deep dependencies from other bundles' module hashes arrays.
    .then((bundles) => {
      return _.map(bundles, function (bundleA) {
        bundleA = _.clone(bundleA);

        _.each(bundles, function (bundleB) {
          if (bundleA !== bundleB && _.contains(bundleA.moduleHashes, bundleB.module.hash)) {
            bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
          }
        });

        return bundleA;
      });
    });

  // Take the eventual explicit bundles array and emit implicit bundles (where
  // the dependency sets of two explicit bundles intersect) followed by the
  // explicit bundles themselves.
  return most
    .fromPromise(explicitBundles)
    .flatMap(function (bundles) {
      return most.generate(genBundlesWithImplicit, bundles, compilation.opts.implicitBundleDest);
    });
};
