var path = require("path");

module.exports = {
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/entry-a.js": "entry-a.bundle.js",
    "./app/entry-b.js": { dest: "entry-b.bundle.js" }
  },
  split: {
    "./app/shared/lib-a.js": "[setHash].js"
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [],

  presets: [require("./preset")],

  babelConfig: {
    plugins: [require.resolve("./example-plugin")]
  }
};
