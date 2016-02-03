import path from "path";

import { parse } from "babylon";
import traverse from "babel-traverse";

import pluggable from "../../pluggable";


/**
 * Parse the source of the provided early-stage module.  Resolves to the same
 * module with a new `ast` property (or equivalent for non-JavaScript modules).
 *
 * @param  {Object}  module  Unparsed module with rawSource property.
 *
 * @return {Object}          Parsed module with new `ast` property.
 */
export default pluggable(function parseModule (module) {
  if (module.type !== "javascript") {
    throw new Error("Cannot process non-JavaScript.  Please configure appropriate plugin.");
  }

  try {
    const ast = parse(module.rawSource, {
      sourceType: "module",
      // See: https://github.com/babel/babel/tree/master/packages/babylon#plugins
      plugins: [
        "jsx"
      ]
    }).program;

    const sourcePath = path.join(module.ns, module.nsPath);
    traverse.cheap(ast, node => {
      if (node.loc) {
        node.loc.source = sourcePath;
      }
    });

    return Object.assign({}, module, { ast });
  } catch (err) {
    return Promise.reject(`Unable to parse file: ${module.path}\n${err.stack}`);
  }
});
