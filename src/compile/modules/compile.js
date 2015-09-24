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


const compileModules = pluggable(function compileModules (seedModules) {
  const modulesByAbsPath = this.cache.modulesByAbsPath;

  const getDependency = (requireStr, contextPath, contextNs, contextNsRoot) => {
    return this.resolveModule(requireStr, contextPath, contextNs, contextNsRoot)
      .then(compileModule.bind(this)) // eslint-disable-line no-use-before-define
      .then(childModule => [requireStr, childModule]);
  };

  const getDeepDependencies = dependencies => _.chain(dependencies)
    .map(([, dep]) => dep.deepDependencies.concat(dep))
    .flatten()
    .value();

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

  return Promise.all(seedModules.map(compileModule))
    .then(compiledSeedModules => _.chain(compiledSeedModules)
      .map(seedModule => seedModule.deepDependencies.concat(seedModule))
      .flatten()
      .uniq()
      .value()
    );
}, { resolveModule, loadModule, hashModule, parseModule, transformModule, updateRequires });

export default compileModules;
