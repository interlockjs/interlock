import _ from "lodash";

import { pluggable } from "pluggable";
import resolveModule from "./resolve";

/**
 * Inspect the compilation options for bundle definitions (provided as
 * key/value pairs to options.entry and options.split), resolve references,
 * and return an object of the early-stage modules indexed by their path
 * relative to the compilation context.
 *
 * @return {Object}          Early-stage modules indexed by relative path.
 */
export default pluggable(function getModuleSeeds () {
  return Promise.all(
    [].concat(_.keys(this.opts.entry), _.keys(this.opts.split))
      .map(relPath => this.resolveModule(relPath)
        .then(module => [relPath, module])
    ))
    .then(_.object);
}, { resolveModule });
