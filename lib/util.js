export function* entries (obj) {
  for (let key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}

export const stream = {
  toArray (strm) {
    return strm.reduce((arr, el) => {
      arr.push(el);
      return arr;
    }, []);
  },

  toHash (strm, key) {
    return strm.reduce((hash, el) => {
      hash[el[key]] = el;
      return hash;
    }, {});
  }
};
