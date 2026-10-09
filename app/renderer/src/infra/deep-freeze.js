// deep-freeze.js
import { deepClone, getProxyDraft } from "./shallow-copy.js";
import { getType } from "./get-type.js";

export function isDraft(target) {
  return !!getProxyDraft(target);
}

export function cloneIfNeeded(target) {
  return isDraft(target) ? deepClone(target) : target;
}

function throwFrozenError() {
  throw new Error("Cannot modify frozen object");
}

export function deepFreeze(target, subKey, updatedValues, stack, keys2) {
  {
    updatedValues =
      updatedValues !== null && updatedValues !== void 0
        ? updatedValues
        : new WeakMap();
    stack = stack !== null && stack !== void 0 ? stack : [];
    keys2 = keys2 !== null && keys2 !== void 0 ? keys2 : [];
    const value = updatedValues.has(target)
      ? updatedValues.get(target)
      : target;
    if (stack.length > 0) {
      const index2 = stack.indexOf(value);
      if (value && typeof value === "object" && index2 !== -1) {
        if (stack[0] === value) {
          throw new Error(`Forbids circular reference`);
        }
        throw new Error(
          `Forbids circular reference: ~/${keys2
            .slice(0, index2)
            .map((key2, index3) => {
              if (typeof key2 === "symbol") return `[${key2.toString()}]`;
              const parent = stack[index3];
              if (
                typeof key2 === "object" &&
                (parent instanceof Map || parent instanceof Set)
              )
                return Array.from(parent.keys()).indexOf(key2);
              return key2;
            })
            .join("/")}`,
        );
      }
      stack.push(value);
      keys2.push(subKey);
    } else {
      stack.push(value);
    }
  }
  if (Object.isFrozen(target) || isDraft(target)) {
    {
      stack.pop();
      keys2.pop();
    }
    return;
  }
  const type2 = getType(target);
  switch (type2) {
    case 2:
      for (const [key2, value] of target) {
        deepFreeze(key2, key2, updatedValues, stack, keys2);
        deepFreeze(value, key2, updatedValues, stack, keys2);
      }
      target.set = target.clear = target.delete = throwFrozenError;
      break;
    case 3:
      for (const value of target) {
        deepFreeze(value, value, updatedValues, stack, keys2);
      }
      target.add = target.clear = target.delete = throwFrozenError;
      break;
    case 1:
      Object.freeze(target);
      let index2 = 0;
      for (const value of target) {
        deepFreeze(value, index2, updatedValues, stack, keys2);
        index2 += 1;
      }
      break;
    default:
      Object.freeze(target);
      Object.keys(target).forEach((name2) => {
        const value = target[name2];
        deepFreeze(value, name2, updatedValues, stack, keys2);
      });
  }
  {
    stack.pop();
    keys2.pop();
  }
}
