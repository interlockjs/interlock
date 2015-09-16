import pluggable from "../../pluggable";
import resolve from "../../resolve";

const createModule = pluggable(function createModule (overrides) {
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

const preresolve = pluggable(function preresolve (requireStr) {
  return requireStr;
});

function resolveModule (requireStr, contextPath, ns, nsRoot, extensions) {
  contextPath = contextPath || this.opts.srcRoot;

  return this.preresolve(requireStr, contextPath)
    .then(requireStrToResolve => {
      const resolved = resolve(
        requireStrToResolve,
        contextPath || this.opts.srcRoot,
        ns || this.opts.ns,
        nsRoot || this.opts.srcRoot,
        extensions || this.opts.extensions
      );

      if (!resolved) {
        throw new Error(`Cannot resolve ${requireStr} from ${contextPath}.`);
      }

      return this.createModule(resolved);
    });
}

export default pluggable(resolveModule, { preresolve, createModule });
