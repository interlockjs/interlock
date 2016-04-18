import fs from "fs";
import path from "path";

import { assign } from "lodash";
import Promise from "bluebird";
import * as t from "babel-types";
import template from "../../util/template";

import { pluggable } from "pluggable";
import { fromObject } from "../../util/ast";


function getTemplate (templateName, transform) {
  transform = transform || (node => node);
  const absPath = path.join(__dirname, `templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8")
    // Remove ESlint rule exclusions from parsed templates.
    .replace(/\s*\/\/\s*eslint-disable-line.*/g, "");
  const _template = template(templateStr);
  return opts => transform(_template(opts));
}

const commonModuleTmpl = getTemplate("common-module", node => node.expression);
const moduleSetTmpl = getTemplate("module-set");
const runtimeTmpl = getTemplate("runtime");
const loadModuleWhenReadyTmpl = getTemplate("load-module-when-ready");
const registerUrlsTmpl = getTemplate("register-urls");
const iifeTmpl = getTemplate("iife");

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
    return commonModuleTmpl({
      MODULE_BODY: moduleBody,
      DEPS: t.arrayExpression(deps.map(dep => t.stringLiteral(dep.hash)))
    });
  }
);

function markAsEntry (moduleAst) {
  return assign({}, moduleAst, {
    properties: moduleAst.properties.concat(
      t.objectProperty(t.identifier("entry"), t.booleanLiteral(true))
    )
  });
}

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
  function constructModuleSet (modules, globalName, entryModuleHash) {
    return Promise.all(modules.map(module =>
      this.constructCommonModule(module.ast.body, module.dependencies)
        .then(moduleAst => module.hash === entryModuleHash ?
          markAsEntry(moduleAst) :
          moduleAst
        )
        .then(moduleAst => t.objectProperty(t.stringLiteral(module.hash), moduleAst))
    ))
      .then(moduleProps => moduleSetTmpl({
        GLOBAL_NAME: t.stringLiteral(globalName),
        MODULES_HASH: t.objectExpression(moduleProps)
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
    GLOBAL_NAME: t.stringLiteral(globalName)
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
    GLOBAL_NAME: t.stringLiteral(globalName),
    MODULE_HASH: t.stringLiteral(moduleHash)
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
      GLOBAL_NAME: t.stringLiteral(globalName),
      URLS: fromObject(urls)
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
  return Promise.all([
    opts.includeRuntime && this.constructRuntime(this.opts.globalName),
    opts.urls && this.constructRegisterUrls(opts.urls, this.opts.globalName),
    opts.modules && this.constructModuleSet(opts.modules, this.opts.globalName, opts.entryModuleHash)
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
    .then(body => iifeTmpl({
      BODY: body.filter(x => x)
    }));
}, { constructBundleBody });
