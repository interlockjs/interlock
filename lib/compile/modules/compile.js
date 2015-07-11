import discoverModules from "./discover";

export default function compileModules (compilation, seedModules) {
  return discoverModules(compilation, seedModules);
}
