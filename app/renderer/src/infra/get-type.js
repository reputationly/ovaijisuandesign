// get-type.js

export function getType(target) {
  if (Array.isArray(target)) return 1;
  if (target instanceof Map) return 2;
  if (target instanceof Set) return 3;
  return 0;
}
