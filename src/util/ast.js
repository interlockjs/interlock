import _ from "lodash";
import { builders as b } from "ast-types";
import { parse } from "babel-core";

function fromVal (val) {
  if (_.isArray(val)) {
    return fromArray(val); // eslint-disable-line no-use-before-define
  } else if (_.isObject(val)) {
    return fromObject(val); // eslint-disable-line no-use-before-define
  } else if (_.isFunction(val)) {
    return fromFunction(val); // eslint-disable-line no-use-before-define
  } else if (_.isNumber(val) || _.isString(val)) {
    return b.literal(val);
  }
  throw new Error("Cannot transform value into AST.", val);
}

export function fromObject (obj) {
  return b.objectExpression(Object.keys(obj).map(key =>
    b.property("init", b.literal(key), fromVal(obj[key]))));
}

export function fromArray (arr) {
  return b.arrayExpression(arr.map(fromVal));
}

export function fromFunction (fn) {
  return parse(`(${fn.toString()})`).body[0].expression;
}
