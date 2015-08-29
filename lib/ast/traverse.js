import most from "most";
import _ from "lodash";
import types from "ast-types";

import { NODE, ARRAY, OTHER } from "./types";
import { enumerate } from "../util/stream";


function getNodeChildren (node, parents) {
  /* eslint-disable block-scoped-var */
  return most.from(types.getFieldNames(node))
    .map(fieldName =>
      getTraversableAst(types.getFieldValue(node, fieldName), fieldName, [node, ...parents]));
  /* eslint-enable block-scoped-var */
}

function getArrayChildren (node, parents) {
  /* eslint-disable block-scoped-var */
  return enumerate(most.from(node))
    .map(([idx, childNode]) =>
      getTraversableAst(childNode, idx, [node, ...parents]));
  /* eslint-enable block-scoped-var */
}

export function getTraversableAst (node, key = null, parents = []) {
  let type;
  let children;
  if (_.isObject(node) && node.type) {
    type = NODE;
    children = getNodeChildren(node, parents);
  } else if (_.isArray(node)) {
    type = ARRAY;
    children = getArrayChildren(node, parents);
  } else {
    type = OTHER;
    children = most.empty();
  }

  return { node, type, key, children, parents };
}

export function visit (root, visitor) {
  const traversableRoot = getTraversableAst(root);
  const getTuples = tuple => most.concat(most.of(tuple), tuple.children.flatMap(getTuples));
  return getTuples(traversableRoot)
    .filter(({ type }) => type === NODE)
    .map(tuple => Object.assign({}, tuple, {
      parents: tuple.parents.filter(p => !_.isArray(p))
    }))
    .observe(visitor);
}