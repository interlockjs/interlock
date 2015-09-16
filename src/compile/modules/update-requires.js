import { Plugin } from "babel-core";

export default function updateRequires (requireStrToModHash) {
  return new Plugin("getRequires", {
    visitor: {
      CallExpression (node/*, parent */) {
        if (node.callee.name === "require") {
          const originalVal = node.arguments[0].value;
          const correspondingModule = requireStrToModHash[originalVal];
          node.arguments[0].value = correspondingModule.hash;
          node.arguments[0].raw = `"$(correspondingModule.hash)"`;
        }
      }
    }
  });
}
