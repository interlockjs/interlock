
export function toArray (strm) {
  return strm.reduce((arr, el) => {
    arr.push(el);
    return arr;
  }, []);
}

export function toHash (strm, key) {
  return strm.reduce((hash, el) => {
    hash[el[key]] = el;
    return hash;
  }, {});
}
