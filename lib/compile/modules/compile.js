import path from "path";

import most from "most";
import { transform } from "babel-core";

import * as Pluggable from "../../pluggable";

import resolve from "./resolve";
import loadAst from "./load-ast";
import hashModule from "./hash";

import coerceToCommonJs from "./coerce-to-common-js";
import updateRequires from "./update-requires";


function compileModules (seedModules) {
  const self = this;
  const modulesByAbsPath = this.cache.modulesByAbsPath;

  function* genModules (module) {
    if (module.path in modulesByAbsPath) { return; }
    modulesByAbsPath[module.path] = module;

    const contextPath = path.dirname(module.path);
    const resolvedRequires = Object.create(null);
    module.dependencies = [];

    let {ast, synchronousRequires} = coerceToCommonJs(module.ast);
    module.ast = ast.program;

    for (let requireStr of synchronousRequires) {
      const asset = self.resolve(requireStr, contextPath, module.ns, module.nsRoot);
      resolvedRequires[requireStr] = asset.path;

      if (asset.path in modulesByAbsPath) {
        module.dependencies.push(modulesByAbsPath[asset.path]);
      } else {
        const newModule = self.loadAst(asset);
        yield* genModules(newModule);
        module.dependencies.push(newModule);
      }
    }

    module.deepDependencies = Array.prototype.concat.apply(
      module.dependencies,
      module.dependencies.map(dep => dep.dependencies)
    );

    module.ast = transform.fromAst(module.ast, null, {
      code: false,
      whitelist: ["react"],
      plugins: [
        updateRequires(modulesByAbsPath, resolvedRequires)
      ]
    }).ast.program;

    module.hash = hashModule(module);

    yield module;
  }

  return seedModules.flatMap(module => most.generate(genModules, module));
}

export default Pluggable.stream(compileModules, { resolve, loadAst });

