import { parse } from "babel-core";

import { deepAssign } from "../util/object";

import transformAst from "./transform";


/**
 * Transforms the provided string template (should be syntactically-valid
 * JavaScript) into a template function.  The template function will replace
 * nodes that match the given condition with the replacement node.
 *
 * ## Example
 *
 * ### `strTemplate`
 *
 *     var myString = REPLACE_ME;
 *
 * ### `replacements`
 *
 *     {
 *       identifier: {
 *         REPLACE_ME: b.literal("hi")
 *       }
 *     }
 *
 * ### Output, when rendered to JavaScript string:
 *
 *     var myString = "hi";
 *
 * The template generator also takes a `modifier` function.  Without it,
 * the output of the template will be program AST.  In many cases, you only want
 * the program's body, or the first node.  Ths modifier allows you to match
 * a particular transformation to the output of each call to the template.
 *
 * @param  {String}    strTemplate  Syntactically-valid JavaScript template.
 * @param  {Function}  modifier     Transformation function for template output.
 *
 * @return {Function}               Template function.
 */
function template (strTemplate, modifier) {
  const templateAst = parse(strTemplate);

  return (replacements = {}) => {
    const bodyActions = Object.keys(replacements.body || {})
      .map(placeholder => tuple => {
        const { node } = tuple;

        if (node.body &&
            node.body.length &&
            node.body[0].type === "ExpressionStatement" &&
            node.body[0].expression.type === "Identifier" &&
            node.body[0].expression.name === placeholder) {
          return deepAssign(node, "body", replacements.body[placeholder]);
        }

        return node;
      });

    const identifierActions = Object.keys(replacements.identifier || {})
      .map(placeholder => tuple => {
        const { node } = tuple;
        if (node.type === "Identifier" && node.name === placeholder) {
          // Replacements should be cloned properly before being passed to the template,
          // if that is a concern.  We cannot deep-clone here, due to cycles in some of
          // the AST structures that Babel produces.
          return replacements.identifier[placeholder];
        }
        return node;
      });

    // TODO: `statementsActions`
    //  - inserts multiple nodes in array, replacing placeholder
    //  - parent should flatten arrays after chidren are processed

    const actions = [].concat(bodyActions, identifierActions);
    const programAst = transformAst(templateAst, tuple => {
      for (const action of actions) {
        const result = action(tuple);
        if (result !== tuple.node) { return result; }
      }
      return tuple.node;
    });

    return modifier(programAst);
  };
}

/**
 * Returns a template function that, when evaluated, returns program AST.
 *
 * @param  {String}    strTemplate  Syntactically-valid JavaScript template.
 *
 * @return {Function}               Template function.
 */
export function programTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst);
}

/**
 * Returns a template function that, when evaluated, returns an array of AST
 * nodes, taken from the evaluated template's Program AST.
 *
 * @param  {String}    strTemplate  Syntactically-valid JavaScript template.
 *
 * @return {Function}               Template function.
 */
export function bodyTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body);
}

/**
 * Returns a template function that, when evaluated, returns the first AST
 * node of the evaluated template's Program AST.
 *
 * @param  {String}    strTemplate  Syntactically-valid JavaScript template.
 *
 * @return {Function}               Template function.
 */
export function expressionStmtTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body[0]);
}

/**
 * Returns a template function that, when evaluated, returns expression found
 * in the first AST node of the evaluated template's Program AST.  This assumes
 * that the first thing in the provided template is an expression statement.
 * There are, however, no checks to validate this assumption - so use correctly!
 *
 * @param  {String}    strTemplate  Syntactically-valid JavaScript template.
 *
 * @return {Function}               Template function.
 */
export function expressionTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body[0].expression);
}
