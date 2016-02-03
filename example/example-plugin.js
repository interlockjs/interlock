module.exports = function (babel) {
  var t = babel.types;
  return {
    visitor: {
      FunctionDeclaration: function (path) {
        var id = path.node.id;
        path.node.type = "FunctionExpression";
        path.node.id = null;

        path.replaceWith(t.variableDeclaration("var", [
          t.variableDeclarator(id, path.node)
        ]));
      }
    }
  };
}