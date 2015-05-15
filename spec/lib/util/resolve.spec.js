var path = require("path");

var resolve = require("../../../lib/util/resolve");

var baseDir = path.resolve(__dirname, "../../..");


describe("lib/util/", function () {
  describe("resolve", function () {
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
      var resolved = attemptResolve("./ingest");
      expect(resolved).to.have.property("ns", "interlock");
      expect(resolved).to.have.property("nsPath", "lib/ingest.js");
      expect(resolved.path).to.equal(path.join(baseDir, "lib/ingest.js"));
    });

    it("resolves file in sub-directory", function () {
      var resolved = attemptResolve("./util/resolve");
      expect(resolved).to.have.property("ns", "interlock");
      expect(resolved).to.have.property("nsPath", "lib/util/resolve.js");
      expect(resolved.path).to.equal(path.join(baseDir, "lib/util/resolve.js"));
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

    it("resolves a directory in a separate directory branch", function () {
      var resolved = attemptResolve("../example/plugin");
      expect(resolved).to.have.property("ns", "interlock");
      expect(resolved).to.have.property("nsPath", "example/plugin/index.js");
      expect(resolved.path).to.equal(path.join(baseDir, "example/plugin/index.js"));
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
});
