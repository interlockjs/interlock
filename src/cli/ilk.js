#!/usr/bin/env node

import yargs from "yargs";

import * as options from "../options";


const y = yargs
  .strict()
  .usage(`Usage: $0 <command> [options]

This is where additional information will go.`);

options.buildArgs(y, options.shared)
  .command(
    "build",
    "Transform source files to destination JS.",
    require("./ilk-build")
  )
  .command(
    "server",
    "Run a development server with live-updated assets.",
    require("./ilk-server")
  )

  .demand(1, "You must specify an Interlock command.")

  .epilogue("For more information, see http://www.interlockjs.com/docs/ilk.")
  .help()
  .parse(process.argv);
