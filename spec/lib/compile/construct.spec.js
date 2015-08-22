import { parse } from "babel";
import esquery from "esquery";
import escodegen from "escodegen";
import {
  constructCommonModule
} from "../../../lib/compile/construct";

function render (ast) {
  return escodegen.generate(ast, {
    format: {
      indent: { style: "  " },
      quotes: "single"
    }
  });
}

describe("lib/compile/construct", () => {
  describe("common module", () => {
    function simpleModule () {
      const origModuleBody = parse("module.exports = 'hello';").body;
      const dependencies = [{ hash: "ddb179" }, { hash: "aa527f" }];
      return {
        moduleAst: constructCommonModule(origModuleBody, dependencies),
        origModuleBody
      };
    }

    it("outputs an object literal with two properties", () => {
      const ast = simpleModule().moduleAst;
      const objLiterals = esquery(ast, "ObjectExpression");

      expect(objLiterals).to.have.length(1);
      expect(objLiterals[0].properties).to.have.length(2);
    });

    it("includes dependency hashes", () => {
      const ast = simpleModule().moduleAst;
      const depsArray = esquery(ast, "[key.name=deps]")[0];

      expect(depsArray).to.have.deep.property("value.type", "ArrayExpression");
      expect(depsArray.value.elements).to.have.length(2);
      expect(esquery(depsArray, "Literal[value='ddb179']")).to.have.length(1);
      expect(esquery(depsArray, "Literal[value='aa527f']")).to.have.length(1);
    });

    it("includes the wrapped module body", () => {
      const module = simpleModule();
      const moduleFn = esquery(module.moduleAst, "Property[key.name=fn]")[0];

      expect(moduleFn).to.have.deep.property("value.type", "FunctionExpression");
      expect(moduleFn.value.params).to.have.length(3);

      const constructedModuleFnBody = esquery(moduleFn, "BlockStatement")[0].body;
      expect(constructedModuleFnBody).to.eql(module.origModuleBody);
    });

    it("outputs correct JS when rendered", () => {
      const ast = simpleModule().moduleAst;

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
