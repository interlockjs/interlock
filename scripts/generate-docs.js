#!/usr/bin/env node
import { join } from "path";
import generateDocs from "pluggable/lib/generate-docs";

const PREAMBLE = `# Extensibility

Bacon ipsum dolor amet jerky jowl meatloaf ribeye beef. Doner chicken bacon tongue picanha
landjaeger pork chop brisket leberkas fatback ball tip meatball corned beef. Drumstick turkey
salami fatback ham hock venison tenderloin pork chop short ribs t-bone beef ribs hamburger
shankle.

Chuck pastrami bresaola salami, pork flank porchetta ground round filet mignon tongue corned
beef. Pork belly spare ribs kielbasa chicken ribeye turducken, jerky pig doner flank.

Hamburger tail landjaeger ball tip, porchetta fatback drumstick kielbasa shankle frankfurter.

Something about Pluggable.CONTINUE...

`;

generateDocs({
  rootPath: join(__dirname, ".."),
  outputPath: "docs/extensibility.md",
  jsonOutputPath: "docs/compilation.json",
  sources: "src/**/*.js",
  preamble: PREAMBLE
});
