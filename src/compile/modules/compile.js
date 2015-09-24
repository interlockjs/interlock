import path from "path";

import _ from "lodash";
import { transform } from "babel-core";
import Promise from "bluebird";

import pluggable from "../../pluggable";
import resolveModule from "./resolve";
import loadModule from "./load";
import hashModule from "./hash";
import parseModule from "./parse";
import transformModuleAst from "./transform-module-ast";
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

  const compileModule = module => {
    if (module.path in modulesByAbsPath) {
      return modulesByAbsPath[module.path];
    }

    const contextPath = path.dirname(module.path);

    // When the promise resolves, all shallow- and deep- dependencies will have been
    // resolved and fully generated, and the module's hash will also have been calculated.
    return modulesByAbsPath[module.path] = this.loadModule(module)
      .then(this.parseModule)
      .then(loadedModule => {
        const { ast, synchronousRequires } =
          transformModuleAst(loadedModule.ast, this.opts.babelConfig);
        Object.assign(module, loadedModule, { ast: ast.program });

        const dependenciesP = Promise.all(synchronousRequires.map(requireStr =>
          getDependency(requireStr, contextPath, module.ns, module.nsRoot)));
        const deepDependenciesP = dependenciesP.then(getDeepDependencies);

        return Promise.all([dependenciesP, deepDependenciesP]);
      })
      .then(([dependencies, deepDependencies]) => {
        const moduleWithDeps = Object.assign({}, module, {
          // De-dupe any (deep-)dependencies by their hash.
          deepDependencies: _.chain(deepDependencies).indexBy("hash").values().value(),
          dependencies: _.chain(dependencies)
            .map(([, dependency]) => dependency)
            .indexBy("hash")
            .values()
            .value()
        });

        return this.hashModule(moduleWithDeps)
          .then(hash => Object.assign({}, moduleWithDeps, { hash }))
          .then(hashedModule => {
            // Generate a mapping between the original require strings and the
            // hashes of the modules they resolved to.
            const requireStrToModHash = _.object(dependencies);

            // Update require statements to refer to the hashes of dependencies.
            const updatedRequiresAst = transform.fromAst(module.ast, null, {
              code: false,
              whitelist: ["react"],
              plugins: [ updateRequires(requireStrToModHash)]
            }).ast.program;

            return Object.assign({}, hashedModule, { ast: updatedRequiresAst });
          });
      });
  };

  return Promise.all(seedModules.map(compileModule))
    .then(compiledSeedModules => _.chain(compiledSeedModules)
      .map(seedModule => seedModule.deepDependencies.concat(seedModule))
      .flatten()
      .uniq()
      .value()
    );
}, { resolveModule, loadModule, hashModule, parseModule });

export default compileModules;
