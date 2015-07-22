import most from "most";
import escodegen from "escodegen";

import * as Pluggable from "../pluggable";
import construct from "./construct";
import compileModules from "./modules/compile";
import bootstrapBundles from "./bundles/bootstrap";
import hashBundle from "./bundles/hash";
import interpolateFilename from "./bundles/interpolate-filename";
import dedupeExplicit from "./bundles/dedupe-explicit";
import dedupeImplicit from "./bundles/dedupe-implicit";


export const bootstrapCompilation = Pluggable.sync(function bootstrapCompilation (opts) {
  return {
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    opts: Object.freeze(opts)
  };
});

export const getModuleMaps = Pluggable.promise(function getModuleMaps (seedModules) {
  return this.compileModules(seedModules)
    .reduce((moduleMaps, module) => {
      moduleMaps.byHash[module.hash] = module;
      moduleMaps.byAbsPath[module.path] = module;
      return moduleMaps;
    }, {
      byHash: {},
      byAbsPath: {}
    });
}, { compileModules });

export const getBundles = Pluggable.sync(function getBundles (bootstrappedBundles, moduleMapsPromise) {
  const explicitDedupedBundlesPromise = moduleMapsPromise
    .then(moduleMaps => this.dedupeExplicit(bootstrappedBundles, moduleMaps.byAbsPath));

  return most
    .fromPromise(Promise.all([moduleMapsPromise, explicitDedupedBundlesPromise]))
    .take(1)
    // TODO: The below flapMap method is being invoked twice, even with the take(1) above.
    // All subsequent methods in the chain fire 2x what they should. Identify the reason why
    // this is happening.
    .flatMap(resolved => {
      let [{byHash}, explicitBundles] = resolved;
      return this.dedupeImplicit(explicitBundles)
        // Populate bundles with module objects.
        .map(bundle => Object.assign({}, bundle, {
          modules: bundle.moduleHashes.map(hash => byHash[hash])
        }));
    })
    .map(this.hashBundle)
    .map(this.interpolateFilename);

}, { dedupeExplicit, dedupeImplicit, hashBundle, interpolateFilename });

function compile (opts) {
  const compilation = bootstrapCompilation(opts);

  const bootstrappedBundles = bootstrapBundles.call(compilation, compilation.opts.emit);
  const seedModules = bootstrappedBundles.map(bundle => bundle.module);
  const moduleMapsPromise = getModuleMaps.call(compilation, seedModules);
  const bundles = getBundles.call(compilation, bootstrappedBundles, moduleMapsPromise);

  const urlsPromise = bundles
    .reduce((urls, bundle) => {
      bundle.moduleHashes.forEach(hash => urls[hash] = bundle.dest);
      return urls;
    }, {});

  return urlsPromise.then(urls => {
    return bundles.reduce((output, bundle) => {
      const bundleAst = construct.bundle({
        modules: bundle.modules,
        includeRuntime: bundle.includeRuntime,
        urls: bundle.entry ? urls : null,
        initialRequire: bundle.entryModuleHash || null,
        cacheMode: opts.cacheMode
      });

      const {code, map} = escodegen.generate(bundleAst, {
        format: { indent: { style: "  " } },
        sourceMap: !!compilation.opts.sourceMaps,
        sourceMapWithCode: true,
        comment: !!compilation.opts.includeComments
      });

      output.bundles[bundle.dest] = Object.assign({}, bundle, { raw: code });
      if (compilation.opts.sourceMaps === true) {
        const mapDest = bundle.dest + ".map";
        output.bundles[bundle.dest].raw += `\n//# sourceMappingUrl=${mapDest}`;
        output.bundles[mapDest] = { raw: map, dest: mapDest };
      }

      return output;
    }, {
      cache: compilation.cache,
      bundles: {},
      opts: compilation.opts
    });
  });
}

export default compile;
