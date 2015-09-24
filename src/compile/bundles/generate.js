import pluggable from "../../pluggable";
import getBundleSeeds from "./get-seeds";
import dedupeExplicit from "./dedupe-explicit";
import dedupeImplicit from "./dedupe-implicit";
import hashBundle from "./hash";
import interpolateFilename from "./interpolate-filename";

export default pluggable(function generateBundles (moduleSeeds, moduleMaps) {
  function getModulesFromHashes (bundle) {
    return Object.assign({}, bundle, {
      modules: bundle.moduleHashes.map(hash => moduleMaps.byHash[hash])
    });
  }

  return this.getBundleSeeds(moduleSeeds, moduleMaps.byAbsPath)
    .then(seedBundles => this.dedupeExplicit(seedBundles, moduleMaps.byAbsPath))
    .then(this.dedupeImplicit)
    .then(bundles => bundles.map(getModulesFromHashes))
    .then(bundles => Promise.all(bundles.map(this.hashBundle)))
    .then(bundles => Promise.all(bundles.map(this.interpolateFilename)));
}, { getBundleSeeds, dedupeExplicit, dedupeImplicit, hashBundle, interpolateFilename });
