// find-last-index.js

// support-01.js
export function findLastIndex(arr, predicate) {
  for (let i2 = arr.length - 1; i2 >= 0; i2--) {
    if (predicate(arr[i2])) return i2;
  }
  return -1;
}
