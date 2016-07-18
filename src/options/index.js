import path from "path";

import { assign, flatten } from "lodash";


export { compile } from "./compile";
export { shared, getLogger } from "./shared";
export { server } from "./server";


export function loadConfig (configPath) {
  configPath = path.resolve(process.cwd(), configPath);

  try {
    return require(configPath);
  } catch (err) {
    console.log("ERROR: Unable to load config file.\n"); // eslint-disable-line no-console
    console.log(err.stack); // eslint-disable-line no-console
    console.log(""); // eslint-disable-line no-console
    throw new Error("Please correct your config file and try again.");
  }
}

export function buildArgs (yargs, ...optionsDefs) {
  return flatten(optionsDefs).reduce((_yargs, option) => {
    if (!option.flags) {
      return _yargs;
    }
    return _yargs.option(option.flags[0], {
      alias: option.flags ? option.flags.slice(1) : [],
      describe: option.description.short,
      type: option.flagType,
      ...(option.cmdOpts || {}) // eslint-disable-line no-extra-parens
    });
  }, yargs);
}

export function getInterlockOpts (argv, optionsDef, defaults = {}) {
  const cwd = process.cwd();

  return optionsDef.reduce((opts, option) => {
    const argKey = option.flags[0];
    let val = argv[argKey];

    if (val) {
      if (option.flagTransform) {
        val = option.flagTransform(val, cwd);
      }
      opts[option.key] = val;
    }

    return opts;
  }, defaults);
}

function markAsDefault (opts, key) {
  opts.__defaults = opts.__defaults || {};
  opts.__defaults[key] = true;
}

export function validate (options, optionsDef) {
  const cwd = process.cwd();

  options = optionsDef.reduce((opts, option) => {
    const hasKey = option.key in options;
    let val = options[option.key];

    if (!hasKey && option.default) {
      markAsDefault(opts, option.key);
      val = opts[option.key] = option.default(cwd);
    }

    if (!hasKey && option.required) {
      throw new Error(`A value is required for option '${option.key}'.`);
    }
    if (hasKey && option.schema && !option.schema(val)) {
      throw new Error(`Received invalid value for option '${option.key}': ${JSON.stringify(val)}.`);
    }

    return opts;
  }, assign({}, options));

  if (optionsDef.or) {
    optionsDef.or.forEach(alternatives => {
      const oneIsPresent = alternatives.reduce((isPresent, alternative) => {
        return isPresent || !!options[alternative];
      }, false);

      if (!oneIsPresent) {
        throw new Error(
          `Expected at least one of the following options: ${alternatives.join(", ")}.`
        );
      }
    });
  }

  return options;
}
