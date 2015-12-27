import fs from "fs";
import path from "path";

import Promise from "bluebird";
import { builders as b } from "ast-types";

import pluggable from "../../pluggable";
import { programTmpl, bodyTmpl, expressionStmtTmpl, expressionTmpl } from "../../ast/template";
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
 * Given an array of AST nodes from a module's body along with that module's
 * dependencies, construct an AST object expression that represents its run-time
 * equivalent.
 *
 * @param  {Array}  moduleBody  Array of AST nodes.
 * @param  {Array}  deps        Array of modules upon which module is dependent.
 *
 * @return {ASTnode}            Object expression AST node.
 */
export const constructCommonModule = pluggable(
  function constructCommonModule (moduleBody, deps) {
    const depsHashes = deps.map(dependency => b.literal(dependency.hash));
    return commonModuleTmpl({
      body: { "MODULE_BODY": moduleBody },
      identifier: { "DEPS": b.arrayExpression(depsHashes) }
    });
  }
);

/**
 * Given an array of compiled modules, construct the AST for JavaScript that would
 * register those modules for consumption by the Interlock run-time.
 *
 * @param  {Array}  modules        Array of compiled modules.
 * @param  {String} globalName     Global variable name of the Interlock run-time.
 *
 * @return {Array}                 Array of AST nodes to be emitted as JavaScript.
 */
export const constructModuleSet = pluggable(
  function constructModuleSet (modules, globalName) {
    return Promise.all(modules.map(module =>
      this.constructCommonModule(module.ast.body, module.dependencies)
        .then(moduleAst => b.property("init", b.literal(module.hash), moduleAst))
    ))
      .then(moduleHashNodes => moduleSetTmpl({
        identifier: {
          "GLOBAL_NAME": b.literal(globalName),
          "MODULES_HASH": b.objectExpression(moduleHashNodes)
        }
      }));
  },
  { constructCommonModule }
);

/**
 * Construct the guts of the Interlock run-time for inclusion in file output.
 *
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {Array}              Array of AST nodes.
 */
export const constructRuntime = pluggable(function constructRuntime (globalName) {
  return runtimeTmpl({
    identifier: { "GLOBAL_NAME": b.literal(globalName) }
  });
});

/**
 * Construct a statement to instruct the runtime to run the specified module.
 *
 * @param  {String} moduleHash  Hash of the module to be required.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {ASTnode}            Single AST node.
 */
export const setLoadEntry = pluggable(function setLoadEntry (moduleHash, globalName) {
  return loadModuleWhenReadyTmpl({
    identifier: {
      "GLOBAL_NAME": b.literal(globalName),
      "MODULE_HASH": b.literal(moduleHash)
    }
  });
});

/**
 * Transforms a map of module-hashes-to-URLs to the AST equivalent.
 *
 * @param  {Object} urls        Keys are module hashes, values are URL strings.
 * @param  {String} globalName  Global variable name of Interlock run-time.
 *
 * @return {ASTnode}            Single AST node.
 */
export const constructRegisterUrls = pluggable(
  function constructRegisterUrls (urls, globalName) {
    return registerUrlsTmpl({
      identifier: {
        "GLOBAL_NAME": b.literal(globalName),
        "URLS": fromObject(urls)
      }
    });
  }
);

/**
 * Builds body of output bundle, to be inserted into the IIFE.
 *
 * @param  {Object}  opts  Same options object passed to constructBundleBody.
 *
 * @return {Array}         Body of bundle.
 */
export const constructBundleBody = pluggable(function constructBundleBody (opts) {
  const globalName = this.opts.globalName || "__interlock__";

  return Promise.all([
    opts.includeRuntime && this.constructRuntime(globalName),
    opts.urls && this.constructRegisterUrls(opts.urls, globalName),
    opts.modules && this.constructModuleSet(opts.modules, globalName),
    opts.entryModuleHash && this.setLoadEntry(opts.entryModuleHash, globalName)
  ])
    .then(([runtime, urls, moduleSet, loadEntry]) =>
      [].concat(runtime, urls, moduleSet, loadEntry));
}, { constructModuleSet, constructRuntime, setLoadEntry, constructRegisterUrls });

/**
 * Construct the AST for an output bundle.  A number of optional options-args are
 * allowed, to give flexibility to the compiler for what sort of bundle should be
 * constructed.
 *
 * For example, in the case of a bundle with an entry module, you'll want everything
 * to be included.  The run-time is needed, because there is no guarantee another
 * bundle has already loaded the run-time.  The module-hash-to-bundle-URLs object
 * should be included, as again there is no guarantee another bundle has already
 * set those values.  The modules of the bundle itself need to be included, etc.
 *
 * However, you might instead generate a specialized bundle that only contains the
 * run-time and URLs.  This bundle might be inlined into the page, or guaranteed
 * to be loaded first, so that redundant copies of the run-time be included in
 * every other bundle generated.
 *
 * The output for this function should be a root AST node, ready to be transformed
 * back into JavaScript code.
 *
 * @param  {Object}  opts                 Options.
 * @param  {Boolean} opts.includeRuntime  Indicates whether Interlock run-time should be emitted.
 * @param  {Object}  opts.urls            Optional. If included, map of module hashes to URLs
 *                                        will be emitted.
 * @param  {Array}   opts.modules         Optional. If included, the module objects will be
 *                                        transformed into output module AST and emitted.
 * @param  {String}  opts.entryModuleHash Optional. If included, a statement will be rendered
 *                                        to invoke the specified module on load.
 *
 * @return {ASTnode}                      Single program AST node.
 */
export const constructBundleAst = pluggable(function constructBundleAst (opts) {
  return this.constructBundleBody(opts)
    .then(body => iifeTmpl({ body: { "BODY": body.filter(x => x) } }));
}, { constructBundleBody });
