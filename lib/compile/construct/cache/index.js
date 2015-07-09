import fs from "fs";
import path from "path";

import estemplate from "estemplate";


function getTemplate (templateName) {
  const absPath = path.join(__dirname, "templates", templateName + ".jst");
  const templateStr = fs.readFileSync(absPath, "utf-8");
  return estemplate.compile(templateStr, {attachComment: true});
}

const localStorageGetTmpl = getTemplate("local-storage-get");
const localStorageSaveTmpl = getTemplate("local-storage-save");


export default {
  localStorage: {
    get: opts =>localStorageGetTmpl(opts || {}).body[0].expression.body.body,
    save: opts => localStorageSaveTmpl(opts || {}).body
  }
};
