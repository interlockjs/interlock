import Interlock from "..";
import * as options from "../options";
import { createServer } from "../server/server";
import hotPatchPlugin from "../server/hot-patch-plugin/index";


export const builder = yargs => {
  return options
    .buildArgs(yargs, options.server, options.compile)
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
  const opts = Object.assign({}, sharedOpts, compileOpts);

  let serverOpts = options.getInterlockOpts(argv, options.server);
  serverOpts = options.validate(serverOpts, options.server);

  // add hot-reloading plugin
  if (serverOpts.hot) {
    opts.plugins = (opts.plugins || []).concat(hotPatchPlugin);
  }

  const {
    // server,
    setDynamicAssets,
    notify,
    pause
  } = createServer(serverOpts);

  try {
    const ilk = new Interlock(opts);

    let resume = pause();
    ilk.watch(buildEvent => {
      const { change, patchModules, compilation } = buildEvent;

      if (change) {
        resume = pause();
        notify("recompiling", { filename: buildEvent.change });
        return;
      }

      if (patchModules) {
        console.log("updates:", patchModules);
        notify("update", { update: true });
      } else if (compilation) {
        const newAssets = Object.keys(compilation.bundles).reduce((assets, filename) => {
          assets["/" + filename] = compilation.bundles[filename].raw;
          return assets;
        }, {});
        console.log("newAssets", Object.keys(newAssets));
        setDynamicAssets(Object.assign({}, newAssets, {
          "/test.html": `
            <html>
              <body>
                It works!
                <script type="text/javascript" src="./entry-a.bundle.js"></script>
              </body>
            </html>
          `
        }));
        resume();
        console.log("a new compilation has completed");
        // console.log(compilation);
        notify("compilation", { compilation: true });
      }
    });
  } catch (err) {
    logger.warn(err.stack) || logger.error("Error:", err.message);
  }
};
