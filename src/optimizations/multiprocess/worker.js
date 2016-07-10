import { initChild } from "bson-ipc";

import * as targets from "./targets";


initChild().then(({ send, onMessage }) => {
  onMessage(({ pluggableName, cxt, args}) => {
    try {
      const fn = targets[pluggableName];
      fn.apply(cxt, args)
        .then(result => send({ result }))
        .catch(err => send({ err }));
    } catch (err) {
      send({ err });
    }
  });
});
