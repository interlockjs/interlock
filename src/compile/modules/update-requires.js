import traverse from "babel-traverse";

import { pluggable } from "pluggable";
import { assign } from "lodash";


/**
 * Give a module whose dependencies have been identified and compiled, replace
 * all original `require("path/to/dep")` with `require("HASH_OF_DEP")`.
 *
 * @param  {Object}  module  Module with AST containing original require expressions.
 *
 * @return {Object}          Module with AST containing require expressions whose
 *                           arguments have been replaced with corresponding dependency
 *                           module hashes.
 */
export default pluggable(function updateRequires (module) {
  traverse.cheap(module.ast, node => {
    if (
      node.type === "CallExpression" &&
      node.callee.name === "require"
    ) {
      const originalVal = node.arguments[0].value;
      const correspondingModule = module.dependenciesByInternalRef[originalVal];
      node.arguments[0].value = correspondingModule.hash;
      node.arguments[0].raw = `"$(correspondingModule.hash)"`;
    }
  });

  return assign({}, module, { ast: module.ast });
});
