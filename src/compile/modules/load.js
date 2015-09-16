import fs from "fs";
import path from "path";

import Promise from "bluebird";
import { parse } from "babel-core";

import transform from "../../ast/transform";
import { deepAssign } from "../../util/object";
import pluggable from "../../pluggable";


const readFilePromise = Promise.promisify(fs.readFile, fs);


const parseSourceToAst = pluggable(function parseSourceToAst (raw, sourceFile) {
  if (!sourceFile) { return parse(raw); }

  try {
    const babelAst = parse(raw, {
      locations: true,
      ranges: true
    });

    return transform(babelAst, tuple => {
      const { node/*, type, parents*/ } = tuple;
      if (node.loc) {
        return deepAssign(node, "loc.source", sourceFile);
      }
      return node;
    });
  } catch (err) {
    return Promise.reject(`Unable to parse file: ${sourceFile}\n${err.toString()}`);
  }
});

/**
 * This function is invoked whenever the compiler attempts to read a source-file
 * from the disk.  It takes an asset object as its only input.  The properties
 * available on that asset object are as follows:
 *
 *  - `path` - the absolute path of the file
 *  - `ns` - the namespace of the module (either the default ns, or borrowed from its
 *    containing package)
 *  - `nsRoot` - the absolute path to the root of the namespace
 *  - `nsPath` - the file's path relative to the root of the namespace
 *  - `rawSource` - `null`, this value is provided by the `readSource` function
 *  - `ast` - `null`, this value will be populated later in the compilation
 *  - `requireNodes` - `null`, this value will be populated later in the compilation
 *  - `dependencies` - `null`, this value will be populated later in the compilation
 *  - `hash` - `null`, this value will be populated later in the compilation
 *
 * @param  {Object} asset  Asset object.
 *
 * @return {String}        The raw source of the file, in string format.
 */
export const readSource = pluggable(function readSource (asset) {
  return readFilePromise(asset.path, "utf-8");
});

const loadModule = pluggable(function loadModule (asset) {
  return this.readSource(asset)
    .then(rawSource => this.parseSourceToAst(rawSource, path.join(asset.ns, asset.nsPath))
      .then(ast => Object.assign({}, asset, { ast, rawSource }))
    );
}, { readSource, parseSourceToAst });

export default loadModule;
