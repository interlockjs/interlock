import os from "os";

import workerFarm from "worker-farm";
import _ from "lodash";

import * as targets from "./targets";


const MAX_PROCESSES = os.cpus().length;
const MULTIPROCESS_OVERRIDES = Object.keys(targets);
const WORKER_PATH = require.resolve("./worker");


export default function (opts = {}) {
  const farmOpts = {
    maxCallsPerWorker: Infinity,
    maxConcurrentWorkers: opts.cpus && opts.cpus < MAX_PROCESSES ?
      opts.cpus :
      MAX_PROCESSES,
    maxConcurrentCallsPerWorker: Infinity,
    maxConcurrentCalls: Infinity,
    maxCallTime: Infinity,
    maxRetries: Infinity,
    autoStart: false
  };

  return (override, transform) => {
    let workers;

    override("compile", function () {
      if (this.opts.babelConfig && this.opts.babelConfig.plugins) {
        const validPlugins = this.opts.babelConfig.plugins.reduce(
          (memo, plugin) => memo && !_.isFunction(plugin),
          true
        );
        if (!validPlugins) {
          throw new Error("When in multi-process mode, Babel plugin-functions are disallowed.");
        }
      }

      workers = workerFarm(
        farmOpts,
        WORKER_PATH,
        MULTIPROCESS_OVERRIDES.map(pluggableName => `${pluggableName}MP`)
      );
      return override.CONTINUE;
    });

    transform("compile", compilation => {
      workerFarm.end(workers);
      return compilation;
    });

    MULTIPROCESS_OVERRIDES.forEach(pluggableName => {
      override(pluggableName, function () {
        const msg = JSON.stringify({
          cxt: _.pick(this, ["opts"]),
          args: Array.prototype.slice.call(arguments)
        });

        return new Promise(function (resolve, reject) {
          workers[`${pluggableName}MP`](msg, (err, result) => {
            if (err) {
              workerFarm.end(workers);
              return reject(err);
            }
            return resolve(JSON.parse(result));
          });
        });
      });
    });
  };
}
