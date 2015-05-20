var _ = require("lodash");
var escodegen = require("escodegen");

var construct = require("../construct");
var populateBundles = require("./bundles/populate");
var hashBundles = require("./bundles/hash");
var updateRequires = require("./modules/update-requires");
var interpolateFilenames = require("./bundles/interpolate-filenames");
var applyPluginsBase = require("./apply-plugins");

module.exports = function compile(opts) {
  var cache = {};
  var applyPlugins = _.partial(applyPluginsBase, opts.plugins || []);

  var resolveAsset = require("./modules/resolve")(opts, applyPlugins, cache);
  var loadModule = require("./modules/load")(opts, applyPlugins);
  var discoverModules = require("./modules/discover")(opts, applyPlugins, cache);
  var hashModule = require("./modules/hash")(opts, applyPlugins);
  var settleModuleSets = require("./bundles/settle-module-sets")(opts);

  var keyedModules;
  var urls;
  var bundles;
  var modules;

  applyPlugins("precompile");

  bundles = _.map(opts.bundles, function (bundleDef) {
    var asset = resolveAsset(bundleDef.src);
    var module = loadModule(asset);
    return {
      module: module,
      dest: bundleDef.dest,
      entry: !!bundleDef.entry,
      includeRuntime: bundleDef.includeRuntime === false ? false : true
    };
  });

  modules = _.reduce(bundles, function (mods, bundle) {
    return discoverModules(mods, bundle.module);
  }, {});

  _.each(bundles, function (bundle) { hashModule(bundle.module); });

  modules = _.map(modules, function (module) {
    return updateRequires(module, modules);
  });

  bundles = settleModuleSets(bundles);

  keyedModules = _.chain(modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  bundles = populateBundles(bundles, keyedModules);
  bundles = hashBundles(bundles);
  bundles = interpolateFilenames(bundles);

  applyPlugins("postcompile");

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
        initialRequire: bundle.entry ? bundle.module.hash : null
      });

      return [bundle.dest, escodegen.generate(bundleAst, {
        format: { indent: { style: "  " } },
        comment: true
      })];
    })
    .object()
    .value();
};
