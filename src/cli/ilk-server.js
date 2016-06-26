/* @flow */

import Interlock from "..";
import * as options from "../options";
import { createServer } from "../server/server";


export const builder = (yargs: any) => {
  return options
    .buildArgs(yargs, options.server, options.compile)
    .epilogue("For more information, see http://www.interlockjs.com/docs/ilk-build.");
};

export const handler = (argv: { [key: string]: any }) => {
  const config = argv.config ? options.loadConfig(argv.config) : {};
  const logger = options.getLogger(argv.verbose);

  const compileOpts = options.getInterlockOpts(
    argv,
    options.compile,
    config
  );
  const sharedOpts = options.getInterlockOpts(
    argv,
    options.shared,
    config
  );
  const opts = Object.assign({}, sharedOpts, compileOpts);

  let serverOpts = options.getInterlockOpts(argv, options.server);
  serverOpts = options.validate(serverOpts, options.server);

  const {
    setDynamicAssets,
    notify,
    pause
  } = createServer(serverOpts);

  try {
    const ilk = new Interlock(opts);

    let resume: Function = pause();
    ilk.watch(buildEvent => {
      const { change, patchModules, compilation } = buildEvent;

      if (change) {
        resume = pause();
        notify("recompiling", { filename: buildEvent.change });
        return;
      }

      if (patchModules) {
        notify("update", { update: true });
      } else if (compilation) {
        const newAssets = Object.keys(compilation.bundles).reduce((assets, filename) => {
          assets["/" + filename] = compilation.bundles[filename].raw;
          return assets;
        }, {});
        setDynamicAssets(newAssets);
        resume();
        notify("compilation", { compilation: true });
      }
    });
  } catch (err) {
    logger.warn(err.stack) || logger.error("Error:", err.message);
  }
};
