var _ = require("lodash");
var escodegen = require("escodegen");

var construct = require("../construct");

var Compilation = module.exports = function (opts) {
  var cache, applyPlugins;

  this.opts = opts;
  cache = this.cache = {};
  applyPlugins = this.applyPlugins = require("./apply-plugins")(opts);

  this.resolveAsset = require("./modules/resolve")(opts, cache, applyPlugins);
  this.loadModule = require("./modules/load")(opts, cache, applyPlugins);
  this.discoverModules = require("./modules/discover")(opts, cache, applyPlugins);
  this.hashModule = require("./modules/hash")(opts, cache, applyPlugins);
  this.updateRequires = require("./modules/update-requires")(opts, cache, applyPlugins);
  this.getFlatDependencies = require("./modules/get-flat-dependencies")(opts, cache, applyPlugins);
  this.settleModuleSets = require("./bundles/settle-module-sets")(opts, cache, applyPlugins);
  this.populateBundles = require("./bundles/populate")(opts, cache, applyPlugins);
  this.hashBundles = require("./bundles/hash")(opts, cache, applyPlugins);
  this.interpolateFilenames = require("./bundles/interpolate-filenames")(opts, cache, applyPlugins);
};

Compilation.prototype.compile = function compile() {
  var keyedModules, urls, bundles, modules;

  this.applyPlugins("precompile", this);

  bundles = _.map(this.opts.bundles, function (bundleDef) {
    var asset = this.resolveAsset(bundleDef.src);
    var module = this.loadModule(asset);
    return {
      module: module,
      dest: bundleDef.dest,
      entry: !!bundleDef.entry,
      includeRuntime: bundleDef.includeRuntime === false ? false : true
    };
  }, this);

  modules = _.reduce(bundles, function (mods, bundle) {
    return this.discoverModules(mods, bundle.module);
  }, {}, this);

  _.each(bundles, function (bundle) { this.hashModule(bundle.module); }, this);
  _.each(modules, function (module) {
    this.updateRequires(module, modules);
  }, this);
  bundles = this.settleModuleSets(bundles);

  keyedModules = _.chain(modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  bundles = this.populateBundles(bundles, keyedModules);
  bundles = this.hashBundles(bundles);
  bundles = this.interpolateFilenames(bundles);

  this.applyPlugins("postcompile", this);

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
