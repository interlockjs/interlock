import most from "most";

export function enumerate (strm) {
  const iterator = most.iterate(x => x + 1, 0);
  return strm.zip((el, idx) => [idx, el], iterator);
}

export function toArray (strm) {
  return strm.reduce((arr, el) => {
    arr.push(el);
    return arr;
  }, []);
}

export function toHash (strm, key, val) {
  const hasVal = !!val;
  return strm.reduce((hash, el) => {
    hash[el[key]] = hasVal ? el[val] : el;
    return hash;
  }, {});
}
