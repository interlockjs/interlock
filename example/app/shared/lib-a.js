define([
  "./lib-b",
  "./required-but-not-assigned"
], function (b) {
  return "A! " + b;
});

/*
  Expected output:
  module.exports = (function () {
    var b = require("hash-for-lib-b");
    require("hash-for-required-but-not-assigned");
    return "A! " + b;
  })();
 */
