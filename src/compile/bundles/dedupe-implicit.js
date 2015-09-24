import _ from "lodash";

import pluggable from "../../pluggable";

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
          dest: implicitBundleDest,
          type: bundles[a].type
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

/**
 * Given an array of explicitly defined bundles, generate a new array of bundles
 * including new implicit bundles.  These implicit bundles will be generated from
 * the intersections of two (or more) bundles' module hashes.
 *
 * This ensures that no module is included in more than one bundle.  It further
 * ensures that any module that is depended upon by more than one bundle will be
 * split off into its own new bundle.
 *
 * @param  {Array}  explicitBundles  Bundles with module and moduleHashes properties.
 * 
 * @return {Array}                   Explicit bundles plus new implicit bundles.
 */
export default pluggable(function dedupeImplicit (explicitBundles) {
  // Take the explicit bundles array and emit implicit bundles (where the dependency
  // sets of two explicit bundles intersect) followed by the explicit bundles themselves.
  const allBundles = [];
  for (const bundle of genBundlesWithImplicit(explicitBundles, this.opts.implicitBundleDest)) {
    allBundles.push(bundle);
  }
  return allBundles;
});
