import { assign, difference, intersection, filter } from "lodash";
import Promise from "bluebird";

import { pluggable } from "pluggable";
import initBundle from "./init";


const genBundlesWithImplicit = Promise.coroutine(function* (bundles) {
  bundles = bundles.slice();

  for (let a = 0; a < bundles.length; a++) {
    const bundleA = bundles[a];
    const bundleLengthAtIteration = bundles.length;

    for (let b = a + 1; b < bundleLengthAtIteration; b++) {
      const bundleB = bundles[b];
      const commonHashes = intersection(bundleA.moduleHashes, bundleB.moduleHashes);

      if (commonHashes.length) {
        const moduleHashesA = difference(bundleA.moduleHashes, commonHashes);
        const moduleHashesB = difference(bundleB.moduleHashes, commonHashes);
        bundles[a] = assign({}, bundleA, { moduleHashes: moduleHashesA });
        bundles[b] = assign({}, bundleB, { moduleHashes: moduleHashesB });

        bundles.push(yield this.initBundle({
          moduleHashes: intersection,
          type: bundles[a].type,
          excludeRuntime: true
        }));
      }
    }
  }

  return filter(bundles, bundle => bundle.moduleHashes.length);
});

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
  return genBundlesWithImplicit.call(this, explicitBundles);
}, { initBundle });
