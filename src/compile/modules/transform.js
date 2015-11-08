import _ from "lodash";
import { Plugin, transform } from "babel-core";

import pluggable from "../../pluggable";
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

  const getRequires = new Plugin("get-requires", {
    visitor: {
      CallExpression (node/*, parent */) {
        if (node.callee.name === "require") {
          if (node.arguments.length === 0) {
            throw new Error("Require expressions must include a target.");
          }
          synchronousRequires.push(node.arguments[0].value);
        }
      }
    }
  });

  const config = _.extend({}, babelUserConfig, {
    whitelist: babelUserConfig.whitelist ?
      _.uniq(["es6.modules", ...(babelUserConfig.whitelist || [])]) :
      undefined,
    code: false,
    ast: true,
    plugins: [...(babelUserConfig.plugins || []), {
      transformer: transformAmd(),
      position: "after"
    }, {
      transformer: getRequires,
      position: "after"
    }]
  });

  const { ast } = transform.fromAst(module.ast, null, config);
  synchronousRequires = _.uniq(synchronousRequires);

  return Object.assign({}, module, {
    synchronousRequires,
    ast: ast.program
  });
});
