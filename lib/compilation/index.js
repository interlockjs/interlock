var _ = require("lodash");
var escodegen = require("escodegen");

var construct = require("../construct");
var populateBundles = require("./bundles/populate");
var hashBundles = require("./bundles/hash");
var updateRequires = require("./modules/update-requires");
var interpolateFilenames = require("./bundles/interpolate-filenames");

var Compilation = module.exports = function (opts) {
  this.opts = opts;
};

Compilation.prototype.compile = function compile() {
  var opts = this.opts;
  var cache = {};
  var applyPlugins = require("./apply-plugins")(opts);

  var resolveAsset = require("./modules/resolve")(opts, applyPlugins, cache);
  var loadModule = require("./modules/load")(opts, applyPlugins);
  var discoverModules = require("./modules/discover")(opts, applyPlugins, cache);
  var hashModule = require("./modules/hash")(opts, applyPlugins);
  var settleModuleSets = require("./bundles/settle-module-sets")(opts);

  var keyedModules;
  var urls;
  var bundles;
  var modules;

  applyPlugins("precompile", this);

  bundles = _.map(this.opts.bundles, function (bundleDef) {
    var asset = resolveAsset(bundleDef.src);
    var module = loadModule(asset);
    return {
      module: module,
      dest: bundleDef.dest,
      entry: !!bundleDef.entry,
      includeRuntime: bundleDef.includeRuntime === false ? false : true
    };
  }, this);

  modules = _.reduce(bundles, function (mods, bundle) {
    return discoverModules(mods, bundle.module);
  }, {}, this);

  _.each(bundles, function (bundle) { hashModule(bundle.module); }, this);

  modules = _.map(modules, function (module) {
    return updateRequires(module, modules);
  }, this);

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

  applyPlugins("postcompile", this);

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
