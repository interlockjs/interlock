import path from "path";

import _ from "lodash";
import Promise from "bluebird";

import pluggable from "../../pluggable";
import resolveModule from "./resolve";
import loadModule from "./load";
import hashModule from "./hash";
import parseModule from "./parse";
import transformModule from "./transform";
import updateRequires from "./update-requires";


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
  const modulesByAbsPath = this.cache.modulesByAbsPath;

  /**
   * Given a require string (or compatible value), attempt to resolve that
   * reference, generate a new seed module for that reference, and resolve to
   * that module, recursively compiled.
   *
   * @param  {String}  requireStr    Relative or absolute path.
   * @param  {String}  contextPath   Path from which relative paths should be resolved.
   * @param  {String}  contextNs     Default/originating namespace to use when resolving
   *                                 the require string.
   * @param  {String}  contextNsRoot Default/originating namespace root path to use
   *                                 when resolving the require string.
   *
   * @return {Promise}               Resolves to compiled module.
   */
  const getDependency = (requireStr, contextPath, contextNs, contextNsRoot) => {
    return this.resolveModule(requireStr, contextPath, contextNs, contextNsRoot)
      .then(compileModule.bind(this)) // eslint-disable-line no-use-before-define
      .then(childModule => [requireStr, childModule]);
  };

  /**
   * Given an array of dependencies that are guaranteed to have already been compiled
   * at the point of this function's invocation, generate a flattened list of
   * all modules dependencies.
   *
   * @param  {Array}  dependencies  Array of compiled modules.
   *
   * @return {Array}                Array of compiled modules (and their dependencies).
   */
  const getDeepDependencies = dependencies => _.chain(dependencies)
    .map(([, dep]) => dep.deepDependencies.concat(dep))
    .flatten()
    .value();

  /**
   * Given a module whose dependency references (like require strings) have been
   * determined, recursively compile all dependencies and return the module with
   * new dependency properties.
   *
   * @param  {Object}  module  Module for whom dependencies should be compiled.
   *
   * @return {Object}          Module with new dependency properties.
   */
  const generateDependencies = module => {
    const contextPath = path.dirname(module.path);
    const directDependencies = Promise.all(module.synchronousRequires.map(requireStr =>
      getDependency(requireStr, contextPath, module.ns, module.nsRoot)));

    return Promise.all([directDependencies, directDependencies.then(getDeepDependencies)])
      .then(([depTuples, deepDependencies]) => Object.assign({}, module, {
        // De-dupe any (deep-)dependencies by their hash.
        deepDependencies: _.chain(deepDependencies).indexBy("hash").values().value(),
        dependencies: _.chain(depTuples)
          .map(([, dependency]) => dependency)
          .indexBy("hash")
          .values()
          .value(),
        // Generate a mapping between the original require strings and the modules
        // they resolved to.
        dependenciesByInternalRef: _.object(depTuples)
      }));
  };

  /**
   * Takes in a seed module and returns a promise that resolves to a the same module
   * once it and its dependencies have been compiled.
   *
   * @param  {Object}  module  Seed module.
   *
   * @return {Promise}         Resolves to compiled module.
   */
  const compileModule = module => {
    if (module.path in modulesByAbsPath) {
      return modulesByAbsPath[module.path];
    }

    return modulesByAbsPath[module.path] = this.loadModule(module)
      .then(this.parseModule)
      .then(this.transformModule)
      .then(generateDependencies)
      .then(this.hashModule)
      .then(this.updateRequires);
  };

  return Promise.all(moduleSeeds.map(compileModule))
    .then(compiledSeedModules => _.chain(compiledSeedModules)
      .map(seedModule => seedModule.deepDependencies.concat(seedModule))
      .flatten()
      .uniq()
      .value()
    );
}, { resolveModule, loadModule, hashModule, parseModule, transformModule, updateRequires });

export default compileModules;
