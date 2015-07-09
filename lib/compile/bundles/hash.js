import crypto from "crypto";

export default function hashBundle (bundle) {
  // Node v0.10.x cannot re-use crypto instances after digest is called.
  bundle.setHash = crypto.createHash("sha1")
    .update(JSON.stringify(bundle.moduleHashes), "utf-8")
    .digest("hex");
  bundle.bundleHash = crypto.createHash("sha1")
    .update(JSON.stringify(bundle.moduleHashes), "utf-8")
    .update(JSON.stringify(!!bundle.entry), "utf-8")
    .update(JSON.stringify(!!bundle.includeRuntime), "utf-8")
    .digest("hex");
  return bundle;
}
