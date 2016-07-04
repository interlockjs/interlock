import fs from "fs";
import path from "path";

import { chain } from "lodash";


const WINDOWS = process.platform === "win32";


export function isFile (absPath) {
  let stat;
  try { stat = fs.statSync(absPath); } catch (e) { return false; }
  return stat.isFile() || stat.isFIFO();
}

export function isDir (absPath) {
  let stat;
  try { stat = fs.statSync(absPath); } catch (e) { return false; }
  return stat.isDirectory();
}

export function getPossiblePaths (deepPath, desiredFilename) {
  const prefix = WINDOWS && /^[A-Za-z]:[\/\\]/.test(deepPath) ?
    deepPath.slice(0, 3) :
    "/";
  const nestedDirs = deepPath.split(WINDOWS ? /[\/\\]+/ : /\/+/);

  return chain(0)
    .range(nestedDirs.length + 1)
    .map(idx => {
      const pathPieces = nestedDirs.slice(0, nestedDirs.length - idx);
      return path.resolve(prefix, ...pathPieces, desiredFilename);
    })
    .value();
}

export function getPackageJson (filePath) {
  for (const pjPath of getPossiblePaths(filePath, "package.json")) {
    if (isFile(pjPath)) {
      try {
        return require(pjPath);
      } catch (err) {
        throw new Error(`Invalid package.json found at '${pjPath}'.`);
      }
    }
  }
  throw new Error(`Could not find package.json for '${filePath}'.`);
}
