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
var moduleSetTmpl = getTemplate("module-set");

module.exports = {
  /**
   * Given an array of AST nodes and their dependencies (most likely originating
   * from a common JS module), construct an object expression that represents
   * its run-time equivalent.
   *
   * @param  {Array}  moduleBody  Array of ECMAscript AST nodes.
   * @param  {Array}  deps        Array of module hashes that original module is
   *                              dependent upon.
   *
   * @return {ASTnode}            Object expression AST node.
   */
  commonModule: function constructCommonModule (moduleBody, deps) {
    var depsLiterals = deps.map(function (dependencyHash) {
      return b.literal(dependencyHash);
    });

    // Parser infers an expression-statement from the template, whereas the common module
    // construction should only return an object expression (not a statement).
    return commonModuleTmpl({ body: moduleBody, deps: depsLiterals })
      .body[0].expression;
  },

  /**
   * Given an array of common modules (in the form of object expression AST nodes),
   * construct the AST of a file that would register those modules for consumpsion
   * by the Regiment run-time.
   *
   * @param  {Array}  commonModules  Array of object expressions.
   * @param  {String} globalName     Global variable name of the Regiment run-time.
   *
   * @return {ASTnode}               Program AST node to be emitted as JavaScript.
   */
  moduleSet: function constructModuleSet (commonModules, globalName) {
    // Construct an object whose keys are the module hashes and values are AST expression
    // nodes - expected values are those returned from `construct.commonModule`.
    var modules = b.objectExpression(
      Object.keys(commonModules).map(function (moduleHash) {
        return b.property("init", b.literal(moduleHash), commonModules[moduleHash]);
      })
    );

    return moduleSetTmpl({ globalName: globalName, modules: modules });
  }
};
