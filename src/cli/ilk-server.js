import Interlock from "..";
import * as options from "../options";
import { createServer } from "../server/server";


export const builder = yargs => {
  return options
    .buildArgs(yargs, options.server, options.compile)
    .epilogue("For more information, see http://www.interlockjs.com/docs/ilk-build.");
};

export const handler = argv => {
  // const config = argv.config ? options.loadConfig(argv.config) : {};
  // const logger = options.getLogger(argv.verbose);

  // const compileOpts = options.getInterlockOpts(
  //   argv,
  //   options.compile,
  //   config
  // );
  // const sharedOpts = options.getInterlockOpts(
  //   argv,
  //   options.shared,
  //   config
  // );
  // const opts = Object.assign({}, sharedOpts, compileOpts);

  let serverOpts = options.getInterlockOpts(argv, options.server);
  serverOpts = options.validate(serverOpts, options.server);

  const {
    server,
    setDynamicAssets,
    notify,
    pause
  } = createServer(serverOpts);

  setDynamicAssets({
    "/some-file.html": `
      <html>
        <body>
          It works!
          <script type="text/javascript">
            var updates = new EventSource("/ilk/events");
            updates.addEventListener("my-event", ev => {
              console.log(ev.type, JSON.parse(ev.data));
            });
          </script>
        </body>
      </html>
    `
  });

  setInterval(() => {
    notify("my-event", {
      something: "must have updated..."
    });
  }, 5000);

  // let ilk;
  // try {
  //   ilk = new Interlock(opts);
  //   ilk.build();
  // } catch (err) {
  //   logger.warn(err.stack) || logger.error("Error:", err.message);
  // }
};
