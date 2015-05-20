var crypto = require("crypto");

var _ = require("lodash");

module.exports = function hashModule(module) {
  var dependencyHashes, shasum;
  if (module.hash) { return module; }
  if (module.dependencies.length > 0) {
    _.each(module.dependencies, hashModule, this);
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
