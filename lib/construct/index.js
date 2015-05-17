var fs = require("fs");
var path = require("path");

var b = require("ast-types").builders;
var estemplate = require("estemplate");

var commonModuleTmpl, moduleSetTmpl, runtimeTmpl, iifeTmpl, requireStmtTmpl, construct;

function getTemplate(templateName) {
  var absPath = path.join(__dirname, "templates", templateName + ".jst");
  var templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

commonModuleTmpl = getTemplate("common-module");
moduleSetTmpl = getTemplate("module-set");
runtimeTmpl = getTemplate("runtime");
iifeTmpl = getTemplate("iife");
requireStmtTmpl = getTemplate("require-statement");

construct = module.exports = {
  /**
   * Given an array of AST nodes and their dependencies (possibly originating from
   * a common JS module), construct an object expression that represents its run-time
   * equivalent.
   *
   * @param  {Array}  moduleBody  Array of ECMAscript AST nodes.
   * @param  {Array}  deps        Array of module hashes that original module is
   *                              dependent upon.
   *
   * @return {ASTnode}            Object expression AST node.
   */
  commonModule: function constructCommonModule(moduleBody, deps) {
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
   * @return {Array[ASTnode]}        Array of AST nodes to be emitted as JavaScript.
   */
  moduleSet: function constructModuleSet(commonModules, globalName) {
    // Construct an object whose keys are the module hashes and values are AST expression
    // nodes - expected values are those returned from `construct.commonModule`.
    var modules = b.objectExpression(
      Object.keys(commonModules).map(function (moduleHash) {
        return b.property("init", b.literal(moduleHash), commonModules[moduleHash]);
      })
    );

    return moduleSetTmpl({ globalName: globalName, modules: modules }).body;
  },

  /**
   * Construct the guts of the Regiment run-time for inclusion in file output.
   *
   * @param  {String} globalName  Global variable name of Regiment run-time.
   *
   * @return {Array[ASTnode]}
   */
  runtime: function constructRuntime(globalName) {
    return runtimeTmpl({ globalName: globalName }).body;
  },

  /**
   * Construct a require statement invoking the given module.
   *
   * @param  {String} moduleHash  Hash of the module to be required.
   * @param  {String} globalName  Global variable name of Regiment run-time.
   *
   * @return {Array[ASTnode]}
   */
  requireStmt: function constructRequireStmt(moduleHash, globalName) {
    return requireStmtTmpl({
      globalName: globalName,
      moduleHash: b.literal(moduleHash)
    }).body[0];
  },

  /**
   * Transforms a map of module-hashes-to-URLs to the AST equivalent.
   *
   * @param  {Object}  urls  Keys are module hashes, values are URL strings.
   *
   * @return {ASTnode}
   */
  urlRegistration: function constructUrlRegistration(urls) {
    return b.objectExpression(
      Object.keys(urls).map(function (moduleHash) {
        return b.property("init", b.literal(moduleHash), b.literal(urls[moduleHash]));
      })
    );
  },

  /**
   * The primary constructor.  Given a set of options, construct Program AST
   * to be emitted as JavaScript.
   *
   * @param  {Object}  opts
   * @param  {Boolean} opts.includeRuntime  Indicates whether Regiment run-time should be emitted.
   * @param  {Object}  opts.urls            Optional. If included, map of module hashes to URLs
   *                                        will be emitted.
   * @param  {Array}   opts.modules         Optional. If included, the module objects will be
   *                                        transformed into output module AST and emitted.
   * @param  {String}  opts.initialRequire  Optional. If included, the statement in the AST output
   *                                        will be to require the specified module.
   */
  program: function constructRegimentFile(opts) {
    var commonModules;
    var globalName = opts.globalName || "__regiment__";
    var programBody = [];

    if (opts.includeRuntime) { programBody = programBody.concat(construct.runtime(globalName)); }

    if (opts.urls) { programBody = programBody.concat(construct.urlRegistration(opts.urls)); }

    if (opts.modules) {
      commonModules = opts.modules.map(function (moduleObj) {
        return construct.commonModule(moduleObj.body, moduleObj.deps);
      });
      programBody = programBody.concat(construct.moduleSet(commonModules, globalName));
    }

    if (opts.initialRequire) {
      programBody = programBody.concat(construct.requireStmt(opts.initialRequire, globalName));
    }

    return iifeTmpl({ body: programBody });
  }
};
