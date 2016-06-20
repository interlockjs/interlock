import { has, cloneDeep } from "lodash";
import * as babylon from "babylon";
import * as t from "babel-types";
import traverse from "babel-traverse";


const FROM_TEMPLATE = "_fromTemplate";
const TEMPLATE_SKIP = Symbol();
const CLEAR_KEYS = [ "tokens", "start", "end", "loc", "raw", "rawValue" ];


// Adapted from `babel-traverse`'s `traverse.clearNode`.
function clearNode (node) {
  CLEAR_KEYS.forEach(key => {
    if (node[key] !== null) { node[key] = undefined; }
  });

  for (const key in node) {
    if (key[0] === "_" && node[key] !== null) { node[key] = undefined; }
  }

  Object.getOwnPropertySymbols(node).forEach(sym => {
    node[sym] = null;
  });
}


const templateVisitor = {
  noScope: true,

  enter (path, replacements) {
    let { node } = path;

    if (node[TEMPLATE_SKIP]) { return path.skip(); }
    if (t.isExpressionStatement(node)) { node = node.expression; }

    let replacement;

    if (t.isIdentifier(node) && node[FROM_TEMPLATE]) {
      if (has(replacements, node.name)) {
        replacement = replacements[node.name];
      }
    }

    if (replacement === null) { path.remove(); }

    if (replacement) {
      replacement[TEMPLATE_SKIP] = true;
      path.replaceInline(replacement);
    }
  }
};


function useTemplate (ast, replacements) {
  ast = cloneDeep(ast);
  const { program } = ast;

  traverse(ast, templateVisitor, null, replacements);

  if (program.body.length > 1) {
    return program.body;
  } else {
    return program.body[0];
  }
}

// Adapted from `babel-template`.  The existing package was deliberately
// removing comments and other node meta-data from templates and from
// replacement nodes.
export default function template (code) {
  let stack;
  try {
    throw new Error();
  } catch (error) {
    stack = error.stack.split("\n").slice(1).join("\n");
  }

  let getAst = function () {
    let ast;

    try {
      ast = babylon.parse(code, {
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true
      });

      traverse.cheap(ast, function (node) {
        clearNode(node);
        node[FROM_TEMPLATE] = true;
      });
    } catch (err) {
      err.stack = `${err.stack}from\n${stack}`;
      throw err;
    }

    getAst = function () {
      return ast;
    };

    return ast;
  };

  return function (replacements) {
    return useTemplate(getAst(), replacements);
  };
}
