export function* entries (obj) {
  for (let key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}
