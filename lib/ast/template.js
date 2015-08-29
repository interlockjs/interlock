import { parse } from "babel-core";

import { deepAssign } from "../util/object";

import transformAst from "./transform";
import { getTraversableAst } from "./traverse";

function template (strTemplate, modifier) {
  const traversable = getTraversableAst(parse(strTemplate));

  return (replacements = {}) => {
    const bodyActions = Object.keys(replacements.body || {})
      .map(placeholder => tuple => {
        const { node } = tuple;

        if (node.body &&
            node.body.length &&
            node.body[0].type === "ExpressionStatement" &&
            node.body[0].expression.type === "Identifier" &&
            node.body[0].expression.name === placeholder) {
          return deepAssign(tuple, "node.body", replacements.body[placeholder]);
        }
        return tuple;
      });

    const identifierActions = Object.keys(replacements.identifier || {})
      .map(placeholder => tuple => {
        const { node } = tuple;
        if (node.type === "Identifier" && node.name === placeholder) {
          return deepAssign(tuple, "node", replacements.identifier[placeholder]);
        }
        return tuple;
      });

    // TODO: `statements`
    //  - inserts multiple nodes in array, replacing placeholder
    //  - parent should flatten arrays after chidren are processed

    const actions = [].concat(bodyActions, identifierActions);
    return transformAst(traversable, tuple => {
      for (const action of actions) {
        const result = action(tuple);
        if (result !== tuple) { return result; }
      }
      return tuple;
    }).then(modifier);
  };
}

export function programTmpl (strTemplate) {
  return template(strTemplate);
}

export function bodyTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body);
}

export function expressionTmpl (strTemplate) {
  return template(strTemplate, programAst => programAst.body[0]);
}

