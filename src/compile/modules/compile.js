/* eslint-disable no-use-before-define */
import path from "path";

import { assign, chain, fromPairs } from "lodash";
import Promise from "bluebird";
import { pluggable } from "pluggable";

import resolveModule from "./resolve";
import loadModule from "./load";
import hashModule from "./hash";
import generateModuleId from "./generate-id";
import parseModule from "./parse";
import transformModule from "./transform";
import updateRequires from "./update-requires";


/**
 * Because the `compileModule` and `generateDependencies` functions interact
 * recursively, defining a stand-in pluggable for `compileModule` allows for
 * plugins to utilize `compileModule` from within an overridden `generateDependencies`.
 *
 * For true behavior, please see documentation for `compileModule`.
 *
 * @return {Promise}         Resolves to compiled module.
 */
const compileModuleR = pluggable(function compileModuleR () {
  return compileModule.apply(this, arguments);
});

/**
 * Given a module whose dependency references (like require strings) have been
 * determined, recursively compile all dependencies and return the module with
 * new dependency properties.
 *
 * @param  {Object}  module  Module for whom dependencies should be compiled.
 *
 * @return {Object}          Module with new dependency properties.
 */
const generateDependencies = pluggable(function generateDependencies (module) {

  // Given a require string or similar absolute/relative path reference, resolve
  // that reference and compile the dependency (recursively).
  const getDependency = (requireStr, contextPath, contextNs, contextNsRoot) => {
    return this.resolveModule(requireStr, contextPath, contextNs, contextNsRoot)
      .then(dependency => this.compileModuleR(dependency))
      .then(childModule => [requireStr, childModule]);
  };

  // Given an array of compiled module dependencies, generate a recursively flattened
  // list of all module dependencies.
  const getDeepDependencies = dependencies => chain(dependencies)
    .map(([, dep]) => dep.deepDependencies.concat(dep))
    .flatten()
    .value();

  const contextPath = path.dirname(module.path);
  const directDependencies = Promise.all(module.synchronousRequires.map(
    requireStr => getDependency(requireStr, contextPath, module.ns, module.nsRoot)
  ));

  return Promise.all([directDependencies, directDependencies.then(getDeepDependencies)])
    .then(([depTuples, deepDependencies]) => assign({}, module, {
      // De-dupe any (deep-)dependencies by their hash.
      deepDependencies: chain(deepDependencies).keyBy("hash").values().value(),
      dependencies: chain(depTuples)
        .map(([, dependency]) => dependency)
        .keyBy("hash")
        .values()
        .value(),
      // Generate a mapping between the original require strings and the modules
      // they resolved to.
      dependenciesByInternalRef: fromPairs(depTuples)
    }));
}, { resolveModule, compileModuleR });

/**
 * Given an unprocess module that has been loaded from disk, return a promise
 * that resolves to the same module in a processed/compiled state, and whose
 * dependencies have also been processed/compiled.
 *
 * @param  {Object}  module  Seed module.
 *
 * @return {Promise}         Resolves to compiled module.
 */
const compileModule = pluggable(function compileModule (module) {
  const modulesByAbsPath = this.cache.modulesByAbsPath;

  if (module.path in modulesByAbsPath) {
    return modulesByAbsPath[module.path];
  }

  return modulesByAbsPath[module.path] = this.loadModule(module)
    .then(this.parseModule)
    .then(this.transformModule)
    .then(this.generateDependencies)
    .then(this.hashModule)
    .then(this.generateModuleId)
    .then(this.updateRequires);
}, {
  loadModule,
  parseModule,
  transformModule,
  generateDependencies,
  hashModule,
  generateModuleId,
  updateRequires
});

/**
 * Given one or more module seeds, traverse their dependency graph, collecting any and
 * all dependency modules, and then parse, transform, and hash those modules.  Return
 * a promise that resolves to the full set of modules, once they have been correctly
 * gathered and compiled.
 *
 * @param  {Array}    moduleSeeds  Module seeds, i.e. modules that have not yet been
 *                                 populated with properties such as ast, `dependencies`,
 *                                 etc.  Module objects _should_ have path, rawSource,
 *                                 and namespace values.
 *
 * @return {Promise}               Resolves to array of all compiled modules.
 */
const compileModules = pluggable(function compileModules (moduleSeeds) {
  return Promise.all(moduleSeeds.map(this.compileModule.bind(this)))
    .then(compiledSeedModules => chain(compiledSeedModules)
      .map(seedModule => seedModule.deepDependencies.concat(seedModule))
      .flatten()
      .uniq()
      .value()
    );
}, { compileModule });

export default compileModules;
