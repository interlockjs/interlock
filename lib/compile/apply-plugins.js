module.exports = function applyPlugins (plugins, ev /* args... */) {
  if (!ev) {
    throw new Error("Must provide event type for plugin application.");
  }

  const contextArgs = Array.prototype.slice.call(arguments, 3);
  let result = arguments[2];

  plugins.forEach(plugin => {
    if (ev in plugin) {
      result = plugin[ev].apply(plugin, [result, ...contextArgs]);
    }
  });

  return result;
};

