import { keys, isFunction, pick } from "lodash";

import * as targets from "./targets";
import distributor from "./distributor";


const MULTIPROCESS_OVERRIDES = keys(targets);
const WORKER_PATH = require.resolve("./worker");


export default function (opts = {}) {
  let task;
  let killAll;

  return (override, transform) => {

    override("compile", function () {
      if (this.opts.babelConfig && this.opts.babelConfig.plugins) {
        const validPlugins = this.opts.babelConfig.plugins.reduce(
          (memo, plugin) => memo && !isFunction(plugin),
          true
        );
        if (!validPlugins) {
          throw new Error("When in multi-process mode, Babel plugin-functions are disallowed.");
        }
      }

      ({ task, killAll } = distributor({
        workers: opts.workers,
        workerPath: WORKER_PATH
      }));

      return override.CONTINUE;
    });

    transform("compile", compilation => {
      return killAll().then(() => compilation);
    });

    MULTIPROCESS_OVERRIDES.forEach(pluggableName => {
      override(pluggableName, function () {
        return task({
          pluggableName,
          cxt: pick(this, ["opts"]),
          args: Array.prototype.slice.call(arguments)
        });
      });
    });
  };
}
