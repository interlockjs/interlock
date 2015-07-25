var parse = require("babel").parse;
var esquery = require("esquery");
var escodegen = require("escodegen");

var construct = require("../../../lib/compile/construct");

var render = function (ast) {
  return escodegen.generate(ast, {
    format: {
      indent: { style: "  " },
      quotes: "single"
    }
  });
};

describe("lib/compile/construct", function () {
  describe("common module", function () {
    function simpleModule () {
      var origModuleBody = parse("module.exports = 'hello';").body;
      var dependencies = [{ hash: "ddb179" }, { hash: "aa527f" }];
      return {
        moduleAst: construct.commonModule(origModuleBody, dependencies),
        origModuleBody: origModuleBody
      };
    }

    it("outputs an object literal with two properties", function () {
      var ast = simpleModule().moduleAst;
      var objLiterals = esquery(ast, "ObjectExpression");

      expect(objLiterals).to.have.length(1);
      expect(objLiterals[0].properties).to.have.length(2);
    });

    it("includes dependency hashes", function () {
      var ast = simpleModule().moduleAst;
      var depsArray = esquery(ast, "[key.name=deps]")[0];

      expect(depsArray).to.have.deep.property("value.type", "ArrayExpression");
      expect(depsArray.value.elements).to.have.length(2);
      expect(esquery(depsArray, "Literal[value='ddb179']")).to.have.length(1);
      expect(esquery(depsArray, "Literal[value='aa527f']")).to.have.length(1);
    });

    it("includes the wrapped module body", function () {
      var module = simpleModule();
      var moduleFn = esquery(module.moduleAst, "Property[key.name=fn]")[0];

      expect(moduleFn).to.have.deep.property("value.type", "FunctionExpression");
      expect(moduleFn.value.params).to.have.length(3);

      const constructedModuleFnBody = esquery(moduleFn, "BlockStatement")[0].body;
      expect(constructedModuleFnBody).to.eql(module.origModuleBody);
    });

    it("outputs correct JS when rendered", function () {
      var ast = simpleModule().moduleAst;

      expect(render(ast)).to.eql([
        "{",
        "  deps: [",
        "    'ddb179',",
        "    'aa527f'",
        "  ],",
        "  fn: function (require, module, exports) {",
        "    module.exports = 'hello';",
        "  }",
        "}"
      ].join("\n"));
    });
  });
});
