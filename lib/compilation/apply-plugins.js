var _ = require("lodash");

module.exports = function (options) {
  return function applyPlugins(ev /* args... */) {
    var contextArgs, result;
    if (!ev) {
      throw new Error("Must provide event type for plugin application.");
    }

    contextArgs = Array.prototype.slice.call(arguments, 2);
    result = arguments[1];

    _.each(options.plugins, function (plugin) {
      var fnArgs;
      if (ev in plugin) {
        fnArgs = [result].concat(contextArgs);
        result = plugin[ev].apply(plugin, fnArgs);
      }
    });

    return result;
  };
};

