var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var _ = require("lodash");
var esprima = require("esprima");
var escodegen = require("escodegen");
var esquery = require("esquery");

var resolve = require("./resolve");

var Compilation = function (opts) {
  this.opts = opts;
};

Compilation.prototype.compile = function compile() {
  this.modules = {};
  this.applyPlugins("precompile", this.compilation);

  this.bundles = _.map(this.opts.bundles, function (bundleDef) {
    var asset = this.resolveAsset(bundleDef.src);
    var module = this.loadModule(asset);
    return {
      module: module,
      dest: bundleDef.dest,
      entry: !!bundleDef.entry
    };
  }, this);

  _.each(this.bundles, function (bundle) { this.discoverDependencies(bundle.module); }, this);
  _.each(this.bundles, function (bundle) { this.hashModule(bundle.module); });
  _.each(this.modules, function (module) { this.updateRequires(module); });

  // sort modules into output bundles, both explicit and implicit, by
  // checking for collisions in module hash sets for the explicit bundles

  this.applyPlugins("postcompile", this.compilation);

  return this.bundles;
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
    ns || this.namespace,
    nsRoot || this.opts.root,
    this.opts.extensions
  );

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
    var asset = this.resolveAsset(requireStr);
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
  dependencyHashes = _.map(module.dependencies, function (dep) { return dep.hash; });

  shasum = crypto.createHash("sha-1");
  shasum.update(module.rawSource);
  shasum.update(module.ns);
  shasum.update(module.nsPath);
  shasum.update(JSON.stringify(dependencyHashes));
  this.applyPlugins("hash", _.bind(shasum.update, shasum), module);

  module.hash = shasum.digets("hex");
  return module;
};

Compilation.prototype.updateRequires = function (module) {
  _.each(module.requireNodes, function (requireNode) {
    var requireHash = this.modules[requireNode.resolved];
    requireNode.arguments[0].oldValue = requireNode.arguments[0].value;
    requireNode.arguments[0].value = requireHash;
  }, this);
};
