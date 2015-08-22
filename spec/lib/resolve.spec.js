/* eslint-disable max-nested-callbacks,no-new */

import path from "path";

import resolve from "../../lib/resolve";

const baseDir = path.resolve(__dirname, "../..");


describe("lib/resolve", function () {
  function attemptResolve (requireStr, extentions) {
    return resolve(
      requireStr,
      path.join(baseDir, "lib"),
      "interlock",
      baseDir,
      extentions || [".js"]
    );
  }

  it("resolves file in same directory", function () {
    const resolved = attemptResolve("./index");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/index.js"));
  });

  it("resolves file in sub-directory", function () {
    const resolved = attemptResolve("./compile/construct/index");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/compile/construct/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/compile/construct/index.js"));
  });

  it("resolves current directory", function () {
    const resolved = attemptResolve("./");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/index.js"));
  });

  it("resolves a file in a separate directory branch", function () {
    const resolved = attemptResolve("../example/build");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "example/build.js");
    expect(resolved.path).to.equal(path.join(baseDir, "example/build.js"));
  });

  it("resolves a node_modules package", function () {
    const resolved = attemptResolve("lodash");
    expect(resolved).to.have.property("ns", "lodash");
    expect(resolved).to.have.property("nsPath", "index.js");
    expect(resolved.path)
      .to.equal(path.join(baseDir, "node_modules/lodash", "index.js"));
  });

  it("resolves a file in node_modules package", function () {
    const resolved = attemptResolve("ast-types/lib/scope.js");
    expect(resolved).to.have.property("ns", "ast-types");
    expect(resolved).to.have.property("nsPath", "lib/scope.js");
    expect(resolved.path)
      .to.equal(path.join(baseDir, "node_modules/ast-types", "lib/scope.js"));
  });
});
