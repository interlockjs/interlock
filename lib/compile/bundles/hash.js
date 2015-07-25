import crypto from "crypto";

import * as Pluggable from "../../pluggable";

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
  bundle.bundleHash = shasum.digest();

  return bundle;
}

export default Pluggable.sync(hashBundle, { updateBundleHash });
