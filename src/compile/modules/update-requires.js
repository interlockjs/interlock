import { transformFromAst } from "babel-core";

import { pluggable } from "pluggable";


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
  const updatePlugin = {
    visitor: {
      CallExpression (path) {
        if (path.node.callee.name === "require") {
          const originalVal = path.node.arguments[0].value;
          const correspondingModule = module.dependenciesByInternalRef[originalVal];
          path.node.arguments[0].value = correspondingModule.hash;
          path.node.arguments[0].raw = `"$(correspondingModule.hash)"`;
        }
      }
    }
  };

  const ast = transformFromAst(module.ast, null, {
    code: false,
    plugins: [updatePlugin]
  }).ast.program;

  return Object.assign({}, module, { ast });
});
