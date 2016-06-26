/* @flow */

import * as path from "path";
import * as fs from "fs";

import { watch } from "chokidar";
import { sync as mkdirp } from "mkdirp";
import _ from "lodash";

import compile from "./compile";
import * as options from "./options";
import { entries } from "./util/object";
import compileModules from "./compile/modules/compile";


function normalizeEntryPoints (entryPoints) {
  return _.chain(entryPoints || {})
    .map((entryDefinition, entrySrcPath) => {
      entryDefinition = _.isString(entryDefinition) ?
        { dest: entryDefinition } :
        entryDefinition;
      return [entrySrcPath, entryDefinition];
    })
    .fromPairs()
    .value();
}

/**
 * The entry point for the Interlock application
 *
 * @param   {Object}    opts               Compilation options.
 *
 * @param   {Object}    opts.entry         A hash where keys are input files, relative to
 *                                         srcRoot and treated as entry points, and values
 *                                         are entry definitions.  Entry definitions can be
 *                                         string paths relative to destRoot, or objects with
 *                                         `dest` value and other config.
 * @param   {Object}    opts.split         A hash where keys are input files, relative to
 *                                         srcRoot, and values are split definitions.  Split
 *                                         definitions can be string paths relative to
 *                                         destRoot, or objects with `dest` value and other
 *                                         config.
 * @param   {String}    opts.srcRoot       The absolute path from which all relative source
 *                                         paths will be resolved.
 * @param   {String}    opts.destRoot      The absolute path from which all relative destination
 *                                         paths will be resolved.
 * @param   {String}    opts.context       Interlock's working directory.
 * @param   {Array}     opts.extensions    The list of file extentions that Interlock will
 *                                         automatically append to require-strings when
 *                                         attempting to resolve that require-string.
 * @param   {String}    opts.ns            The namespace for the build.  If omitted, the value
 *                                         will be borrowed from `name` in package.json.
 * @param   {Boolean}   opts.sourceMaps    Emit source maps with the bundles.
 * @param   {String}    opts.globalName    Name to use for run-time global variable.
 * @param   {Array}     opts.plugins       An Array of interlock Plugins.
 * @param   {Boolean}   opts.includeComments     Include comments in the compiled bundles
 * @param   {String}    opts.implicitBundleDest  The location to emit shared dependency bundles
 *
 * @returns {void}
 */
export default function Interlock (opts) {
  opts = options.validate(opts, options.compile);
  opts = options.validate(opts, options.shared);

  this.options = Object.assign({}, opts, {
    globalName: "__interlock__",
    entry: normalizeEntryPoints(opts.entry),
    split: normalizeEntryPoints(opts.split)
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
  if (compilation === null) {
    return Promise.resolve();
  }
  return compilation.cache.modulesByAbsPath[changedFilePath]
    .then(origAsset => Object.assign({}, origAsset, {
      rawSource: null,
      ast: null,
      requireNodes: null,
      dependencies: null,
      hash: null
    }));
}

Interlock.prototype.watch = function (cb, opts = {}) {
  const self = this;
  let lastCompilation = null;
  const absPathToModuleHash = Object.create(null);

  const watcher = watch([], {});

  function onCompileComplete (compilation) {
    lastCompilation = compilation;
    for (const [, bundleObj] of entries(compilation.bundles)) {
      for (const module of bundleObj.modules || []) {
        watcher.add(module.path);
        absPathToModuleHash[module.path] = module.hash;
      }
    }
    if (opts.save) { self._saveBundles(compilation); }
    // Emit compilation.
    cb({ compilation });
  }

  watcher.on("change", changedFilePath => {
    cb({ change: changedFilePath }); // eslint-disable-line callback-return

    for (const modulePath of Object.keys(absPathToModuleHash)) { watcher.unwatch(modulePath); }

    getRefreshedAsset(lastCompilation, changedFilePath)
      .then(refreshedAsset => {
        if (!lastCompilation) { return Promise.resolve(); }
        delete lastCompilation.cache.modulesByAbsPath[changedFilePath];
        return compileModules.call(lastCompilation, [refreshedAsset]);
      })
      .then(patchModules => {
        if (!lastCompilation) { return Promise.resolve(); }
        cb({ patchModules, changedFilePath }); // eslint-disable-line callback-return
        return compile(lastCompilation.opts).then(onCompileComplete);
      });
  });

  compile(this.options).then(onCompileComplete);
};
