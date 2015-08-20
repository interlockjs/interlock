import fs from "fs";
import path from "path";
import _ from "lodash";


const WINDOWS = process.platform === "win32";


function select (items, fn) {
  for (let item of items) {
    let result = fn(item);
    if (result) { return result; }
  }
  return null;
}

function isFile (absPath) {
  let stat;
  try { stat = fs.statSync(absPath); } catch (e) { return; }
  return stat.isFile() || stat.isFIFO();
}

function isDir (absPath) {
  let stat;
  try { stat = fs.statSync(absPath); } catch (e) { return; }
  return stat.isDirectory();
}

function resolveFile (absPath, extensions) {
  let altPath;

  if (isFile(absPath)) { return absPath; }

  return _.any(extensions, function (ext) {
    altPath = absPath + ext;
    return isFile(altPath) && altPath;
  }) && altPath || null;
}

function resolveDir (absPath, extensions) {
  if (!isDir(absPath)) { return null; }

  const packageJsonPath = path.join(absPath, "package.json");
  if (isFile(packageJsonPath)) {
    const main = require(packageJsonPath).main;
    if (main) {
      const mainAbsPath = path.join(absPath, main);
      return resolveFile(mainAbsPath, extensions) || resolveDir(mainAbsPath, extensions);
    }
  }

  const fallback = path.join(absPath, "index.js");
  return isFile(fallback) && fallback || null;
}

function getNodeModulesPaths (contextPath) {
  const prefix = WINDOWS && /^[A-Za-z]:[\/\\]/.test(contextPath) ?
    contextPath.slice(0, 3) :
    "/";
  const nestedDirs = contextPath.split(WINDOWS ? /[\/\\]+/ : /\/+/);

  return _.chain(0)
    .range(nestedDirs.length + 1)
    .map(idx => {
      var pathPieces = nestedDirs.slice(0, nestedDirs.length - idx);
      return path.resolve.apply(path, [prefix].concat(pathPieces, "node_modules"));
    })
    .value();
}

function resolveSimple (requireStr, contextPath, nsRoot, extensions) {
  const absPath = path.resolve(contextPath, requireStr);

  const resolvedPath = resolveFile(absPath, extensions) || resolveDir(absPath, extensions);
  if (resolvedPath) {
    return {
      resolvedPath: resolvedPath,
      nsPath: path.relative(nsRoot, resolvedPath)
    };
  }
  return null;
}

/**
 * Evaluates a require string to an absolute path, along with that file's
 * namespace meta-data.
 *
 * @param  {String} requireStr   The value passed to the `require()` statement.
 * @param  {String} contextPath  The directory from where relative requires are evaluated.
 * @param  {String} ns           The default/active namespace.
 * @param  {String} nsRoot       The root directory of the default/active namespace.
 * @param  {Array}  extensions   All possible file extensions to try.
 * @param  {Array}  searchPaths  Additional directories in which to attempt to locate
 *                               specified resource.
 *
 * @returns {Object}             Object with three properties:
 *                                 - path: the resolved absolute path of the resource;
 *                                 - ns: the namespace associated with that resource;
 *                                 - nsPath: the root path of the namespace.
 *
 * @returns {null}               Will return null if resolve fails.
 */
export default function resolve (requireStr, contextPath, ns, nsRoot, extensions, searchPaths=[]) {
  const resolvedSimple = resolveSimple(requireStr, contextPath, nsRoot, extensions);

  if (resolvedSimple) {
    return {
      path: resolvedSimple.resolvedPath,
      ns: ns,
      nsPath: resolvedSimple.nsPath,
      nsRoot: nsRoot
    };
  }

  if (/^(\.\.?)?\//.test(requireStr)) { return null; }

  ns = requireStr.split("/")[0];
  const resolvedPath = select(searchPaths.concat(getNodeModulesPaths(contextPath)), searchPath => {
    const searchCandidate = path.join(searchPath, requireStr);
    nsRoot = path.join(searchPath, ns);
    return resolveFile(searchCandidate, extensions) || resolveDir(searchCandidate, extensions);
  });

  if (resolvedPath) {
    return {
      path: resolvedPath,
      ns: ns,
      nsPath: path.relative(nsRoot, resolvedPath),
      nsRoot: nsRoot
    };
  }

  return null;
}
