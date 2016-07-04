import fs from "fs";

import Promise from "bluebird";
import { assign } from "lodash";
import { pluggable } from "pluggable";


const readFilePromise = Promise.promisify(fs.readFile, fs);


/**
 * This function is invoked whenever the compiler attempts to read a source-file
 * from the disk.  It takes an raw-module object as its only input.  The properties
 * available on that object are as follows:
 *
 *  - `path` - the absolute path of the file
 *  - `ns` - the namespace of the module (either the default ns, or borrowed from its
 *    containing package)
 *  - `nsRoot` - the absolute path to the root of the namespace
 *  - `nsPath` - the file's path relative to the root of the namespace
 *
 * The function should output an object with the same properties, plus one additional
 * property: `rawSource`.  This property should be the string-value of the module
 * source.
 *
 * @param  {Object} module  Module object.
 *
 * @return {Object}         Module object + `rawSource`.
 */
export const readSource = pluggable(function readSource (module) {
  return readFilePromise(module.path, "utf-8")
    .then(rawSource => assign({}, module, { rawSource }));
});

/**
 * Given the early-stage module (module seed + rawSource property), determine and set
 * its type.  This value defaults to "javascript" and is used to determine whether
 * default behaviors for parsing and processing modules should be used on the module.
 *
 * @param  {Object} module  Early-stage module.
 *
 * @return {Object}         Module with new `type` property.
 */
export const setModuleType = pluggable(function setModuleType (module) {
  return assign({}, module, { type: "javascript" });
});

/**
 * Given a module seed, read the module from disk and determine its type.
 *
 * @param  {Object}  module   Module seed.
 *
 * @return {Object}           Module seed plus `rawSource` and `type` properties.
 */
const loadModule = pluggable(function loadModule (module) {
  if (module.type) { return module; }

  return this.readSource(module)
    .then(this.setModuleType);
}, { readSource, setModuleType });

export default loadModule;
