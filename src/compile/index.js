import _ from "lodash";
import Promise from "bluebird";

import { pluggable, getBaseContext } from "pluggable";

import { constructBundleAst } from "./construct";
import getModuleSeeds from "./modules/get-seeds";
import generateModuleMaps from "./modules/generate-maps";
import generateBundles from "./bundles/generate";
import generateRawBundles from "./bundles/generate-raw";

import multiprocessPlugin from "../optimizations/multiprocess";


/**
 * Given an array of bundles, generate a lookup dictionary of module hashes
 * to the destination path of the bundles that contains them.
 *
 * @param  {Array}   bundles  Compiled bundles.
 *
 * @return {Object}           moduleHash-to-URL lookup dictionary.
 */
export const getUrls = pluggable(function getUrls (bundles) {
  return bundles.reduce((urls, bundle) => {
    bundle.moduleHashes.forEach(hash => urls[hash] = bundle.dest);
    return urls;
  }, {});
});

/**
 * Given a compiled bundle and moduleHash-to-URL lookup object, output
 * the same bundle with generated AST.
 *
 * @param  {Object} bundle   Fully compiled bundle, ready to be outputed.
 * @param  {Object} urls     moduleHash-to-URL lookup dictionary.
 *
 * @return {Object}          Bundle with new `ast` property.
 */
export const constructBundle = pluggable(function constructBundle (bundle, urls) {
  return this.constructBundleAst({
    modules: bundle.modules,
    includeRuntime: bundle.includeRuntime,
    urls: bundle.isEntryPt ? urls : null,
    entryModuleHash: bundle.isEntryPt && bundle.module && bundle.module.hash || null
  })
    .then(ast => Object.assign({}, bundle, { ast }));
}, { constructBundleAst });

/**
 * Given an array of compiled bundles and a moduleHash-to-URL lookup dictionary,
 * generate a new array of bundles with new `ast` and `raw` properties.
 *
 * Some compiled bundles (as internally represented) will result in more than
 * one output file.  The canonical example of this is a JS file and its source-map.
 * Plugins may also implement mechanisms to output multiple files per bundle.
 *
 * This one-to-many relationship is defined by the generateRawBundles method, which
 * may output an array of raw bundles.
 *
 * @param  {Array}  bundlesArr  Compiled bundles.
 * @param  {Object} urls        moduleHash-to-URL lookup dictionary.
 *
 * @return {Array}              Bundles with new `raw` properties.
 */
export const emitRawBundles = pluggable(function emitRawBundles (bundlesArr, urls) {
  return Promise.all(bundlesArr.map(bundle =>
    this.constructBundle(bundle, urls)
      .then(this.generateRawBundles)
  ))
    // generateRawBundles returns arrays of bundles.  This allows, for example, a
    // source map to also be emitted along with its bundle JS.
    .then(_.flatten);
}, { constructBundle, generateRawBundles });

/**
 * Reduces an array of compiled bundles into a compilation object.  This compilation
 * object will have three key/value pairs:
 *
 * - **cache:**    populated from the compilation process
 * - **bundles:**  a mapping of destination paths to `raw` code
 * - **opts:**     the original options passed to the compilation
 *
 * @param  {Array}   bundles   Compiled bundles, generated by generateBundles.
 *
 * @return {Promise}           Compilation object.
 */
export const buildOutput = pluggable(function buildOutput (bundles) {
  return this.getUrls(bundles)
    .then(urls => this.emitRawBundles(bundles, urls))
    .then(rawBundles => _.chain(rawBundles)
        .map(rawBundle => [rawBundle.dest, rawBundle])
        .object()
        .value())
    .then(bundlesByDest => ({
      bundles: bundlesByDest,
      opts: this.opts,
      cache: this.cache
    }));
}, { getUrls, emitRawBundles });

/**
 * Loads, transforms, and bundles an application using the provided options.
 * Modules are collected and transformed, bundles are formed from those modules,
 * and those bundles are finally converted into a format that can be written
 * to disk or served over HTTP.
 *
 * @return {Promise}    Resolves to an object with three properties: `bundles`,
 *                      `opts`, and `cache`.
 */
const compile = pluggable(function compile () {
  return this.getModuleSeeds()
    .then(moduleSeeds => Promise.all([
      moduleSeeds,
      this.generateModuleMaps(_.values(moduleSeeds))
    ]))
    .then(([moduleSeeds, moduleMaps]) => this.generateBundles(moduleSeeds, moduleMaps))
    .then(this.buildOutput);
}, { getModuleSeeds, generateModuleMaps, generateBundles, buildOutput });


export default function (opts) {
  const plugins = [].concat(opts.plugins);

  if (opts.multiprocess || opts.workers) {
    plugins.push(multiprocessPlugin({
      workers: opts.workers
    }));
  }

  return compile.call(getBaseContext({
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    opts: Object.freeze(opts)
  }, plugins));
}
