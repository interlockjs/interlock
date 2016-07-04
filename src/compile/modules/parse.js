import path from "path";

import { parse } from "babylon";
import { assign } from "lodash";

import { pluggable } from "pluggable";


/**
 * Parse the source of the provided early-stage module.  Resolves to the same
 * module object, with additional `ast` and `sourcePath` properties (or equivalent
 * for non-JavaScript modules).
 *
 * @param  {Object}  module  Unparsed module with rawSource property.
 *
 * @return {Object}          Parsed module with new `ast` and `sourcePath` properties.
 */
export default pluggable(function parseModule (module) {
  if (module.type !== "javascript") {
    throw new Error("Cannot parse non-JavaScript.  Please configure appropriate plugin.");
  }

  try {
    const sourcePath = path.join(module.ns, module.nsPath);
    const ast = parse(module.rawSource, {
      sourceType: "module",
      sourceFilename: sourcePath,
      // See: https://github.com/babel/babel/tree/master/packages/babylon#plugins
      plugins: [
        "jsx",
        "flow",
        "asyncFunctions",
        "classConstructorCall",
        "doExpressions",
        "trailingFunctionCommas",
        "objectRestSpread",
        "decorators",
        "classProperties",
        "exportExtensions",
        "exponentiationOperator",
        "asyncGenerators",
        "functionBind",
        "functionSent"
      ]
    }).program;

    return assign({}, module, { ast, sourcePath });
  } catch (err) {
    return Promise.reject(`Unable to parse file: ${module.path}\n${err.stack}`);
  }
});
