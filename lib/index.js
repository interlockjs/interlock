import * as path from "path";
import * as fs from "fs";

import { watch } from "chokidar";
import {sync as mkdirp} from "mkdirp";
import most from "most";
import Joi from "joi";

import compile from "./compile";
import { entries } from "./util";
import loadAst from "./compile/modules/load-ast";
import compileModules from "./compile/modules/compile";

/**
 * The entry point for the Interlock application
 *
 * @param   {Object}    options
 * @param   {Object[]}  options.emit          An Array of Objects containing compilation options
 *                                            for entry points
 * @param   {String}    options.emit[].entry  The path of a JavaScript entry point (relative to
 *                                            options.root)
 * @param   {String}    options.emit[].dest   The path to output the compiled JavaScript for the
 *                                            specified entry point (relative to
 *                                            options.outputPath)
 * @param   {String}    options.root          The root for interlock and root for file fetching
 *                                            paths on the client
 * @param   {String}    options.context       Interlock's working directory
 * @param   {String}    options.outputPath    The root used to generate an entry point's absolute
 *                                            output path
 * @param   {Array}     options.extensions    A list of filetypes for Interlock to read
 * @param   {String}    options.includeComments  Preserve comments in the compiled output
 * @param   {String}    options.sourceMaps    Generate sourceMaps for compiled entry points
 * @param   {String}    options.cacheMode     Client side caching mechanism
 * @param   {String}    options.implicitBundleDest  Path to destination for computed shared bundles
 *                                            (relative to options.root)
 * @param   {Array}     options.plugins       An Array of Interlock plugins

 */
export default function Interlock (options) {
  const cwd = process.cwd();

  const entryPointSchema = Joi.object().keys({
    entry: Joi.string().required(),
    dest: Joi.string().required()
  });

  const schema = Joi.object().keys({
    emit: Joi.array().items(entryPointSchema)
      .min(1)
      .unique()
      .required(),
    root: Joi.string()
      .required(),
    context: Joi.string()
      .default(cwd)
      .optional(),
    outputPath: Joi.string()
      .default(() => { path.join(cwd, "dist") }, "cwd + '/dist'")
      .optional(),
    extensions: Joi.array().items(Joi.string())
      .default([".js", ".jsx", ".es6"])
      .optional(),
    ns: Joi.string()
      .optional(),
    includeComments: Joi.boolean()
      .optional(),
    sourceMaps: Joi.boolean()
      .optional(),
    cacheMode: Joi.string()
      .optional(),
    implicitBundleDest: Joi.string()
      .optional(),
    plugins: Joi.array()
      .optional()
  });

  Joi.validate(options, schema, (err, value) => {
    if (err) {
      // TODO: is this even an Error I can throw?
      throw err;
    }

    // It is not possible to extend joi though it is an open discussion for a future version
    // https://github.com/hapijs/joi/issues/577
    try {
      value.ns = require(path.join(value.root, "./package.json")).name;
    } catch (e) {
      throw new Error("Invalid project root - cannot find package.json");
    }
    this.options = value;
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
