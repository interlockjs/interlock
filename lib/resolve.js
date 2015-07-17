import fs from "fs";
import path from "path";
import _ from "lodash";


const WINDOWS = process.platform === "win32";


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
 *
 * @return {Object}              Object with three properties:
 *                                 - path: the resolved absolute path of the resource;
 *                                 - ns: the namespace associated with that resource;
 *                                 - nsPath: the root path of the namespace.
 *
 * @return {null}                Will return null if resolve fails.
 */
export default function resolve (requireStr, contextPath, ns, nsRoot, extensions) {
  if (/^(\.\.?)?\//.test(requireStr)) {
    const resolved = resolveSimple(requireStr, contextPath, nsRoot, extensions);
    return !resolved ? null : {
      path: resolved.resolvedPath,
      ns: ns,
      nsPath: resolved.nsPath,
      nsRoot: nsRoot
    };
  }

  ns = requireStr.split("/")[0];
  const resolvedPath = _.find(getNodeModulesPaths(contextPath), nmPath => {
    const nmPathCandidate = path.join(nmPath, requireStr);
    nsRoot = path.join(nmPath, ns);
    return resolveFile(nmPathCandidate, extensions) || resolveDir(nmPathCandidate, extensions);
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
