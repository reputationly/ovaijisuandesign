// proxy-handler.js
import { Operation } from "../../vendor.js";
import {
  PROXY_DRAFT,
  dataTypes,
  deepFreeze,
  ensureShallowCopy,
  get$1,
  getDescriptor,
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
  peek,
  revokeProxy,
  set,
} from "../../infra/deep-freeze.js";
import {
  checkReadable,
  finalizePatches,
  finalizeSetValue,
  forEach2,
  generatePatches,
  getNextIterator,
  mapHandler,
  mapHandlerKeys,
  markFinalization,
} from "./map-handler.js";
const setHandler = {
  get size() {
    const target = getProxyDraft(this);
    return target.setMap.size;
  },
  has(value) {
    const target = getProxyDraft(this);
    if (target.setMap.has(value)) return true;
    ensureShallowCopy(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original)) return true;
    return false;
  },
  add(value) {
    const target = getProxyDraft(this);
    if (!this.has(value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(value, true);
      target.setMap.set(value, value);
      markFinalization(target, value, value, generatePatches);
    }
    return this;
  },
  delete(value) {
    if (!this.has(value)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original)) {
      target.assignedMap.set(valueProxyDraft.original, false);
      return target.setMap.delete(valueProxyDraft.original);
    }
    if (!valueProxyDraft && target.setMap.has(value)) {
      target.assignedMap.set(value, false);
    } else {
      target.assignedMap.delete(value);
    }
    return target.setMap.delete(value);
  },
  clear() {
    if (!this.size) return;
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    for (const value of target.original) {
      target.assignedMap.set(value, false);
    }
    target.setMap.clear();
  },
  values() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.values(),
      next: getNextIterator(target, iterator, {
        isValuesIterator: true,
      }),
    };
  },
  entries() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.entries(),
      next: getNextIterator(target, iterator, {
        isValuesIterator: false,
      }),
    };
  },
  keys() {
    return this.values();
  },
  [iteratorSymbol]() {
    return this.values();
  },
  forEach(callback, thisArg) {
    const iterator = this.values();
    let result = iterator.next();
    while (!result.done) {
      callback.call(thisArg, result.value, result.value, this);
      result = iterator.next();
    }
  },
};
if (Set.prototype.difference) {
  Object.assign(setHandler, {
    intersection(other) {
      return Set.prototype.intersection.call(new Set(this.values()), other);
    },
    union(other) {
      return Set.prototype.union.call(new Set(this.values()), other);
    },
    difference(other) {
      return Set.prototype.difference.call(new Set(this.values()), other);
    },
    symmetricDifference(other) {
      return Set.prototype.symmetricDifference.call(new Set(this.values()), other);
    },
    isSubsetOf(other) {
      return Set.prototype.isSubsetOf.call(new Set(this.values()), other);
    },
    isSupersetOf(other) {
      return Set.prototype.isSupersetOf.call(new Set(this.values()), other);
    },
    isDisjointFrom(other) {
      return Set.prototype.isDisjointFrom.call(new Set(this.values()), other);
    },
  });
}
const setHandlerKeys = Reflect.ownKeys(setHandler);
const proxyHandler = {
  get(target, key2, receiver) {
    var _a2, _b;
    const copy2 = (_a2 = target.copy) === null || _a2 === void 0 ? void 0 : _a2[key2];
    if (copy2 && target.finalities.draftsCache.has(copy2)) {
      return copy2;
    }
    if (key2 === PROXY_DRAFT) return target;
    let markResult;
    if (target.options.mark) {
      const value2 =
        key2 === "size" && (target.original instanceof Map || target.original instanceof Set)
          ? Reflect.get(target.original, key2)
          : Reflect.get(target.original, key2, receiver);
      markResult = target.options.mark(value2, dataTypes);
      if (markResult === dataTypes.mutable) {
        if (target.options.strict) {
          checkReadable(value2, target.options, true);
        }
        return value2;
      }
    }
    const source = latest(target);
    if (source instanceof Map && mapHandlerKeys.includes(key2)) {
      if (key2 === "size") {
        return Object.getOwnPropertyDescriptor(mapHandler, "size").get.call(target.proxy);
      }
      const handle2 = mapHandler[key2];
      return handle2.bind(target.proxy);
    }
    if (source instanceof Set && setHandlerKeys.includes(key2)) {
      if (key2 === "size") {
        return Object.getOwnPropertyDescriptor(setHandler, "size").get.call(target.proxy);
      }
      const handle2 = setHandler[key2];
      return handle2.bind(target.proxy);
    }
    if (!has(source, key2)) {
      const desc2 = getDescriptor(source, key2);
      return desc2
        ? `value` in desc2
          ? desc2.value
          : // !case: support for getter
            (_b = desc2.get) === null || _b === void 0
            ? void 0
            : _b.call(target.proxy)
        : void 0;
    }
    const value = source[key2];
    if (target.options.strict) {
      checkReadable(value, target.options);
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value === peek(target.original, key2)) {
      ensureShallowCopy(target);
      target.copy[key2] = createDraft({
        original: target.original[key2],
        parentDraft: target,
        key: target.type === 1 ? Number(key2) : key2,
        finalities: target.finalities,
        options: target.options,
      });
      if (typeof markResult === "function") {
        const subProxyDraft = getProxyDraft(target.copy[key2]);
        ensureShallowCopy(subProxyDraft);
        markChanged(subProxyDraft);
        return subProxyDraft.copy;
      }
      return target.copy[key2];
    }
    if (isDraft(value)) {
      target.finalities.draftsCache.add(value);
    }
    return value;
  },
  set(target, key2, value) {
    var _a2;
    if (target.type === 3 || target.type === 2) {
      throw new Error(`Map/Set draft does not support any property assignment.`);
    }
    let _key;
    if (
      target.type === 1 &&
      key2 !== "length" &&
      !(
        Number.isInteger((_key = Number(key2))) &&
        _key >= 0 &&
        (key2 === 0 || _key === 0 || String(_key) === String(key2))
      )
    ) {
      throw new Error(`Only supports setting array indices and the 'length' property.`);
    }
    const desc2 = getDescriptor(latest(target), key2);
    if (desc2 === null || desc2 === void 0 ? void 0 : desc2.set) {
      desc2.set.call(target.proxy, value);
      return true;
    }
    const current2 = peek(latest(target), key2);
    const currentProxyDraft = getProxyDraft(current2);
    if (currentProxyDraft && isEqual(currentProxyDraft.original, value)) {
      target.copy[key2] = value;
      target.assignedMap = (_a2 = target.assignedMap) !== null && _a2 !== void 0 ? _a2 : new Map();
      target.assignedMap.set(key2, false);
      return true;
    }
    if (isEqual(value, current2) && (value !== void 0 || has(target.original, key2))) return true;
    ensureShallowCopy(target);
    markChanged(target);
    if (has(target.original, key2) && isEqual(value, target.original[key2])) {
      target.assignedMap.delete(key2);
    } else {
      target.assignedMap.set(key2, true);
    }
    target.copy[key2] = value;
    markFinalization(target, key2, value, generatePatches);
    return true;
  },
  has(target, key2) {
    return key2 in latest(target);
  },
  ownKeys(target) {
    return Reflect.ownKeys(latest(target));
  },
  getOwnPropertyDescriptor(target, key2) {
    const source = latest(target);
    const descriptor = Reflect.getOwnPropertyDescriptor(source, key2);
    if (!descriptor) return descriptor;
    return {
      writable: true,
      configurable: target.type !== 1 || key2 !== "length",
      enumerable: descriptor.enumerable,
      value: source[key2],
    };
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target.original);
  },
  setPrototypeOf() {
    throw new Error(`Cannot call 'setPrototypeOf()' on drafts`);
  },
  defineProperty() {
    throw new Error(`Cannot call 'defineProperty()' on drafts`);
  },
  deleteProperty(target, key2) {
    var _a2;
    if (target.type === 1) {
      return proxyHandler.set.call(this, target, key2, void 0, target.proxy);
    }
    if (peek(target.original, key2) !== void 0 || key2 in target.original) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key2, false);
    } else {
      target.assignedMap = (_a2 = target.assignedMap) !== null && _a2 !== void 0 ? _a2 : new Map();
      target.assignedMap.delete(key2);
    }
    if (target.copy) delete target.copy[key2];
    return true;
  },
};
function createDraft(createDraftOptions) {
  const { original, parentDraft, key: key2, finalities, options } = createDraftOptions;
  const type2 = getType(original);
  const proxyDraft = {
    type: type2,
    finalized: false,
    parent: parentDraft,
    original,
    copy: null,
    proxy: null,
    finalities,
    options,
    // Mapping of draft Set items to their corresponding draft values.
    setMap: type2 === 3 ? new Map(original.entries()) : void 0,
  };
  if (key2 || "key" in createDraftOptions) {
    proxyDraft.key = key2;
  }
  const { proxy, revoke } = Proxy.revocable(
    type2 === 1 ? Object.assign([], proxyDraft) : proxyDraft,
    proxyHandler,
  );
  finalities.revoke.push(revoke);
  proxyDraft.proxy = proxy;
  if (parentDraft) {
    const target = parentDraft;
    target.finalities.draft.push((patches, inversePatches) => {
      var _a2, _b;
      const oldProxyDraft = getProxyDraft(proxy);
      let copy2 = target.type === 3 ? target.setMap : target.copy;
      const draft = get$1(copy2, key2);
      const proxyDraft2 = getProxyDraft(draft);
      if (proxyDraft2) {
        let updatedValue = proxyDraft2.original;
        if (proxyDraft2.operated) {
          updatedValue = getValue(draft);
        }
        finalizeSetValue(proxyDraft2);
        finalizePatches(proxyDraft2, generatePatches, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues =
            (_a2 = target.options.updatedValues) !== null && _a2 !== void 0 ? _a2 : new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft2.original);
        }
        set(copy2, key2, updatedValue);
      }
      (_b = oldProxyDraft.callbacks) === null || _b === void 0
        ? void 0
        : _b.forEach((callback) => {
            callback(patches, inversePatches);
          });
    });
  } else {
    const target = getProxyDraft(proxy);
    target.finalities.draft.push((patches, inversePatches) => {
      finalizeSetValue(target);
      finalizePatches(target, generatePatches, patches, inversePatches);
    });
  }
  return proxy;
}
internal.createDraft = createDraft;
function finalizeDraft(result, returnedValue, patches, inversePatches, enableAutoFreeze) {
  var _a2;
  const proxyDraft = getProxyDraft(result);
  const original =
    (_a2 = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== null &&
    _a2 !== void 0
      ? _a2
      : result;
  const hasReturnedValue = !!returnedValue.length;
  if (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated) {
    while (proxyDraft.finalities.draft.length > 0) {
      const finalize = proxyDraft.finalities.draft.pop();
      finalize(patches, inversePatches);
    }
  }
  const state2 = hasReturnedValue
    ? returnedValue[0]
    : proxyDraft
      ? proxyDraft.operated
        ? proxyDraft.copy
        : proxyDraft.original
      : result;
  if (proxyDraft) revokeProxy(proxyDraft);
  if (enableAutoFreeze) {
    deepFreeze(
      state2,
      state2,
      proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options.updatedValues,
    );
  }
  return [
    state2,
    patches && hasReturnedValue
      ? [
          {
            op: Operation.Replace,
            path: [],
            value: returnedValue[0],
          },
        ]
      : patches,
    inversePatches && hasReturnedValue
      ? [
          {
            op: Operation.Replace,
            path: [],
            value: original,
          },
        ]
      : inversePatches,
  ];
}
export function draftify(baseState, options) {
  var _a2;
  const finalities = {
    draft: [],
    revoke: [],
    handledSet: new WeakSet(),
    draftsCache: new WeakSet(),
  };
  let patches;
  let inversePatches;
  if (options.enablePatches) {
    patches = [];
    inversePatches = [];
  }
  const isMutable =
    ((_a2 = options.mark) === null || _a2 === void 0
      ? void 0
      : _a2.call(options, baseState, dataTypes)) === dataTypes.mutable ||
    !isDraftable(baseState, options);
  const draft = isMutable
    ? baseState
    : createDraft({
        original: baseState,
        parentDraft: null,
        finalities,
        options,
      });
  return [
    draft,
    (returnedValue = []) => {
      const [finalizedState, finalizedPatches, finalizedInversePatches] = finalizeDraft(
        draft,
        returnedValue,
        patches,
        inversePatches,
        options.enableAutoFreeze,
      );
      return options.enablePatches
        ? [finalizedState, finalizedPatches, finalizedInversePatches]
        : finalizedState;
    },
  ];
}
export function handleReturnValue(options) {
  const { rootDraft, value, useRawReturn = false, isRoot = true } = options;
  forEach2(value, (key2, item, source) => {
    const proxyDraft = getProxyDraft(item);
    if (proxyDraft && rootDraft && proxyDraft.finalities === rootDraft.finalities) {
      options.isContainDraft = true;
      const currentValue = proxyDraft.original;
      if (source instanceof Set) {
        const arr = Array.from(source);
        source.clear();
        arr.forEach((_item) => source.add(key2 === _item ? currentValue : _item));
      } else {
        set(source, key2, currentValue);
      }
    } else if (typeof item === "object" && item !== null) {
      options.value = item;
      options.isRoot = false;
      handleReturnValue(options);
    }
  });
  if (isRoot) {
    if (!options.isContainDraft)
      console.warn(
        `The return value does not contain any draft, please use 'rawReturn()' to wrap the return value to improve performance.`,
      );
    if (useRawReturn) {
      console.warn(
        `The return value contains drafts, please don't use 'rawReturn()' to wrap the return value.`,
      );
    }
  }
}
