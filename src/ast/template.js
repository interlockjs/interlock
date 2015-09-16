import { parse } from "babel-core";
import _ from "lodash";

import { deepAssign } from "../util/object";

import transformAst from "./transform";


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

export function programTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst);
}

export function bodyTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body);
}

export function expressionStmtTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body[0]);
}

export function expressionTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body[0].expression);
}
