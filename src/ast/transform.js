import types from "ast-types";
import _ from "lodash";

import { NODE, ARRAY, OTHER } from "./types";


function enumerate (arr) {
  return arr.map((el, idx) => [idx, el]);
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

/**
 * Determine type of node being iterated over.
 *
 * @param  {Array/Object/Other}  node  Node being iterated over.
 *
 * @return {Symbol}                    Correct type for input node.
 */
function getType (node) {
  if (_.isArray(node)) {
    return ARRAY;
  } else if (_.isObject(node) && node.type) {
    return NODE;
  }
  return OTHER;
}

/**
 * Return an array of key/value tuples for the given node.  If of type NODE,
 * all possible ECMAscript field-name/value combinations will be included.
 *
 * @param  {Object|Array}  node  Node (not AST node) of the AST data-structure.
 * @param  {Symbol}        type  Symbol indicating type of node.  If not ARRAY
 *                               or NODE, the function's return value will be
 *                               an empty array, since it is not possible (or
 *                               desirable) to set properties on those types
 *                               of objects.
 *
 * @return {Array}               Array of key/value tuples for the given node.
 */
function getChildren (node, type) {
  if (type === ARRAY) {
    return enumerate(node);
  } else if (type === NODE) {
    return types.getFieldNames(node)
      .map(fieldName => [fieldName, types.getFieldValue(node, fieldName)]);
  }
  return [];
}

/**
 * If childUpdates are supplied, returns a new object the provided keys
 * and values, as well as any original keys and values that were not
 * overwritten.  If no childUpdates are supplied, the original node is
 * returned.
 *
 * @param  {Object|Array}  node          Node (not AST node) of the AST data-structure;
 *                                       i.e. an object or an array - leaf nodes like
 *                                       strings and numbers are not iterated over, as
 *                                       they cannot be transformed directly.
 * @param  {Symbol}        type          Indicates whether node is an object or an array.
 * @param  {Array}         childUpdates  Array of key/value tuples to apply to the node.
 *
 * @return {Object|Array}                Either same node object, or new node object
 *                                       with updated properties.
 */
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

/**
 * Traverses and synchronously transforms the provided node with the provided transformer.
 * The operation is recursive, in that the children of each node will be transformed
 * depth-first.  If any changes occur, a new node will be returned.  Transformers should
 * _not_ mutate AST nodes in place; instead, return a new Object with the desired
 * properties.
 *
 * @param  {AST}           node         AST node to transform.
 * @param  {Function}      transformer  Function that should either return a new node or
 *                                      the original node, unmodified.
 * @param  {String|Number} key          The key of the node, in relation to its parent.
 * @param  {Array}         parents      An array of nodes between this node and the root
 *                                      node, including the root node.
 *
 * @return {AST}                        Transformed AST node.
 */
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
