var fs = require("fs");
var path = require("path");

var esprima = require("esprima");
var escodegen = require("escodegen");

module.exports = function loadModule(asset) {
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
