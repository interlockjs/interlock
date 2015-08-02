import fs from "fs";
import path from "path";

import { parse } from "babel-core";
import escodegen from "escodegen";

import * as Pluggable from "../../pluggable";


const parseSourceToAst = Pluggable.sync(function parseSourceToAst (raw, sourceFile) {
  if (!sourceFile) { return parse(raw); }

  const tokens = [];
  const comments = [];

  const ast = parse(raw, {
    locations: true,
    ranges: true,
    sourceFile: sourceFile,
    onToken: tokens,
    onComment: comments
  });

  return escodegen.attachComments(ast, comments, tokens);
});

const parseModule = Pluggable.sync(function parseModule (asset) {
  return Object.assign({}, asset, {
    ast: this.parseSourceToAst(asset.rawSource, path.join(asset.ns, asset.nsPath))
  });
}, { parseSourceToAst });


function loadModule (asset) {
  asset = Object.assign({}, asset);
  asset.rawSource = fs.readFileSync(asset.path, "utf-8");
  return this.parseModule(asset);
}

export default Pluggable.sync(loadModule, { parseModule });
