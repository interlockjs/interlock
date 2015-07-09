var _ = require("lodash");
var most = require("most");
var escodegen = require("escodegen");

var construct = require("./construct");
const compileModules = require("./modules/compile");
const bootstrapBundles = require("./bundles/bootstrap");
const hashBundle = require("./bundles/hash");
const interpolateFilename = require("./bundles/interpolate-filename");
const dedupeExplicit = require("./bundles/dedupe-explicit");
const dedupeImplicit = require("./bundles/dedupe-implicit");

module.exports = function compile (opts, compilation) {
  compilation = compilation || {
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    applyPlugins: _.partial(require("./apply-plugins"), opts.plugins || []),
    opts: opts
  };

  compilation.applyPlugins("precompile");

  const bootstrappedBundles = bootstrapBundles(compilation);

  const seedModules = bootstrappedBundles.map((bundle) => bundle.module);

  const moduleMapsPromise = compileModules(compilation, seedModules)
    .reduce((_moduleMaps, module) => {
      _moduleMaps.byHash[module.hash] = module;
      _moduleMaps.byAbsPath[module.path] = module;
      return _moduleMaps;
    }, {
      byHash: {},
      byAbsPath: {}
    });

  const explicitDedupedBundlesPromise = moduleMapsPromise
    .then(_moduleMaps => {
      return dedupeExplicit(compilation, bootstrappedBundles, _moduleMaps.byAbsPath);
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
        .map(bundle => _.extend({}, bundle, {
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
      let bundleAst = construct.bundle({
        modules: bundle.modules,
        includeRuntime: bundle.includeRuntime,
        urls: bundle.entry ? urls : null,
        initialRequire: bundle.entry ? bundle.module.hash : null,
        cacheMode: opts.cacheMode
      });

      output.bundles[bundle.dest] = escodegen.generate(bundleAst, {
        format: { indent: { style: "  " } },
        comment: true
      });

      return output;
    }, {
      cache: compilation.cache,
      bundles: {}
    });
  });
};
