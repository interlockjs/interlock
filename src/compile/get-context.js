import { CONTINUE } from "../pluggable";


/**
 * Invoke each plugin with two params, an override function and a transform
 * function.  When _these_ functions are invoked by individual plugins,
 * the plugin's override or transform function will be associated with the
 * name of the pluggable it is meant to override/transform.
 *
 * During compilation, the transform- and override- functions will be invoked
 * to manipulate the output of compilation steps.
 *
 * @param  {Object}  compilationContext  `this` context for pluggable compilation
 *                                       functions
 *
 * @return {Object}                      compilationContext with plugins defined
 *                                       and ready to be used during compilation.
 */
function addPluginsToContext (compilationContext) {
  compilationContext.__pluggables__ = { override: {}, transform: {} };
  const overrides = compilationContext.__pluggables__.override;
  const transforms = compilationContext.__pluggables__.transform;

  function override (pluggableFnName, overrideFn) {
    overrides[pluggableFnName] = (overrides[pluggableFnName] || []).concat(overrideFn);
  }
  function transform (pluggableFnName, transformFn) {
    transforms[pluggableFnName] = (transforms[pluggableFnName] || []).concat(transformFn);
  }
  Object.assign(override, { CONTINUE });

  (compilationContext.opts.plugins || []).forEach(plugin => plugin(override, transform));

  return compilationContext;
}

/**
 * Create an object to be used as the base `this` context for all pluggable
 * functions in a given compilation.
 *
 * @param  {Object}  opts  Options, most likely passed to the Interlock constructor.
 *
 * @return {Object}        Object to be used as `this` context for pluggablw functions.
 */
export default function getCompilationContext (opts) {
  return addPluginsToContext({
    cache: {
      modulesByAbsPath: Object.create(null)
    },
    opts: Object.freeze(opts)
  });
}
