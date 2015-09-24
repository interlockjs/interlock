import _ from "lodash";

import pluggable from "../../pluggable";
import resolveModule from "./resolve";

export default pluggable(function getModuleSeeds () {
  return Promise.all(
    [].concat(_.keys(this.opts.entry), _.keys(this.opts.split))
      .map(relPath => this.resolveModule(relPath)
        .then(module => [relPath, module])
    ))
    .then(_.object);
}, { resolveModule });
