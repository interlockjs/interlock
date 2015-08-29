import { parse } from "babel-core";

import { deepAssign } from "../util/object";

import transformAst from "./transform";
import { getTraversableAst } from "./traverse";
import { NODE } from "./types";


function template (strTemplate, modifier) {
  const traversable = getTraversableAst(parse(strTemplate));

  return () => {
    const actions = [];

    return {
      replaceBody (name, replacementNodes) {
        actions.push(tuple => {
          const { node } = tuple;

          if (node.body &&
              node.body.length &&
              node.body[0].type === "ExpressionStatement" &&
              node.body[0].expression.type === "Identifier" &&
              node.body[0].expression.name === name) {
            return deepAssign(tuple, "node.body", replacementNodes);
          }

          return tuple;
        });

        return this;
      },

      replaceIdentifier (name, replacementNode) {
        actions.push(tuple => {
          const { node, type/*, key, children, parents*/ } = tuple;
          if (type === NODE && node.type === "Identifier" && node.name === name) {
            return deepAssign(tuple, "node", replacementNode);
          }
          return tuple;
        });
        return this;
      },

      exec () {
        return transformAst(traversable, tuple => {
          for (const action of actions) {
            const result = action(tuple);
            if (result !== tuple) { return result; }
          }
          return tuple;
        }).then(modifier);
      }
    };
  };
}

export function programTmpl (strTemplate) {
  return template(strTemplate, function (programAst) {
    return programAst;
  });
}

export function bodyTmpl (strTemplate) {
  return template(strTemplate, function (programAst) {
    return programAst.body;
  });
}

export function expressionTmpl (strTemplate) {
  return template(strTemplate, function (programAst) {
    return programAst.body[0];
  });
}

