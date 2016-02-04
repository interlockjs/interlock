Error.stackTraceLimit = Infinity;

require("babel-core/register");

const requireDir = require("require-dir");
const chai = require("chai");
const sinonChai = require("sinon-chai");
global.sinon = require("sinon");

chai.config.includeStack = true;
chai.use(sinonChai);

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

requireDir("./src", { recurse: true });
