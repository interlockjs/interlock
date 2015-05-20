var _ = require("lodash");

module.exports = function applyPlugins(plugins, ev /* args... */) {
  var contextArgs, result;
  if (!ev) {
    throw new Error("Must provide event type for plugin application.");
  }

  contextArgs = Array.prototype.slice.call(arguments, 3);
  result = arguments[2];

  _.each(plugins, function (plugin) {
    var fnArgs;
    if (ev in plugin) {
      fnArgs = [result].concat(contextArgs);
      result = plugin[ev].apply(plugin, fnArgs);
    }
  });

  return result;
};

