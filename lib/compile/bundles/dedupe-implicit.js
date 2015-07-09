
const most = require("most");
const _ = require("lodash");

function* genBundlesWithImplicit (bundles, implicitBundleDest) {
  var a, b;
  bundles = bundles.slice();

  for (a = 0; a < bundles.length; a++) {
    let bundleA = bundles[a];
    let bundleLengthAtIteration = bundles.length;

    for (b = a + 1; b < bundleLengthAtIteration; b++) {
      let bundleB = bundles[b];
      let intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);

      if (intersection.length) {
        let moduleHashesA = _.difference(bundleA.moduleHashes, intersection);
        let moduleHashesB = _.difference(bundleB.moduleHashes, intersection);
        bundles[a] = _.extend({}, bundleA, { moduleHashes: moduleHashesA });
        bundles[b] = _.extend({}, bundleB, { moduleHashes: moduleHashesB });

        bundles.push({
          moduleHashes: intersection,
          dest: implicitBundleDest
        });
      }
    }
  }

  for (let bundle of bundles) {
    if (bundle.moduleHashes.length) {
      yield bundle;
    }
  }
}

module.exports = function dedupeImplicit (compilation, explicitBundles) {
  // Take the explicit bundles array and emit implicit bundles (where the dependency
  // sets of two explicit bundles intersect) followed by the explicit bundles themselves.
  return most.generate(genBundlesWithImplicit, explicitBundles, compilation.opts.implicitBundleDest);
};
