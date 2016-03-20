import path from "path";

import _ from "lodash";

import { getPackageJson } from "../util/file";


function evalOption (errorMsg) {
  return val => {
    try {
      return new Function("require", `return ${val};`)(require); // eslint-disable-line no-new-func
    } catch (err) {
      throw new Error(errorMsg);
    }
  };
}


export const compile = [{
  key: "srcRoot",
  default: cwd => path.join(cwd, "src"),
  schema: _.isString,

  flags: ["src"],
  flagType: "string",
  flagTransform: (val, cwd) => path.resolve(cwd, val),
  cmdOpts: { normalize: true },

  description: {
    short: "Path to source directory.",
    full: `TODO`
  }
}, {
  key: "destRoot",
  default: cwd => path.join(cwd, "dist"),
  schema: _.isString,

  flags: ["dest"],
  flagType: "string",
  flagTransform: (val, cwd) => path.resolve(cwd, val),
  cmdOpts: { normalize: true },

  description: {
    short: "Path to output directory.",
    full: `TODO`
  }
}, {
  key: "entry",
  schema: entryObj => {
    return _.isObject(entryObj) && Object.keys(entryObj).reduce((isValid, key) => {
      return isValid &&
        _.isString(entryObj[key]) ||
        _.isObject(entryObj[key]) &&
        _.isString(entryObj[key].dest);
    }, true);
  },

  flags: ["entry", "e"],
  flagType: "string",
  flagTransform: val => _.chain(val).chunk(2).object().value(),
  cmdOpts: { nargs: 2 },

  description: {
    short: "Your application entry point, followed by its output bundle filename.",
    full: `TODO`
  }
}, {
  key: "split",
  schema: splitObj => {
    return _.isObject(splitObj) && Object.keys(splitObj).reduce((isValid, key) => {
      return isValid &&
        _.isString(splitObj[key]) ||
        _.isObject(splitObj[key]) &&
        _.isString(splitObj[key].dest);
    }, true);
  },

  flags: ["split", "s"],
  flagType: "string",
  flagTransform: val => _.chain(val).chunk(2).object().value(),
  cmdOpts: { nargs: 2 },

  description: {
    short: "Your application split point, followed by its output bundle filename.",
    full: `TODO`
  }
}, {
  key: "extensions",
  default: () => [".js", ".jsx", ".es6"],
  schema: val =>
    _.isArray(val) &&
    val.reduce((result, entry) => result && _.isString(entry), true),

  flags: ["ext"],
  flagType: "string",
  flagTransform: val => Array.isArray(val) ? val : [val],

  description: {
    short: "Extensions to use for require() resolution.",
    full: `TODO`
  }
}, {
  key: "ns",
  default: cwd => getPackageJson(cwd).name,
  schema: _.isString,

  flags: ["namespace"],
  flagType: "string",

  description: {
    short: "Namespace to use for your project.",
    full: `TODO`
  }
}, {
  key: "implicitBundleDest",
  default: () => "[setHash].js",
  schema: _.isString,

  flags: ["implicit-bundle-dest"],
  flagType: "string",

  description: {
    short: "Filename pattern for discovered/implicit bundles.",
    full: ``
  }
}, {
  key: "sourceMaps",
  default: () => false,
  schema: _.isBoolean,

  flags: ["sourcemaps"],
  flagType: "boolean",

  description: {
    short: "Output sourcemaps along with bundled code.",
    full: `TODO`
  }
}, {
  key: "includeComments",
  default: () => false,
  schema: _.isBoolean,

  flagType: "boolean",
  flags: ["comments"],

  description: {
    short: "Include comments in output JS.",
    full: `TODO`
  }
}, {
  key: "pretty",
  default: () => false,
  schema: _.isBoolean,

  flags: ["pretty"],
  flagType: "boolean",

  description: {
    short: "Output bundles in non-compact mode.",
    full: `TODO`
  }
}, {
  key: "babelConfig",
  schema: _.isObject,

  flags: ["babel-config"],
  flagType: "string",
  flagTransform: evalOption("You supplied an invalid 'babel-config' value."),

  description: {
    short: "Babel config.  Should take the form of a JS object.",
    full: `TODO`
  }
}, {
  key: "plugins",
  default: () => [],
  schema: _.isArray,

  flags: ["plugins"],
  flagType: "string",
  flagTransform: evalOption("You supplied an invalid 'plugins' value."),

  description: {
    short: "Plugins array.  Should take the form of a JS array.",
    full: `TODO`
  }
}];

compile.or = [
  ["entry", "split"]
];
