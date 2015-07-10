var path = require("path");

var Interlock = require("..");
var ExamplePlugin = require("./plugin");

var ilk = new Interlock({
  root: __dirname,
  outputPath: path.join(__dirname, "dist"),

  emit: [{
    entry: "./app/entry-a.js",
    dest: "entry-a.bundle.js"
  }, {
    entry: "./app/entry-b.js",
    dest: "entry-b.bundle.js"
  }, {
    split: "./app/shared/lib-a.js",
    dest: "[setHash].js"
  }],

  includeComments: true,
  sourceMaps: true,
  // cacheMode: "localStorage",

  implicitBundleDest: "[setHash].js",

  plugins: [
    new ExamplePlugin()
  ]
});

ilk.build();
