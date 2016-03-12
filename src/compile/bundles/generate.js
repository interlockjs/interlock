import { pluggable } from "pluggable";
import getBundleSeeds from "./get-seeds";
import dedupeExplicit from "./dedupe-explicit";
import dedupeImplicit from "./dedupe-implicit";
import hashBundle from "./hash";
import interpolateFilename from "./interpolate-filename";

/**
 * Define the canonical modules array for a bundle.  This should occur after
 * bundle module hashes are deduped.
 *
 * @param  {Object}  bundle      The bundle object, with no modules property.
 * @param  {Object}  moduleMaps  Has two properties - byAbsPath and byHash -
 *                               where each of these map to the compiled module
 *                               via the respective value.
 *
 * @return {Object}              The bundle object, with modules property.
 */
const populateBundleModules = pluggable(function populateBundleModules (bundle, moduleMaps) {
  return Object.assign({}, bundle, {
    modules: bundle.moduleHashes.map(hash => moduleMaps.byHash[hash])
  });
});

/**
 * Given a set of module seeds and the set of fully generated modules, generate
 * a finalized array of bundles.  These bundles will be early-stage and should
 * not be populated with the actual modules.  Instead, each bundle will be defined
 * by the module hashes (unique IDs) of the modules that comprise the bundle.
 *
 * @param  {Object}  moduleSeeds   Early-stage module objects, indexed by their
 *                                 path relative to the compilation context.
 * @param  {Object}  moduleMaps    Maps of fully compiled modules, indexed by both
 *                                 absolute path and hash.
 *
 * @return {Array}                 Early-stage bundles.
 */
const partitionBundles = pluggable(function partitionBundles (moduleSeeds, moduleMaps) {
  return this.getBundleSeeds(moduleSeeds, moduleMaps.byAbsPath)
    .then(seedBundles => this.dedupeExplicit(seedBundles, moduleMaps.byAbsPath))
    .then(this.dedupeImplicit);
}, { getBundleSeeds, dedupeExplicit, dedupeImplicit });

/**
 * Given a set of module seeds - originally generated from the bundle definitions
 * passed into the Interlock constructor - and the set of fully generated modules,
 * generate the full set of bundles that should be emitted, populate them with
 * module objects, hash them, and interpolate any output filenames.
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
  return this.partitionBundles(moduleSeeds, moduleMaps)
    .then(bundles => Promise.all(bundles.map(bundle =>
      this.populateBundleModules(bundle, moduleMaps))))
    .then(bundles => Promise.all(bundles.map(this.hashBundle)))
    .then(bundles => Promise.all(bundles.map(this.interpolateFilename)));
}, { partitionBundles, hashBundle, interpolateFilename, populateBundleModules });
