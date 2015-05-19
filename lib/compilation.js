var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var _ = require("lodash");
var esprima = require("esprima");
var escodegen = require("escodegen");
var esquery = require("esquery");

var resolve = require("./resolve");
var construct = require("./construct");

var Compilation = module.exports = function (opts) {
  this.opts = opts;
};

Compilation.prototype.compile = function compile() {
  var keyedModules, urls;

  this.modules = {};
  this.applyPlugins("precompile", this.compilation);

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
  _.each(this.bundles, function (bundle) { this.hashModule(bundle.module); });
  _.each(this.modules, function (module) { this.updateRequires(module); });
  this.settleExclusiveBundleModules();

  keyedModules = _.chain(this.modules)
    .map(function (module) {
      return [module.hash, module];
    })
    .object()
    .value();

  this.populateBundles(keyedModules);
  this.hashBundles();
  this.interpolateFilenames();

  this.applyPlugins("postcompile", this.compilation);

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
      return [bundle.dest, construct.constructInterlockFile({
        includeRuntime: bundle.includeRuntime,
        urls: bundle.entry ? urls : null,
        initialRequire: bundle.entry ? bundle.module.hash : null
      })];
    })
    .object()
    .value();
};

Compilation.prototype.applyPlugins = function (ev /* args...*/) {
  var contextArgs, result;
  if (!ev) {
    throw new Error("Must provide event type for plugin application.");
  }

  contextArgs = Array.prototype.slice.call(arguments, 2);
  result = arguments[1];

  _.each(this.opts.plugins, function (plugin) {
    var fnArgs;
    if (ev in plugin) {
      fnArgs = [result].concat(contextArgs);
      result = plugin[ev].apply(plugin, fnArgs);
    }
  });

  return result;
};

Compilation.prototype.resolveAsset = function (requireStr, contextPath, ns, nsRoot) {
  var asset;
  contextPath = contextPath || this.opts.root;
  requireStr = this.applyPlugins("preresolve", requireStr, contextPath);

  asset = resolve(
    requireStr,
    contextPath || this.opts.root,
    ns || this.opts.namespace,
    nsRoot || this.opts.root,
    this.opts.extensions
  );

  if (!asset) {
    throw new Error("Cannot resolve '" + requireStr + "' from '" + contextPath + "'.");
  }

  this.applyPlugins("postresolve", requireStr, asset);

  return asset;
};

Compilation.prototype.loadModule = function (asset) {
  asset.rawSource = fs.readFileSync(asset.path, "utf-8");
  asset = this.applyPlugins("preparse", asset);

  asset.ast = esprima.parse(asset.rawSource, {
    loc: true,
    source: path.join(asset.ns, asset.nsPath),
    range: true,
    tokens: true,
    comment: true
  });
  asset.ast = escodegen.attachComments(asset.ast, asset.ast.comments, asset.ast.tokens);

  return this.applyPlugins("postparse", asset);
};

Compilation.prototype.discoverDependencies = function (unhashedModule) {
  var contextPath;

  if (unhashedModule.path in this.modules) { return this.modules[unhashedModule.path]; }
  this.modules[unhashedModule.path] = unhashedModule;

  contextPath = path.dirname(unhashedModule.path);

  unhashedModule.requireNodes = esquery(unhashedModule.ast, "CallExpression[callee.name=require]");
  unhashedModule.dependencies = _.map(unhashedModule.requireNodes, function (requireNode) {
    var requireStr = requireNode.arguments[0].value;
    var asset = this.resolveAsset(requireStr, contextPath);
    requireNode.resolved = asset.path;
    return this.loadModule(asset, contextPath, unhashedModule.ns, unhashedModule.nsRoot);
  }, this);

  _.each(unhashedModule.dependencies, function (unhashedDep) {
    this.discoverDependencies(unhashedDep);
  }, this);

  return unhashedModule;
};

Compilation.prototype.hashModule = function (module) {
  var dependencyHashes, shasum;
  if (module.hash) { return module; }
  if (module.dependencies.length > 0) {
    _.each(module.dependencies, this.hashModule, this);
  }
  dependencyHashes = _.map(module.dependencies, function (dep) { return dep.hash; }).sort();

  shasum = crypto.createHash("sha1");
  shasum.update(module.rawSource);
  shasum.update(module.ns);
  shasum.update(module.nsPath);
  _.each(dependencyHashes, shasum.update.bind(shasum));
  this.applyPlugins("hash", _.bind(shasum.update, shasum), module);

  module.hash = shasum.digest("hex");
  return module;
};

Compilation.prototype.updateRequires = function (module) {
  _.each(module.requireNodes, function (requireNode) {
    var requireHash = this.modules[requireNode.resolved];
    requireNode.arguments[0].oldValue = requireNode.arguments[0].value;
    requireNode.arguments[0].value = requireHash;
  }, this);
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
    var shasum = crypto.createHash("sha-1");
    shasum.update(JSON.stringify(bundle.moduleHashes), "utf-8");
    bundle.setHash = shasum.digest("hex");
    shasum.update(JSON.stringify(!!bundle.entry), "utf-8");
    shasum.update(JSON.stringify(!!bundle.includeRuntime), "utf-8");
    bundle.bundleHash = shasum.digest("hex");
  });
};

Compilation.prototype.interpolateFilenames = function () {
  _.each(this.bundles, function (bundle) {
    bundle.dest
      .replace("[setHash]", bundle.setHash)
      .replace("[bundleHash]", bundle.bundleHash);
    if (bundle.module) {
      bundle.dest.replace("[primaryModuleHash]", bundle.module.hash);
    }
  });
};
