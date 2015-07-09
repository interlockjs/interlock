import crypto from "crypto";

export default function hashModule (compilation, module) {
  if (module.hash) { return module; }
  const dependencyHashes = module.dependencies.map(dep => dep.hash);
  dependencyHashes.sort();

  const shasum = crypto.createHash("sha1");
  const update = shasum.update.bind(shasum);
  update(module.rawSource);
  update(module.ns);
  update(module.nsPath);
  dependencyHashes.forEach(update);

  compilation.applyPlugins("hash", update, module);

  module.hash = shasum.digest("hex");
  return module;
}
