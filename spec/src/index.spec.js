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
        .to.throw(Error, "child \"entry\" fails because [\"entry\" must be an object]");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { entry: 1 })); })
        .to.throw(Error, "child \"entry\" fails because [\"entry\" must be an object]");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { entry: null })); })
        .to.throw(Error, "child \"entry\" fails because [\"entry\" must be an object]");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { entry: null },
          { entry: {"fakepath": {}} }
        );
        new Interlock(invalidConfig);
      }).to.throw(Error, "child \"entry\" fails because [child \"fakepath\" fails because " +
        "[\"fakepath\" must be a string, child \"dest\" fails because [\"dest\" is required]]]");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { entry: null },
          { entry: {"fakepath": {dest: true}} }
        );
        new Interlock(invalidConfig);
      }).to.throw(Error, "child \"entry\" fails because [child \"fakepath\" fails because " +
        "[\"fakepath\" must be a string, child \"dest\" fails because [\"dest\" must be a string]]]"
      );

      // Invalid options.split
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: true })); })
        .to.throw(Error, "child \"split\" fails because [\"split\" must be an object]");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: 1 })); })
        .to.throw(Error, "child \"split\" fails because [\"split\" must be an object]");
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { split: null })); })
        .to.throw(Error, "child \"split\" fails because [\"split\" must be an object]");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig, { split: {"fakepath": {}} });
        new Interlock(invalidConfig);
      }).to.throw(Error, "child \"split\" fails because [child \"fakepath\" fails because " +
        "[\"fakepath\" must be a string, child \"dest\" fails because [\"dest\" is required]]]");
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig,
          { split: {"fakepath": {dest: true}} });
        new Interlock(invalidConfig);
      }).to.throw(Error, "child \"split\" fails because [child \"fakepath\" fails because " +
        "[\"fakepath\" must be a string, child \"dest\" fails because [\"dest\" must be a string]]]"
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
      expect(() => {
        const invalidConfig = _.merge({}, minimalValidConfig);
        delete invalidConfig.srcRoot;
        new Interlock(invalidConfig);
      }).to.throw(Error);
    });

    it("fills in default values when not passed in", function () {
      const ilk = new Interlock(minimalValidConfig);

      expect(ilk.options).to.deep.equal({
        entry: { "./index.js": { dest: "bundle.js" }},
        split: {},
        globalName: "__interlock__",
        srcRoot: path.join(__dirname, "/../.."),
        context: path.join(__dirname, "../.."),
        destRoot: path.join(__dirname, "../..", "dist"),
        extensions: [ ".js", ".jsx", ".es6" ],
        ns: "interlock",
        implicitBundleDest: "[setHash].js"
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

      expect(ilk.options).to.deep.equal({
        entry: { "./index.js": { "dest": "bundle.js" } },
        split: {},
        globalName: "__interlock__",
        srcRoot: path.join(__dirname, "/../.."),
        context: "custom context",
        destRoot: "custom destRoot",
        extensions: [".custom"],
        ns: "custom-namespace",
        implicitBundleDest: "custom-dest"
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
