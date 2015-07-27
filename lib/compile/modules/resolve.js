import * as Pluggable from "../../pluggable";
import resolve from "../../resolve";

const createModule = Pluggable.sync(function createModule (overrides) {
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
});

const preresolve = Pluggable.sync(function preresolve (requireStr) {
  return requireStr;
});

function resolveModule (requireStr, contextPath, ns, nsRoot) {
  contextPath = contextPath || this.opts.root;

  requireStr = this.preresolve(requireStr, contextPath);

  const resolved = resolve(
    requireStr,
    contextPath || this.opts.root,
    ns || this.opts.ns,
    nsRoot || this.opts.root,
    this.opts.extensions
  );

  if (!resolved) {
    throw new Error(`Cannot resolve ${requireStr} from ${contextPath}.`);
  }

  return this.createModule(resolved);
}

export default Pluggable.sync(resolveModule, { preresolve, createModule });
