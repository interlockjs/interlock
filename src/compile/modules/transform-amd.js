import _ from "lodash";
import * as t from "babel-types";


/**
 * Return the AST equivalent of `require(requireStr)`, where requireStr is
 * the provided value.
 *
 *   Example:
 *     "./path/to/thing" --> `require("./path/to/thing")`
 *
 * @param  {String} requireStr  Require string.
 *
 * @return {AST}                Call expression node.
 */
function requireCallExpression (requireStr) {
  return t.callExpression(t.identifier("require"), [t.stringLiteral(requireStr)]);
}

/**
 * Return the provided expression node wrapped in an expression statement node.
 *
 *   Example:
 *     `some.expression()` --> `some.expression();`
 *
 * @param  {AST}    expr  Expression node to wrap.
 *
 * @return {AST}          Expression statement node.
 */
function expressionStmt (expr) {
  return t.expressionStatement(expr);
}

/*

 */
/**
 * Return an assignment expression, setting module.exports to an IIFE containing
 * the provided require statements and module body.
 *
 *   Example:
 *     module.exports = (function () {
 *       // ... require statements
 *       // ... module body
 *     })();
 *
 * @param  {Array}  requireStatements  Array of call expression statements.
 * @param  {Array}  moduleBody         Array of AST nodes.
 *
 * @return {AST}                       Assignment expression AST node.
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

/**
 * Given a desired variable name and require string, generate a new
 * call expression statement.  If no variable name is provided, return
 * a simple call expression statement.
 *
 *   Examples:
 *     `var myVar = require("the-provided-requireStr");`
 *     `require("the-provided-requireStr-that-is-not-assigned");`
 *
 * @param  {String}  requireVar    Variable name.
 * @param  {String}  requireStr    Require string.
 *
 * @return {AST}                   Variable declaration or call expression
 *                                 statement, depending on presence of
 *                                 requireVar.
 */
function toRequire (requireVar, requireStr) {
  if (requireVar) {
    return t.variableDeclaration("var", [t.variableDeclarator(
      t.identifier(requireVar),
      requireCallExpression(requireStr)
    )]);
  }

  return expressionStmt(requireCallExpression(requireStr));
}

/**
 * Given the AST node representing a define function call's dependency array
 * and the AST node representing that same call's callback function, generate
 * the common JS equivalent as AST.
 *
 * @param  {AST}    defineArray     AST node of define dependency array.
 * @param  {AST}    defineFunction  AST node of define callback.
 *
 * @return {AST}                    AST node of common JS equivalent to
 *                                  AMD-style module.
 */
function toCommonJs (defineArray, defineFunction) {
  const requireStrings = defineArray.elements.map(el => el.value);
  const requireVars = defineFunction.params.map(param => param.name);
  const requireStatements = _.zip(requireVars, requireStrings)
    .map(([requireVar, requireStr]) => toRequire(requireVar, requireStr));
  return commonJsTemplate(requireStatements, defineFunction.body.body);
}

export default function () {
  let topLevelNode;

  return {
    visitor: {
      ExpressionStatement (nodePath) {
        if (nodePath.parent.type === "Program") {
          topLevelNode = nodePath.node;
        }
      },
      CallExpression (nodePath) {
        if (nodePath.parent === topLevelNode && nodePath.node.callee.name === "define") {
          const args = nodePath.node.arguments;
          if (args.length === 2 &&
              args[0].type === "ArrayExpression" &&
              args[1].type === "FunctionExpression") {
            nodePath.replaceWith(toCommonJs(args[0], args[1]));
            return;
          } else if (args.length === 3 &&
                     args[1].type === "ArrayExpression" &&
                     args[1].type === "FunctionExpression") {
            nodePath.replaceWith(toCommonJs(args[1], args[2]));
            return;
          }
          throw new Error("Could not parse `define` block.");
        }
      }
    }
  };

}
