var useTranspiled = true; // eslint-disable-line no-var

try {
  require.resolve("./lib");
} catch (e) {
  useTranspiled = false;
}

/* eslint-disable global-require */
if (useTranspiled) {
  require("babel-polyfill");
  module.exports = require("./lib");
} else {
  require("babel-core/register");
  module.exports = require("./src");
}
/* eslint-enable global-require */
