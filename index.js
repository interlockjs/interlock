try {
  module.exports = require("./lib");
} catch (e) {
  require("babel/register");
  module.exports = require("./src");
}
