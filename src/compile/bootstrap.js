import _ from "lodash";

import { CONTINUE } from "../pluggable";


function addPluginsToContext (compilationContext) {
  compilationContext.__pluggables__ = { override: {}, transform: {} };
  const overrides = compilationContext.__pluggables__.override;
  const transforms = compilationContext.__pluggables__.transform;

  (compilationContext.opts.plugins || []).forEach(plugin => {
    function override (pluggableFnName, overrideFn) {
      overrides[pluggableFnName] = (overrides[pluggableFnName] || []).concat(overrideFn);
    }
    function transform (pluggableFnName, transformFn) {
      transforms[pluggableFnName] = (transforms[pluggableFnName] || []).concat(transformFn);
    }

    _.extend(override, { CONTINUE });
    plugin(override, transform);
  });

  return compilationContext;
}

export default function bootstrapCompilation (opts) {
  return addPluginsToContext({
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    opts: Object.freeze(opts)
  });
}
