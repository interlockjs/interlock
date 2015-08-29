import fs from "fs";
import path from "path";

import most from "most";
import { builders as b } from "ast-types";
import estemplate from "estemplate";

import cache from "./cache";
import { programTmpl, bodyTmpl, expressionStmtTmpl, expressionTmpl } from "../../ast/template";
import { toArray } from "../../util/stream";
import { fromObject } from "../../util/ast";


function getTemplate (templateName) {
  const absPath = path.join(__dirname, "templates", templateName + ".jst");
  const templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

function getAsyncTemplate (templateName, tmplType) {
  const absPath = path.join(__dirname, `templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8");
  return tmplType(templateStr);
}

const commonModuleTmpl = getAsyncTemplate("common-module", expressionTmpl);
const moduleSetTmpl = getAsyncTemplate("module-set", expressionStmtTmpl);
const runtimeTmpl = getTemplate("runtime");
const loadModuleWhenReadyTmpl = getAsyncTemplate("load-module-when-ready", expressionStmtTmpl);
const registerUrlsTmpl = getAsyncTemplate("register-urls", bodyTmpl);
const iifeTmpl = getAsyncTemplate("iife", programTmpl);

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

  return commonModuleTmpl({
    body: { "MODULE_BODY": moduleBody },
    identifier: { "DEPS": b.arrayExpression(depsHashes) }
  });
}

/**
 * Given an array of CJS modules (in the form of object expression AST nodes),
 * construct the AST of a file that would register those modules for consumpsion
 * by the Interlock run-time.
 *
 * @param  {Array}  cjsModules  Array of object expressions.
 * @param  {String} globalName     Global variable name of the Interlock run-time.
 *
 * @return {Array}                 Array of AST nodes to be emitted as JavaScript.
 */
export function constructModuleSet (cjsModules, globalName) {
  // Construct an object whose keys are the module hashes and values are AST expression
  // nodes - expected values are those returned from `constructCommonModule`.
  return toArray(cjsModules)
    .then(modules =>
      modules.map(([hash, ast]) => b.property("init", b.literal(hash), ast)))
    .then(modulesAst =>
      moduleSetTmpl({
        identifier: {
          "GLOBAL_NAME": b.literal(globalName),
          "MODULES_HASH": b.objectExpression(modulesAst)
        }
      }));
}

/**
 * Construct the guts of the Interlock run-time for inclusion in file output.
 *
 * @param  {String} globalName  Global variable name of Interlock run-time.
 * @param  {String} cacheMode   (DEPRECATED) cache mode enum.
 *
 * @return {Array}              Array of AST nodes.
 */
export function constructRuntime (globalName, cacheMode) {
  const cacheRuntime = cache[cacheMode];
  const cacheGet = cacheRuntime && cacheRuntime.get({}) || [];
  const cacheSave = cacheRuntime && cacheRuntime.save({}) || [];

  return runtimeTmpl({
    globalName: b.literal(globalName),
    cacheGet,
    cacheSave
  }).body;
}

/**
 * Construct a require statement invoking the given module.
 *
 * @param  {String} moduleHash  Hash of the module to be required.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {ASTnode}            Single AST node.
 */
export function constructRequireStmt (moduleHash, globalName) {
  return loadModuleWhenReadyTmpl({
    identifier: {
      "GLOBAL_NAME": b.literal(globalName),
      "MODULE_HASH": b.literal(moduleHash)
    }
  });
}

/**
 * Transforms a map of module-hashes-to-URLs to the AST equivalent.
 *
 * @param  {Object} urls        Keys are module hashes, values are URL strings.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {ASTnode}            Single AST node.
 */
export function constructUrlRegistration (urls, globalName) {
  return registerUrlsTmpl({
    identifier: {
      "GLOBAL_NAME": b.literal(globalName),
      "URLS": fromObject(urls)
    }
  });
}

/**
 * The primary constructor.  Given a set of options, construct Program AST
 * to be emitted as JavaScript.
 *
 * @param  {Object}  opts                 Options.
 * @param  {Boolean} opts.includeRuntime  Indicates whether Interlock run-time should be emitted.
 * @param  {Object}  opts.urls            Optional. If included, map of module hashes to URLs
 *                                        will be emitted.
 * @param  {Array}   opts.modules         Optional. If included, the module objects will be
 *                                        transformed into output module AST and emitted.
 * @param  {String}  opts.initialRequire  Optional. If included, the statement in the AST output
 *                                        will be to require the specified module.
 *
 * @return {ASTnode}                      Single program AST node.
 */
export function constructBundle (opts) {
  const globalName = opts.globalName || "__interlock__";

  const runtimeP = opts.includeRuntime ?
    constructRuntime(globalName, opts.cacheMode) :
    null;

  const urlsP = opts.urls ?
    constructUrlRegistration(opts.urls, globalName) :
    null;

  const modules = most.from(opts.modules)
    .map(module => Promise.all([
      module.hash,
      constructCommonModule(module.ast.body, module.dependencies)
    ]))
    .flatMap(most.fromPromise);

  const moduleSetP = opts.modules ? constructModuleSet(modules, globalName) : null;

  const initialRequireP = opts.initialRequire ?
    constructRequireStmt(opts.initialRequire, globalName) :
    null;

  return Promise.all([runtimeP, urlsP, moduleSetP, initialRequireP])
    .then(([runtime, urls, moduleSet, initialRequire]) => iifeTmpl({
      body: { "BODY": [].concat(runtime, urls, moduleSet, initialRequire).filter(x => x) }
    }));
}

