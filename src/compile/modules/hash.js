import crypto from "crypto";

import pluggable from "../../pluggable";

/**
 * Use data from the provided module to generate a hash, utilizing the provided
 * update function.  Only string values should be passed to the update function.
 * The resulting hash should be deterministic for the same inputs in the same order.
 *
 * @param  {Object}    args         Wrapper object for update and module.
 * @param  {Object}    args.module  Module that needs a hash property.
 * @param  {Function}  args.update  Function to be invoked with data that uniquely
 *                                  identifies the module (or, more precisely, the
 *                                  run-time behavior of the module).
 *
 * @return {Object}                 The same as the input `args`.  This is so that
 *                                  chained transformers of this function have easy
 *                                  access to both the module and the update
 *                                  function.
 */
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

  return this.updateModuleHash({ update, module })
    .then(() => shasum.digest("hex"))
    .then(hash => Object.assign({}, module, { hash }));
}, { updateModuleHash });
