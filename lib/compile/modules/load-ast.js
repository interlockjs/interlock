import fs from "fs";
import path from "path";

import { parse } from "babel-core";
import escodegen from "escodegen";

import * as Pluggable from "../../pluggable";


const parseSourceToAst = Pluggable.sync(function parseSourceToAst (raw, sourceFile) {
  if (!sourceFile) { return parse(raw); }

  const tokens = [];
  const comments = [];
  let ast;

  try {
    ast = parse(raw, {
      locations: true,
      ranges: true,
      sourceFile: sourceFile,
      onToken: tokens,
      onComment: comments
    });
  } catch (err) {
    throw new Error(`Unable to parse file: ${sourceFile}\n${err.toString()}`);
  }

  return escodegen.attachComments(ast, comments, tokens);
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
export const readSource = Pluggable.sync(function readSource (asset) {
  return fs.readFileSync(asset.path, "utf-8");
});

const loadModule = Pluggable.sync(function loadModule (asset) {
  asset = Object.assign({}, asset);
  asset.rawSource = this.readSource(asset);

  return Object.assign({}, asset, {
    ast: this.parseSourceToAst(asset.rawSource, path.join(asset.ns, asset.nsPath))
  });
}, { readSource, parseSourceToAst });

export default loadModule;
