import * as path from "path";
import * as fs from "fs";

import { watch } from "chokidar";
import {sync as mkdirp} from "mkdirp";
import most from "most";
import _ from "lodash";
import Joi from "joi";

import compile from "./compile";
import { entries } from "./util/object";
import { interlockConstructorInput } from "./schemas/index";
import loadModule from "./compile/modules/load";
import compileModules from "./compile/modules/compile";


function normalizeEntryPoints (entryPoints) {
  return _.chain(entryPoints || {})
    .map((entryDefinition, entrySrcPath) => {
      entryDefinition = _.isString(entryDefinition) ?
        { dest: entryDefinition } :
        entryDefinition;
      return [entrySrcPath, entryDefinition];
    })
    .object()
    .value();
}

/**
 * The entry point for the Interlock application
 *
 * @param   {Object}    options               Compilation options.
 *
 * @param   {Object}    options.entry         A hash where keys are input files, relative to
 *                                            srcRoot and treated as entry points, and values
 *                                            are entry definitions.  Entry definitions can be
 *                                            string paths relative to destRoot, or objects with
 *                                            `dest` value and other config.
 * @param   {Object}    options.split         A hash where keys are input files, relative to
 *                                            srcRoot, and values are split definitions.  Split
 *                                            definitions can be string paths relative to
 *                                            destRoot, or objects with `dest` value and other
 *                                            config.
 * @param   {String}    options.srcRoot       The absolute path from which all relative source
 *                                            paths will be resolved.
 * @param   {String}    options.destRoot      The absolute path from which all relative destination
 *                                            paths will be resolved.
 * @param   {String}    options.context       Interlock's working directory.
 * @param   {Array}     options.extensions    The list of file extentions that Interlock will
 *                                            automatically append to require-strings when
 *                                            attempting to resolve that require-string.
 * @param   {String}    options.ns            The namespace for the build.  If omitted, the value
 *                                            will be borrowed from `name` in package.json.
 * @param   {Boolean}   options.sourceMaps    Emit source maps with the bundles
 * @param   {Array}     options.plugins       An Array of interlock Plugins
 * @param   {Boolean}   options.includeComments     Include comments in the compiled bundles
 * @param   {String}    options.implicitBundleDest  The location to emit shared dependency bundles
 *
 * @returns {void}
 */
export default function Interlock (options) {
  Joi.validate(options || {}, interlockConstructorInput, (err, value) => {
    if (err) { throw err; }

    // It is not possible to extend joi though it is an open discussion for a future version
    // https://github.com/hapijs/joi/issues/577
    let packageJSON;
    try {
      packageJSON = require(path.join(value.srcRoot, "./package.json"));
    } catch (e) {
      throw new Error("Invalid srcRoot - cannot find package.json");
    }

    value.ns = value.ns || packageJSON.name;
    value.entry = normalizeEntryPoints(value.entry);
    value.split = normalizeEntryPoints(value.split);
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
      console.log("*** BUILD FAILED ***"); // eslint-disable-line no-console
      if (err && err.stack) {
        console.log(err.stack); // eslint-disable-line no-console
      } else {
        console.log(err); // eslint-disable-line no-console
      }
      throw err;
    });
};

Interlock.prototype._saveBundles = function (compilation) {
  for (const [bundleDest, bundle] of entries(compilation.bundles)) {
    const bundleOutput = bundle.raw;
    const destRoot = path.join(compilation.opts.destRoot, bundleDest);
    mkdirp(path.dirname(destRoot));
    fs.writeFileSync(destRoot, bundleOutput);
  }
  return compilation;
};

function getRefreshedAsset (compilation, changedFilePath) {
  const origAsset = compilation.cache.modulesByAbsPath[changedFilePath];
  const newAsset = Object.assign({}, origAsset, {
    rawSource: null,
    ast: null,
    requireNodes: null,
    dependencies: null,
    hash: null
  });

  return loadModule.call(compilation, newAsset);
}

Interlock.prototype.watch = function (save = false) {
  const self = this;
  let lastCompilation = null;
  const absPathToModuleHash = Object.create(null);

  const watcher = watch([], {});

  return most.create(add => {
    function onCompileComplete (compilation) {
      lastCompilation = compilation;
      for (const [, bundleObj] of entries(compilation.bundles)) {
        for (const module of bundleObj.modules || []) {
          watcher.add(module.path);
          absPathToModuleHash[module.path] = module.hash;
        }
      }
      if (save) { self._saveBundles(compilation); }
      // Emit compilation.
      add({ compilation });
    }

    watcher.on("change", changedFilePath => {
      for (const modulePath of Object.keys(absPathToModuleHash)) { watcher.unwatch(modulePath); }

      const refreshedAsset = getRefreshedAsset(lastCompilation, changedFilePath);
      delete lastCompilation.cache.modulesByAbsPath[changedFilePath];

      compileModules.call(lastCompilation, most.of(refreshedAsset))
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
