var fs = require("fs");
var path = require("path");

var b = require("ast-types").builders;
var estemplate = require("estemplate");

function getTemplate (templateName) {
  var absPath = path.join(__dirname, "templates", templateName + ".jst");
  var templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

var commonModuleTmpl = getTemplate("common-module");

module.exports = {
  commonModule: function constructCommonModule (moduleBody, deps) {
    var depsLiterals = deps.map(function (dependencyHash) {
      return b.literal(dependencyHash);
    });

    // Parser infers an expression-statement from the template, whereas the common module
    // construction should only return an object expression (not a statement).
    return commonModuleTmpl({ body: moduleBody, deps: depsLiterals })
      .body[0].expression;
  }
};
