var crypto = require("crypto");

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
  this.discoverDependencies = require("./modules/discover-dependencies")(opts, cache, applyPlugins);
  this.hashModule = require("./modules/hash")(opts, cache, applyPlugins);
  this.updateRequires = require("./modules/update-requires")(opts, cache, applyPlugins);
  this.getFlatDependencies = require("./modules/get-flat-dependencies")(opts, cache, applyPlugins);
  this.settleModuleSets = require("./bundles/settle-module-sets")(opts, cache, applyPlugins);
  this.populateBundles = require("./bundles/populate")(opts, cache, applyPlugins);
  this.hashBundles = require("./bundles/hash")(opts, cache, applyPlugins);
};

Compilation.prototype.compile = function compile() {
  var keyedModules, urls;

  this.cache.modules = {};
  this.applyPlugins("precompile", this);

  this.bundles = _.map(this.opts.bundles, function (bundleDef) {
    var asset = this.resolveAsset(bundleDef.src);
    var module = this.loadModule(asset);
    return {
      module: module,
      dest: bundleDef.dest,
      entry: !!bundleDef.entry,
      includeRuntime: bundleDef.includeRuntime === false ? false : true
    };
  }, this);

  _.each(this.bundles, function (bundle) { this.discoverDependencies(bundle.module); }, this);
  _.each(this.bundles, function (bundle) { this.hashModule(bundle.module); }, this);
  _.each(this.cache.modules, function (module) { this.updateRequires(module); }, this);
  this.bundles = this.settleModuleSets(this.bundles);

  keyedModules = _.chain(this.cache.modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  this.bundles = this.populateBundles(this.bundles, keyedModules);
  this.bundles = this.hashBundles(this.bundles);
  this.interpolateFilenames();

  this.applyPlugins("postcompile", this);

  urls = _.chain(this.bundles)
    .map(function (bundle) {
      return _.map(bundle.moduleHashes, function (moduleHash) {
        return [moduleHash, bundle.dest];
      });
    })
    .flatten()
    .object()
    .value();

  return _.chain(this.bundles)
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

Compilation.prototype.interpolateFilenames = function () {
  _.each(this.bundles, function (bundle) {
    bundle.dest = bundle.dest
      .replace("[setHash]", bundle.setHash)
      .replace("[bundleHash]", bundle.bundleHash);
    if (bundle.module) {
      bundle.dest = bundle.dest.replace("[primaryModuleHash]", bundle.module.hash);
    }
  });
};
