import { assign } from "lodash";

import { pluggable } from "pluggable";

/**
 * Given a mostly-compiled module, generate an ID for that module
 * and resolve the same module with an `id` property.
 *
 * @param  {Object}  module  Module that needs an ID.
 *
 * @return {Object}          Module that now has an `id` property.
 */
export default pluggable(function generateModuleId (module) {
  if (!module.hash) {
    throw new Error(`Cannot generate module ID for module at path: ${module.path}`);
  }

  return assign({}, module, {
    id: module.hash
  });
});
