// deep-freeze.js
import { reactExports, create$2, Slash, Pencil, Tag$1 } from "../vendor.js";
import { placeholderNodeSize } from "./group-nodes-in-canvas.js";
import {
  ArrowFilledIcon,
  Circle,
  MosaicIcon,
  MousePointer2,
  Square,
  Type$1,
} from "./parse-item.jsx";
export const TOOLS$1 = [
  {
    id: "select",
    i18nKey: "imageEdit.toolSelect",
    defaultLabel: "Select",
    Icon: MousePointer2,
  },
  {
    id: "rectangle",
    i18nKey: "imageEdit.toolRectangle",
    defaultLabel: "Rectangle",
    Icon: Square,
  },
  {
    id: "ellipse",
    i18nKey: "imageEdit.toolEllipse",
    defaultLabel: "Ellipse",
    Icon: Circle,
  },
  {
    id: "arrow",
    i18nKey: "imageEdit.toolArrow",
    defaultLabel: "Arrow",
    Icon: ArrowFilledIcon,
  },
  {
    id: "line",
    i18nKey: "imageEdit.toolLine",
    defaultLabel: "Line",
    Icon: Slash,
  },
  {
    id: "brush",
    i18nKey: "imageEdit.toolBrush",
    defaultLabel: "Brush",
    Icon: Pencil,
  },
  {
    id: "text",
    i18nKey: "imageEdit.toolText",
    defaultLabel: "Text",
    Icon: Type$1,
  },
  {
    id: "tag",
    i18nKey: "imageEdit.toolTag",
    defaultLabel: "Tag",
    Icon: Tag$1,
  },
  {
    id: "mosaic",
    i18nKey: "imageEdit.toolMosaic",
    defaultLabel: "Mosaic",
    Icon: MosaicIcon,
  },
];
function isUsableDisplaySize(value) {
  if (!value || typeof value !== "object") return false;
  const size2 = value;
  return (
    typeof size2.width === "number" &&
    Number.isFinite(size2.width) &&
    size2.width > 0 &&
    typeof size2.height === "number" &&
    Number.isFinite(size2.height) &&
    size2.height > 0
  );
}
export function resolvePlaceholderCardSize(status, aspectRatio, mediaType, placeholderDisplaySize) {
  if (isUsableDisplaySize(placeholderDisplaySize)) {
    return placeholderDisplaySize;
  }
  return placeholderNodeSize(status, aspectRatio, mediaType);
}
const STORAGE_KEY$8 = "hilo:canvas:video-muted";
const DEFAULT_MUTED = true;
function readPersisted$2() {
  if (typeof window === "undefined") return DEFAULT_MUTED;
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY$8);
    if (v2 === "0") return false;
    if (v2 === "1") return true;
  } catch {}
  return DEFAULT_MUTED;
}
export const useVideoMutedStore = create$2((set2, get3) => ({
  muted: readPersisted$2(),
  setMuted: (muted) => {
    if (get3().muted === muted) return;
    set2({
      muted,
    });
    try {
      window.localStorage.setItem(STORAGE_KEY$8, muted ? "1" : "0");
    } catch {}
  },
  toggleMuted: () => get3().setMuted(!get3().muted),
}));
export const equals = (row, columnId, filterValue) => {
  return row.getValue(columnId) === filterValue;
};
equals.autoRemove = (val) => testFalsey(val);
export function testFalsey(val) {
  return val === void 0 || val === null || val === "";
}
function readDpr() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}
export function useDevicePixelRatio() {
  const [dpr, setDpr] = reactExports.useState(readDpr);
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    let cancelled = false;
    let mql = null;
    const subscribe2 = (currentDpr) => {
      mql = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
      mql.addEventListener("change", onChange);
    };
    const onChange = () => {
      if (cancelled) return;
      const next2 = readDpr();
      setDpr((prev) => (prev === next2 ? prev : next2));
      mql?.removeEventListener("change", onChange);
      subscribe2(next2);
    };
    subscribe2(readDpr());
    return () => {
      cancelled = true;
      mql?.removeEventListener("change", onChange);
    };
  }, []);
  return dpr;
}
export const PROXY_DRAFT = Symbol.for("__MUTATIVE_PROXY_DRAFT__");
export const RAW_RETURN_SYMBOL = Symbol("__MUTATIVE_RAW_RETURN_SYMBOL__");
export const iteratorSymbol = Symbol.iterator;
export const dataTypes = {
  mutable: "mutable",
  immutable: "immutable",
};
export const internal = {};
export function has(target, key2) {
  return target instanceof Map
    ? target.has(key2)
    : Object.prototype.hasOwnProperty.call(target, key2);
}
export function getDescriptor(target, key2) {
  if (key2 in target) {
    let prototype = Reflect.getPrototypeOf(target);
    while (prototype) {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key2);
      if (descriptor) return descriptor;
      prototype = Reflect.getPrototypeOf(prototype);
    }
  }
  return;
}
export function isBaseSetInstance(obj) {
  return Object.getPrototypeOf(obj) === Set.prototype;
}
export function isBaseMapInstance(obj) {
  return Object.getPrototypeOf(obj) === Map.prototype;
}
export function latest(proxyDraft) {
  var _a2;
  return (_a2 = proxyDraft.copy) !== null && _a2 !== void 0 ? _a2 : proxyDraft.original;
}
export function isDraft(target) {
  return !!getProxyDraft(target);
}
export function getProxyDraft(value) {
  if (typeof value !== "object") return null;
  return value === null || value === void 0 ? void 0 : value[PROXY_DRAFT];
}
export function getValue(value) {
  var _a2;
  const proxyDraft = getProxyDraft(value);
  return proxyDraft
    ? (_a2 = proxyDraft.copy) !== null && _a2 !== void 0
      ? _a2
      : proxyDraft.original
    : value;
}
export function isDraftable(value, options) {
  if (!value || typeof value !== "object") return false;
  let markResult;
  return (
    Object.getPrototypeOf(value) === Object.prototype ||
    Array.isArray(value) ||
    value instanceof Map ||
    value instanceof Set ||
    (!!(options === null || options === void 0 ? void 0 : options.mark) &&
      ((markResult = options.mark(value, dataTypes)) === dataTypes.immutable ||
        typeof markResult === "function"))
  );
}
export function getPath$1(target, path2 = []) {
  if (Object.hasOwnProperty.call(target, "key")) {
    const parentCopy = target.parent.copy;
    const proxyDraft = getProxyDraft(get$1(parentCopy, target.key));
    if (
      proxyDraft !== null &&
      (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !==
        target.original
    ) {
      return null;
    }
    const isSet = target.parent.type === 3;
    const key2 = isSet ? Array.from(target.parent.setMap.keys()).indexOf(target.key) : target.key;
    if (!((isSet && parentCopy.size > key2) || has(parentCopy, key2))) return null;
    path2.push(key2);
  }
  if (target.parent) {
    return getPath$1(target.parent, path2);
  }
  path2.reverse();
  try {
    resolvePath$1(target.copy, path2);
  } catch (e2) {
    return null;
  }
  return path2;
}
export function getType(target) {
  if (Array.isArray(target)) return 1;
  if (target instanceof Map) return 2;
  if (target instanceof Set) return 3;
  return 0;
}
export function get$1(target, key2) {
  return getType(target) === 2 ? target.get(key2) : target[key2];
}
export function set(target, key2, value) {
  const type2 = getType(target);
  if (type2 === 2) {
    target.set(key2, value);
  } else {
    target[key2] = value;
  }
}
export function peek(target, key2) {
  const state2 = getProxyDraft(target);
  const source = state2 ? latest(state2) : target;
  return source[key2];
}
export function isEqual(x2, y4) {
  if (x2 === y4) {
    return x2 !== 0 || 1 / x2 === 1 / y4;
  } else {
    return x2 !== x2 && y4 !== y4;
  }
}
export function revokeProxy(proxyDraft) {
  if (!proxyDraft) return;
  while (proxyDraft.finalities.revoke.length > 0) {
    const revoke = proxyDraft.finalities.revoke.pop();
    revoke();
  }
}
export function escapePath(path2, pathAsArray) {
  return pathAsArray
    ? path2
    : [""]
        .concat(path2)
        .map((_item) => {
          const item = `${_item}`;
          if (item.indexOf("/") === -1 && item.indexOf("~") === -1) return item;
          return item.replace(/~/g, "~0").replace(/\//g, "~1");
        })
        .join("/");
}
export function unescapePath(path2) {
  if (Array.isArray(path2)) return path2;
  return path2
    .split("/")
    .map((_item) => _item.replace(/~1/g, "/").replace(/~0/g, "~"))
    .slice(1);
}
function resolvePath$1(base2, path2) {
  for (let index2 = 0; index2 < path2.length - 1; index2 += 1) {
    const key2 = path2[index2];
    base2 = get$1(getType(base2) === 3 ? Array.from(base2) : base2, key2);
    if (typeof base2 !== "object") {
      throw new Error(`Cannot resolve patch at '${path2.join("/")}'.`);
    }
  }
  return base2;
}
function strictCopy(target) {
  const copy2 = Object.create(Object.getPrototypeOf(target));
  Reflect.ownKeys(target).forEach((key2) => {
    let desc2 = Reflect.getOwnPropertyDescriptor(target, key2);
    if (desc2.enumerable && desc2.configurable && desc2.writable) {
      copy2[key2] = target[key2];
      return;
    }
    if (!desc2.writable) {
      desc2.writable = true;
      desc2.configurable = true;
    }
    if (desc2.get || desc2.set)
      desc2 = {
        configurable: true,
        writable: true,
        enumerable: desc2.enumerable,
        value: target[key2],
      };
    Reflect.defineProperty(copy2, key2, desc2);
  });
  return copy2;
}
const propIsEnum = Object.prototype.propertyIsEnumerable;
export function shallowCopy(original, options) {
  let markResult;
  if (Array.isArray(original)) {
    return Array.prototype.concat.call(original);
  } else if (original instanceof Set) {
    if (!isBaseSetInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original.values());
    }
    return Set.prototype.difference
      ? Set.prototype.difference.call(original, new Set())
      : new Set(original.values());
  } else if (original instanceof Map) {
    if (!isBaseMapInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original);
    }
    return new Map(original);
  } else if (
    (options === null || options === void 0 ? void 0 : options.mark) &&
    ((markResult = options.mark(original, dataTypes)), markResult !== void 0) &&
    markResult !== dataTypes.mutable
  ) {
    if (markResult === dataTypes.immutable) {
      return strictCopy(original);
    } else if (typeof markResult === "function") {
      if (options.enablePatches || options.enableAutoFreeze) {
        throw new Error(`You can't use mark and patches or auto freeze together.`);
      }
      return markResult();
    }
    throw new Error(`Unsupported mark result: ${markResult}`);
  } else if (typeof original === "object" && Object.getPrototypeOf(original) === Object.prototype) {
    const copy2 = {};
    Object.keys(original).forEach((key2) => {
      copy2[key2] = original[key2];
    });
    Object.getOwnPropertySymbols(original).forEach((key2) => {
      if (propIsEnum.call(original, key2)) {
        copy2[key2] = original[key2];
      }
    });
    return copy2;
  } else {
    throw new Error(`Please check mark() to ensure that it is a stable marker draftable function.`);
  }
}
export function ensureShallowCopy(target) {
  if (target.copy) return;
  target.copy = shallowCopy(target.original, target.options);
}
export function deepClone(target) {
  if (!isDraftable(target)) return getValue(target);
  if (Array.isArray(target)) return target.map(deepClone);
  if (target instanceof Map) {
    const iterable = Array.from(target.entries()).map(([k2, v2]) => [k2, deepClone(v2)]);
    if (!isBaseMapInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Map(iterable);
  }
  if (target instanceof Set) {
    const iterable = Array.from(target).map(deepClone);
    if (!isBaseSetInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Set(iterable);
  }
  const copy2 = Object.create(Object.getPrototypeOf(target));
  for (const key2 in target) copy2[key2] = deepClone(target[key2]);
  return copy2;
}
export function cloneIfNeeded(target) {
  return isDraft(target) ? deepClone(target) : target;
}
export function markChanged(proxyDraft) {
  var _a2;
  proxyDraft.assignedMap =
    (_a2 = proxyDraft.assignedMap) !== null && _a2 !== void 0 ? _a2 : new Map();
  if (!proxyDraft.operated) {
    proxyDraft.operated = true;
    if (proxyDraft.parent) {
      markChanged(proxyDraft.parent);
    }
  }
}
function throwFrozenError() {
  throw new Error("Cannot modify frozen object");
}
export function deepFreeze(target, subKey, updatedValues, stack, keys2) {
  {
    updatedValues =
      updatedValues !== null && updatedValues !== void 0 ? updatedValues : new WeakMap();
    stack = stack !== null && stack !== void 0 ? stack : [];
    keys2 = keys2 !== null && keys2 !== void 0 ? keys2 : [];
    const value = updatedValues.has(target) ? updatedValues.get(target) : target;
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
              if (typeof key2 === "object" && (parent instanceof Map || parent instanceof Set))
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
