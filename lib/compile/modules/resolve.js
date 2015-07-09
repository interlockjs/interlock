import resolve from "../../resolve";

function createModule (overrides) {
  return Object.assign({
    path: null,
    ns: null,
    nsPath: null,
    nsRoot: null,
    rawSource: null,
    ast: null,
    requireNodes: null,
    dependencies: null,
    hash: null
  }, overrides);
}

export default function resolveModule (requireStr, contextPath, ns, nsRoot) {
  var asset, resolved;

  contextPath = contextPath || this.opts.root;
  requireStr = this.applyPlugins("preresolve", requireStr, contextPath);

  resolved = resolve(
    requireStr,
    contextPath || this.opts.root,
    ns || this.opts.ns,
    nsRoot || this.opts.root,
    this.opts.extensions
  );

  if (!resolved) {
    throw new Error("Cannot resolve '" + requireStr + "' from '" + contextPath + "'.");
  }

  asset = this.applyPlugins("postresolve", createModule(resolved), requireStr);
  return asset;
}
