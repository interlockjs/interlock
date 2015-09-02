import { Plugin, transform } from "babel-core";
import transformAmd from "./transform-amd";

export default function coerceToCommonJs (origAst) {
  const synchronousRequires = [];

  const getRequires = new Plugin("get-requires", {
    visitor: {
      CallExpression (node/*, parent */) {
        if (node.callee.name === "require") {
          if (node.arguments.length === 0) {
            throw new Error("Require expressions must include a target.");
          }
          synchronousRequires.push(node.arguments[0].value);
        }
      }
    }
  });

  const {ast} = transform.fromAst(origAst, null, {
    whitelist: ["es6.modules"],
    code: false,
    plugins: [{
      transformer: transformAmd(),
      position: "after"
    }, {
      transformer: getRequires,
      position: "after"
    }]
  });

  return {ast, synchronousRequires};
}
