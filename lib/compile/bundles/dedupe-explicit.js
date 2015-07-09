import _ from "lodash";

export default function dedupeExplicit (compilation, bundlesWithDupes, modulesByAbsPath) {

  return bundlesWithDupes
    // Generate flat, naive dependency arrays.
    .map(bundle => {
      let entryModule = modulesByAbsPath[bundle.module.path];
      return _.extend({}, bundle, {
        moduleHashes: [entryModule.hash, ...entryModule.deepDependencies.map((dep) => dep.hash)],
        entryModuleHash: entryModule.hash
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
              _.contains(bundleA.moduleHashes, bundleB.module.hash)) {
            bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
          }
        });

        return bundleA;
      });
    });
}
