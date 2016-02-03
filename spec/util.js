import { get } from "lodash";
import traverse from "babel-traverse";

const QUERY_FORMAT = /(([A-Za-z]+)?)((\[[A-Za-z\.]+=[A-Za-z0-9+-=_\.]+\])*)/;
const NUMBER_FORMAT = /[0-9\.]+/;
const NOT_FOUND = Symbol();

export function query (ast, queryStr) {
  const queryMatch = QUERY_FORMAT.exec(queryStr);
  if (!queryMatch) { return null; }
  const [ , nodeType, , keyValsStr ] = queryMatch;
  const keyVals = !keyValsStr ?
    [] :
    keyValsStr
      .slice(1, keyValsStr.length - 1)
      .split("][")
      .map(keyValPair => keyValPair.split("="))
      .map(([keypath, val]) => ({
        keypath,
        val,
        altVal: NUMBER_FORMAT.test(val) ? Number(val) : undefined
      }));

  const matches = [];
  traverse.cheap(ast, node => {
    if (!nodeType || node.type === nodeType) {
      const keyValsMatch = keyVals.reduce((isMatch, { keypath, val, altVal }) => {
        const valAtPath = get(node, keypath, NOT_FOUND);
        return isMatch && valAtPath === val || valAtPath === altVal;
      }, true);
      if (keyValsMatch) { matches.push(node); }
    }
  });
  return matches;
}
