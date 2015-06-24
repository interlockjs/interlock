var _ = require("lodash");
var escodegen = require("escodegen");

var construct = require("./construct");
var populateBundles = require("./bundles/populate");
var hashBundles = require("./bundles/hash");
var updateRequires = require("./modules/update-requires");
var interpolateFilenames = require("./bundles/interpolate-filenames");
var resolveAsset = require("./modules/resolve");
var loadModule = require("./modules/load");
var discoverModules = require("./modules/discover");
var hashModule = require("./modules/hash");
var settleModuleSets = require("./bundles/settle-module-sets");

function bootstrapBundle (bundleDef) {
  var asset = resolveAsset.call(compilation, bundleDef.src);
  var module = loadModule.call(compilation, asset);
  return {
    module: module,
    dest: bundleDef.dest,
    entry: !!bundleDef.entry,
    includeRuntime: bundleDef.includeRuntime === false ? false : true
  };
}

module.exports = function compile(opts) {
  var keyedModules, urls, bundles, modules;
  var compilation = {
    cache: {},
    applyPlugins: _.partial(require("./apply-plugins"), opts.plugins || []),
    defaults: opts // TODO: filter this and enumerate possible default values
  };

  compilation.applyPlugins("precompile");

  bundles = _.map(opts.bundles, bootstrapBundle);

  modules = _.reduce(bundles, function (m, bundle) {
    return discoverModules.call(compilation, m, bundle.module);
  }, {});

  _.each(bundles, function (bundle) { hashModule.call(compilation, bundle.module); });

  modules = _.map(modules, function (module) {
    return updateRequires(module, modules);
  });

  bundles = settleModuleSets.call(compilation, bundles);

  keyedModules = _.chain(modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  bundles = populateBundles(bundles, keyedModules);
  bundles = hashBundles(bundles);
  bundles = interpolateFilenames(bundles);

  compilation.applyPlugins("postcompile");

  urls = _.chain(bundles)
    .map(function (bundle) {
      return _.map(bundle.moduleHashes, function (moduleHash) {
        return [moduleHash, bundle.dest];
      });
    })
    .flatten()
    .object()
    .value();

  return _.chain(bundles)
    .map(function (bundle) {
      var bundleAst = construct.bundle({
        modules: bundle.modules,
        includeRuntime: bundle.includeRuntime,
        urls: bundle.entry ? urls : null,
        initialRequire: bundle.entry ? bundle.module.hash : null,
        cacheMode: opts.cacheMode
      });

      return [bundle.dest, escodegen.generate(bundleAst, {
        format: { indent: { style: "  " } },
        comment: true
      })];
    })
    .object()
    .value();
};
