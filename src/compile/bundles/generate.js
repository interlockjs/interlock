import pluggable from "../../pluggable";
import getBundleSeeds from "./get-seeds";
import dedupeExplicit from "./dedupe-explicit";
import dedupeImplicit from "./dedupe-implicit";
import hashBundle from "./hash";
import interpolateFilename from "./interpolate-filename";

/**
 * Given a set of module seeds - originally generated from the bundle definitions
 * passed into the Interlock constructor - and the set of fully generated modules,
 * create bundle objects that are deduped, are populated with module objects,
 * are hashed, and have their filenames interpolated.
 *
 * Bundles outputted from this function should be ready to be transformed into
 * strings using AST->source transformation, and then written to disk.
 *
 * @param  {Object}  moduleSeeds   Early-stage module objects, indexed by their
 *                                 path relative to the compilation context.
 * @param  {Object}  moduleMaps    Maps of fully compiled modules, indexed by both
 *                                 absolute path and hash.
 *
 * @return {Array}                 Fully compiled bundles.
 */
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
