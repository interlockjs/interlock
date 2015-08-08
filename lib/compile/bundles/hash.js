import crypto from "crypto";

import * as Pluggable from "../../pluggable";

/**
 * Calculate the bundle's hash by invoking `update` with data from the bundle.
 * `update` should be called with string data only.
 *
 * @param  {Function} update  Updates the ongoing computation of bundle hash.
 * @param  {Object}   bundle  The bundle object.
 */
const updateBundleHash = Pluggable.promise(function updateBundleHash (update, bundle) {
  update(JSON.stringify(bundle.moduleHashes), "utf-8");
  update(JSON.stringify(!!bundle.entry), "utf-8");
  update(JSON.stringify(!!bundle.includeRuntime), "utf-8");
});


/**
 * Calculate the bundle's hash.  Defers to [updateBundleHash](#updatebundlehash) for
 * the actual calculations.
 *
 * @param  {Object} bundle  Bundle.
 *
 * @return {String}         40-character SHA1 that uniquely identifies the bundle.
 */
function hashBundle (bundle) {
  // Node v0.10.x cannot re-use crypto instances after digest is called.
  bundle.setHash = crypto.createHash("sha1")
    .update(JSON.stringify(bundle.moduleHashes), "utf-8")
    .digest("hex");

  const shasum = crypto.createHash("sha1");
  const update = shasum.update.bind(shasum);

  return this.updateBundleHash(update, bundle)
    .then(() => shasum.digest());
}

export default Pluggable.promise(hashBundle, { updateBundleHash });
