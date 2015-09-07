module.exports = function (babel) {
  var Plugin = babel.Plugin;
  var t = babel.types;
  return new Plugin("plugin-example", {
    visitor: {
      FunctionDeclaration: function (node, parent) {
        var id = node.id;
        node.type = "FunctionExpression";
        node.id   = null;

        return t.variableDeclaration("var", [
          t.variableDeclarator(id, node)
        ]);
      }
    }
  });
}