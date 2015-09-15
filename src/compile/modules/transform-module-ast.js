import _ from "lodash";
import { Plugin, transform } from "babel-core";

import transformAmd from "./transform-amd";

export default function transformModuleAst (origAst, babelUserConfig = {}) {
  let synchronousRequires = [];

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

  const config = _.extend({}, babelUserConfig, {
    whitelist: babelUserConfig.whitelist ?
      _.uniq(["es6.modules", ...(babelUserConfig.whitelist || [])]) :
      undefined,
    code: false,
    ast: true,
    plugins: [...(babelUserConfig.plugins || []), {
      transformer: transformAmd(),
      position: "after"
    }, {
      transformer: getRequires,
      position: "after"
    }]
  });

  synchronousRequires = _.uniq(synchronousRequires);

  const { ast } = transform.fromAst(origAst, null, config);
  return { ast, synchronousRequires };
}
