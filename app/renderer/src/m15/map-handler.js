// map-handler.js
import { Operation } from "../vendor.js";
import {
  cloneIfNeeded,
  dataTypes,
  ensureShallowCopy,
  escapePath,
  get$1,
  getPath$1,
  getProxyDraft,
  getType,
  getValue,
  has,
  internal,
  isDraft,
  isDraftable,
  isEqual,
  iteratorSymbol,
  latest,
  markChanged,
  set,
} from "./deep-freeze.js";
export function forEach2(target, iter) {
  const type2 = getType(target);
  if (type2 === 0) {
    Reflect.ownKeys(target).forEach((key2) => {
      iter(key2, target[key2], target);
    });
  } else if (type2 === 1) {
    let index2 = 0;
    for (const entry of target) {
      iter(index2, entry, target);
      index2 += 1;
    }
  } else {
    target.forEach((entry, index2) => iter(index2, entry, target));
  }
}
function handleValue(target, handledSet, options) {
  if (
    isDraft(target) ||
    !isDraftable(target, options) ||
    handledSet.has(target) ||
    Object.isFrozen(target)
  )
    return;
  const isSet = target instanceof Set;
  const setMap = isSet ? new Map() : void 0;
  handledSet.add(target);
  forEach2(target, (key2, value) => {
    var _a2;
    if (isDraft(value)) {
      const proxyDraft = getProxyDraft(value);
      ensureShallowCopy(proxyDraft);
      const updatedValue =
        ((_a2 = proxyDraft.assignedMap) === null || _a2 === void 0 ? void 0 : _a2.size) ||
        proxyDraft.operated
          ? proxyDraft.copy
          : proxyDraft.original;
      set(isSet ? setMap : target, key2, updatedValue);
    } else {
      handleValue(value, handledSet, options);
    }
  });
  if (setMap) {
    const set2 = target;
    const values3 = Array.from(set2);
    set2.clear();
    values3.forEach((value) => {
      set2.add(setMap.has(value) ? setMap.get(value) : value);
    });
  }
}
function finalizeAssigned(proxyDraft, key2) {
  const copy2 = proxyDraft.type === 3 ? proxyDraft.setMap : proxyDraft.copy;
  if (proxyDraft.finalities.revoke.length > 1 && proxyDraft.assignedMap.get(key2) && copy2) {
    handleValue(get$1(copy2, key2), proxyDraft.finalities.handledSet, proxyDraft.options);
  }
}
export function finalizeSetValue(target) {
  if (target.type === 3 && target.copy) {
    target.copy.clear();
    target.setMap.forEach((value) => {
      target.copy.add(getValue(value));
    });
  }
}
export function finalizePatches(target, generatePatches2, patches, inversePatches) {
  const shouldFinalize =
    target.operated && target.assignedMap && target.assignedMap.size > 0 && !target.finalized;
  if (shouldFinalize) {
    if (patches && inversePatches) {
      const basePath = getPath$1(target);
      if (basePath) {
        generatePatches2(target, basePath, patches, inversePatches);
      }
    }
    target.finalized = true;
  }
}
export function markFinalization(target, key2, value, generatePatches2) {
  const proxyDraft = getProxyDraft(value);
  if (proxyDraft) {
    if (!proxyDraft.callbacks) {
      proxyDraft.callbacks = [];
    }
    proxyDraft.callbacks.push((patches, inversePatches) => {
      var _a2;
      const copy2 = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get$1(copy2, key2), value)) {
        let updatedValue = proxyDraft.original;
        if (proxyDraft.copy) {
          updatedValue = proxyDraft.copy;
        }
        finalizeSetValue(target);
        finalizePatches(target, generatePatches2, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues =
            (_a2 = target.options.updatedValues) !== null && _a2 !== void 0 ? _a2 : new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft.original);
        }
        set(copy2, key2, updatedValue);
      }
    });
    if (target.options.enableAutoFreeze) {
      if (proxyDraft.finalities !== target.finalities) {
        target.options.enableAutoFreeze = false;
      }
    }
  }
  if (isDraftable(value, target.options)) {
    target.finalities.draft.push(() => {
      const copy2 = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get$1(copy2, key2), value)) {
        finalizeAssigned(target, key2);
      }
    });
  }
}
function generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray) {
  let { original, assignedMap, options } = proxyState;
  let copy2 = proxyState.copy;
  if (copy2.length < original.length) {
    [original, copy2] = [copy2, original];
    [patches, inversePatches] = [inversePatches, patches];
  }
  for (let index2 = 0; index2 < original.length; index2 += 1) {
    if (assignedMap.get(index2.toString()) && copy2[index2] !== original[index2]) {
      const _path = basePath.concat([index2]);
      const path2 = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Replace,
        path: path2,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(copy2[index2]),
      });
      inversePatches.push({
        op: Operation.Replace,
        path: path2,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(original[index2]),
      });
    }
  }
  for (let index2 = original.length; index2 < copy2.length; index2 += 1) {
    const _path = basePath.concat([index2]);
    const path2 = escapePath(_path, pathAsArray);
    patches.push({
      op: Operation.Add,
      path: path2,
      // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
      value: cloneIfNeeded(copy2[index2]),
    });
  }
  if (original.length < copy2.length) {
    const { arrayLengthAssignment = true } = options.enablePatches;
    if (arrayLengthAssignment) {
      const _path = basePath.concat(["length"]);
      const path2 = escapePath(_path, pathAsArray);
      inversePatches.push({
        op: Operation.Replace,
        path: path2,
        value: original.length,
      });
    } else {
      for (let index2 = copy2.length; original.length < index2; index2 -= 1) {
        const _path = basePath.concat([index2 - 1]);
        const path2 = escapePath(_path, pathAsArray);
        inversePatches.push({
          op: Operation.Remove,
          path: path2,
        });
      }
    }
  }
}
function generatePatchesFromAssigned(
  { original, copy: copy2, assignedMap },
  basePath,
  patches,
  inversePatches,
  pathAsArray,
) {
  assignedMap.forEach((assignedValue, key2) => {
    const originalValue = get$1(original, key2);
    const value = cloneIfNeeded(get$1(copy2, key2));
    const op = !assignedValue
      ? Operation.Remove
      : has(original, key2)
        ? Operation.Replace
        : Operation.Add;
    if (isEqual(originalValue, value) && op === Operation.Replace) return;
    const _path = basePath.concat(key2);
    const path2 = escapePath(_path, pathAsArray);
    patches.push(
      op === Operation.Remove
        ? {
            op,
            path: path2,
          }
        : {
            op,
            path: path2,
            value,
          },
    );
    inversePatches.push(
      op === Operation.Add
        ? {
            op: Operation.Remove,
            path: path2,
          }
        : op === Operation.Remove
          ? {
              op: Operation.Add,
              path: path2,
              value: originalValue,
            }
          : {
              op: Operation.Replace,
              path: path2,
              value: originalValue,
            },
    );
  });
}
function generateSetPatches(
  { original, copy: copy2 },
  basePath,
  patches,
  inversePatches,
  pathAsArray,
) {
  let index2 = 0;
  original.forEach((value) => {
    if (!copy2.has(value)) {
      const _path = basePath.concat([index2]);
      const path2 = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Remove,
        path: path2,
        value,
      });
      inversePatches.unshift({
        op: Operation.Add,
        path: path2,
        value,
      });
    }
    index2 += 1;
  });
  index2 = 0;
  copy2.forEach((value) => {
    if (!original.has(value)) {
      const _path = basePath.concat([index2]);
      const path2 = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Add,
        path: path2,
        value,
      });
      inversePatches.unshift({
        op: Operation.Remove,
        path: path2,
        value,
      });
    }
    index2 += 1;
  });
}
export function generatePatches(proxyState, basePath, patches, inversePatches) {
  const { pathAsArray = true } = proxyState.options.enablePatches;
  switch (proxyState.type) {
    case 0:
    case 2:
      return generatePatchesFromAssigned(
        proxyState,
        basePath,
        patches,
        inversePatches,
        pathAsArray,
      );
    case 1:
      return generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
    case 3:
      return generateSetPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
  }
}
export const checkReadable = (value, options, ignoreCheckDraftable = false) => {
  if (
    typeof value === "object" &&
    value !== null &&
    (!isDraftable(value, options) || ignoreCheckDraftable) &&
    true
  ) {
    throw new Error(
      `Strict mode: Mutable data cannot be accessed directly, please use 'unsafe(callback)' wrap.`,
    );
  }
};
export const mapHandler = {
  get size() {
    const current2 = latest(getProxyDraft(this));
    return current2.size;
  },
  has(key2) {
    return latest(getProxyDraft(this)).has(key2);
  },
  set(key2, value) {
    const target = getProxyDraft(this);
    const source = latest(target);
    if (!source.has(key2) || !isEqual(source.get(key2), value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key2, true);
      target.copy.set(key2, value);
      markFinalization(target, key2, value, generatePatches);
    }
    return this;
  },
  delete(key2) {
    if (!this.has(key2)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    if (target.original.has(key2)) {
      target.assignedMap.set(key2, false);
    } else {
      target.assignedMap.delete(key2);
    }
    target.copy.delete(key2);
    return true;
  },
  clear() {
    const target = getProxyDraft(this);
    if (!this.size) return;
    ensureShallowCopy(target);
    markChanged(target);
    target.assignedMap = new Map();
    for (const [key2] of target.original) {
      target.assignedMap.set(key2, false);
    }
    target.copy.clear();
  },
  forEach(callback, thisArg) {
    const target = getProxyDraft(this);
    latest(target).forEach((_value, _key) => {
      callback.call(thisArg, this.get(_key), _key, this);
    });
  },
  get(key2) {
    var _a2, _b;
    const target = getProxyDraft(this);
    const value = latest(target).get(key2);
    const mutable =
      ((_b = (_a2 = target.options).mark) === null || _b === void 0
        ? void 0
        : _b.call(_a2, value, dataTypes)) === dataTypes.mutable;
    if (target.options.strict) {
      checkReadable(value, target.options, mutable);
    }
    if (mutable) {
      return value;
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value !== target.original.get(key2)) {
      return value;
    }
    const draft = internal.createDraft({
      original: value,
      parentDraft: target,
      key: key2,
      finalities: target.finalities,
      options: target.options,
    });
    ensureShallowCopy(target);
    target.copy.set(key2, draft);
    return draft;
  },
  keys() {
    return latest(getProxyDraft(this)).keys();
  },
  values() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.values(),
      next: () => {
        const result = iterator.next();
        if (result.done) return result;
        const value = this.get(result.value);
        return {
          done: false,
          value,
        };
      },
    };
  },
  entries() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.entries(),
      next: () => {
        const result = iterator.next();
        if (result.done) return result;
        const value = this.get(result.value);
        return {
          done: false,
          value: [result.value, value],
        };
      },
    };
  },
  [iteratorSymbol]() {
    return this.entries();
  },
};
export const mapHandlerKeys = Reflect.ownKeys(mapHandler);
export const getNextIterator =
  (target, iterator, { isValuesIterator }) =>
  () => {
    var _a2, _b;
    const result = iterator.next();
    if (result.done) return result;
    const key2 = result.value;
    let value = target.setMap.get(key2);
    const currentDraft = getProxyDraft(value);
    const mutable =
      ((_b = (_a2 = target.options).mark) === null || _b === void 0
        ? void 0
        : _b.call(_a2, value, dataTypes)) === dataTypes.mutable;
    if (target.options.strict) {
      checkReadable(key2, target.options, mutable);
    }
    if (
      !mutable &&
      !currentDraft &&
      isDraftable(key2, target.options) &&
      !target.finalized &&
      target.original.has(key2)
    ) {
      const proxy = internal.createDraft({
        original: key2,
        parentDraft: target,
        key: key2,
        finalities: target.finalities,
        options: target.options,
      });
      target.setMap.set(key2, proxy);
      value = proxy;
    } else if (currentDraft) {
      value = currentDraft.proxy;
    }
    return {
      done: false,
      value: isValuesIterator ? value : [value, value],
    };
  };
