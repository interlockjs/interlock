import _ from "lodash";
import { Plugin, types as t } from "babel-core";

/*
  "./path/to/thing" --> `require("./path/to/thing")`
 */
function requireCallExpression (requireStr) {
  return t.callExpression(t.identifier("require"), [t.literal(requireStr)]);
}

/*
  `some.expression()` --> `some.expression();`
 */
function expressionStmt (expr) {
  return t.expressionStatement(expr);
}

/*
  module.exports = (function () {
    // ... require statements
    // ... module body
  })();
 */
function commonJsTemplate (requireStatements, moduleBody) {
  return t.assignmentExpression(
    "=",
    t.memberExpression(t.identifier("module"), t.identifier("exports")),
    t.callExpression(
      t.functionExpression(null, [], t.blockStatement(
        requireStatements.concat(moduleBody)
      )),
      []
    )
  );
}

function toRequire (requireTuple) {
  const [requireVar, requireStr] = requireTuple;

  if (requireVar) {
    return t.variableDeclaration("var", [t.variableDeclarator(
      t.identifier(requireVar),
      requireCallExpression(requireStr)
    )]);
  }

  return expressionStmt(requireCallExpression(requireStr));
}

function toCommonJs (defineArray, defineFunction) {
  const requireStrings = defineArray.elements.map(el => el.value);
  const requireVars = defineFunction.params.map(param => param.name);
  const requireStatements = _.zip(requireVars, requireStrings).map(toRequire);
  return commonJsTemplate(requireStatements, defineFunction.body.body);
}

export default function () {
  let topLevelNode;

  return new Plugin("convert-from-amd", {
    visitor: {
      ExpressionStatement: function (node, parent) {
        if (parent.type === "Program") {
          topLevelNode = node;
        }
      },
      CallExpression: function (node, parent) {
        if (parent === topLevelNode && node.callee.name === "define") {
          const args = node.arguments;
          if (args.length === 2 &&
              args[0].type === "ArrayExpression" &&
              args[1].type === "FunctionExpression") {
            this.replaceWith(toCommonJs(args[0], args[1]));
            return;
          } else if (args.length === 3 &&
                     args[1].type === "ArrayExpression" &&
                     args[1].type === "FunctionExpression") {
            this.replaceWith(toCommonJs(args[1], args[2]));
            return;
          }
          throw new Error("Could not parse `define` block.");
        }
      }
    }
  });

}
