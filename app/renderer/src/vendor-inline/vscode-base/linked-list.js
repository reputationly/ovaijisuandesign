// linked-list.js
import { regionToLocale, getRuntimeConfig, instance } from "../../vendor.js";
export { Router, useRouterState, useLocation } from "@tanstack/react-router";
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
  const seen = new WeakSet();
  const next = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === void 0 || value === null || value === "") continue;
    next[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : sanitizeRumValue(value, seen);
  }
  return next;
}
function sanitizeRumValue(value, seen, depth = 0) {
  if (typeof value === "string") return sanitizeRumMessage(value);
  if (typeof value !== "object" || value === null) return value;
  if (depth >= 8) return "[TRUNCATED]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRumValue(item, seen, depth + 1));
  }
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === void 0 || item === null || item === "") continue;
    next[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[REDACTED]"
      : sanitizeRumValue(item, seen, depth + 1);
  }
  return next;
}
const RUM_MAX_LENGTH = 500;
export function sanitizeRumMessage(message) {
  return message
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
      const config = JSON.parse(cached);
      if (config.language === "zh" || config.language === "en") return config.language;
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
export function createSingleCallFunction(fn, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function () {
    if (didCall) {
      return result;
    }
    didCall = true;
    {
      result = fn.apply(_this, arguments);
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
      for (const d of arg) {
        if (d) {
          try {
            d.dispose();
          } catch (e) {
            errors.push(e);
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
export function combinedDisposable(...disposables) {
  return toDisposable(() => dispose(disposables));
}
export function toDisposable(fn) {
  const disposable = {
    dispose: createSingleCallFunction(fn),
  };
  return disposable;
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
  add(o) {
    if (!o || o === Disposable.None) {
      return o;
    }
    if (o === this) {
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
      this._toDispose.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    this._toDispose.delete(o);
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
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
}
export function workspaceRuntimeFromOpenResult(result) {
  return result.kind === "opened" || result.kind === "reused" ? result.runtime : void 0;
}
export const errorListeners = [];
export function onUnexpectedError(e) {
  if (!isCancellationError(e)) {
    for (const listener of errorListeners) {
      listener(e);
    }
  }
  return void 0;
}
export function illegalState(stateName) {
  {
    return new Error(`Illegal state: ${stateName}`);
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
let LinkedListNode = class LinkedListNode {
  static Undefined = new LinkedListNode(void 0);
  element;
  next;
  prev;
  constructor(element) {
    this.element = element;
    this.next = LinkedListNode.Undefined;
    this.prev = LinkedListNode.Undefined;
  }
};
export class LinkedList {
  _first = LinkedListNode.Undefined;
  _last = LinkedListNode.Undefined;
  _size = 0;
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === LinkedListNode.Undefined;
  }
  clear() {
    let node = this._first;
    while (node !== LinkedListNode.Undefined) {
      const next = node.next;
      node.prev = LinkedListNode.Undefined;
      node.next = LinkedListNode.Undefined;
      node = next;
    }
    this._first = LinkedListNode.Undefined;
    this._last = LinkedListNode.Undefined;
    this._size = 0;
  }
  unshift(element) {
    return this._insert(element, false);
  }
  push(element) {
    return this._insert(element, true);
  }
  _insert(element, atTheEnd) {
    const newNode = new LinkedListNode(element);
    if (this._first === LinkedListNode.Undefined) {
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
    if (this._first === LinkedListNode.Undefined) {
      return void 0;
    } else {
      const element = this._first.element;
      this._remove(this._first);
      return element;
    }
  }
  pop() {
    if (this._last === LinkedListNode.Undefined) {
      return void 0;
    } else {
      const element = this._last.element;
      this._remove(this._last);
      return element;
    }
  }
  _remove(node) {
    if (node.prev !== LinkedListNode.Undefined && node.next !== LinkedListNode.Undefined) {
      const anchor = node.prev;
      anchor.next = node.next;
      node.next.prev = anchor;
    } else if (node.prev === LinkedListNode.Undefined && node.next === LinkedListNode.Undefined) {
      this._first = LinkedListNode.Undefined;
      this._last = LinkedListNode.Undefined;
    } else if (node.next === LinkedListNode.Undefined) {
      this._last = this._last.prev;
      this._last.next = LinkedListNode.Undefined;
    } else if (node.prev === LinkedListNode.Undefined) {
      this._first = this._first.next;
      this._first.prev = LinkedListNode.Undefined;
    }
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let node = this._first;
    while (node !== LinkedListNode.Undefined) {
      yield node.element;
      node = node.next;
    }
  }
}
