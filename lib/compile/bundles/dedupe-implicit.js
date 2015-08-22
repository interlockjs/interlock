import most from "most";
import _ from "lodash";

import * as Pluggable from "../../pluggable";

function* genBundlesWithImplicit (bundles, implicitBundleDest) { // eslint-disable-line max-len,max-statements
  bundles = bundles.slice();

  for (let a = 0; a < bundles.length; a++) {
    const bundleA = bundles[a];
    const bundleLengthAtIteration = bundles.length;

    for (let b = a + 1; b < bundleLengthAtIteration; b++) {
      const bundleB = bundles[b];
      const intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);

      if (intersection.length) {
        const moduleHashesA = _.difference(bundleA.moduleHashes, intersection);
        const moduleHashesB = _.difference(bundleB.moduleHashes, intersection);
        bundles[a] = Object.assign({}, bundleA, { moduleHashes: moduleHashesA });
        bundles[b] = Object.assign({}, bundleB, { moduleHashes: moduleHashesB });

        bundles.push({
          moduleHashes: intersection,
          dest: implicitBundleDest
        });
      }
    }
  }

  for (const bundle of bundles) {
    if (bundle.moduleHashes.length) {
      yield bundle;
    }
  }
}

function dedupeImplicit (explicitBundles) {
  // Take the explicit bundles array and emit implicit bundles (where the dependency
  // sets of two explicit bundles intersect) followed by the explicit bundles themselves.
  return most.generate(
    genBundlesWithImplicit, explicitBundles, this.opts.implicitBundleDest);
}

export default Pluggable.stream(dedupeImplicit);
