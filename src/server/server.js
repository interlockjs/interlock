import http from "http";
import path from "path";
import fs from "fs";

import mime from "mime";
import _ from "lodash";


function fileNotFound (res) {
  res.writeHead(404);
  res.end();
}

function respondStatic (res, basePath, relativePath) {
  const contentType = mime.lookup(relativePath);
  const realPath = path.join(basePath, relativePath);

  fs.readFile(realPath, (err, data) => {
    if (err) {
      res.writeHead(404);
    } else {
      res.writeHead(200, { "content-type": contentType });
      res.write(data);
    }
    res.end();
  });
}

function sendEvent (connections, id, eventName, data, retryTimeout) {
  const connection = connections[id];
  data = JSON.stringify(data);
  connection.write(`id: ${id}\n`);
  connection.write(`event: ${eventName}\n`);
  connection.write(`retry: ${retryTimeout}\n`);
  connection.write(`data: ${data}\n\n`);
}


export function createServer (opts = {}) {
  const eventsUrl = opts.eventsUrl || "/ilk/events";
  const connections = {};
  let nextConnectionID = 0;

  let dynamicResources = {};
  let shouldRespond = Promise.resolve();

  function pause () {
    let resume;
    shouldRespond = new Promise(_resolve => resume = _resolve);
    return resume;
  }

  function setDynamicAssets (assets) { dynamicResources = assets; }

  function notify (eventName, data) {
    Object.keys(connections).forEach(key => {
      if (!connections[key]) { return; }
      sendEvent(connections, key, eventName, data, opts.retryTimeout);
    });
  }

  const server = http.createServer((req, res) => {
    shouldRespond.then(() => {
      const acceptType = req.headers.accept;
      const url = req.url.toLowerCase();

      if (url === eventsUrl && acceptType === "text/event-stream") {
        const id = ++nextConnectionID;
        connections[id] = res;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        });

        res.on("close", function () {
          connections[id] = null;
          console.log("lost", id); // eslint-disable-line no-console
        });

        return;
      } else if (url in dynamicResources) {
        const contentType = mime.lookup(url);
        res.writeHead(200, { "content-type": contentType });
        res.write(dynamicResources[url]);
        res.end();
        return;
      }
      const staticMatch = _.findKey(opts.staticResources, pattern => {
        return pattern.test(url);
      });

      if (!staticMatch) {
        fileNotFound(res);
        return;
      }

      const relPath = url.replace(opts.staticResources[staticMatch], "");
      respondStatic(res, staticMatch, relPath);
    });
  });

  server.listen(opts.port);

  return {
    server,
    setDynamicAssets,
    notify,
    pause
  };
}
