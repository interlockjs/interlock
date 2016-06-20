var libB = require("./shared/lib-b");
import libC from "./shared/lib-c";

console.log("entry-b:libB", libB);
console.log("entry-b:libC", libC.thing);
