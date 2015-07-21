import fs from "fs";
import path from "path";

import { parse } from "babel-core";

import escodegen from "escodegen";

import * as Pluggable from "../../pluggable";


const parseModule = Pluggable.sync(function parseModule (asset) {
  const tokens = [];
  const comments = [];

  asset.ast = parse(asset.rawSource, {
    locations: true,
    ranges: true,
    sourceFile: path.join(asset.ns, asset.nsPath),
    onToken: tokens,
    onComment: comments
  });
  asset.ast = escodegen.attachComments(asset.ast, comments, tokens);

  return asset;
});


function loadModule (asset) {
  asset = Object.assign({}, asset);
  asset.rawSource = fs.readFileSync(asset.path, "utf-8");
  return this.parseModule(asset);
}

export default Pluggable.sync(loadModule, { parseModule });
