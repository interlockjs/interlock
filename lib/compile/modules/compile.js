import discoverModules from "./discover";
import hashModule from "./hash";
import updateRequires from "./update-requires";

export default function compileModules (compilation, seedModules) {
  return discoverModules(compilation, seedModules)
    .map(module => hashModule(compilation, module))
    .map(module => updateRequires(module, compilation.cache.modulesByAbsPath));
}
