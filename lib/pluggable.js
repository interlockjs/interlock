// TODO: make DRY

import * as most from "most";


export const CONTINUE = Symbol.for("interlock.continue");


function getContext (baseCxt, dependencies) {
  const context = Object.create(null);
  Object.assign(context, baseCxt);
  for (let depKey of Object.keys(dependencies)) {
    let dep = dependencies[depKey];
    context[depKey] = dep.__isPluggable__ ? dep.bind(baseCxt) : dep;
  }
  return context;
}

function getExtensionChains (extensions, fnName) {
  extensions = extensions || { override: {}, transform: {} };
  const overrideChain = extensions.override[fnName] || [];
  const transformChain = extensions.transform[fnName] || [];
  return [overrideChain, transformChain];
}


export function sync (fn, dependencies = {}) {
  function pluggableFn () {
    const context = getContext(this, dependencies);
    const [overrideChain, transformChain] = getExtensionChains(this.__extensions__, fn.name);

    let chainedResult = CONTINUE;

    // Apply overrides, followed by default function.
    for (let fnCandidate of overrideChain.concat(fn)) {
      chainedResult = chainedResult === CONTINUE ?
        fnCandidate.apply(context, arguments) :
        chainedResult;
    }
    chainedResult = chainedResult === CONTINUE ? null : chainedResult;

    // Apply transforms.
    for (let transform of transformChain) {
      chainedResult = transform(chainedResult);
    }

    return chainedResult;
  }

  pluggableFn.__isPluggable__ = true;
  return pluggableFn;
}

export function promise (fn, dependencies = {}) {
  function pluggableFn () {
    const context = getContext(this, dependencies);
    const [overrideChain, transformChain] = getExtensionChains(this.__extensions__, fn.name);

    let chainedResult = Promise.resolve(CONTINUE);

    // Apply overrides, followed by default function.
    for (let fnCandidate of overrideChain.concat(fn)) {
      chainedResult = chainedResult.then(previousResult => {
        return previousResult === CONTINUE ?
          Promise.resolve(fnCandidate.apply(context, arguments)) :
          previousResult;
      }
      );
    }

    // Apply transforms.
    for (let transform of transformChain) {
      chainedResult = chainedResult.then(previousResult =>
        Promise.resolve(transform.call(context, previousResult)));
    }

    return chainedResult;
  }

  pluggableFn.__isPluggable__ = true;
  return pluggableFn;
}

export function stream (fn, dependencies = {}) {
  function pluggableFn () {
    const context = getContext(this, dependencies);
    const [overrideChain, transformChain] = getExtensionChains(this.__extensions__, fn.name);


    let chainedResult = Promise.resolve(CONTINUE);

    // Apply overrides, followed by default function.
    for (let fnCandidate of overrideChain.concat(fn)) {
      chainedResult = chainedResult === CONTINUE ?
        fnCandidate.apply(context, arguments) :
        chainedResult;
    }

    if (chainedResult === CONTINUE) {
      return most.from([]);
    }

    // Apply transforms.
    for (let transform of transformChain) {
      chainedResult = chainedResult.map(transform.bind(context));
    }

    return chainedResult;
  }

  pluggableFn.__isPluggable__ = true;
  return pluggableFn;
}
