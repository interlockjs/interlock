import { reduce } from "lodash";

import { pluggable } from "pluggable";


/**
 * Given a set of fully compiled modules, generate and return two
 * hashmaps of those modules, indexed by their hash and their
 * absolute path.
 *
 * @param  {Array}   modules   Fully compiles modules.
 *
 * @return {Object}            Fully compiled modules, indexed by hash and
 *                             absolute path.
 */
export default pluggable(function generateModuleMaps (modules) {
  return reduce(modules, (moduleMaps, module) => {
    moduleMaps.byHash[module.hash] = module;
    moduleMaps.byAbsPath[module.path] = module;
    return moduleMaps;
  }, {
    byHash: {},
    byAbsPath: {}
  });
});
