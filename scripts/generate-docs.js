#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const glob = require("glob");

const _ = require("lodash");
const commentParser = require("comment-parser");
const babel = require("babel-core");
const estraverse = require("estraverse");
const parse = babel.parse;

const rootPath = path.join(__dirname, "..");
const outputPath = path.join(rootPath, "docs/extensibility.md");
const jsonOutputPath = path.join(rootPath, "docs/compilation.json");
const srcGlob = path.join(__dirname, "../src/**/*.js");


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


function green (text) {
  return "\x1b[32m" + text + "\x1b[0m";
}

function red (text) {
  return "\x1b[31m" + text + "\x1b[0m";
}

function loadAst (fpath) {
  const rawSource = fs.readFileSync(fpath, "utf-8");
  return parse(rawSource, {
    locations: true,
    ranges: true,
    sourceFile: fpath
  });
}

function findDoc (node, parents) {
  if (node.leadingComments && node.leadingComments.length > 0) {
    return node.leadingComments[0].value;
  }
  for (const anscestor of parents) {
    if ((anscestor.type === "VariableDeclaration" ||
        anscestor.type === "ExportNamedDeclaration" ||
        anscestor.type === "ExportDefaultDeclaration") &&
        anscestor.leadingComments &&
        anscestor.leadingComments.length > 0) {
      return anscestor.leadingComments[0].value;
    }
  }
  return null;
}

function getNamedFunctions (ast) {
  const controller = new estraverse.Controller();
  const functions = {};

  function enter (node) {
    if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" &&
        node.id !== null) {
      functions[node.id.name] = {
        fnParams: node.params,
        name: node.id.name,
        fnStart: node.loc.start.line,
        fnEnd: node.loc.end.line,
        doc: findDoc(node, controller.parents().reverse())
      };
    }
  }

  controller.traverse(ast, { enter });
  return functions;
}

function getEdges (objNode) {
  if (!objNode || objNode.type !== "ObjectExpression") {
    return [];
  }
  return _.map(objNode.properties, prop => prop.key.name);
}

function getPluggablesForFile (fpath) {
  const ast = loadAst(fpath);
  const relPath = path.relative(rootPath, fpath);
  const namedFunctions = getNamedFunctions(ast);

  const pluggables = [];

  const controller = new estraverse.Controller();

  function enter (node) {
    if (node.type === "CallExpression" &&
        node.callee.name === "pluggable") {

      const pluggable = {
        path: relPath,
        pluggableLine: node.loc.start.line,
        edges: getEdges(node.arguments[1])
      };

      if (node.arguments[0].type === "FunctionExpression") {
        Object.assign(pluggable, {
          fnParams: node.arguments[0].params,
          name: node.arguments[0].id.name,
          fnStart: node.loc.start.line,
          fnEnd: node.loc.end.line,
          doc: findDoc(node, controller.parents().reverse())
        });
      } else {
        Object.assign(pluggable, namedFunctions[node.arguments[0].name]);
      }

      pluggable.fnParams = pluggable.fnParams.map(param => param.name);

      pluggables.push(pluggable);
    }
  }

  controller.traverse(ast, { enter });
  return pluggables;
}

function parseDoc (pluggable) {
  const parsedDoc = pluggable.doc ? commentParser("/*" + pluggable.doc + "*/")[0] : null;
  return Object.assign({}, pluggable, { parsedDoc });
}

function getArgsMismatch (pluggable) {
  if (pluggable.parsedDoc) {
    const paramsHash = pluggable.parsedDoc.tags
      .filter(tag => tag.tag === "param")
      .reduce((hash, param) => {
        hash[param.name] = true;
        return hash;
      }, {});

    const rootParams = _.chain(Object.keys(paramsHash))
      .map(paramName => paramName.split(".")[0])
      .uniq()
      .value();

    if (rootParams.length !== pluggable.fnParams.length) {
      return `params length mismatch for '${pluggable.name}' in ${pluggable.path}`;
    }

    for (const param of pluggable.fnParams) {
      if (!paramsHash[param]) {
        return `mismatch for param '${param}' of '${pluggable.name}' in ${pluggable.path}`;
      }
    }

  }
  return null;
}

