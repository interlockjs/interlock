import generate from "babel-generator";
import { assign } from "lodash";

import { pluggable } from "pluggable";


/**
 * Given a compiled bundle object, return an array of one or more bundles with
 * new `raw` property.  This raw property should be generated from the bundle's
 * AST or equivalent intermediate representation.
 *
 * This is a one-to-many transformation because it is quite possible for multiple
 * output files to result from a single bundle object.  The canonical example (and
 * default behavior of this function, when sourcemaps are enabled) is for one
 * bundle to result in a `.js` file and a `.map` file.
 *
 * @param  {Object} bundle    Bundle object without `raw` property.
 *
 * @return {Array}            Array of bundle objects.  At minimum, these bundle
 *                            objects should have a `raw` property - a string
 *                            representation of the file to be written to disk -
 *                            and a `dest` property - the relative filepath
 *                            of the file to be written to disk.
 */
export default pluggable(function generateRawBundles (bundle) {
  if (bundle.type !== "javascript") {
    throw new Error("Cannot generate JS source for non-JavaScript bundle.");
  }

  const bundleSources = bundle.modules.reduce((hash, module) => {
    hash[module.sourcePath] = module.rawSource;
    return hash;
  }, {});

  const ast = bundle.ast.type === "Program" || bundle.ast.type === "File" ?
    bundle.ast :
    { type: "Program", body: [].concat(bundle.ast) };

  const { code, map } = generate(ast, {
    sourceMaps: !!this.opts.sourceMaps,
    sourceMapTarget: this.opts.sourceMaps && bundle.dest,
    comments: !!this.opts.includeComments,
    compact: !this.opts.pretty,
    quotes: "double"
  }, bundleSources);

  const outputBundle = assign({}, bundle, { raw: code });
  const mapDest = bundle.dest + ".map";

  return this.opts.sourceMaps ?
    [ outputBundle, { raw: JSON.stringify(map), dest: mapDest } ] :
    [ outputBundle ];
});
