/* eslint-disable max-nested-callbacks,no-new */

import path from "path";

import _ from "lodash";

import Interlock from "../../lib/index.js";

const minimalValidConfig = {
  emit: ["./index.js"],
  srcRoot: path.join(__dirname, "/../..")
};

describe("lib/index", () => {
  describe("constructor", function () {
    // TODO: Test for [] and undefined. _.merge ignores those values.
    it("throws an Error if not passed invalid options", function () {
      // Missing or empty config
      expect(() => { new Interlock(); }).to.throw(Error);
      expect(() => { new Interlock({}); }).to.throw(Error);

      // Invalid options.emit
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { emit: true })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { emit: 1 })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { emit: null })); })
        .to.throw(Error);
      expect(() => {
        var invalidConfig = _.merge({}, minimalValidConfig);
        delete invalidConfig.emit;
        new Interlock(invalidConfig);
      }).to.throw(Error);

      // Invalid options.srcRoot
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: true })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: 1 })); })
        .to.throw(Error);
      expect(() => { new Interlock(_.merge({}, minimalValidConfig, { srcRoot: null })); })
        .to.throw(Error);
      expect(() => {
        var invalidConfig = _.merge({}, minimalValidConfig);
        delete invalidConfig.srcRoot;
        new Interlock(invalidConfig);
      }).to.throw(Error);
    });

    it("fills in default values when not passed in", function () {
      var ilk = new Interlock(minimalValidConfig);

      expect(ilk.options).to.deep.equal({
        emit: [ "./index.js" ],
        srcRoot: path.join(__dirname, "/../.."),
        context: path.join(__dirname, "../.."),
        destRoot: path.join(__dirname, "../..", "dist"),
        extensions: [ ".js", ".jsx", ".es6" ],
        ns: "interlock"
      });
    });

    it("allows overrides to the default config", function () {
      var ilk = new Interlock({
        emit: ["./index.js"],
        srcRoot: path.join(__dirname, "/../.."),
        context: "custom context",
        destRoot: "custom destRoot",
        extensions: [".custom"],
        ns: "custom-namespace"
      });

      expect(ilk.options).to.deep.equal({
        emit: [ "./index.js" ],
        srcRoot: path.join(__dirname, "/../.."),
        context: "custom context",
        destRoot: "custom destRoot",
        extensions: [".custom"],
        ns: "custom-namespace"
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
