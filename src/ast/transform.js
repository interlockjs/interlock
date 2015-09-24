import types from "ast-types";
import _ from "lodash";

import { NODE, ARRAY, OTHER } from "./types";


function enumerate (arr) {
  return arr.map((el, idx) => [idx, el]);
}

function getType (node) {
  if (_.isArray(node)) {
    return ARRAY;
  } else if (_.isObject(node) && node.type) {
    return NODE;
  }
  return OTHER;
}

function getChildren (node, type) {
  if (type === ARRAY) {
    return enumerate(node);
  } else if (type === NODE) {
    return types.getFieldNames(node)
      .map(fieldName => [fieldName, types.getFieldValue(node, fieldName)]);
  }
  return [];
}

function updateObj (obj, key, val) {
  const u = {};
  u[key] = val;
  return Object.assign({}, obj, u);
}

function updateArr (arr, key, val) {
  const newArr = arr.slice();
  newArr[key] = val;
  return newArr;
}

function applyUpdates (node, type, childUpdates) {
  if (type === NODE) {
    return childUpdates
      .reduce((newObj, [key, childNode]) => updateObj(newObj, key, childNode), node);
  } else if (type === ARRAY) {
    return childUpdates
      .reduce((newArr, [key, childNode]) => updateArr(newArr, key, childNode), node);
  }
  return node;
}

export default function transformAst (node, transformer, key = null, parents = []) {
  const type = getType(node);
  node = type === NODE ?
    transformer({ node, key, parents}) :
    node;
  const children = getChildren(node, type);

  const childUpdates = children
    .map(([childKey, childNode]) => {
      const newChildNode = transformAst(childNode, transformer, childKey, [node, ...parents]);
      return newChildNode === childNode ?
        null :
        [childKey, newChildNode];
    })
    .filter(x => x);

  return applyUpdates(node, type, childUpdates);
}
