import { Plugin, transform } from "babel-core";

import pluggable from "../../pluggable";


export default pluggable(function updateRequires (module) {
  const updatePlugin = new Plugin("getRequires", {
    visitor: {
      CallExpression (node/*, parent */) {
        if (node.callee.name === "require") {
          const originalVal = node.arguments[0].value;
          const correspondingModule = module.dependenciesByInternalRef[originalVal];
          node.arguments[0].value = correspondingModule.hash;
          node.arguments[0].raw = `"$(correspondingModule.hash)"`;
        }
      }
    }
  });

  const ast = transform.fromAst(module.ast, null, {
    code: false,
    whitelist: ["react"],
    plugins: [updatePlugin]
  }).ast.program;

  return Object.assign({}, module, { ast });
});
