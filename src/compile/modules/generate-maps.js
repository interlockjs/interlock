import _ from "lodash";

import pluggable from "../../pluggable";
import compileModules from "./compile";


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
