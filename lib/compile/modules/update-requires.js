import { Plugin } from "babel-core";

export default function updateRequires (modulesByAbsPath, resolvedRequires) {
  return new Plugin("getRequires", {
    visitor: {
      CallExpression: function (node/*, parent */) {
        if (node.callee.name === "require") {
          const originalVal = node.arguments[0].value;
          const correspondingModule = modulesByAbsPath[resolvedRequires[originalVal]];
          node.arguments[0].value = correspondingModule.hash;
          node.arguments[0].raw = `"$(correspondingModule.hash)"`;
        }
      }
    }
  });
}
