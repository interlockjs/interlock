import fs from "fs";
import path from "path";

import {parse} from "babel-core";

export default function loadModule (asset) {
  asset.rawSource = fs.readFileSync(asset.path, "utf-8");
  asset = this.applyPlugins("preparse", asset);

  asset.ast = parse(asset.rawSource, {
    locations: true,
    ranges: true,
    sourceFile: path.join(asset.ns, asset.nsPath),
    ecmaVersion: 6
  });

  // asset.ast = escodegen.attachComments(asset.ast, asset.ast.comments, asset.ast.tokens);

  return this.applyPlugins("postparse", asset);
}
