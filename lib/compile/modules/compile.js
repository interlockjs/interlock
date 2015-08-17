import path from "path";

import most from "most";
import _ from "lodash";
import { transform } from "babel-core";

import * as Pluggable from "../../pluggable";
import { toArray, toHash } from "../../util/stream";

import resolve from "./resolve";
import loadAst from "./load-ast";
import hashModule from "./hash";

import coerceToCommonJs from "./coerce-to-common-js";
import updateRequires from "./update-requires";

const compileModules = Pluggable.stream(function compileModules (seedModules) {
  const modulesByAbsPath = this.cache.modulesByAbsPath;
  const streamsByAbsPath = {};

  const genModules = module => {
    if (module.path in streamsByAbsPath) {
      return streamsByAbsPath[module.path];
    }

    const contextPath = path.dirname(module.path);
    const {ast, synchronousRequires} = coerceToCommonJs(module.ast);
    module = Object.assign({}, module, { ast: ast.program });

    const resolvedDeps = most.from(synchronousRequires)
      .map(requireStr => this.resolve(requireStr, contextPath, module.ns, module.nsRoot)
        .then(asset => [requireStr, asset]))
      .await();

    const resolvedRequiresPromise = resolvedDeps.reduce((resolvedRequires, [requireStr, asset]) => {
      resolvedRequires[requireStr] = asset.path;
      return resolvedRequires;
    }, {});

    const directDeps = resolvedDeps
      .map(([, asset]) => Promise.resolve(modulesByAbsPath[asset.path] || this.loadAst(asset)))
      .await();

    const descendants = directDeps.flatMap(dep => genModules(dep));

    const hashedModulePromise = Promise.all([
      toArray(directDeps),
      toArray(descendants),
      toHash(descendants, "path")
    ])
      .then(([dependencies, deepDependencies, deepDepsHash]) => {
        dependencies = dependencies.map(dep => deepDepsHash[dep.path]);
        return Object.assign({}, module, { dependencies, deepDependencies });
      })
      .then(moduleWithDeps => this.hashModule(moduleWithDeps)
        .then(hash => Object.assign({}, moduleWithDeps, { hash })));

    const updatedModulePromise = Promise.all([
      hashedModulePromise,
      resolvedRequiresPromise
    ])
      .then(([hashedModule, resolvedRequires]) => {
        return modulesByAbsPath[module.path] = Object.assign({}, hashedModule, {
          // De-dupe any (deep) dependencies by their hash.
          deepDependencies: _.chain(hashedModule.deepDependencies).indexBy("hash").values().value(),
          dependencies: _.chain(module.dependencies).indexBy("hash").values().value(),

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

  return seedModules.flatMap(genModules);

}, { resolve, loadAst, hashModule });

export default compileModules;

