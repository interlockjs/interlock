import path from "path";

import { parse } from "babel-core";

import transform from "../../ast/transform";
import { deepAssign } from "../../util/object";
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
    const babelAst = parse(module.rawSource, {
      locations: true,
      ranges: true
    });

    const ast = transform(babelAst, ({ node/*, type, parents*/ }) => {
      return node.loc ?
        deepAssign(node, "loc.source", path.join(module.ns, module.nsPath)) :
        node;
    });

    return Object.assign({}, module, { ast });
  } catch (err) {
    return Promise.reject(`Unable to parse file: ${module.path}\n${err.stack}`);
  }
});
