var fs = require("fs");
var path = require("path");
var _ = require("lodash");


var WINDOWS = process.platform === "win32";


function isFile(absPath) {
  var stat;
  try { stat = fs.statSync(absPath); } catch (e) { return; }
  return stat.isFile() || stat.isFIFO();
}

function isDir(absPath) {
  var stat;
  try { stat = fs.statSync(absPath); } catch (e) { return; }
  return stat.isDirectory();
}

function resolveFile(absPath, extensions) {
  var altPath;

  if (isFile(absPath)) { return absPath; }

  return _.any(extensions, function (ext) {
    altPath = absPath + ext;
    return isFile(altPath) && altPath;
  }) && altPath || null;
}

function resolveDir(absPath, extensions) {
  var packageJsonPath, fallback, main, mainAbsPath;
  if (!isDir(absPath)) { return null; }

  packageJsonPath = path.join(absPath, "package.json");
  if (isFile(packageJsonPath)) {
    main = require(packageJsonPath).main;
    if (main) {
      mainAbsPath = path.join(absPath, main);
      return resolveFile(mainAbsPath, extensions) || resolveDir(mainAbsPath, extensions);
    }
  }

  fallback = path.join(absPath, "index.js");
  return isFile(fallback) && fallback || null;
}

function getNodeModulesPaths(contextPath) {
  var prefix, nestedDirs, pathSep;
  prefix = WINDOWS && /^[A-Za-z]:[\/\\]/.test(contextPath) ?
    contextPath.slice(0, 3) :
    "/";
  pathSep = WINDOWS ? "\\" : "/";
  nestedDirs = contextPath.split(WINDOWS ? /[\/\\]+/ : /\/+/);

  return _.chain(0)
    .range(nestedDirs.length + 1)
    .map(function (idx) {
      var pathPieces = nestedDirs.slice(0, nestedDirs.length - idx);
      return path.resolve.apply(path, [prefix].concat(pathPieces, "node_modules"));
    })
    .value();
}

function resolveSimple(requireStr, contextPath, nsRoot, extensions) {
  var absPath = path.resolve(contextPath, requireStr);

  var resolvedPath = resolveFile(absPath, extensions) || resolveDir(absPath, extensions);
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
function resolve(requireStr, contextPath, ns, nsRoot, extensions) {
  var resolved, resolvedPath, isResolved;
  if (/^(\.\.?)?\//.test(requireStr)) {
    resolved = resolveSimple(requireStr, contextPath, nsRoot, extensions);
    return !resolved ? null : {
      path: resolved.resolvedPath,
      ns: ns,
      nsPath: resolved.nsPath,
      nsRoot: nsRoot
    };
  }

  ns = requireStr.split("/")[0];
  isResolved = _.any(getNodeModulesPaths(contextPath), function (nmPath) {
    var nmPathCandidate = path.join(nmPath, requireStr);
    nsRoot = path.join(nmPath, ns);
    return resolvedPath =
      resolveFile(nmPathCandidate, extensions) || resolveDir(nmPathCandidate, extensions);
  });

  if (isResolved) {
    return {
      path: resolvedPath,
      ns: ns,
      nsPath: path.relative(nsRoot, resolvedPath),
      nsRoot: nsRoot
    };
  }

  return null;
}

module.exports = resolve;
