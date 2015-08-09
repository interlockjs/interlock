import * as path from "path";
import * as fs from "fs";

import { watch } from "chokidar";
import {sync as mkdirp} from "mkdirp";
import most from "most";
import _ from "lodash";

import compile from "./compile";
import { entries } from "./util/object";
import loadAst from "./compile/modules/load-ast";
import compileModules from "./compile/modules/compile";


function normalizeOpts (options, ns) {
  const cwd = process.cwd();

  const normalized = _.defaults(options || {}, {
    context: cwd,
    destRoot: path.join(cwd, "dist"),
    extensions: [".js", ".jsx", ".es6"],
    ns: ns,
    implicitBundleDest: "[setHash].js"
  });

  normalized.entry = _.chain(normalized.entry || {})
    .map((entryDefinition, entrySrcPath) => {
      entryDefinition = _.isString(entryDefinition) ?
        { dest: entryDefinition } :
        entryDefinition;
      return [entrySrcPath, entryDefinition];
    })
    .object()
    .value();

  normalized.split = _.chain(normalized.split || {})
    .map((splitDefinition, splitSrcPath) => {
      splitDefinition = _.isString(splitDefinition) ?
        { dest: splitDefinition } :
        splitDefinition;
      return [splitSrcPath, splitDefinition];
    })
    .object()
    .value();

  return normalized;
}

/**
 * The entry point for the Interlock application
 *
 * @param   {Object}    options
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
 */
export default function Interlock (options) {
  const hasEntries = !!(options.entry && Object.keys(options.entry).length);
  const hasSplits = !!(options.split && Object.keys(options.entry).length);

  if (!hasEntries && !hasSplits) {
    throw new Error("You must define at least one entry or split point.");
  }
  if (!_.isString(options.srcRoot)) {
    throw new Error("Must define a project srcRoot");
  }

  let ns;
  try {
    ns = require(path.join(options.srcRoot, "./package.json")).name;
  } catch (e) {
    throw new Error("Invalid project root - cannot find package.json");
  }

  // TODO: validate options, or only persist specific values
  this.options = normalizeOpts(options || {}, ns);
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
  for (let [bundleDest, bundle] of entries(compilation.bundles)) {
    const bundleOutput = bundle.raw;
    const destRoot = path.join(compilation.opts.destRoot, bundleDest);
    mkdirp(path.dirname(destRoot));
    fs.writeFileSync(destRoot, bundleOutput);
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
