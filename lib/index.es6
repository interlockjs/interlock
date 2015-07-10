import path from "path";
import fs from "fs";

import {sync as mkdirp} from "mkdirp";

import compile from "./compile";
import {entries} from "./util";

export default function Interlock (options) {
  const cwd = process.cwd();
  options = options || {};

  if (!options.emit || !options.emit.length) {
    throw new Error("Must define at least one bundle.");
  }

  // TODO: validate options, or only persist specific values
  options.context = options.context || cwd;
  options.outputPath = options.outputPath || path.join(cwd, "dist");
  options.extensions = options.extensions || [".js", ".jsx", ".es6"];
  options.ns = options.ns || require(path.join(options.root, "./package.json")).name;
  options.context = options.context || cwd;
  this.options = options;
}

Interlock.prototype.build = function () {
  compile(this.options).then(compilation => {
    for (let [bundleDest, bundleOutput] of entries(compilation.bundles)) {
      const outputPath = path.join(this.options.outputPath, bundleDest);
      mkdirp(path.dirname(outputPath));
      fs.writeFileSync(outputPath, bundleOutput);
    }
  });
};
