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
