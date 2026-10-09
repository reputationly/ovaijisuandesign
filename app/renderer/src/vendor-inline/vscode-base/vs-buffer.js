// vs-buffer.js
import {
  CancellationError,
  Disposable,
  DisposableStore,
  LinkedList,
  combinedDisposable,
  dispose,
  onUnexpectedError,
  toDisposable,
} from "./linked-list.js";
export var Event$1;
((Event2) => {
  Event2.None = () => Disposable.None;
  function once(event) {
    return (listener, thisArgs = null, disposables2) => {
      let didFire = false;
      let result;
      result = event(
        (e2) => {
          if (didFire) {
            return;
          } else if (result) {
            result.dispose();
          } else {
            didFire = true;
          }
          return listener.call(thisArgs, e2);
        },
        null,
        disposables2,
      );
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  Event2.once = once;
  function map3(event, map22, disposable) {
    return snapshot2((listener, thisArgs = null, disposables2) => {
      return event((i2) => listener.call(thisArgs, map22(i2)), null, disposables2);
    }, disposable);
  }
  Event2.map = map3;
  function filter2(event, filter22, disposable) {
    return snapshot2(
      (listener, thisArgs = null, disposables2) =>
        event((e2) => filter22(e2) && listener.call(thisArgs, e2), null, disposables2),
      disposable,
    );
  }
  Event2.filter = filter2;
  function signal(event) {
    return event;
  }
  Event2.signal = signal;
  function any(...events2) {
    return (listener, thisArgs = null, disposables2) => {
      const disposable = combinedDisposable(
        ...events2.map((event) => event((e2) => listener.call(thisArgs, e2))),
      );
      return addAndReturnDisposable(disposable, disposables2);
    };
  }
  Event2.any = any;
  function snapshot2(event, disposable) {
    let listener;
    const emitter = new Emitter({
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener?.dispose();
      },
    });
    disposable?.add(emitter);
    return emitter.event;
  }
  function toPromise(event) {
    return new Promise((resolve) => once(event)(resolve));
  }
  Event2.toPromise = toPromise;
  function buffer(event, _flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let listener = event((e2) => {
      if (buffer2) {
        buffer2.push(e2);
      } else {
        emitter.fire(e2);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush2 = () => {
      if (buffer2) {
        for (const e2 of buffer2) {
          emitter.fire(e2);
        }
      }
      buffer2 = null;
    };
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e2) => emitter.fire(e2));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          flush2();
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
        buffer2 = [];
      },
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  Event2.buffer = buffer;
  function fromNodeEventEmitter(emitter, eventName, map22 = (id2) => id2) {
    const fn2 = (...args) => result.fire(map22(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn2);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn2);
    const result = new Emitter({
      onWillAddFirstListener: onFirstListenerAdd,
      onDidRemoveLastListener: onLastListenerRemove,
    });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
  function addAndReturnDisposable(d2, store) {
    if (Array.isArray(store)) {
      store.push(d2);
    } else if (store) {
      store.add(d2);
    }
    return d2;
  }
})(Event$1 || (Event$1 = {}));
export class Emitter {
  _options;
  _disposed;
  _event;
  _deliveryQueue;
  _listeners;
  constructor(options) {
    this._options = options;
  }
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      if (this._listeners) {
        this._listeners.clear();
      }
      this._deliveryQueue?.clear();
    }
  }
  /**
   * For the public to allow to subscribe to events from this Emitter
   */
  get event() {
    this._event ??= (listener, thisArgs, disposables2) => {
      if (!this._listeners) {
        this._listeners = new LinkedList();
      }
      const firstListener = this._listeners.isEmpty();
      if (firstListener && this._options?.onWillAddFirstListener) {
        this._options.onWillAddFirstListener(this);
      }
      let removeListener;
      let listenerObj;
      if (thisArgs) {
        listenerObj = (e2) => {
          listener.call(thisArgs, e2);
        };
      } else {
        listenerObj = listener;
      }
      removeListener = this._listeners.push(listenerObj);
      if (firstListener && this._options?.onDidAddFirstListener) {
        this._options.onDidAddFirstListener(this);
      }
      this._options?.onDidAddListener?.();
      const result = toDisposable(() => {
        if (!this._disposed) {
          this._options?.onWillRemoveListener?.(this);
          removeListener?.();
          if (this._options?.onDidRemoveLastListener) {
            const hasListeners = this._listeners && !this._listeners.isEmpty();
            if (!hasListeners) {
              this._options.onDidRemoveLastListener(this);
            }
          }
        }
      });
      if (disposables2 instanceof DisposableStore) {
        disposables2.add(result);
      } else if (Array.isArray(disposables2)) {
        disposables2.push(result);
      }
      return result;
    };
    return this._event;
  }
  /**
   * To be kept private to fire an event to subscribers
   */
  fire(event) {
    if (this._listeners) {
      if (!this._deliveryQueue) {
        this._deliveryQueue = new EventDeliveryQueue();
      }
      for (const listener of this._listeners) {
        this._deliveryQueue.push(listener, event);
      }
      const onListenerError = this._options?.onListenerError || onUnexpectedError;
      while (this._deliveryQueue.size > 0) {
        const entry = this._deliveryQueue.shift();
        if (!entry) break;
        const [listener, event2] = entry;
        try {
          listener(event2);
        } catch (e2) {
          onListenerError(e2);
        }
      }
    }
  }
  hasListeners() {
    return !!this._listeners && !this._listeners.isEmpty();
  }
}
class EventDeliveryQueue {
  _queue = [];
  get size() {
    return this._queue.length;
  }
  push(listener, event) {
    this._queue.push([listener, event]);
  }
  shift() {
    return this._queue.shift();
  }
  clear() {
    this._queue.length = 0;
  }
}
const shortcutEvent = (callback, context) => {
  const handle2 = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle2);
    },
  };
};
export var CancellationToken;
((CancellationToken2) => {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return (
      typeof thing.isCancellationRequested === "boolean" &&
      typeof thing.onCancellationRequested === "function"
    );
  }
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event$1.None,
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent,
  });
})(CancellationToken || (CancellationToken = {}));
class MutableToken {
  _isCancelled = false;
  _emitter = null;
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
}
class CancellationTokenSource {
  _token = void 0;
  _parentListener = void 0;
  constructor(parent) {
    this._parentListener = parent?.onCancellationRequested(this.cancel, this);
  }
  get token() {
    if (!this._token) {
      this._token = new MutableToken();
    }
    return this._token;
  }
  cancel() {
    if (!this._token) {
      this._token = CancellationToken.Cancelled;
    } else if (this._token instanceof MutableToken) {
      this._token.cancel();
    }
  }
  dispose(cancel = false) {
    if (cancel) {
      this.cancel();
    }
    this._parentListener?.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
}
export function createCancelablePromise(callback) {
  const source = new CancellationTokenSource();
  const thenable = callback(source.token);
  const promise = new Promise((resolve, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose();
      reject(new CancellationError());
    });
    Promise.resolve(thenable).then(
      (value) => {
        subscription.dispose();
        source.dispose();
        resolve(value);
      },
      (err) => {
        subscription.dispose();
        source.dispose();
        reject(err);
      },
    );
  });
  return new (class {
    cancel() {
      source.cancel();
      source.dispose();
    }
    then(resolve, reject) {
      return promise.then(resolve, reject);
    }
    catch(reject) {
      return this.then(void 0, reject);
    }
    finally(onfinally) {
      return promise.finally(onfinally);
    }
    [Symbol.toStringTag] = "CancelablePromise";
  })();
}
const hasBuffer = typeof Buffer !== "undefined";
let textEncoder$1;
let textDecoder;
export class VSBuffer {
  static alloc(byteLength) {
    if (hasBuffer) {
      return new VSBuffer(Buffer.allocUnsafe(byteLength));
    } else {
      return new VSBuffer(new Uint8Array(byteLength));
    }
  }
  static wrap(actual) {
    if (hasBuffer && !Buffer.isBuffer(actual)) {
      actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
    }
    return new VSBuffer(actual);
  }
  static fromString(str2, options) {
    const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new VSBuffer(Buffer.from(str2));
    } else {
      if (!textEncoder$1) {
        textEncoder$1 = new globalThis.TextEncoder();
      }
      return new VSBuffer(textEncoder$1.encode(str2));
    }
  }
  static fromByteArray(source) {
    const result = VSBuffer.alloc(source.length);
    for (let i2 = 0, len = source.length; i2 < len; i2++) {
      result.buffer[i2] = source[i2];
    }
    return result;
  }
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i2 = 0, len = buffers.length; i2 < len; i2++) {
        totalLength += buffers[i2].byteLength;
      }
    }
    const ret = VSBuffer.alloc(totalLength);
    let offset2 = 0;
    for (let i2 = 0, len = buffers.length; i2 < len; i2++) {
      const element2 = buffers[i2];
      ret.set(element2, offset2);
      offset2 += element2.byteLength;
    }
    return ret;
  }
  /**
   * @returns `true` if `thing` is a native Node Buffer or Uint8Array.
   */
  static isNativeBuffer(thing) {
    if (hasBuffer && Buffer.isBuffer(thing)) {
      return true;
    }
    if (thing instanceof Uint8Array) {
      return true;
    }
    return false;
  }
  buffer;
  byteLength;
  constructor(buffer) {
    this.buffer = buffer;
    this.byteLength = this.buffer.byteLength;
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferable.
   */
  clone() {
    const result = VSBuffer.alloc(this.byteLength);
    result.set(this);
    return result;
  }
  toString() {
    if (hasBuffer) {
      return this.buffer.toString();
    } else {
      if (!textDecoder) {
        textDecoder = new globalThis.TextDecoder();
      }
      return textDecoder.decode(this.buffer);
    }
  }
  slice(start2, end2) {
    const slice2 = this.buffer.subarray(start2, end2);
    return new VSBuffer(slice2);
  }
  set(array2, offset2) {
    if (array2 instanceof VSBuffer) {
      this.buffer.set(array2.buffer, offset2);
    } else if (array2 instanceof Uint8Array) {
      this.buffer.set(array2, offset2);
    } else if (array2 instanceof ArrayBuffer) {
      this.buffer.set(new Uint8Array(array2), offset2);
    } else if (ArrayBuffer.isView(array2)) {
      this.buffer.set(new Uint8Array(array2.buffer, array2.byteOffset, array2.byteLength), offset2);
    } else {
      throw new Error(`Unknown argument 'array'`);
    }
  }
  readUInt32BE(offset2) {
    return readUInt32BE(this.buffer, offset2);
  }
  writeUInt32BE(value, offset2) {
    writeUInt32BE(this.buffer, value, offset2);
  }
  readUInt32LE(offset2) {
    return readUInt32LE(this.buffer, offset2);
  }
  writeUInt32LE(value, offset2) {
    writeUInt32LE(this.buffer, value, offset2);
  }
  readUInt8(offset2) {
    return this.buffer[offset2];
  }
  writeUInt8(value, offset2) {
    this.buffer[offset2] = value;
  }
}
function readUInt32BE(source, offset2) {
  return (
    source[offset2] * 2 ** 24 +
    source[offset2 + 1] * 2 ** 16 +
    source[offset2 + 2] * 2 ** 8 +
    source[offset2 + 3]
  );
}
function writeUInt32BE(destination, value, offset2) {
  destination[offset2 + 3] = value;
  value = value >>> 8;
  destination[offset2 + 2] = value;
  value = value >>> 8;
  destination[offset2 + 1] = value;
  value = value >>> 8;
  destination[offset2] = value;
}
function readUInt32LE(source, offset2) {
  return (
    ((source[offset2 + 0] << 0) >>> 0) |
    ((source[offset2 + 1] << 8) >>> 0) |
    ((source[offset2 + 2] << 16) >>> 0) |
    ((source[offset2 + 3] << 24) >>> 0)
  );
}
function writeUInt32LE(destination, value, offset2) {
  destination[offset2 + 0] = value & 255;
  value = value >>> 8;
  destination[offset2 + 1] = value & 255;
  value = value >>> 8;
  destination[offset2 + 2] = value & 255;
  value = value >>> 8;
  destination[offset2 + 3] = value & 255;
}
export function memoize(_target, key2, descriptor) {
  let fnKey = null;
  let fn2 = null;
  if (typeof descriptor.value === "function") {
    fnKey = "value";
    fn2 = descriptor.value;
  } else if (typeof descriptor.get === "function") {
    fnKey = "get";
    fn2 = descriptor.get;
  }
  if (!fn2) {
    throw new Error("not supported");
  }
  const memoizeKey = `$memoize$${key2}`;
  const memoizedFn = function (...args) {
    if (!Object.hasOwn(this, memoizeKey)) {
      Object.defineProperty(this, memoizeKey, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: fn2?.apply(this, args),
      });
    }
    return this[memoizeKey];
  };
  if (fnKey === "value") {
    descriptor.value = memoizedFn;
  } else {
    descriptor.get = memoizedFn;
  }
}
export function revive(obj, depth2 = 0) {
  if (!obj || depth2 > 200) {
    return obj;
  }
  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      for (let i2 = 0; i2 < obj.length; ++i2) {
        obj[i2] = revive(obj[i2], depth2 + 1);
      }
    } else {
      for (const key2 in obj) {
        if (Object.hasOwn(obj, key2)) {
          obj[key2] = revive(obj[key2], depth2 + 1);
        }
      }
    }
  }
  return obj;
}
export function isUpperAsciiLetter(code2) {
  return code2 >= 65 && code2 <= 90;
}
export function isUndefinedOrNull(obj) {
  return obj === void 0 || obj === null;
}
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
export var __decorateClass$1 = (decorators, target, key2, kind) => {
  var result = __getOwnPropDesc$1(target, key2);
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if ((decorator = decorators[i2])) result = decorator(target, key2, result) || result;
  if (result) __defProp$1(target, key2, result);
  return result;
};
function readIntVQL(reader) {
  let value = 0;
  for (let n2 = 0; ; n2 += 7) {
    const next2 = reader.read(1);
    value |= (next2.buffer[0] & 127) << n2;
    if (!(next2.buffer[0] & 128)) {
      return value;
    }
  }
}
const vqlZero = createOneByteBuffer(0);
function writeInt32VQL(writer, value) {
  if (value === 0) {
    writer.write(vqlZero);
    return;
  }
  let len = 0;
  for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
    len++;
  }
  const scratch = VSBuffer.alloc(len);
  for (let i2 = 0; value !== 0; i2++) {
    scratch.buffer[i2] = value & 127;
    value = value >>> 7;
    if (value > 0) {
      scratch.buffer[i2] |= 128;
    }
  }
  writer.write(scratch);
}
export class BufferReader {
  constructor(buffer) {
    this.buffer = buffer;
  }
  pos = 0;
  read(bytes2) {
    const result = this.buffer.slice(this.pos, this.pos + bytes2);
    this.pos += result.byteLength;
    return result;
  }
}
export class BufferWriter {
  buffers = [];
  get buffer() {
    return VSBuffer.concat(this.buffers);
  }
  write(buffer) {
    this.buffers.push(buffer);
  }
}
function createOneByteBuffer(value) {
  const result = VSBuffer.alloc(1);
  result.writeUInt8(value, 0);
  return result;
}
const BufferPresets = {
  Undefined: createOneByteBuffer(
    0,
    /* Undefined */
  ),
  String: createOneByteBuffer(
    1,
    /* String */
  ),
  Buffer: createOneByteBuffer(
    2,
    /* Buffer */
  ),
  VSBuffer: createOneByteBuffer(
    3,
    /* VSBuffer */
  ),
  Array: createOneByteBuffer(
    4,
    /* Array */
  ),
  Object: createOneByteBuffer(
    5,
    /* Object */
  ),
  Uint: createOneByteBuffer(
    6,
    /* Int */
  ),
};
export function serialize(writer, data2) {
  if (typeof data2 === "undefined") {
    writer.write(BufferPresets.Undefined);
  } else if (typeof data2 === "string") {
    const buffer = VSBuffer.fromString(data2);
    writer.write(BufferPresets.String);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (VSBuffer.isNativeBuffer(data2)) {
    const buffer = VSBuffer.wrap(data2);
    writer.write(BufferPresets.Buffer);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (data2 instanceof VSBuffer) {
    writer.write(BufferPresets.VSBuffer);
    writeInt32VQL(writer, data2.byteLength);
    writer.write(data2);
  } else if (Array.isArray(data2)) {
    writer.write(BufferPresets.Array);
    writeInt32VQL(writer, data2.length);
    for (const el of data2) {
      serialize(writer, el);
    }
  } else if (typeof data2 === "number" && (data2 | 0) === data2) {
    writer.write(BufferPresets.Uint);
    writeInt32VQL(writer, data2);
  } else {
    const json2 = JSON.stringify(data2);
    if (json2 === void 0) {
      throw new Error(
        `IPC argument is not serializable (${typeof data2}); only JSON-encodable values are supported`,
      );
    }
    const buffer = VSBuffer.fromString(json2);
    writer.write(BufferPresets.Object);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  }
}
export function deserialize(reader) {
  const type2 = reader.read(1).readUInt8(0);
  switch (type2) {
    case 0:
      return void 0;
    case 1:
      return reader.read(readIntVQL(reader)).toString();
    case 2:
      return reader.read(readIntVQL(reader)).buffer;
    case 3:
      return reader.read(readIntVQL(reader));
    case 4: {
      const length2 = readIntVQL(reader);
      const result = [];
      for (let i2 = 0; i2 < length2; i2++) {
        result.push(deserialize(reader));
      }
      return result;
    }
    case 5:
      return JSON.parse(reader.read(readIntVQL(reader)).toString());
    case 6:
      return readIntVQL(reader);
  }
}
export class ChannelServer {
  constructor(protocol, ctx, _logger = null, timeoutDelay = 1e3) {
    this.protocol = protocol;
    this.ctx = ctx;
    this.timeoutDelay = timeoutDelay;
    this.protocolListener = this.protocol.onMessage((msg) => this.onRawMessage(msg));
    this.sendResponse({
      type: 200,
      /* Initialize */
    });
  }
  channels = new Map();
  activeRequests = new Map();
  protocolListener;
  pendingRequests = new Map();
  registerChannel(channelName, channel) {
    this.channels.set(channelName, channel);
    setTimeout(() => this.flushPendingRequests(channelName), 0);
  }
  unregisterChannel(channelName) {
    this.channels.delete(channelName);
    this.rejectPendingRequests(channelName, `Channel name '${channelName}' was unregistered`);
    this.disposeActiveRequests(channelName);
  }
  get channelCount() {
    return this.channels.size;
  }
  sendResponse(response) {
    switch (response.type) {
      case 200: {
        this.send([response.type]);
        return;
      }
      case 201:
      case 202:
      case 204:
      case 203: {
        try {
          this.send([response.type, response.id], response.data);
        } catch (err) {
          if (response.type === 204) {
            onUnexpectedError(err);
            return;
          }
          this.sendUnencodableResponseError(response.id, err);
        }
        return;
      }
    }
  }
  /** Last-resort reply so a failed encode still settles the peer's promise. */
  sendUnencodableResponseError(id2, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    try {
      this.send([202, id2], {
        message: `IPC response could not be encoded: ${detail}`,
        name: "Error",
        stack: void 0,
      });
    } catch (err) {
      onUnexpectedError(err);
    }
  }
  send(header, body2 = void 0) {
    const writer = new BufferWriter();
    serialize(writer, header);
    serialize(writer, body2);
    return this.sendBuffer(writer.buffer);
  }
  sendBuffer(message2) {
    try {
      this.protocol.send(message2);
      return message2.byteLength;
    } catch {
      return 0;
    }
  }
  onRawMessage(message2) {
    const reader = new BufferReader(message2);
    let header;
    try {
      header = deserialize(reader);
    } catch (err) {
      onUnexpectedError(
        new Error(
          `IPC request header could not be decoded (${message2.byteLength} bytes): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      return;
    }
    if (!Array.isArray(header)) {
      onUnexpectedError(
        new Error(`IPC request header has an unexpected shape (${message2.byteLength} bytes)`),
      );
      return;
    }
    const type2 = header[0];
    let body2;
    try {
      body2 = deserialize(reader);
    } catch (err) {
      this.onUndecodableRequest(type2, header, message2.byteLength, err);
      return;
    }
    switch (type2) {
      case 100:
        return this.onPromise({
          type: type2,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body2,
        });
      case 102:
        return this.onEventListen({
          type: type2,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body2,
        });
      case 101:
        return this.disposeActiveRequest({
          type: type2,
          id: header[1],
        });
      case 103:
        return this.disposeActiveRequest({
          type: type2,
          id: header[1],
        });
    }
  }
  /**
   * A request frame whose body could not be decoded. Reply with an error when
   * the request type expects one; a silently dropped frame would otherwise
   * leave the caller awaiting a response that can never arrive.
   */
  onUndecodableRequest(type2, header, byteLength, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const channelName = typeof header[2] === "string" ? header[2] : "unknown";
    const name2 = typeof header[3] === "string" ? header[3] : "unknown";
    const error = new Error(
      `IPC request body could not be decoded for ${channelName}.${name2} (${byteLength} bytes): ${detail}`,
    );
    onUnexpectedError(error);
    if (type2 !== 100) return;
    const id2 = header[1];
    if (typeof id2 !== "number") return;
    this.sendResponse({
      id: id2,
      data: {
        message: error.message,
        name: error.name,
        stack: void 0,
      },
      type: 202,
      /* PromiseError */
    });
  }
  onPromise(request) {
    const channel = this.channels.get(request.channelName);
    if (!channel) {
      this.collectPendingRequest(request);
      return;
    }
    const cancellationTokenSource = new CancellationTokenSource();
    let promise;
    try {
      promise = channel.call(this.ctx, request.name, request.arg, cancellationTokenSource.token);
    } catch (err) {
      promise = Promise.reject(err);
    }
    const id2 = request.id;
    promise
      .then(
        (data2) => {
          this.sendResponse({
            id: id2,
            data: data2,
            type: 201,
            /* PromiseSuccess */
          });
        },
        (err) => {
          if (err instanceof Error) {
            this.sendResponse({
              id: id2,
              data: {
                message: err.message,
                name: err.name,
                stack: err.stack ? err.stack.split("\n") : void 0,
              },
              type: 202,
              /* PromiseError */
            });
          } else {
            this.sendResponse({
              id: id2,
              data: err,
              type: 203,
              /* PromiseErrorObj */
            });
          }
        },
      )
      .finally(() => {
        disposable.dispose();
        this.activeRequests.delete(request.id);
      });
    const disposable = {
      channelName: request.channelName,
      dispose: () => cancellationTokenSource.cancel(),
    };
    this.activeRequests.set(request.id, disposable);
  }
  onEventListen(request) {
    const channel = this.channels.get(request.channelName);
    if (!channel) {
      this.collectPendingRequest(request);
      return;
    }
    const id2 = request.id;
    const event = channel.listen(this.ctx, request.name, request.arg);
    const listener = event((data2) =>
      this.sendResponse({
        id: id2,
        data: data2,
        type: 204,
        /* EventFire */
      }),
    );
    const disposable = {
      channelName: request.channelName,
      dispose: () => listener.dispose(),
    };
    this.activeRequests.set(request.id, disposable);
  }
  disposeActiveRequest(request) {
    const disposable = this.activeRequests.get(request.id);
    if (disposable) {
      disposable.dispose();
      this.activeRequests.delete(request.id);
    }
  }
  collectPendingRequest(request) {
    let pendingRequests = this.pendingRequests.get(request.channelName);
    if (!pendingRequests) {
      pendingRequests = [];
      this.pendingRequests.set(request.channelName, pendingRequests);
    }
    const timer2 = setTimeout(() => {
      console.error(`Unknown channel: ${request.channelName}`);
      if (request.type === 100) {
        this.sendResponse({
          id: request.id,
          data: {
            name: "Unknown channel",
            message: `Channel name '${request.channelName}' timed out after ${this.timeoutDelay}ms`,
            stack: void 0,
          },
          type: 202,
          /* PromiseError */
        });
      }
    }, this.timeoutDelay);
    pendingRequests.push({
      request,
      timeoutTimer: timer2,
    });
  }
  rejectPendingRequests(channelName, message2) {
    const requests = this.pendingRequests.get(channelName);
    if (!requests) return;
    for (const request of requests) {
      clearTimeout(request.timeoutTimer);
      if (request.request.type === 100) {
        this.sendResponse({
          id: request.request.id,
          data: {
            name: "Unknown channel",
            message: message2,
            stack: void 0,
          },
          type: 202,
          /* PromiseError */
        });
      }
    }
    this.pendingRequests.delete(channelName);
  }
  disposeActiveRequests(channelName) {
    for (const [requestId, request] of this.activeRequests) {
      if (request.channelName !== channelName) continue;
      request.dispose();
      this.activeRequests.delete(requestId);
    }
  }
  flushPendingRequests(channelName) {
    const requests = this.pendingRequests.get(channelName);
    if (requests) {
      for (const request of requests) {
        clearTimeout(request.timeoutTimer);
        switch (request.request.type) {
          case 100:
            this.onPromise(request.request);
            break;
          case 102:
            this.onEventListen(request.request);
            break;
        }
      }
      this.pendingRequests.delete(channelName);
    }
  }
  dispose() {
    if (this.protocolListener) {
      this.protocolListener.dispose();
      this.protocolListener = null;
    }
    dispose(this.activeRequests.values());
    this.activeRequests.clear();
  }
}
