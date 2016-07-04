import path from "path";
import { tmpdir } from "os";
import fs from "fs";

import Promise from "bluebird";
import { assign } from "lodash";
import { sync as mkdirp } from "mkdirp";
import farmhash from "farmhash";


const DEFAULT_SUBDIR = "ilk_fcache";

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);


function getCacheDir (cacheDir) {
  if (!cacheDir) {
    const tmpDir = tmpdir();
    try {
      fs.accessSync(tmpDir, fs.R_OK | fs.W_OK); // eslint-disable-line no-bitwise
    } catch (err) {
      throw new Error(
        "Unable to access temp directory for caching. " +
        "Please check user permissions or specify `cacheDir` explicitly."
      );
    }

    cacheDir = path.join(tmpDir, DEFAULT_SUBDIR);
  }

  try {
    mkdirp(cacheDir);
    fs.accessSync(cacheDir, fs.R_OK | fs.W_OK); // eslint-disable-line no-bitwise
  } catch (err) {
    throw new Error(
      "Unable to access cache directory.  Please check user permissions.\n" +
      `CACHE DIR: ${cacheDir}`
    );
  }

  return cacheDir;
}


export default function (opts = {}) {
  const cacheDir = getCacheDir(opts.cacheDir);

  const getCachePath = rawSource => path.join(cacheDir, farmhash.hash64(rawSource) + ".ast");

  return (override, transform) => {
    override("parseModule", function (module) {
      if (module.type !== "javascript") { return override.CONTINUE; }

      const cachePath = getCachePath(module.rawSource);

      return readFile(cachePath)
        .then(astJson => {
          const ast = JSON.parse(astJson);
          const sourcePath = path.join(module.ns, module.nsPath);
          return assign({}, module, { ast, sourcePath });
        })
        .catch(() => override.CONTINUE);
    });

    transform("parseModule", function (module) {
      if (module.type !== "javascript") { return module; }

      const cachePath = getCachePath(module.rawSource);
      const astJson = JSON.stringify(module.ast);

      return writeFile(cachePath, astJson).then(() => module);
    });
  };
}
