// linked-list.js
import {
  reactExports,
  useRouter,
  useStore,
  RouterCore,
  getStoreFactory,
  replaceEqualDeep$1,
  regionToLocale,
  getRuntimeConfig,
  instance,
} from "../vendor.js";
export var Router = class extends RouterCore {
  constructor(options) {
    super(options, getStoreFactory);
  }
};
export function useRouterState(opts) {
  const contextRouter = useRouter({
    warn: opts?.router === void 0,
  });
  const router2 = opts?.router || contextRouter;
  const previousResult = reactExports.useRef(void 0);
  return useStore(router2.stores.__store, (state2) => {
    if (opts?.select) {
      if (opts.structuralSharing ?? router2.options.defaultStructuralSharing) {
        const newSlice = replaceEqualDeep$1(previousResult.current, opts.select(state2));
        previousResult.current = newSlice;
        return newSlice;
      }
      return opts.select(state2);
    }
    return state2;
  });
}
export function useLocation(opts) {
  const router2 = useRouter();
  const previousResult = reactExports.useRef(void 0);
  return useStore(router2.stores.location, (location2) => {
    const selected2 = location2;
    if (router2.options.defaultStructuralSharing) {
      const shared = replaceEqualDeep$1(previousResult.current, selected2);
      previousResult.current = shared;
      return shared;
    }
    return selected2;
  });
}
export const MAX_PENDING_RUM_EVENTS = 50;
export const pendingRumEvents = [];
export function toSafeRumError(error) {
  const safe = new Error(sanitizeRumMessage(error.message));
  safe.name = sanitizeRumMessage(error.name || "Error");
  if (error.stack) {
    safe.stack = sanitizeRumMessage(error.stack);
  }
  return safe;
}
const SENSITIVE_KEY_PATTERN =
  /token|password|secret|authorization|cookie|credential|api.?key|bearer/i;
