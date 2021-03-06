import { assign, uniq } from "lodash";
import { transformFromAst } from "babel-core";

import { pluggable } from "pluggable";
import transformAmd from "./transform-amd";


/**
 * Transforms the module's AST, returning a module object with transformed
 * `ast` property as well as a new `synchronousRequires` property.  If the
 * module is not of type "javascript", transformations to type-specific
 * intermediate representation should occur at this step.
 *
 * @param  {Object} module  Module object, with `ast` property.
 *
 * @return {Object}         Module object with transformed `ast` property
 *                          and new `synchronousRequires` property.
 */
export default pluggable(function transformModule (module) {
  if (module.type !== "javascript") {
    throw new Error("Cannot transform non-JS module.  Please activate appropriate plugin.");
  }
  const babelUserConfig = this.opts.babelConfig || {};
  let synchronousRequires = [];

  const getRequires = {
    visitor: {
      CallExpression (path) {
        if (path.node.callee.name === "require") {
          if (path.node.arguments.length === 0) {
            throw new Error("Require expressions must include a target.");
          }
          synchronousRequires.push(path.node.arguments[0].value);
        }
      }
    }
  };

  const config = assign({}, babelUserConfig, {
    filename: module.path,
    code: false,
    ast: true,
    plugins: [
      ...(babelUserConfig.plugins || []),
      require.resolve("babel-plugin-transform-es2015-modules-commonjs"),
      transformAmd(),
      getRequires
    ]
  });

  const { ast } = transformFromAst(module.ast, null, config);
  synchronousRequires = uniq(synchronousRequires);

  return assign({}, module, {
    synchronousRequires,
    ast: ast.program
  });
});
