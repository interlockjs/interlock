import crypto from "crypto";

import * as Pluggable from "../../pluggable";

/**
 * Calculate the bundle's hash by invoking `update` with data from the bundle.
 * `update` should be called with string data only.
 *
 * @param  {Function} update  Updates the ongoing computation of bundle hash.
 * @param  {Object}   bundle  The bundle object.
 */
const updateBundleHash = Pluggable.sync(function updateBundleHash (update, bundle) {
  update(JSON.stringify(bundle.moduleHashes), "utf-8");
  update(JSON.stringify(!!bundle.entry), "utf-8");
  update(JSON.stringify(!!bundle.includeRuntime), "utf-8");
});

function hashBundle (bundle) {
  // Node v0.10.x cannot re-use crypto instances after digest is called.
  bundle.setHash = crypto.createHash("sha1")
    .update(JSON.stringify(bundle.moduleHashes), "utf-8")
    .digest("hex");

  const shasum = crypto.createHash("sha1");
  const update = shasum.update.bind(shasum);
  this.updateBundleHash(update, bundle);

  return shasum.digest();
}

export default Pluggable.sync(hashBundle, { updateBundleHash });
