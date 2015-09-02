import _ from "lodash";

import * as Pluggable from "../../pluggable";

function dedupeExplicit (bundlesWithDupes, modulesByAbsPath) {

  return bundlesWithDupes
    // Generate flat, naive dependency arrays.
    .map(bundle => {
      const module = modulesByAbsPath[bundle.module.path];
      return _.extend({}, bundle, {
        moduleHashes: [module.hash, ...module.deepDependencies.map((dep) => dep.hash)],
        module
      });
    })

    // Collect all bundles into array.
    .reduce((bundles, bundle) => {
      bundles.push(bundle);
      return bundles;
    }, [])

    // For each explicitly-defined bundle, remove that bundle's entry module
    // and other deep dependencies from other bundles' module arrays.
    .then(bundles => {
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
    });
}

export default Pluggable.promise(dedupeExplicit);
