var path = require("path");

var Interlock = require("..");

var ilk = new Interlock(require("./ilk-config"));


ilk.watch(function (buildEvent) {
  var patchModules = buildEvent.patchModules;
  var compilation = buildEvent.compilation;

  if (patchModules) {
    const paths = patchModules.map(function (module) { return module.path; });
    console.log("the following modules have been updated:", paths);
  }
  if (compilation) {
    console.log("a new compilation has completed");
  }
}, { save: true });

// ilk.build();
