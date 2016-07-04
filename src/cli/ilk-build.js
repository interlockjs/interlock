import Interlock from "..";
import * as options from "../options";
import { assign } from "lodash";


export const builder = yargs => {
  return options
    .buildArgs(yargs, options.compile)
    .epilogue("For more information, see http://www.interlockjs.com/docs/ilk-build.");
};

export const handler = argv => {
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

  const opts = assign({}, sharedOpts, compileOpts);

  let ilk;
  try {
    ilk = new Interlock(opts);
    ilk.build();
  } catch (err) {
    logger.warn(err.stack) || logger.error("Error:", err.message);
  }
};
