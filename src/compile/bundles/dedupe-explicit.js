import _ from "lodash";

import pluggable from "../../pluggable";

function dedupeExplicit (seedBundles, modulesByAbsPath) {

  const bundles = seedBundles.map(bundle => {
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
          _.contains(bundleA.moduleHashes, modulesByAbsPath[bundleB.module.path].hash)) {
        bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
      }
    });

    return bundleA;
  });
}

export default pluggable(dedupeExplicit);
