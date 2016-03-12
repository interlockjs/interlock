import { pluggable } from "pluggable";
import resolve from "../../resolve";


/**
 * Transform the require string before it is resolved to a file on disk.
 * No transformations occur by default - the output is the same as the input.
 *
 * @param  {String}  requireStr  Require string or comparable value.
 *
 * @return {String}              Transformed require string.
 */
const preresolve = pluggable(function preresolve (requireStr) {
  return requireStr;
});

/**
 * Given a require string and some context, resolve that require string
 * to a file on disk, returning a module seed.
 *
 * @param  {String}  requireStr  Require string or comparable value.
 * @param  {String}  contextPath Absolute path from which to resolve any relative
 *                               paths.
 * @param  {String}  ns          Namespace to set on module seed if the resolved
 *                               module is of the same namespace as its context.
 * @param  {String}  nsRoot      Absolute path of default namespace.
 * @param  {Array}   extensions  Array of file extension strings, including the leading
 *                               dot.
 *
 * @return {Object}              Module seed.
 */
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

      return resolved;
    });
}

export default pluggable(resolveModule, { preresolve });
