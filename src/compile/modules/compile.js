import path from "path";

import most from "most";
import _ from "lodash";
import { transform } from "babel-core";

import * as Pluggable from "../../pluggable";
import { toArray, toHash } from "../../util/stream";

import resolve from "./resolve";
import loadAst from "./load-ast";
import hashModule from "./hash";

import transformModuleAst from "./transform-module-ast";
import updateRequires from "./update-requires";

const compileModules = Pluggable.stream(function compileModules (seedModules) {
  const modulesByAbsPath = this.cache.modulesByAbsPath;
  const streamsByAbsPath = {};

  /**
   * In order, asynchronously accomplishes the following:
   *
   *  1. Parses the module's source to AST.
   *  2. Resolves all of the module's shallow dependencies.
   *  3. Generates module stubs for all shallow dependencies.
   *  4. Recursively generates all dependencies and their dependencies.
   *  5. Attaches generated (deep-)dependencies to module and calculates hash.
   *  6. Updates all require statements with hashes of resolved modules.
   *
   * @param  {Object} module  Un-generated module object.
   *
   * @returns {Stream}         Stream of all generated dependencies, followed by
   *                           the generated input module itself.
   */
  const genModules = module => {
    if (module.path in streamsByAbsPath) {
      return streamsByAbsPath[module.path];
    }

    const contextPath = path.dirname(module.path);
    const {ast, synchronousRequires} = transformModuleAst(module.ast, this.opts.babelConfig);
    module = Object.assign({}, module, { ast: ast.program });

    // A stream of tuples, where the first element is a require string from the
    // source module, and the second element is the resolved (but un-generated)
    // asset.
    const resolvedDeps = most.from(synchronousRequires)
      .map(requireStr => this.resolve(requireStr, contextPath, module.ns, module.nsRoot)
        .then(asset => [requireStr, asset]))
      .await();

    // A hash of require strings to the paths of the modules they resolved to.
    const resolvedRequiresPromise = resolvedDeps.reduce((resolvedRequires, [requireStr, asset]) => {
      resolvedRequires[requireStr] = asset.path;
      return resolvedRequires;
    }, {});

    // A stream of all (un-generated) shallow dependencies.
    const directDeps = resolvedDeps
      .map(([, asset]) => Promise.resolve(modulesByAbsPath[asset.path] || this.loadAst(asset)))
      .await();

    // A stream of all deep dependencies of the source module, fully generated.
    const descendants = directDeps.flatMap(dep => genModules(dep));

    // Represents the module in the state where all shallow and deep dependencies have been
    // resolved and fully generated, and where the module's hash has also been calculated.
    const hashedModulePromise = Promise.all([
      toArray(directDeps),
      toArray(descendants),
      toHash(descendants, "path")
    ])
      .then(([dependencies, deepDependencies, deepDepsHash]) => {
        // Only deep-dependencies have been fully generated (via above call to
        // `genModules`).  Each module in `module.dependencies` should refer to
        // the fully generated version, so populate dependencies array with
        // associated entries in deepDependencies.
        dependencies = dependencies.map(dep => deepDepsHash[dep.path]);

        const moduleWithDeps = Object.assign({}, module, {
          // De-dupe any (deep-)dependencies by their hash, and add to the module.
          deepDependencies: _.chain(deepDependencies).indexBy("hash").values().value(),
          dependencies: _.chain(dependencies).indexBy("hash").values().value()
        });

        return this.hashModule(moduleWithDeps)
          .then(hash => Object.assign({}, moduleWithDeps, { hash }));
      });

    // Represents the module in the state where the argument of each require statement
    // has been replaced with the hash of the corresponding dependency.
    const updatedModulePromise = Promise.all([
      hashedModulePromise,
      resolvedRequiresPromise
    ])
      .then(([hashedModule, resolvedRequires]) => {
        return modulesByAbsPath[module.path] = Object.assign({}, hashedModule, {
          // Update require statements to refer to newly calculated hashes.
          ast: transform.fromAst(module.ast, null, {
            code: false,
            whitelist: ["react"],
            plugins: [ updateRequires(modulesByAbsPath, resolvedRequires)]
          }).ast.program
        });
      });

    return streamsByAbsPath[module.path] =
      most.concat(descendants, most.fromPromise(updatedModulePromise));
  };

  return seedModules
    .flatMap(genModules)
    // Repeats are (necessarily) generated as part of module generation, where
    // two modules share as a dependency the same other module.  These repeats
    // should be filtered out of the resulting stream.
    .skipRepeats();

}, { resolve, loadAst, hashModule, transformModuleAst });

export default compileModules;

