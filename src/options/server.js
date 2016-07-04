import path from "path";

import {
  isInteger,
  isString,
  isObject,
  isRegExp,
  isBoolean,
  chain
} from "lodash";


export const server = [{
  key: "port",
  default: () => 1337,
  schema: portNum => isInteger(portNum) && portNum > 0,

  flagType: "number",
  flags: ["port"],

  description: {
    short: "Port on which to run dev server.",
    full: `TODO`
  }
}, {
  key: "retryTimeout",
  default: () => 3000,
  schema: timeout => isInteger(timeout) && timeout > 0,

  flagType: "number",
  flags: ["retry-timeout"],

  description: {
    short: "Delay before hot-reload clients attempt reconnection.",
    full: `TODO`
  }
}, {
  key: "staticResources",
  default: () => {},
  schema: resources =>
    isObject(resources) &&
    Object.keys(resources).reduce((allEntriesOkay, fullPath) => {
      return allEntriesOkay && isString(fullPath) && isRegExp(resources[fullPath]);
    }, true),

  flagType: "string",
  flags: ["mount"],
  flagTransform: (val, cwd) => chain(val)
    .chunk(2)
    .map(([urlPattern, localPath]) => {
      return [
        path.resolve(cwd, localPath),
        new RegExp("^" + urlPattern)
      ];
    })
    .fromPairs()
    .value(),
  cmdOpts: { nargs: 2 },

  description: {
    short: "Pairs of URL patterns and the local filepaths they should resolve to.",
    full: `TODO`
  }
}, {
  key: "hot",
  default: () => false,
  schema: isBoolean,

  flagType: "boolean",
  flags: ["hot"],

  description: {
    short: "Enable hot-reloading of client modules.",
    long: `TODO`
  }
}];
