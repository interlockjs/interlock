import fs from "fs";
import path from "path";

import {parse} from "babel-core";

import escodegen from "escodegen";


export default function loadModule (asset) {
  asset.rawSource = fs.readFileSync(asset.path, "utf-8");
  asset = this.applyPlugins("preparse", asset);

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

  return this.applyPlugins("postparse", asset);
}
