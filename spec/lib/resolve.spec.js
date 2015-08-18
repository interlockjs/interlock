/* eslint-disable max-nested-callbacks,no-new */

var path = require("path");

var resolve = require("../../lib/resolve");

var baseDir = path.resolve(__dirname, "../..");


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
    var resolved = attemptResolve("./index");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/index.js"));
  });

  it("resolves file in sub-directory", function () {
    var resolved = attemptResolve("./compile/construct/index");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/compile/construct/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/compile/construct/index.js"));
  });

  it("resolves current directory", function () {
    var resolved = attemptResolve("./");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "lib/index.js");
    expect(resolved.path).to.equal(path.join(baseDir, "lib/index.js"));
  });

  it("resolves a file in a separate directory branch", function () {
    var resolved = attemptResolve("../example/build");
    expect(resolved).to.have.property("ns", "interlock");
    expect(resolved).to.have.property("nsPath", "example/build.js");
    expect(resolved.path).to.equal(path.join(baseDir, "example/build.js"));
  });

  it("resolves a node_modules package", function () {
    var resolved = attemptResolve("lodash");
    expect(resolved).to.have.property("ns", "lodash");
    expect(resolved).to.have.property("nsPath", "index.js");
    expect(resolved.path)
      .to.equal(path.join(baseDir, "node_modules/lodash", "index.js"));
  });

  it("resolves a file in node_modules package", function () {
    var resolved = attemptResolve("ast-types/lib/scope.js");
    expect(resolved).to.have.property("ns", "ast-types");
    expect(resolved).to.have.property("nsPath", "lib/scope.js");
    expect(resolved.path)
      .to.equal(path.join(baseDir, "node_modules/ast-types", "lib/scope.js"));
  });
});
