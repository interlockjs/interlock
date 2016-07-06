import * as targets from "./targets";

import zmq from "zmq";

import { SCHEDULER_ADDRESS, COLLECTOR_ADDRESS } from "./";
import monitor from "./monitor";

const pluggableResponse = (err, result) => {
  if (err) {
    return JSON.stringify({ err });
  }

  return JSON.stringify(result);
};

const collector = zmq.socket("pull");
const parentCollector = zmq.socket("push");

collector.on("message", msg => {
  try {
    const { pluggableName, context, args } = JSON.parse(msg);
    const fn = targets[pluggableName];
    fn.apply(context, args)
      .then(result => parentCollector.send(pluggableResponse(null, {
        pluggableName,
        result
      })))
      .catch(err => parentCollector.send(pluggableResponse(err)));
  } catch (err) {
    return parentCollector.send(pluggableResponse(err));
  }
});

monitor(collector);
monitor(parentCollector);

collector.connect(SCHEDULER_ADDRESS);
parentCollector.connect(COLLECTOR_ADDRESS);
