import path from "path";

import esquery from "esquery";
import most from "most";

import resolve from "./resolve";
import loadAst from "./load-ast";

export default function discoverModules (compilation, seedModules) {
  const modulesByAbsPath = compilation.cache.modulesByAbsPath;

  function* genModules (module) {
    if (module.path in modulesByAbsPath) { return; }
    modulesByAbsPath[module.path] = module;
    const contextPath = path.dirname(module.path);

    module.dependencies = [];
    module.requireNodes = esquery(module.ast, "CallExpression[callee.name=require]");

    for (let requireNode of module.requireNodes) {
      const requireStr = requireNode.arguments[0].value;
      const asset = resolve.call(compilation, requireStr, contextPath, module.ns, module.nsRoot);
      requireNode.resolved = asset.path;

      if (asset.path in modulesByAbsPath) {
        module.dependencies.push(modulesByAbsPath[asset.path]);
      } else {
        const newModule = loadAst.call(compilation, asset);
        yield* genModules(newModule);
        modulesByAbsPath[module.path] = newModule;
        module.dependencies.push(newModule);
      }
    }

    module.deepDependencies = Array.prototype.concat.apply(
      module.dependencies,
      module.dependencies.map(dep => dep.dependencies)
    );

    yield module;
  }

  return seedModules.flatMap(module => most.generate(genModules, module));
}
