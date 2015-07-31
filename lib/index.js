import * as path from "path";
import * as fs from "fs";

import { watch } from "chokidar";
import {sync as mkdirp} from "mkdirp";
import most from "most";
import _ from "lodash";

import compile from "./compile";
import { entries } from "./util";
import loadAst from "./compile/modules/load-ast";
import compileModules from "./compile/modules/compile";

/**
 * The entry point for the Interlock application
 *
 * @param   {Object}    options
 * @param   {Object[]}  options.emit         - An Array of Objects containing compilation options for entry points
 * @param   {String}    options.emit[].entry - The path of a JavaScript entry point (relative to options.root)
 * @param   {String}    options.emit[].dest  - The path to output the compiled JavaScript for the specified entry point (relative to options.outputPath)
 * @param   {String}    options.root         - The root for interlock and root for file fetching paths on the client
 *
 * @param   {String} [process.cwd]  options.context - Interlock's working directory
 * @param   {String} [process.cwd + "/dist"]  options.outputPath - The root used to generate an entry point's absolute output path
 * @param   {Array}  [[".js", ".jsx", ".es6"]]  options.extensions - A list of filetypes for Interlock to read
 * @param   {String} [root + "/package.json".name]  options.ns - A custom prefix for generated bundles
 */
export default function Interlock (options) {
  const cwd = process.cwd();

  if (!_.isArray(options.emit) || options.emit.length < 1) {
    throw new Error("Must define at least one bundle.");
  }
  if (!_.isString(options.root)) {
    throw new Error("Must define a project root");
  }

  let ns;
  try {
    ns = require(path.join(options.root, "./package.json")).name;
  } catch (e) {
    throw new Error("Invalid project root - cannot find package.json");
  }

  // TODO: validate options, or only persist specific values
  this.options = _.defaults(options || {}, {
    context: cwd,
    outputPath: path.join(cwd, "dist"),
    extensions: [".js", ".jsx", ".es6"],
    ns: ns
  });
}

/**
 * @return  {Promise}  Resolves to the compilation output.
 */
Interlock.prototype.build = function () {
  return compile(this.options)
    .then(this._saveBundles)
    .catch(function (err) {
      console.log(err); // eslint-disable-line no-console
    });
};

Interlock.prototype._saveBundles = function (compilation) {
  for (let [bundleDest, bundle] of entries(compilation.bundles)) {
    const bundleOutput = bundle.raw;
    const outputPath = path.join(compilation.opts.outputPath, bundleDest);
    mkdirp(path.dirname(outputPath));
    fs.writeFileSync(outputPath, bundleOutput);
  }
  return compilation;
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

      compileModules.call(lastCompilation, most.from([refreshedAsset]))
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
