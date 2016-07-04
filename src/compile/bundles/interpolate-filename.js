import { assign } from "lodash";
import { pluggable } from "pluggable";


/**
 * Given a bundle, determine its ultimate output filepath by replacing
 * supported placeholders with their dynamic equivalents.
 *
 * @param  {Object}  bundle  Late-stage bundle object.
 *
 * @return {Object}          Bundle with interpolated `dest` property.
 */
export default pluggable(function interpolateFilename (bundle) {
  let dest = bundle.dest
    .replace("[setHash]", bundle.setHash)
    .replace("[hash]", bundle.hash);
  if (bundle.module) {
    dest = dest.replace("[primaryModuleHash]", bundle.module.hash);
  }

  return assign({}, bundle, { dest });
});
