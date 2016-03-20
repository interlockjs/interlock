import path from "path";

import _ from "lodash";

import { isFile, isDir, getPossiblePaths } from "./util/file";


function select (items, fn) {
  for (const item of items) {
    const result = fn(item);
    if (result) { return result; }
  }
  return null;
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

function resolveSimple (requireStr, contextPath, nsRoot, extensions) {
  const absPath = path.resolve(contextPath, requireStr);

  const resolvedPath = resolveFile(absPath, extensions) || resolveDir(absPath, extensions);
  if (resolvedPath) {
    return {
      resolvedPath,
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
export default function resolve (requireStr, contextPath, ns, nsRoot, extensions, searchPaths = []) { // eslint-disable-line max-len,max-params
  const resolvedSimple = resolveSimple(requireStr, contextPath, nsRoot, extensions);

  if (resolvedSimple) {
    return {
      path: resolvedSimple.resolvedPath,
      ns,
      nsPath: resolvedSimple.nsPath,
      nsRoot,
      uri: `${ns}:${resolvedSimple.nsPath}`
    };
  }

  if (/^(\.\.?)?\//.test(requireStr)) { return null; }

  ns = requireStr.split("/")[0];
  const resolvedPath = select(searchPaths.concat(getPossiblePaths(contextPath, "node_modules")), searchPath => { // eslint-disable-line max-len
    const searchCandidate = path.join(searchPath, requireStr);
    nsRoot = path.join(searchPath, ns);
    return resolveFile(searchCandidate, extensions) || resolveDir(searchCandidate, extensions);
  });

  if (resolvedPath) {
    const nsPath = path.relative(nsRoot, resolvedPath);
    return {
      path: resolvedPath,
      ns,
      nsPath,
      nsRoot,
      uri: `${ns}:${nsPath}`
    };
  }

  return null;
}
