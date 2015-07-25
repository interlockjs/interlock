import fs from "fs";
import path from "path";

import _ from "lodash";
import {builders as b} from "ast-types";
import estemplate from "estemplate";

import cache from "./cache";


function getTemplate (templateName) {
  const absPath = path.join(__dirname, "templates", templateName + ".jst");
  const templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

const commonModuleTmpl = getTemplate("common-module");
const moduleSetTmpl = getTemplate("module-set");
const runtimeTmpl = getTemplate("runtime");
const iifeTmpl = getTemplate("iife");
const loadModuleWhenReadyTmpl = getTemplate("load-module-when-ready");
const registerUrlsTmpl = getTemplate("register-urls");

/**
 * Given an array of AST nodes and their dependencies (possibly originating from
 * a common JS module), construct an object expression that represents its run-time
 * equivalent.
 *
 * @param  {Array}  moduleBody  Array of ECMAscript AST nodes.
 * @param  {Array}  deps        Array of modules upon which origin module is
 *                              dependent.
 *
 * @return {ASTnode}            Object expression AST node.
 */
export function constructCommonModule (moduleBody, deps) {
  const depsHashes = deps.map(dependency => b.literal(dependency.hash));

  // Parser infers an expression-statement from the template, whereas the common module
  // construction should only return an object expression (not a statement).
  return commonModuleTmpl({ body: moduleBody, deps: depsHashes }).body[0].expression;
}

/**
 * Given an array of common modules (in the form of object expression AST nodes),
 * construct the AST of a file that would register those modules for consumpsion
 * by the Interlock run-time.
 *
 * @param  {Array}  commonModules  Array of object expressions.
 * @param  {String} globalName     Global variable name of the Interlock run-time.
 *
 * @return {Array[ASTnode]}        Array of AST nodes to be emitted as JavaScript.
 */
export function constructModuleSet (commonModules, globalName) {
  // Construct an object whose keys are the module hashes and values are AST expression
  // nodes - expected values are those returned from `constructCommonModule`.
  const modules = b.objectExpression(
    Object.keys(commonModules).map(moduleHash => {
      return b.property("init", b.literal(moduleHash), commonModules[moduleHash]);
    })
  );

  return moduleSetTmpl({ globalName: b.literal(globalName), modules: modules }).body;
}

/**
 * Construct the guts of the Interlock run-time for inclusion in file output.
 *
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {Array[ASTnode]}
 */
export function constructRuntime (globalName, cacheMode) {
  const cacheRuntime = cache[cacheMode];
  const cacheGet = cacheRuntime && cacheRuntime.get({}) || [];
  const cacheSave = cacheRuntime && cacheRuntime.save({}) || [];

  return runtimeTmpl({
    globalName: b.literal(globalName),
    cacheGet: cacheGet,
    cacheSave: cacheSave
  }).body;
}

/**
 * Construct a require statement invoking the given module.
 *
 * @param  {String} moduleHash  Hash of the module to be required.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {Array[ASTnode]}
 */
export function constructRequireStmt (moduleHash, globalName) {
  return loadModuleWhenReadyTmpl({
    globalName: b.literal(globalName),
    moduleHash: b.literal(moduleHash)
  }).body[0];
}

/**
 * Transforms a map of module-hashes-to-URLs to the AST equivalent.
 *
 * @param  {Object}  urls  Keys are module hashes, values are URL strings.
 *
 * @return {ASTnode}
 */
export function constructUrlRegistration (urls, globalName) {
  return registerUrlsTmpl({
    globalName: b.literal(globalName),
    urls: b.objectExpression(
      Object.keys(urls).map(moduleHash => {
        return b.property("init", b.literal(moduleHash), b.literal(urls[moduleHash]));
      })
    )
  });
}

/**
 * The primary constructor.  Given a set of options, construct Program AST
 * to be emitted as JavaScript.
 *
 * @param  {Object}  opts
 * @param  {Boolean} opts.includeRuntime  Indicates whether Interlock run-time should be emitted.
 * @param  {Object}  opts.urls            Optional. If included, map of module hashes to URLs
 *                                        will be emitted.
 * @param  {Array}   opts.modules         Optional. If included, the module objects will be
 *                                        transformed into output module AST and emitted.
 * @param  {String}  opts.initialRequire  Optional. If included, the statement in the AST output
 *                                        will be to require the specified module.
 */
export function constructBundle (opts) {
  const globalName = opts.globalName || "__interlock__";
  let programBody = [];

  if (opts.includeRuntime) {
    programBody = programBody.concat(constructRuntime(globalName, opts.cacheMode));
  }

  if (opts.urls) {
    programBody = programBody.concat(constructUrlRegistration(opts.urls, globalName).body);
  }

  if (opts.modules) {
    const commonModules = _.chain(opts.modules)
      .map(function (module) {
        var moduleAst = constructCommonModule(module.ast.body, module.dependencies);
        return [module.hash, moduleAst];
      })
      .object()
      .value();
    programBody = programBody.concat(constructModuleSet(commonModules, globalName));
  }

  if (opts.initialRequire) {
    programBody = programBody
      .concat(constructRequireStmt(opts.initialRequire, globalName));
  }

  return iifeTmpl({ body: programBody });
}

