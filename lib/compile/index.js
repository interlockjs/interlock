import most from "most";
import escodegen from "escodegen";

import applyPlugins from "./apply-plugins";
import construct from "./construct";
import compileModules from "./modules/compile";
import bootstrapBundles from "./bundles/bootstrap";
import hashBundle from "./bundles/hash";
import interpolateFilename from "./bundles/interpolate-filename";
import dedupeExplicit from "./bundles/dedupe-explicit";
import dedupeImplicit from "./bundles/dedupe-implicit";

export default function compile (opts, compilation) {
  compilation = compilation || {
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    applyPlugins: (ev, ...args) => applyPlugins(opts.plugins, ev, ...args),
    opts: opts
  };

  compilation.applyPlugins("precompile");

  const bootstrappedBundles = bootstrapBundles(compilation);

  const seedModules = bootstrappedBundles.map(bundle => bundle.module);

  const moduleMapsPromise = compileModules(compilation, seedModules)
    .reduce((moduleMaps, module) => {
      moduleMaps.byHash[module.hash] = module;
      moduleMaps.byAbsPath[module.path] = module;
      return moduleMaps;
    }, {
      byHash: {},
      byAbsPath: {}
    });

  const explicitDedupedBundlesPromise = moduleMapsPromise
    .then(moduleMaps => {
      return dedupeExplicit(compilation, bootstrappedBundles, moduleMaps.byAbsPath);
    });

  const bundles = most
    .fromPromise(Promise.all([moduleMapsPromise, explicitDedupedBundlesPromise]))
    .take(1)
    // TODO: The below flapMap method is being invoked twice, even with the take(1) above.
    // All subsequent methods in the chain fire 2x what they should. Identify the reason why
    // this is happening.
    .flatMap(resolved => {
      let [{byHash}, explicitBundles] = resolved;
      return dedupeImplicit(compilation, explicitBundles)
        // Populate bundles with module objects.
        .map(bundle => Object.assign({}, bundle, {
          modules: bundle.moduleHashes.map(hash => byHash[hash])
        }));
    })
    .map(hashBundle)
    .map(interpolateFilename);

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

      output.bundles[bundle.dest] = code;
      if (compilation.opts.sourceMaps === true) {
        const mapDest = bundle.dest + ".map";
        output.bundles[bundle.dest] += `\n//# sourceMappingUrl=${mapDest}`;
        output.bundles[mapDest] = map;
      }

      return output;
    }, {
      cache: compilation.cache,
      bundles: {}
    });
  });
}
