import discoverModules from "./discover";
import updateRequires from "./update-requires";

export default function compileModules (compilation, seedModules) {
  return discoverModules(compilation, seedModules)
    .map(module => updateRequires(module, compilation.cache.modulesByAbsPath));
}
