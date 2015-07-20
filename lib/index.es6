import path from "path";
import fs from "fs";

import { watch } from "chokidar";
import {sync as mkdirp} from "mkdirp";
import most from "most";

import compile from "./compile";
import { entries } from "./util";
import loadAst from "./compile/modules/load-ast";
import compileModules from "./compile/modules/compile";

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
  compile(this.options).then(this._saveBundles);
};

Interlock.prototype._saveBundles = function (compilation) {
  for (let [bundleDest, bundle] of entries(compilation.bundles)) {
    const bundleOutput = bundle.raw;
    const outputPath = path.join(this.options.outputPath, bundleDest);
    mkdirp(path.dirname(outputPath));
    fs.writeFileSync(outputPath, bundleOutput);
  }
};

function getRefreshedAsset (compilation, changedFilePath) {
  const origAsset = compilation.cache.modulesByAbsPath[changedFilePath];
  let newAsset = Object.assign({}, origAsset, {
    rawSource: null,
    ast: null,
    requireNodes: null,
    dependencies: null,
    hash: null
  });

  return loadAst.call(compilation, newAsset);
}

Interlock.prototype.watch = function (save=false) {
  const self = this;
  let lastCompilation = null;
  const absPathToModuleHash = Object.create(null);

  const watcher = watch([], {});

  return most.create(add => {
    function onCompileComplete (compilation) {
      lastCompilation = compilation;
      for (let [, bundleObj] of entries(compilation.bundles)) {
        for (let module of bundleObj.modules || []) {
          watcher.add(module.path);
          absPathToModuleHash[module.path] = module.hash;
        }
      }
      if (save) { self._saveBundles(compilation); }
      // Emit compilation.
      add({ compilation });
    }

    watcher.on("change", changedFilePath => {
      for (let modulePath of Object.keys(absPathToModuleHash)) { watcher.unwatch(modulePath); }

      const refreshedAsset = getRefreshedAsset(lastCompilation, changedFilePath);
      delete lastCompilation.cache.modulesByAbsPath[changedFilePath];

      compileModules(lastCompilation, most.from([refreshedAsset]))
        .reduce((updatedModules, module) => {
          updatedModules.push(module);
          return updatedModules;
        }, [])
        .then(patchModules => {
          // Emit patch modules (changed module plus any new dependencies).
          add({ patchModules, changedFilePath });
          compile(lastCompilation.opts).then(onCompileComplete);
        });
    });

    compile(this.options).then(onCompileComplete);
  });
};
