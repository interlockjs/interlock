import _ from "lodash";


/* eslint-disable no-console */
export function getLogger (verbosity) {
  return {
    error: (...msgs) => console.log(...msgs) || true,
    warn: verbosity >= 1 ? (...msgs) => console.log(...msgs) || true : () => false,
    info: verbosity >= 2 ? (...msgs) => console.log(...msgs) || true : () => false,
    debug: verbosity >= 3 ? (...msgs) => console.log(...msgs) || true : () => false
  };
}
/* eslint-enable no-console */

export const shared = [{
  key: "log",
  default: () => getLogger(0),
  schema: _.isObject,

  flagType: "count",
  flags: ["verbose", "v"],
  flagTransform: getLogger,
  cmdOpts: { global: true },

  description: {
    short: "Compiler verbosity (sent to STDOUT).",
    full: `TODO`
  }
}, {
  key: "config",

  flagType: "string",
  flags: ["config", "c"],
  cmdOpts: { global: true },

  description: {
    short: "Path to Interlock config file.",
    full: `TODO`
  }
}];
