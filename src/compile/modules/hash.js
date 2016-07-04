import crypto from "crypto";

import { assign } from "lodash";

import { pluggable } from "pluggable";


/**
 * Use data from the provided module to generate a hash, utilizing the provided
 * update function.  Only string values should be passed to the update function.
 * The resulting hash should be deterministic for the same inputs in the same order.
 *
 * @param  {Object}    module  Module that needs a hash property.
 * @param  {Function}  update  Function to be invoked with data that uniquely
 *                             identifies the module (or, more precisely, the
 *                             run-time behavior of the module).
 */
const updateModuleHash = pluggable(function updateModuleHash (update, module) {
  const dependencyHashes = module.dependencies.map(dep => dep.hash);
  dependencyHashes.sort();

  update(module.rawSource);
  update(module.ns);
  update(module.nsPath);
  dependencyHashes.forEach(update);
});

/**
 * Given a mostly-compiled module, generate a hash for that module and resolve
 * to that module with a new `hash` property.
 *
 * @param  {Object}  module  Module that needs to be hashed hash.
 *
 * @return {Object}          Module that now has a hash property.
 */
export default pluggable(function hashModule (module) {
  if (module.hash) { return module; }

  const shasum = crypto.createHash("sha1");
  const update = shasum.update.bind(shasum);

  return this.updateModuleHash(update, module)
    .then(() => shasum.digest("base64")
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=+$/, ""))
    .then(hash => assign({}, module, { hash }));
}, { updateModuleHash });
