var fs = require("fs");
var path = require("path");

var estemplate = require("estemplate");


var localStorageGetTmpl,
  localStorageSaveTmpl;

function getTemplate(templateName) {
  var absPath = path.join(__dirname, "templates", templateName + ".jst");
  var templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

localStorageGetTmpl = getTemplate("local-storage-get");
localStorageSaveTmpl = getTemplate("local-storage-save");


module.exports = {
  localStorage: {
    get: function (opts) {
      opts = opts || {};
      return localStorageGetTmpl(opts).body[0].expression.body.body;
    },
    save: function (opts) {
      opts = opts || {};
      return localStorageSaveTmpl(opts).body;
    }
  }
};
