/* eslint-disable no-console */
function getLogger (verbosity) {
  return {
    error: (...msgs) => console.log(...msgs),
    warn: verbosity >= 1 ? (...msgs) => console.log(...msgs) : () => {},
    info: verbosity >= 2 ? (...msgs) => console.log(...msgs) : () => {},
    debug: verbosity >= 3 ? (...msgs) => console.log(...msgs) : () => {}
  };
}
/* eslint-enable no-console */

export const shared = [{
  key: "log",
  default: () => getLogger(0),
  schema: val => typeof val === "object",

  flagType: "count",
  flags: ["verbose", "v"],
  flagTransform: getLogger,
  cmdOpts: { global: true },

  description: {
    short: "Compiler verbosity (sent to STDOUT).",
    full: `TODO`
  }
}];
