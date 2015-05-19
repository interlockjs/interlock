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
  this.settleExclusiveBundleModules();

  keyedModules = _.chain(this.cache.modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  this.populateBundles(keyedModules);
  this.hashBundles();
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

Compilation.prototype.getFlatDependencies = function (module) {
  return [module.hash].concat(_.map(module.dependencies, function (dep) {
    return this.getFlatDependencies(dep);
  }, this));
};

Compilation.prototype.settleExclusiveBundleModules = function () {
  // Generate flat dependency arrays.
  _.each(this.bundles, function (bundle) {
    bundle.moduleHashes = this.getFlatDependencies(bundle.module);
  }, this);

  // Remove explicit bundle modules and their dependencies from other bundles.
  _.each(this.bundles, function (bundleA) {
    _.each(this.bundles, function (bundleB) {
      if (bundleA !== bundleB && _.contains(bundleA.moduleHashes, bundleB.module.hash)) {
        bundleA.moduleHashes = _.difference(bundleA.moduleHashes, bundleB.moduleHashes);
      }
    }, this);
  }, this);

  // Create new bundles from the intersections of existing bundles.
  _.each(this.bundles, function (bundleA) {
    _.each(this.bundles, function (bundleB) {
      var intersection = _.intersection(bundleA.moduleHashes, bundleB.moduleHashes);
      if (intersection) {
        bundleA.moduleHashes = _.difference(bundleA.moduleHashes, intersection);
        bundleB.moduleHashes = _.difference(bundleB.moduleHashes, intersection);
        this.bundles.push({
          moduleHashes: intersection,
          dest: this.opts.implicitBundleDest
        });
      }
    }, this);
  }, this);
};

Compilation.prototype.populateBundles = function (keyedModules) {
  _.each(this.bundles, function (bundle) {
    bundle.modules = _.map(bundle.moduleHashes, function (hash) {
      return keyedModules[hash];
    });
  }, this);
};

Compilation.prototype.hashBundles = function () {
  _.each(this.bundles, function (bundle) {
    // Node v0.10.x cannot re-use crypto instances after digest is called.
    bundle.setHash = crypto.createHash("sha1")
      .update(JSON.stringify(bundle.moduleHashes), "utf-8")
      .digest("hex");
    bundle.bundleHash = crypto.createHash("sha1")
      .update(JSON.stringify(bundle.moduleHashes), "utf-8")
      .update(JSON.stringify(!!bundle.entry), "utf-8")
      .update(JSON.stringify(!!bundle.includeRuntime), "utf-8")
      .digest("hex");
  });
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
