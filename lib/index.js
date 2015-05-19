var path = require("path");
var fs = require("fs");

var mkdirp = require("mkdirp").sync;
var _ = require("lodash");

var Compilation = require("./compilation");

var Interlock = module.exports = function (options) {
  var cwd = process.cwd();
  options = options || {};

  if (!options.bundles || !options.bundles.length) {
    throw new Error("Must define at least one module set.");
  }
  if (!(typeof options.namespace === "string")) {
    throw new Error("Must define namespace for project compilation.");
  }

  // TODO: validate options, or only persist specific values
  options.context = options.context || cwd;
  options.outputPath = options.outputPath || path.join(cwd, "dist");
  options.extensions = options.extensions || [".js"];
  options.context = options.context || cwd;
  this.options = options;
};

Interlock.prototype.build = function () {
  var bundles;
  this.compilation = new Compilation(this.options);
  bundles = this.compilation.compile();
  _.each(bundles, function (bundleOutput, bundleDest) {
    var outputPath = path.join(this.options.outputPath, bundleDest);
    var outputDir = path.dirname(outputPath);
    mkdirp(outputDir);
    fs.writeFileSync(outputPath, bundleOutput);
  }, this);
};
