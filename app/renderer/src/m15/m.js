// m.js
import { Operation, f$3, y$6, p$5, d$3, h$5, c$4 } from "../vendor.js";
import {
  RAW_RETURN_SYMBOL,
  deepClone,
  get$1,
  getProxyDraft,
  getType,
  isBaseMapInstance,
  isBaseSetInstance,
  isDraft,
  isDraftable,
  isEqual,
  revokeProxy,
  set,
  shallowCopy,
  unescapePath,
} from "./deep-freeze.js";
import { forEach2 } from "./map-handler.js";
import { draftify, handleReturnValue } from "./proxy-handler.js";
function getCurrent(target) {
  var _a2;
  const proxyDraft = getProxyDraft(target);
  if (
    !isDraftable(target, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options)
  )
    return target;
  const type2 = getType(target);
  if (proxyDraft && !proxyDraft.operated) return proxyDraft.original;
  let currentValue;
  function ensureShallowCopy2() {
    currentValue =
      type2 === 2
        ? !isBaseMapInstance(target)
          ? new (Object.getPrototypeOf(target).constructor)(target)
          : new Map(target)
        : type2 === 3
          ? Array.from(proxyDraft.setMap.values())
          : shallowCopy(
              target,
              proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options,
            );
  }
  if (proxyDraft) {
    proxyDraft.finalized = true;
    try {
      ensureShallowCopy2();
    } finally {
      proxyDraft.finalized = false;
    }
  } else {
    currentValue = target;
  }
  forEach2(currentValue, (key2, value) => {
    if (proxyDraft && isEqual(get$1(proxyDraft.original, key2), value)) return;
    const newValue = getCurrent(value);
    if (newValue !== value) {
      if (currentValue === target) ensureShallowCopy2();
      set(currentValue, key2, newValue);
    }
  });
  if (type2 === 3) {
    const value =
      (_a2 = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !==
        null && _a2 !== void 0
        ? _a2
        : currentValue;
    return !isBaseSetInstance(value)
      ? new (Object.getPrototypeOf(value).constructor)(currentValue)
      : new Set(currentValue);
  }
  return currentValue;
}
function current(target) {
  if (!isDraft(target)) {
    throw new Error(`current() is only used for Draft, parameter: ${target}`);
  }
  return getCurrent(target);
}
const makeCreator = (arg) => {
  return function create2(arg0, arg1, arg2) {
    var _a2, _b, _c;
    if (typeof arg0 === "function" && typeof arg1 !== "function") {
      return function (base3, ...args) {
        return create2(base3, (draft2) => arg0.call(this, draft2, ...args), arg1);
      };
    }
    const base2 = arg0;
    const mutate = arg1;
    let options = arg2;
    if (typeof arg1 !== "function") {
      options = arg1;
    }
    if (options !== void 0 && Object.prototype.toString.call(options) !== "[object Object]") {
      throw new Error(`Invalid options: ${options}, 'options' should be an object.`);
    }
    options = Object.assign(Object.assign({}, arg), options);
    const state2 = isDraft(base2) ? current(base2) : base2;
    const mark2 = Array.isArray(options.mark)
      ? (value, types2) => {
          for (const mark3 of options.mark) {
            if (typeof mark3 !== "function") {
              throw new Error(`Invalid mark: ${mark3}, 'mark' should be a function.`);
            }
            const result2 = mark3(value, types2);
            if (result2) {
              return result2;
            }
          }
          return;
        }
      : options.mark;
    const enablePatches = (_a2 = options.enablePatches) !== null && _a2 !== void 0 ? _a2 : false;
    const strict = (_b = options.strict) !== null && _b !== void 0 ? _b : false;
    const enableAutoFreeze = (_c = options.enableAutoFreeze) !== null && _c !== void 0 ? _c : false;
    const _options = {
      enableAutoFreeze,
      mark: mark2,
      strict,
      enablePatches,
    };
    if (!isDraftable(state2, _options) && typeof state2 === "object" && state2 !== null) {
      throw new Error(
        `Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`,
      );
    }
    const [draft, finalize] = draftify(state2, _options);
    if (typeof arg1 !== "function") {
      if (!isDraftable(state2, _options)) {
        throw new Error(
          `Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`,
        );
      }
      return [draft, finalize];
    }
    let result;
    try {
      result = mutate(draft);
    } catch (error) {
      revokeProxy(getProxyDraft(draft));
      throw error;
    }
    const returnValue = (value) => {
      const proxyDraft = getProxyDraft(draft);
      if (!isDraft(value)) {
        if (
          value !== void 0 &&
          !isEqual(value, draft) &&
          (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated)
        ) {
          throw new Error(
            `Either the value is returned as a new non-draft value, or only the draft is modified without returning any value.`,
          );
        }
        const rawReturnValue =
          value === null || value === void 0 ? void 0 : value[RAW_RETURN_SYMBOL];
        if (rawReturnValue) {
          const _value = rawReturnValue[0];
          if (_options.strict && typeof value === "object" && value !== null) {
            handleReturnValue({
              rootDraft: proxyDraft,
              value,
              useRawReturn: true,
            });
          }
          return finalize([_value]);
        }
        if (value !== void 0) {
          if (typeof value === "object" && value !== null) {
            handleReturnValue({
              rootDraft: proxyDraft,
              value,
            });
          }
          return finalize([value]);
        }
      }
      if (value === draft || value === void 0) {
        return finalize([]);
      }
      const returnedProxyDraft = getProxyDraft(value);
      if (_options === returnedProxyDraft.options) {
        if (returnedProxyDraft.operated) {
          throw new Error(`Cannot return a modified child draft.`);
        }
        return finalize([current(value)]);
      }
      return finalize([value]);
    };
    if (result instanceof Promise) {
      return result.then(returnValue, (error) => {
        revokeProxy(getProxyDraft(draft));
        throw error;
      });
    }
    return returnValue(result);
  };
};
export const create$1 = makeCreator();
export function apply(state2, patches, applyOptions) {
  let i2;
  for (i2 = patches.length - 1; i2 >= 0; i2 -= 1) {
    const { value, op, path: path2 } = patches[i2];
    if ((!path2.length && op === Operation.Replace) || (path2 === "" && op === Operation.Add)) {
      state2 = value;
      break;
    }
  }
  if (i2 > -1) {
    patches = patches.slice(i2 + 1);
  }
  const mutate = (draft) => {
    patches.forEach((patch2) => {
      const { path: _path, op } = patch2;
      const path2 = unescapePath(_path);
      let base2 = draft;
      for (let index2 = 0; index2 < path2.length - 1; index2 += 1) {
        const parentType = getType(base2);
        let key3 = path2[index2];
        if (typeof key3 !== "string" && typeof key3 !== "number") {
          key3 = String(key3);
        }
        if (
          ((parentType === 0 || parentType === 1) &&
            (key3 === "__proto__" || key3 === "constructor")) ||
          (typeof base2 === "function" && key3 === "prototype")
        ) {
          throw new Error(
            `Patching reserved attributes like __proto__ and constructor is not allowed.`,
          );
        }
        base2 = get$1(parentType === 3 ? Array.from(base2) : base2, key3);
        if (typeof base2 !== "object") {
          throw new Error(`Cannot apply patch at '${path2.join("/")}'.`);
        }
      }
      const type2 = getType(base2);
      const value = deepClone(patch2.value);
      const key2 = path2[path2.length - 1];
      switch (op) {
        case Operation.Replace:
          switch (type2) {
            case 2:
              return base2.set(key2, value);
            case 3:
              throw new Error(`Cannot apply replace patch to set.`);
            default:
              return (base2[key2] = value);
          }
        case Operation.Add:
          switch (type2) {
            case 1:
              return key2 === "-" ? base2.push(value) : base2.splice(key2, 0, value);
            case 2:
              return base2.set(key2, value);
            case 3:
              return base2.add(value);
            default:
              return (base2[key2] = value);
          }
        case Operation.Remove:
          switch (type2) {
            case 1:
              return base2.splice(key2, 1);
            case 2:
              return base2.delete(key2);
            case 3:
              return base2.delete(patch2.value);
            default:
              return delete base2[key2];
          }
        default:
          throw new Error(`Unsupported patch operation: ${op}.`);
      }
    });
  };
  if (applyOptions === null || applyOptions === void 0 ? void 0 : applyOptions.mutable) {
    {
      if (Object.keys(applyOptions).filter((key2) => key2 !== "mutable").length) {
        console.warn('The "mutable" option is not allowed to be used with other options.');
      }
    }
    mutate(state2);
    return void 0;
  }
  if (isDraft(state2)) {
    if (applyOptions !== void 0) {
      throw new Error(`Cannot apply patches with options to a draft.`);
    }
    mutate(state2);
    return state2;
  }
  return create$1(
    state2,
    mutate,
    Object.assign(Object.assign({}, applyOptions), {
      enablePatches: false,
    }),
  );
}
export function rawReturn(value) {
  if (arguments.length === 0) {
    throw new Error("rawReturn() must be called with a value.");
  }
  if (arguments.length > 1) {
    throw new Error("rawReturn() must be called with one argument.");
  }
  if (value !== void 0 && (typeof value !== "object" || value === null)) {
    console.warn(
      "rawReturn() must be called with an object(including plain object, arrays, Set, Map, etc.) or `undefined`, other types do not need to be returned via rawReturn().",
    );
  }
  return {
    [RAW_RETURN_SYMBOL]: [value],
  };
}
export function i$2(t2, e2) {
  var s2 = {};
  for (var a2 in t2)
    Object.prototype.hasOwnProperty.call(t2, a2) && e2.indexOf(a2) < 0 && (s2[a2] = t2[a2]);
  if (null != t2 && "function" == typeof Object.getOwnPropertySymbols) {
    var i2 = 0;
    for (a2 = Object.getOwnPropertySymbols(t2); i2 < a2.length; i2++)
      e2.indexOf(a2[i2]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(t2, a2[i2]) &&
        (s2[a2[i2]] = t2[a2[i2]]);
  }
  return s2;
}
export let b$5 = class b extends Error {
  constructor(t2, e2, s2 = {}) {
    (super(e2),
      (this.name = "TravelsPersistenceError"),
      (this.code = t2),
      (this.cause = s2.cause),
      (this.entryIndex = s2.entryIndex),
      (this.direction = s2.direction));
  }
};
export const m$6 = (t2, e2) => {
  if (!f$3(e2, () => {})) return e2;
  throw new b$5(
    "migrate" === t2 ? "MIGRATION_FAILED" : "FALLBACK_FAILED",
    `Travels: persisted history ${t2} callback must return synchronously.`,
  );
};
const P$6 = (t2) => "object" == typeof t2 && null !== t2;
const w$5 = (t2) => null == t2 || (P$6(t2) && !Array.isArray(t2));
const A$4 = (t2, e2) => {
  const s2 = Object.getOwnPropertyDescriptor(t2, e2);
  return s2 && "value" in s2 ? s2 : void 0;
};
const O$5 = (t2) => {
  if (!P$6(t2) || Array.isArray(t2)) return null;
  const e2 = ((t3) => {
    const e3 = A$4(t3, "op"),
      s3 = A$4(t3, "path"),
      a3 = Object.getOwnPropertyDescriptor(t3, "value");
    if (!e3 || !s3 || (void 0 !== a3 && !("value" in a3))) return null;
    const i2 = {
      op: e3.value,
      path: s3.value,
    };
    return (a3 && "value" in a3 && (i2.value = a3.value), i2);
  })(t2);
  if (!e2) return null;
  const { op: s2, path: a2 } = e2;
  return "add" !== s2 && "remove" !== s2 && "replace" !== s2
    ? null
    : y$6(a2) &&
        (("add" !== s2 && "remove" !== s2) ||
          !((t3) => "" === t3 || (Array.isArray(t3) && 0 === t3.length))(a2)) &&
        (("add" !== s2 && "replace" !== s2) || "value" in e2)
      ? e2
      : null;
};
const E$6 = (t2) => {
  if (!p$5(t2)) return null;
  const e2 = new Array(t2.length);
  for (let s2 = 0; s2 < t2.length; s2 += 1) {
    const a2 = O$5(t2[s2]);
    if (!a2) return null;
    e2[s2] = a2;
  }
  return e2;
};
const C$9 = (t2) => {
  if (!p$5(t2)) return null;
  const e2 = new Array(t2.length);
  for (let s2 = 0; s2 < t2.length; s2 += 1) {
    const a2 = E$6(t2[s2]);
    if (!a2) return null;
    e2[s2] = a2;
  }
  return e2;
};
export const T$5 = (t2) => {
  if (!P$6(t2) || Array.isArray(t2))
    return {
      error: "entry must be an object with 'patches' and 'inversePatches' arrays",
    };
  const e2 = A$4(t2, "patches"),
    s2 = A$4(t2, "inversePatches"),
    a2 = E$6(null == e2 ? void 0 : e2.value),
    i2 = E$6(null == s2 ? void 0 : s2.value);
  return a2 && i2
    ? (0 === a2.length) != (0 === i2.length)
      ? {
          error: "entry.patches and entry.inversePatches must both be empty or both be non-empty",
        }
      : {
          error: null,
          entry: {
            patches: a2,
            inversePatches: i2,
          },
        }
    : {
        error: "entry must have 'patches' and 'inversePatches' arrays of JSON Patch operations",
      };
};
export const S$6 = (t2) => {
  if (!P$6(t2) || Array.isArray(t2))
    return {
      error: "patches must be an object with 'patches' and 'inversePatches' arrays",
    };
  const e2 = A$4(t2, "patches"),
    s2 = A$4(t2, "inversePatches"),
    a2 = C$9(null == e2 ? void 0 : e2.value),
    i2 = C$9(null == s2 ? void 0 : s2.value);
  if (!a2 || !i2)
    return {
      error: "patches must have 'patches' and 'inversePatches' arrays of JSON Patch operations",
    };
  const r2 = {
    patches: a2,
    inversePatches: i2,
  };
  if (d$3(r2))
    return {
      error: "patches must not contain Map or Set values",
    };
  if (a2.length !== i2.length)
    return {
      error: "patches.patches and patches.inversePatches must have the same length",
    };
  for (let t3 = 0; t3 < a2.length; t3 += 1) {
    if ((0 === a2[t3].length) != (0 === i2[t3].length))
      return {
        error: `patches entry ${t3} must have both forward and inverse operations`,
      };
    if (0 === a2[t3].length)
      return {
        error: `patches entry ${t3} must not be empty`,
      };
  }
  return {
    error: null,
    patches: r2,
  };
};
const M$6 = (t2, e2) => {
  if (!t2 || !("value" in t2))
    throw new b$5(
      "INVALID_SCHEMA",
      `Travels: persisted history '${e2}' must be an own data property.`,
    );
  return t2;
};
export const I$4 = (t2) => {
  if (!P$6(t2)) throw new b$5("INVALID_SCHEMA", "Travels: persisted history must be an object.");
  const e2 = Object.getOwnPropertyDescriptor(t2, "version"),
    s2 = Object.getOwnPropertyDescriptor(t2, "state"),
    a2 = Object.getOwnPropertyDescriptor(t2, "patches"),
    i2 = Object.getOwnPropertyDescriptor(t2, "position"),
    r2 = Object.getOwnPropertyDescriptor(t2, "metadata"),
    n2 = M$6(e2, "version").value;
  if (1 !== n2)
    throw new b$5(
      "UNSUPPORTED_VERSION",
      `Travels: unsupported persisted history version ${String(n2)}. Expected 1.`,
    );
  const o2 = M$6(s2, "state").value;
  if (d$3(o2))
    throw new b$5(
      "INVALID_SCHEMA",
      "Travels: persisted history state must not contain Map or Set values.",
    );
  const h2 = M$6(a2, "patches").value,
    c3 = S$6(h2);
  if (null !== c3.error) throw new b$5("INVALID_PATCHES", `Travels: ${c3.error}.`);
  const { patches: l2 } = c3,
    u4 = M$6(i2, "position").value;
  if (
    "number" != typeof u4 ||
    !Number.isFinite(u4) ||
    !Number.isInteger(u4) ||
    u4 < 0 ||
    u4 > l2.patches.length
  )
    throw new b$5(
      "INVALID_SCHEMA",
      `Travels: persisted history position ${String(u4)} is invalid for the patch history.`,
    );
  const v2 = r2 ? M$6(r2, "metadata").value : void 0;
  let y4;
  if (void 0 !== v2) {
    if (!p$5(v2))
      throw new b$5(
        "INVALID_SCHEMA",
        "Travels: persisted history 'metadata' must be a plain dense array when provided.",
      );
    const t3 = v2;
    y4 = new Array(t3.length);
    for (let e3 = 0; e3 < t3.length; e3 += 1) {
      const s3 = t3[e3];
      if (!w$5(s3))
        throw new b$5(
          "INVALID_SCHEMA",
          "Travels: persisted history 'metadata' entries must be objects, null, or undefined.",
        );
      y4[e3] = null == s3 ? void 0 : s3;
    }
  }
  if (void 0 !== y4 && y4.length !== l2.patches.length)
    throw new b$5(
      "INVALID_SCHEMA",
      "Travels: persisted history 'metadata' length must match patches length.",
    );
  return {
    version: 1,
    state: o2,
    patches: l2,
    position: u4,
    metadata: y4,
  };
};
export const D$6 = (t2, e2, s2 = new WeakMap(), a2 = new WeakSet()) => {
  if (
    null === t2 ||
    null === e2 ||
    ("object" != typeof t2 && "function" != typeof t2) ||
    ("object" != typeof e2 && "function" != typeof e2)
  )
    return Object.is(t2, e2);
  const i2 = t2,
    r2 = e2,
    n2 = s2.get(i2);
  if (n2) return n2 === r2;
  if (a2.has(r2)) return false;
  const o2 = Object.getPrototypeOf(i2);
  if (o2 !== Object.getPrototypeOf(r2) || Object.isExtensible(i2) !== Object.isExtensible(r2))
    return false;
  (s2.set(i2, r2), a2.add(r2));
  const l2 = Reflect.ownKeys(i2),
    p3 = Reflect.ownKeys(r2),
    u4 = l2.length;
  if (u4 !== p3.length) return false;
  const d2 = Array.isArray(t2),
    v2 = o2 === RegExp.prototype;
  if (d2) {
    if (l2.some((t3, e3) => t3 !== p3[e3])) return false;
  } else {
    const t3 = new Set(p3);
    if (l2.some((e3) => !t3.has(e3))) return false;
  }
  if (d2 !== Array.isArray(e2) || (d2 && o2 !== Array.prototype)) return false;
  if (o2 === Date.prototype) return !u4 && Object.is(t2.getTime(), e2.getTime());
  if (v2) {
    const s3 = t2,
      a3 = e2;
    if (
      1 !== u4 ||
      "lastIndex" !== l2[0] ||
      0 !== s3.lastIndex ||
      0 !== a3.lastIndex ||
      s3.source !== a3.source ||
      s3.flags !== a3.flags
    )
      return false;
  }
  return (
    !!(d2 || v2 || h$5(t2)) &&
    l2.every((e3) => {
      const n3 = Object.getOwnPropertyDescriptor(i2, e3),
        o3 = Object.getOwnPropertyDescriptor(r2, e3);
      return (
        !(!n3 || !o3) &&
        (d2
          ? "length" === e3 || (c$4(e3, t2.length) && n3.enumerable)
          : v2 || ("string" == typeof e3 && n3.enumerable)) &&
        "value" in n3 &&
        "value" in o3 &&
        n3.writable === o3.writable &&
        n3.enumerable === o3.enumerable &&
        n3.configurable === o3.configurable &&
        D$6(n3.value, o3.value, s2, a2)
      );
    })
  );
};
export const j$4 = (t2, e2, s2, a2) =>
  new b$5("INVALID_HISTORY", `Travels: entry ${t2} failed ${e2}: ${s2}`, {
    cause: a2,
    entryIndex: t2,
    direction: e2,
  });
