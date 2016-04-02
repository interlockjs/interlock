import * as targets from "./targets";

Object.keys(targets).forEach(pluggableName => {
  module.exports[`${pluggableName}MP`] = function (msg, cb) {
    try {
      const fn = targets[pluggableName];
      const { cxt, args } = JSON.parse(msg);

      fn.apply(cxt, args)
        .then(result => cb(null, JSON.stringify(result)))
        .catch(err => cb(err));
    } catch (err) {
      return cb(err);
    }
  };
});
