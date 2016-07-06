import { fork } from "child_process";
import zmq from "zmq";
import { isFunction, pick } from "lodash";

import * as targets from "./targets";
import monitor from "./monitor";

const WORKER_PATH = require.resolve("./worker");

export const SCHEDULER_ADDRESS = "ipc://interlock-scheduler";
export const COLLECTOR_ADDRESS = "ipc://interlock-collector";

// const MAX_PROCESSES = os.cpus().length;
const MULTIPROCESS_OVERRIDES = Object.keys(targets);

export default function (opts = {}) {
  const worker = fork(WORKER_PATH);

  const scheduler = zmq.socket("push");
  const collector = zmq.socket("pull");

  monitor(scheduler);
  monitor(collector);

  scheduler.bindSync(SCHEDULER_ADDRESS);
  collector.bindSync(COLLECTOR_ADDRESS);

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

      return override.CONTINUE;
    });

    transform("compile", compilation => {
      scheduler.unbind();
      collector.unbind();
      scheduler.unmonitor();
      collector.unmonitor();
      worker.kill(0);
      return compilation;
    });

    MULTIPROCESS_OVERRIDES.forEach(pluggableName => {
      override(pluggableName, function () {
        const unitOfWork = {
          pluggableName,
          context: pick(this, ["opts"]),
          args: Array.prototype.slice.call(arguments)
        };

        return new Promise((resolve, reject) => {
          collector.on("message", msg => {
            const {
              err,
              result,
              pluggableName: resultPluggableName
            } = JSON.parse(msg.toString());

            if (err) { reject(err); }

            if (resultPluggableName === pluggableName) {
              resolve(result);
            }
          });

          scheduler.send(JSON.stringify(unitOfWork));

          setTimeout(() => reject(new Error("Pluggable timed out")), 10000);
        }).catch(err => {
          scheduler.unbind();
          collector.unbind();
          scheduler.unmonitor();
          collector.unmonitor();
          worker.kill(0);
          throw err;
        });
      });
    });
  };
}
