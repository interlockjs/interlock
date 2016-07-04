import { isArray, isObject, isFunction, isNumber, isString } from "lodash";
import * as t from "babel-types";
import { parse } from "babylon";


function fromVal (val) {
  if (isArray(val)) {
    return fromArray(val); // eslint-disable-line no-use-before-define
  } else if (isObject(val)) {
    return fromObject(val); // eslint-disable-line no-use-before-define
  } else if (isFunction(val)) {
    return fromFunction(val); // eslint-disable-line no-use-before-define
  } else if (isNumber(val)) {
    return t.numericLiteral(val);
  } else if (isString(val)) {
    return t.stringLiteral(val);
  }
  throw new Error("Cannot transform value into AST.", val);
}

export function fromObject (obj) {
  return t.objectExpression(Object.keys(obj).map(key =>
    t.objectProperty(t.stringLiteral(key), fromVal(obj[key]))
  ));
}

export function fromArray (arr) {
  return t.arrayExpression(arr.map(fromVal));
}

export function fromFunction (fn) {
  return parse(`(${fn.toString()})`).body[0].expression;
}
