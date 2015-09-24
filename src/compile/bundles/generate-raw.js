import escodegen from "escodegen";

import pluggable from "../../pluggable";

const uglyFormat = {
  compact: true,
  newline: ""
};

const prettyFormat = {
  indent: {
    style: "  ",
    adjustMultilineComment: true
  }
};

export default pluggable(function generateRawBundles (bundle) {
  if (bundle.type !== "javascript") {
    throw new Error("Cannot generate JS source for non-JavaScript bundle.");
  }

  const { code, map } = escodegen.generate(bundle.ast, {
    format: this.opts.pretty === false ? uglyFormat : prettyFormat,
    sourceMap: !!this.opts.sourceMaps,
    sourceMapWithCode: true,
    comment: !!this.opts.includeComments
  });

  const outputBundle = Object.assign({}, bundle, { raw: code });
  const mapDest = bundle.dest + ".map";
  return this.opts.sourceMaps === true ?
    [outputBundle, { raw: map, dest: mapDest }] :
    [outputBundle];
});
