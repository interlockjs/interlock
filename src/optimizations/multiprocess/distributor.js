import os from "os";

import { getChild } from "bson-ipc";
import { chain, find } from "lodash";
import Promise from "bluebird";


const MAX_PROCESSES = os.cpus().length;


const getWorkers = (workersNum, workerPath) => {
  return Promise.all(chain(workersNum)
    .range()
    .map(() => getChild(workerPath))
    .value()
  )
    .then(workers => workers.map(({ send, onMessage, kill }) => {
      let resolveTransaction = null;

      const transaction = payload => {
        return new Promise(resolve => {
          resolveTransaction = resolve;
          send(payload);
        });
      };

      onMessage(response => {
        resolveTransaction && resolveTransaction(response);
        resolveTransaction = null;
      });

      return { kill, transaction };
    }));
};


export default opts => {
  const workersNum = opts.workers && opts.workers < MAX_PROCESSES ?
    opts.workers :
    MAX_PROCESSES;

  const workersP = getWorkers(workersNum, opts.workerPath);

  const runTask = (worker, payload) => {
    worker.busy = true;
    return worker.transaction(payload).then(response => {
      worker.busy = false;

      const { result, err } = response;
      if (err) { throw err; }
      setTimeout(nextInQueue, 0, worker); // eslint-disable-line no-use-before-define
      return result;
    });
  };

  const queue = [];
  const queueTask = payload => {
    let resolve;
    let reject;

    const p = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    queue.push({ resolve, reject, payload });

    return p;
  };

  const nextInQueue = worker => {
    const nextTask = queue.shift();
    if (!nextTask) { return; }
    const { resolve, reject, payload } = nextTask;

    runTask(worker, payload)
      .then(result => resolve(result))
      .catch(err => reject(err));
  };

  const task = payload => workersP.then(workers => {
    const availableWorker = find(workers, worker => !worker.busy);

    return availableWorker ?
      runTask(availableWorker, payload) :
      queueTask(payload);
  });

  const killAll = () => workersP.then(workers => {
    return Promise.all(workers.map(
      ({ kill }) => kill()
    ));
  });

  return { task, killAll };
};
