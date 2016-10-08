import generate from "babel-generator";
import { assign } from "lodash";

import { pluggable } from "pluggable";


/**
 * Given an AST and a set of options, generate the corresponding JavaScript
 * source and optional sourcemap string.
 *
 * @param  {Object}  opts                 The generation options.
 * @param  {AST}     opts.ast             The AST to render.
 * @param  {Boolean} opts.sourceMaps      Whether to render a source-map.
 * @param  {String}  opts.sourceMapTarget The output filename.
 * @param  {Boolean} opts.pretty          Whether to output formatted JS.
 * @param  {Boolean} opts.includeComments Whether to include comments in the output.
 * @param  {Object}  opts.sources         A hash of source filenames to source content.
 *
 * @return {Object}                       An object with `code` and `map` strings,
 *                                        where `map` can be null.
 */
const generateJsCode = pluggable(function generateJsCode (opts) {
  const {
    ast,
    sourceMaps,
    sourceMapTarget,
    pretty,
    includeComments,
    sources
  } = opts;

  const { code, map } = generate(ast, {
    sourceMaps,
    sourceMapTarget,
    comments: includeComments,
    compact: !pretty,
    quotes: "double"
  }, sources);

  return {
    code,
    map: sourceMaps ? JSON.stringify(map) : null
  };
});

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

  return this.generateJsCode({
    ast,
    sourceMaps: !!this.opts.sourceMaps,
    sourceMapTarget: this.opts.sourceMaps && bundle.dest,
    pretty: !this.opts.pretty,
    includeComments: !!this.opts.includeComments,
    sources: bundleSources
  }).then(({ code, map }) => {
    const outputBundle = assign({}, bundle, { raw: code });

    return this.opts.sourceMaps ?
      [ outputBundle, { raw: map, dest: `${bundle.dest}.map` } ] :
      [ outputBundle ];
  });
}, { generateJsCode });
