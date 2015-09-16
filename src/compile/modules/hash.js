import crypto from "crypto";

import pluggable from "../../pluggable";

const updateModuleHash = pluggable(function updateModuleHash (args) {
  const { update, module } = args;

  const dependencyHashes = module.dependencies.map(dep => dep.hash);
  dependencyHashes.sort();

  update(module.rawSource);
  update(module.ns);
  update(module.nsPath);
  dependencyHashes.forEach(update);

  return { update, module };
});

function hashModule (module) {
  if (module.hash) { return module; }

  const shasum = crypto.createHash("sha1");
  const update = shasum.update.bind(shasum);

  return this.updateModuleHash({ update, module })
    .then(() => shasum.digest("hex"));
}

export default pluggable(hashModule, { updateModuleHash });
