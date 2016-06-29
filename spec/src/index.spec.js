/* eslint-disable max-nested-callbacks,no-new */

import path from "path";

import _ from "lodash";

import Interlock from "../../src/index.js";

const minimalValidConfig = {
  entry: { "./index.js": "bundle.js" },
  srcRoot: path.join(__dirname, "/../..")
};

describe("src/index", () => {
  describe("constructor", function () {
    // TODO: Test for [] and undefined. _.merge ignores those values.
    it("throws an Error if not passed invalid options", function () { // eslint-disable-line max-statements,max-len
      // Missing or empty config
      expect(() => { new Interlock(); }).to.throw(Error);
      expect(() => { new Interlock({}); }).to.throw(Error);

      // Invalid options.entry
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { entry: true })); })
        .to.throw(Error, "Received invalid value for option 'entry': true.");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { entry: 1 })); })
        .to.throw(Error, "Received invalid value for option 'entry': 1.");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { entry: null })); })
        .to.throw(Error, "Received invalid value for option 'entry': null.");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { entry: null },
          { entry: {"fakepath": {}} }
        );
        new Interlock(invalidConfig);
      }).to.throw(Error, "Received invalid value for option 'entry': {\"fakepath\":{}}.");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { entry: null },
          { entry: {"fakepath": {dest: true}} }
        );
        new Interlock(invalidConfig);
      }).to.throw(
        Error,
        "Received invalid value for option 'entry': {\"fakepath\":{\"dest\":true}}."
      );

      // Invalid options.split
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: true })); })
        .to.throw(Error, "Received invalid value for option 'split': true.");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: 1 })); })
        .to.throw(Error, "Received invalid value for option 'split': 1.");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: null })); })
        .to.throw(Error, "Received invalid value for option 'split': null.");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig, { split: {"fakepath": {}} });
        new Interlock(invalidConfig);
      }).to.throw(Error, "Received invalid value for option \'split\': {\"fakepath\":{}}.");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { split: {"fakepath": {dest: true}} });
        new Interlock(invalidConfig);
      }).to.throw(
        Error,
        "Received invalid value for option \'split\': {\"fakepath\":{\"dest\":true}}."
      );

      // Conditional options.split || options.entry requirement
      expect(() => {
        new Interlock({
          entry: { "./index.js": "bundle.js" },
          srcRoot: path.join(__dirname, "/../..")
        });
      })
        .to.not.throw(Error);
      expect(() => {
        new Interlock({
          split: { "./index.js": "bundle.js" },
          srcRoot: path.join(__dirname, "/../..")
        });
      })
        .to.not.throw(Error);
      expect(() => {
        new Interlock({
          split: { "./index.js": "bundle.js" },
          entry: { "./index.js": "bundle.js" },
          srcRoot: path.join(__dirname, "/../..")
        });
      })
        .to.not.throw(Error);
      expect(() => {
        new Interlock({ srcRoot: path.join(__dirname, "/../..") });
      }).to.throw(Error);

      // Invalid options.srcRoot
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: true })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: 1 })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: null })); })
        .to.throw(Error);
    });

    it("fills in default values when not passed in", function () {
      const ilk = new Interlock(minimalValidConfig);

      // Can't do deep-equal comparison on function objects.
      delete ilk.options.log;

      expect(ilk.options).to.deep.equal({
        entry: { "./index.js": { dest: "bundle.js" }},
        split: {},
        globalName: "__interlock__",
        srcRoot: path.join(__dirname, "/../.."),
        destRoot: path.join(__dirname, "../..", "dist"),
        extensions: [ ".js", ".jsx", ".es6" ],
        ns: "interlock",
        implicitBundleDest: "[setHash].js",
        includeComments: false,
        multiprocess: false,
        plugins: [],
        pretty: false,
        sourceMaps: false,
        fcache: false,
        presets: []
      });
    });

    it("allows overrides to the default config", function () {
      const ilk = new Interlock({
        entry: { "./index.js": "bundle.js" },
        srcRoot: path.join(__dirname, "/../.."),
        context: "custom context",
        destRoot: "custom destRoot",
        extensions: [".custom"],
        ns: "custom-namespace",
        implicitBundleDest: "custom-dest"
      });

      // Can't do deep-equal comparison on function objects.
      delete ilk.options.log;

      expect(ilk.options).to.deep.equal({
        entry: { "./index.js": { "dest": "bundle.js" } },
        split: {},
        globalName: "__interlock__",
        srcRoot: path.join(__dirname, "/../.."),
        context: "custom context",
        destRoot: "custom destRoot",
        extensions: [".custom"],
        ns: "custom-namespace",
        implicitBundleDest: "custom-dest",
        includeComments: false,
        multiprocess: false,
        plugins: [],
        pretty: false,
        sourceMaps: false,
        fcache: false,
        presets: []
      });
    });
  });

  describe("build", function () {
    it("return a Promise");
    it("resolves to the compilation output");
  });
  describe("watch", function () {
    it("rebuilds on file change");
  });
  describe("_saveBundles", function () {
    it("saves output from compilation to destRoot");
    it("prefixes bundles with namespace");
  });
});
