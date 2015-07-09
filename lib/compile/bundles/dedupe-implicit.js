import most from "most";
import _ from "lodash";

function* genBundlesWithImplicit (bundles, implicitBundleDest) {
  bundles = bundles.slice();

  for (let a = 0; a < bundles.length; a++) {
    let bundleA = bundles[a];
    let bundleLengthAtIteration = bundles.length;

    for (let b = a + 1; b < bundleLengthAtIteration; b++) {
      let bundleB = bundles[b];
      let intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);

      if (intersection.length) {
        let moduleHashesA = _.difference(bundleA.moduleHashes, intersection);
        let moduleHashesB = _.difference(bundleB.moduleHashes, intersection);
        bundles[a] = Object.assign({}, bundleA, { moduleHashes: moduleHashesA });
        bundles[b] = Object.assign({}, bundleB, { moduleHashes: moduleHashesB });

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

export default function dedupeImplicit (compilation, explicitBundles) {
  // Take the explicit bundles array and emit implicit bundles (where the dependency
  // sets of two explicit bundles intersect) followed by the explicit bundles themselves.
  return most.generate(
    genBundlesWithImplicit, explicitBundles, compilation.opts.implicitBundleDest);
}
