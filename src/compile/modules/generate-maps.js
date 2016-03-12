import _ from "lodash";

import { pluggable } from "pluggable";
import compileModules from "./compile";


/**
 * Given a set of module seeds (originally generated from bundle definitions
 * passed into the Interlock constructor), traverse their dependency graph
 * to identify all modules that are depended on.
 *
 * Once modules are fully compiled, index them by their hash and their absolute
 * path, and return those indexes.
 *
 * @param  {Array}   moduleSeeds   Early-stage module objects.
 *
 * @return {Object}                Fully compiled modules, indexed by hash and
 *                                 absolute path.
 */
export default pluggable(function generateModuleMaps (moduleSeeds) {
  return this.compileModules(moduleSeeds)
    .then(modules => _.reduce(modules, (moduleMaps, module) => {
      moduleMaps.byHash[module.hash] = module;
      moduleMaps.byAbsPath[module.path] = module;
      return moduleMaps;
    }, {
      byHash: {},
      byAbsPath: {}
    }));
}, { compileModules });
