import { parse } from "babylon";
import { query } from "../../util";
import generate from "babel-generator";
import { constructCommonModule } from "../../../src/compile/construct";

function render (ast) {
  return generate(ast, {
    compact: false,
    comments: true,
    quotes: "double"
  }).code;
}

describe("src/compile/construct", () => {
  describe("common module", () => {
    function simpleModule () {
      const origModuleBody = parse("module.exports = 'hello';").program.body;

      const dependencies = [{ id: "ddb179" }, { id: "aa527f" }];

      return Promise.all([
        constructCommonModule(origModuleBody, dependencies),
        origModuleBody
      ]);
    }

    it("outputs an object literal with two properties", done => {
      return simpleModule()
        .then(([ast]) => {
          const objLiterals = query(ast, "ObjectExpression");
          expect(objLiterals).to.have.length(1);
          expect(objLiterals[0].properties).to.have.length(2);
        })
        .then(done, done);
    });

    it("includes dependency IDs", done => {
      return simpleModule()
        .then(([ast]) => {
          const depsArray = query(ast, "[key.name=deps]")[0];
          expect(depsArray).to.have.deep.property("value.type", "ArrayExpression");
          expect(depsArray.value.elements).to.have.length(2);
          expect(query(depsArray, "StringLiteral[value=ddb179]")).to.have.length(1);
          expect(query(depsArray, "StringLiteral[value=aa527f]")).to.have.length(1);
        })
        .then(done, done);
    });

    it("includes the wrapped module body", done => {
      return simpleModule()
        .then(([ast, origBody]) => {
          const moduleFn = query(ast, "ObjectProperty[key.name=fn]")[0];
          expect(moduleFn).to.have.deep.property("value.type", "FunctionExpression");
          expect(moduleFn.value.params).to.have.length(3);

          const constructedModuleFnBody = query(moduleFn, "BlockStatement")[0].body;
          expect(constructedModuleFnBody).to.eql(origBody);
        })
        .then(done, done);
    });

    it("outputs correct JS when rendered", done => {
      return simpleModule()
        .then(([ast]) => {
          expect(render(ast)).to.eql([
            "{",
            "  deps: [\"ddb179\", \"aa527f\"],",
            "  fn: function (require, module, exports) {",
            "    module.exports = 'hello';",
            "  }",
            "}"
          ].join("\n"));
        })
        .then(done, done);
    });
  });
});