function getAllPluggables () {
  return new Promise((resolve, reject) => {

    glob(srcGlob, function (err, fpaths) {
      if (err) {
        reject([err]);
        return;
      }

      const pluggables = _.chain(fpaths)
        .map(getPluggablesForFile)
        .flatten()
        .map(parseDoc)
        .value();

      const argsMismatches = _.chain(pluggables)
        .map(getArgsMismatch)
        .filter(x => x)
        .value();

      if (argsMismatches.length > 0) {
        reject(argsMismatches);
        return;
      }

      resolve(pluggables);
    });

  });
}

function assertNoDuplicates (pluggables) {
  const pHash = {};

  for (const pluggable of pluggables) {
    if (pluggable.name in pHash) {
      throw new Error(
        `duplicate pluggable '${pluggable.name}' found at\n` +
        `  ${pHash[pluggable.name].path}:${pHash[pluggable.name].fnStart}\n` +
        `  ${pluggable.path}:${pluggable.fnStart}`
        );
    }
    pHash[pluggable.name] = pluggable;
  }

  return pluggables;
}

function sortPluggables (pluggables) {
  return pluggables.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    return 0;
  });
}

function renderToMarkdown (pluggable) {
  const hasParsedDoc = !!pluggable.parsedDoc;
  const doc = hasParsedDoc ? "\n" + pluggable.parsedDoc.description + "\n" : "";

  let tagsData = "";
  if (hasParsedDoc) {
    tagsData += "\n" +
                "|     | Name | Type | Description |\n" +
                "| --- | ---- | ---- | ----------- |\n";

    tagsData += pluggable.parsedDoc.tags.map(tag => {
      const description = tag.description.replace(/\s+/g, " ");
      if (tag.tag === "param") {
        return `| Parameter | **${tag.name}** | ${tag.type} | ${description} |`;
      } else if (tag.tag === "return" || tag.tag === "returns") {
        return `| Return value |  | ${tag.type} | ${description} |`;
      }
      return "";
    }).join("\n");

    tagsData += "\n\n";
  }

  let linksInfo;
  /* eslint-disable max-len */
  if (pluggable.pluggableLine === pluggable.fnStart) {
    linksInfo = `This Pluggable's definition can be found [here](../${pluggable.path}#L${pluggable.fnStart}-L${pluggable.fnEnd}).`;
  } else {
    linksInfo = `This Pluggable's definition can be found [here](../${pluggable.path}#L${pluggable.pluggableLine}).
      The function that it wraps can be found [here](../${pluggable.path}#L${pluggable.fnStart}-L${pluggable.fnEnd}).`;
  }
  /*eslint-enable max-len */

  return `## ${pluggable.name}
  ${doc}
  ${tagsData}
  ${linksInfo}

  `;
}

function trim (markdownText) {
  return markdownText
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    // .filter(x => x)
    .join("\n");
}

function buildJson (pluggables) {
  const byFnName = {};
  pluggables.forEach(p => byFnName[p.name] = p);

  function build (name) {
    const node = byFnName[name];
    const children = node.edges.map(build);
    const markdown = renderToMarkdown(node);
    const treeNode = { name, node, children, markdown };
    if (!children.length) { treeNode.size = 1; }
    return treeNode;
  }

  return build("compile");
}

const pluggables = getAllPluggables()
  .then(assertNoDuplicates);

pluggables
  .then(sortPluggables)
  .then(_pluggables => {
    return _.chain(_pluggables)
      .map(renderToMarkdown)
      .map(trim)
      .reduce((bigMd, pluggableMd) => bigMd + pluggableMd, PREAMBLE)
      .value();
  })
  .then((md) => {
    fs.writeFileSync(outputPath, md);
    console.log(`${green("[ok]")} docs generated successfully`); // eslint-disable-line no-console
  })
  .catch(errs => {
    if (errs instanceof Array) {
      errs.forEach(err => console.log(`${red("[error]")} `, err)); // eslint-disable-line no-console
    } else {
      console.log(`${red("[error]")}`, errs); // eslint-disable-line no-console
    }
    process.exit(1); // eslint-disable-line no-process-exit
  });

pluggables
  .then(buildJson)
  .catch(console.log.bind(console)) // eslint-disable-line no-console
  .then(json => {
    fs.writeFileSync(jsonOutputPath, JSON.stringify(json, null, 2));
    console.log(`${green("[ok]")} JSON generated successfully`); // eslint-disable-line no-console
  });
