import fs from "fs";
import path from "path";

import most from "most";
import { builders as b } from "ast-types";

import { programTmpl, bodyTmpl, expressionStmtTmpl, expressionTmpl } from "../../ast/template";
import { toArray } from "../../util/stream";
import { fromObject } from "../../util/ast";


function getTemplate (templateName, tmplType) {
  const absPath = path.join(__dirname, `templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8")
    // Remove ESlint rule exclusions from parsed templates.
    .replace(/\s*\/\/\s*eslint-disable-line.*/g, "");
  return tmplType(templateStr);
}

const commonModuleTmpl = getTemplate("common-module", expressionTmpl);
const moduleSetTmpl = getTemplate("module-set", expressionStmtTmpl);
const runtimeTmpl = getTemplate("runtime", bodyTmpl);
const loadModuleWhenReadyTmpl = getTemplate("load-module-when-ready", expressionStmtTmpl);
const registerUrlsTmpl = getTemplate("register-urls", bodyTmpl);
const iifeTmpl = getTemplate("iife", programTmpl);

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
 * @param  {Array}  modules        Array of modules objects.
 * @param  {String} globalName     Global variable name of the Interlock run-time.
 *
 * @return {Array}                 Array of AST nodes to be emitted as JavaScript.
 */
export function constructModuleSet (modules, globalName) {
  const moduleHashNodesS = most.from(modules)
    .map(module =>
      constructCommonModule(module.ast.body, module.dependencies)
        .then(moduleDef => ({ hash: module.hash, moduleDef })))
    .flatMap(most.fromPromise)
    .map(({ hash, moduleDef }) => b.property("init", b.literal(hash), moduleDef));

  return toArray(moduleHashNodesS)
    .then(moduleHashNodes => moduleSetTmpl({
      identifier: {
        "GLOBAL_NAME": b.literal(globalName),
        "MODULES_HASH": b.objectExpression(moduleHashNodes)
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
export function constructRuntime (globalName) {
  return runtimeTmpl({
    identifier: { "GLOBAL_NAME": b.literal(globalName) }
  });
}

/**
 * Construct a statement to instruct the runtime to run the specified module.
 *
 * @param  {String} moduleHash  Hash of the module to be required.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {ASTnode}            Single AST node.
 */
export function setLoadEntry (moduleHash, globalName) {
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

  const runtimeP = opts.includeRuntime && constructRuntime(globalName);
  const urlsP = opts.urls && constructUrlRegistration(opts.urls, globalName);
  const moduleSetP = opts.modules && constructModuleSet(opts.modules, globalName);
  const loadEntryP = opts.entryModuleHash && setLoadEntry(opts.entryModuleHash, globalName);

  return Promise.all([runtimeP, urlsP, moduleSetP, loadEntryP])
    .then(([runtime, urls, moduleSet, loadEntry]) => iifeTmpl({
      body: { "BODY": [].concat(runtime, urls, moduleSet, loadEntry).filter(x => x) }
    }));
}

