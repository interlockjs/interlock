import _ from "lodash";

import pluggable from "../../pluggable";


/**
 * First, update the bundle's `module` property to refer to the compiled
 * version of the module.  Then generate a moduleHashes property for each
 * of the bundles, containing all hashes for all modules in the bundle's
 * dependency branch.
 *
 * Then, identify bundles that include the entry module from another bundle.
 * When found, remove all of the second module's bundles from the first.
 *
 * This will ensure that for any explicitly-defined bundle, other bundles
 * will not include its module or module-dependencies.  This avoids copies
 * of a module from appearing in multiple bundles.
 *
 * @param  {Array}  bundleSeeds       Early-stage bundle objects without module
 *                                    or moduleHashes properties.
 * @param  {Object} modulesByAbsPath  Map of absolute paths to compiled modules.
 *
 * @return {Array}                    Bundle objects with explicit intersections
 *                                    removed and new module and moduleHashes
 *                                    properties.
 */
function dedupeExplicit (bundleSeeds, modulesByAbsPath) {
  const bundles = bundleSeeds.map(bundle => {
  // Generate flat, naive dependency arrays.
    const module = modulesByAbsPath[bundle.module.path];
    return _.extend({}, bundle, {
      moduleHashes: [module.hash, ...module.deepDependencies.map((dep) => dep.hash)],
      module
    });
  });

  // For each explicitly-defined bundle, remove that bundle's entry module
  // and other deep dependencies from other bundles' module arrays.
  return bundles.map(bundleA => {
    bundleA = Object.assign({}, bundleA);

    bundles.forEach(bundleB => {
      if (bundleA.module.path !== bundleB.module.path &&
          _.contains(bundleA.moduleHashes, bundleB.module.hash)) {
        bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
      }
    });

    return bundleA;
  });
}

export default pluggable(dedupeExplicit);
