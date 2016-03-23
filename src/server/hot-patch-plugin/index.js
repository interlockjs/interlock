import path from "path";
import fs from "fs";

import traverse from "babel-traverse";
import { parse } from "babylon";


const hotPatchRuntimeStr = fs.readFileSync(path.join(__dirname, "hot-patch-runtime.jst"), "utf-8");
const hotPatchRuntime = parse(hotPatchRuntimeStr, {}).program.body;
const moduleHotStr = fs.readFileSync(path.join(__dirname, "module.hot.jst"), "utf-8");
const moduleHot = parse(moduleHotStr, {}).program.body;


export default function (override, transform) {
  transform("constructRuntime", runtimeBody => {
    // Attach `hot` property to module in `require`.
    traverse.cheap(runtimeBody, node => {
      if (
        node.type === "ObjectProperty" &&
        node.key.name === "require"
      ) {
        const fnBody = node.value.body.body;
        const moduleObjIdx = fnBody.findIndex(fnBody, bodyNode =>
          bodyNode.type === "VariableDeclaration" &&
          bodyNode.declarations[0] &&
          bodyNode.declarations[0].id.name === "moduleObj"
        );
        fnBody.splice(moduleObjIdx + 1, 0, moduleHot);
      }
    });

    // Attach the hot-patch run-time to the end of the run-time body.
    return runtimeBody.concat(hotPatchRuntime);
  });
}
