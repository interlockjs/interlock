var requireDir = require("require-dir");
var chai = require("chai");
global.sinon = require("sinon");

chai.config.includeStack = true;

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion
global.assert = chai.assert

requireDir("./lib", { recurse: true });
