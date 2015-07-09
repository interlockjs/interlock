const discoverModules = require("./discover");
const hashModule = require("./hash");
const updateRequires = require("./update-requires");

module.exports = function compileModules (compilation, seedModules) {
  return discoverModules(compilation, seedModules)
    .map(module => hashModule(compilation, module))
    .map(module => updateRequires(module, compilation.cache.modulesByAbsPath));
};
