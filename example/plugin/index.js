var ExamplePlugin = module.exports = function (opts) {
  this.opts = opts || {};
  /*
  this.compilation will be set by Interlock upon plugin instantiation. Initially,
    it will be an empty object, and will be shared between all instantiated
    plugins to facilitate inter-plugin communication.
   */
};

ExamplePlugin.prototype.precompile = function () {

};

/**
 * Called before a require string (i.e. `var x = require("x");`) is resolved to
 * an absolute path.  Can be used to mutate the require string, as well as keep
 * track of the asset for manipulation later in the process.
 *
 * @param  {String} requireStr   [description]
 * @param  {[type]} contextPath  [description]
 *
 * @return {String}              Return value used as mutated requireStr.
 */
ExamplePlugin.prototype.preresolve = function (requireStr, contextPath) {
  return requireStr;
};

/**
 * Return values don't matter here, but you can mutate the resolved object.
 *
 * @param  {String} requireStr
 * @param  {Object} resolved
 */
ExamplePlugin.prototype.postresolve = function (requireStr, resolved) {

};

ExamplePlugin.prototype.preparse = function (asset) {
  return asset;
};

ExamplePlugin.prototype.postparse = function (unhashedModule) {
  return unhashedModule;
};

ExamplePlugin.prototype.hash = function (shasum, unhashedModule) {

};

/**
 * Before files are written to disk.
 * @return {[type]} [description]
 */
ExamplePlugin.prototype.postcompile = function () {

};
