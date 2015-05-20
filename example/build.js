var path = require("path");

var Interlock = require("..");
var ExamplePlugin = require("./plugin");

var ilk = new Interlock({
  root: __dirname,
  outputPath: path.join(__dirname, "dist"),

  bundles: [{
    entry: true,
    src: "./app/entry-a.js",
    dest: "entry-a.bundle.js"
  }, {
    entry: true,
    src: "./app/entry-b.js",
    dest: "entry-b.bundle.js"
  }, {
    entry: false,
    includeRuntime: false,
    src: "./app/shared/lib-a.js",
    dest: "[setHash].js"
  }],

  implicitBundleDest: "[setHash].js",

  plugins: [
    new ExamplePlugin()
  ]
});

ilk.build();
