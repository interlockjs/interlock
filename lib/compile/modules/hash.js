import crypto from "crypto";

import * as Pluggable from "../../pluggable";

const updateModuleHash = Pluggable.sync(function updateModuleHash (args) {
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

  this.updateModuleHash({ update, module });

  return shasum.digest("hex");
}

export default Pluggable.sync(hashModule, { updateModuleHash });