export function sanitizeRumContext(context) {
  const seen2 = new WeakSet();
  const next2 = {};
  for (const [key2, value] of Object.entries(context)) {
    if (value === void 0 || value === null || value === "") continue;
    next2[key2] = SENSITIVE_KEY_PATTERN.test(key2) ? "[REDACTED]" : sanitizeRumValue(value, seen2);
  }
  return next2;
}
function sanitizeRumValue(value, seen2, depth2 = 0) {
  if (typeof value === "string") return sanitizeRumMessage(value);
  if (typeof value !== "object" || value === null) return value;
  if (depth2 >= 8) return "[TRUNCATED]";
  if (seen2.has(value)) return "[CIRCULAR]";
  seen2.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRumValue(item, seen2, depth2 + 1));
  }
  const next2 = {};
  for (const [key2, item] of Object.entries(value)) {
    if (item === void 0 || item === null || item === "") continue;
    next2[key2] = SENSITIVE_KEY_PATTERN.test(key2)
      ? "[REDACTED]"
      : sanitizeRumValue(item, seen2, depth2 + 1);
  }
  return next2;
}
const RUM_MAX_LENGTH = 500;
export function sanitizeRumMessage(message2) {
  return message2
    .replace(/\/Users\/[^/\s]+\/[^\s]*/g, "{path}")
    .replace(/\/home\/[^/\s]+\/[^\s]*/g, "{path}")
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+\\[^\s]*/g, "{path}")
    .replace(/\/(?:private\/)?var\/folders\/[^\s]*/g, "{path}")
    .replace(/\/tmp\/[^\s]*/g, "{path}")
    .replace(/Config file at .+? is not valid JSON/gi, "Config file at {path} is not valid JSON")
    .slice(0, RUM_MAX_LENGTH);
}
export function getDefaultLanguage() {
  try {
    const cached = localStorage.getItem("hilo:storage:global.config");
    if (cached) {
      const config2 = JSON.parse(cached);
      if (config2.language === "zh" || config2.language === "en") return config2.language;
    }
  } catch {}
  try {
    return regionToLocale(getRuntimeConfig().region);
  } catch {}
  return "en";
}
export function syncLanguage(lang) {
  if (instance.language !== lang) {
    void instance.changeLanguage(lang);
  }
}
export class SyncDescriptor {
  ctor;
  staticArguments;
  supportsDelayedInstantiation;
  constructor(ctor, staticArguments = [], supportsDelayedInstantiation = false) {
    this.ctor = ctor;
    this.staticArguments = staticArguments;
    this.supportsDelayedInstantiation = supportsDelayedInstantiation;
  }
}
export function countUnavailableComfyUiModels(task) {
  return task.missingSourceModels.length + task.untrustedSourceModels.length;
}
export function isComfyUiModelUnavailable(task, modelName) {
  return (
    task.missingSourceModels.includes(modelName) || task.untrustedSourceModels.includes(modelName)
  );
}
export function createSingleCallFunction(fn2, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function () {
    if (didCall) {
      return result;
    }
    didCall = true;
    {
      result = fn2.apply(_this, arguments);
    }
    return result;
  };
}
export function isDisposable(thing) {
  return (
    typeof thing === "object" &&
    thing !== null &&
    typeof thing.dispose === "function" &&
    thing.dispose.length === 0
  );
}
export function dispose(arg) {
  if (arg !== void 0 && arg !== null) {
    if (Symbol.iterator in arg) {
      const errors = [];
      for (const d2 of arg) {
        if (d2) {
          try {
            d2.dispose();
          } catch (e2) {
            errors.push(e2);
          }
        }
      }
      if (errors.length === 1) {
        throw errors[0];
      } else if (errors.length > 1) {
        throw new AggregateError(errors, "Encountered errors while disposing of store");
      }
      return Array.isArray(arg) ? [] : arg;
    } else {
      arg.dispose();
      return arg;
    }
  }
}
export function combinedDisposable(...disposables2) {
  return toDisposable(() => dispose(disposables2));
}
export function toDisposable(fn2) {
  const self2 = {
    dispose: createSingleCallFunction(fn2),
  };
  return self2;
}
export class DisposableStore {
  static DISABLE_DISPOSED_WARNING = false;
  _toDispose = new Set();
  _isDisposed = false;
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this._isDisposed;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o2) {
    if (!o2 || o2 === Disposable.None) {
      return o2;
    }
    if (o2 === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    if (this._isDisposed) {
      {
        console.warn(
          new Error(
            "Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!",
          ).stack,
        );
      }
    } else {
      this._toDispose.add(o2);
    }
    return o2;
  }
  /**
   * Deletes a disposable from store and disposes of it.
   */
  delete(o2) {
    if (!o2) {
      return;
    }
    if (o2 === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o2);
    o2.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o2) {
    if (!o2) {
      return;
    }
    this._toDispose.delete(o2);
  }
}
export class Disposable {
  /**
   * A disposable that does nothing when it is disposed of.
   */
  static None = Object.freeze({
    dispose() {},
  });
  _store = new DisposableStore();
  dispose() {
    this._store.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  _register(o2) {
    if (o2 === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o2);
  }
}
export function workspaceRuntimeFromOpenResult(result) {
  return result.kind === "opened" || result.kind === "reused" ? result.runtime : void 0;
}
export const errorListeners = [];
export function onUnexpectedError(e2) {
  if (!isCancellationError(e2)) {
    for (const listener of errorListeners) {
      listener(e2);
    }
  }
  return void 0;
}
export function illegalState(name2) {
  {
    return new Error(`Illegal state: ${name2}`);
  }
}
const canceledName = "Canceled";
function isCancellationError(error) {
  if (error instanceof CancellationError) {
    return true;
  }
  return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
export class CancellationError extends Error {
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
}
export class ErrorNoTelemetry extends Error {
  name;
  constructor(msg) {
    super(msg);
    this.name = "ErrorNoTelemetry";
  }
  static fromError(err) {
    if (err instanceof ErrorNoTelemetry) {
      return err;
    }
    const result = new ErrorNoTelemetry();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "ErrorNoTelemetry";
  }
}
let Node$2 = class Node3 {
  static Undefined = new Node3(void 0);
  element;
  next;
  prev;
  constructor(element2) {
    this.element = element2;
    this.next = Node3.Undefined;
    this.prev = Node3.Undefined;
  }
};
export class LinkedList {
  _first = Node$2.Undefined;
  _last = Node$2.Undefined;
  _size = 0;
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === Node$2.Undefined;
  }
  clear() {
    let node2 = this._first;
    while (node2 !== Node$2.Undefined) {
      const next2 = node2.next;
      node2.prev = Node$2.Undefined;
      node2.next = Node$2.Undefined;
      node2 = next2;
    }
    this._first = Node$2.Undefined;
    this._last = Node$2.Undefined;
    this._size = 0;
  }
  unshift(element2) {
    return this._insert(element2, false);
  }
  push(element2) {
    return this._insert(element2, true);
  }
  _insert(element2, atTheEnd) {
    const newNode = new Node$2(element2);
    if (this._first === Node$2.Undefined) {
      this._first = newNode;
      this._last = newNode;
    } else if (atTheEnd) {
      const oldLast = this._last;
      this._last = newNode;
      newNode.prev = oldLast;
      oldLast.next = newNode;
    } else {
      const oldFirst = this._first;
      this._first = newNode;
      newNode.next = oldFirst;
      oldFirst.prev = newNode;
    }
    this._size += 1;
    let didRemove = false;
    return () => {
      if (!didRemove) {
        didRemove = true;
        this._remove(newNode);
      }
    };
  }
  shift() {
    if (this._first === Node$2.Undefined) {
      return void 0;
    } else {
      const res = this._first.element;
      this._remove(this._first);
      return res;
    }
  }
  pop() {
    if (this._last === Node$2.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      this._remove(this._last);
      return res;
    }
  }
  _remove(node2) {
    if (node2.prev !== Node$2.Undefined && node2.next !== Node$2.Undefined) {
      const anchor = node2.prev;
      anchor.next = node2.next;
      node2.next.prev = anchor;
    } else if (node2.prev === Node$2.Undefined && node2.next === Node$2.Undefined) {
      this._first = Node$2.Undefined;
      this._last = Node$2.Undefined;
    } else if (node2.next === Node$2.Undefined) {
      this._last = this._last.prev;
      this._last.next = Node$2.Undefined;
    } else if (node2.prev === Node$2.Undefined) {
      this._first = this._first.next;
      this._first.prev = Node$2.Undefined;
    }
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let node2 = this._first;
    while (node2 !== Node$2.Undefined) {
      yield node2.element;
      node2 = node2.next;
    }
  }
}
