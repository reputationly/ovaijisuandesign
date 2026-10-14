// 留在这里：对应 VS Code 这些没有 npm 包的源文件，所以保留可读副本：src/vs/base/common/event.ts、src/vs/base/common/cancellation.ts、src/vs/base/common/buffer.ts、src/vs/base/common/decorators.ts、src/vs/base/common/marshalling.ts、src/vs/base/common/strings.ts、src/vs/base/common/types.ts、src/vs/base/parts/ipc/common/ipc.ts。applyMemberDecorators 是这些类上装饰器编译出来的辅助函数，同样没有独立包。
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
export var VSCodeEvent;
((eventNamespace) => {
  eventNamespace.None = () => Disposable.None;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      let result;
      result = event(
        (e) => {
          if (didFire) {
            return;
          } else if (result) {
            result.dispose();
          } else {
            didFire = true;
          }
          return listener.call(thisArgs, e);
        },
        null,
        disposables,
      );
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  eventNamespace.once = once;
  function eventMapper(event, valueMapper, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => {
      return event((i) => listener.call(thisArgs, valueMapper(i)), null, disposables);
    }, disposable);
  }
  eventNamespace.map = eventMapper;
  function eventFilter(event, predicate, disposable) {
    return snapshot(
      (listener, thisArgs = null, disposables) =>
        event((e) => predicate(e) && listener.call(thisArgs, e), null, disposables),
      disposable,
    );
  }
  eventNamespace.filter = eventFilter;
  function signal(event) {
    return event;
  }
  eventNamespace.signal = signal;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(
        ...events.map((event) => event((e) => listener.call(thisArgs, e))),
      );
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  eventNamespace.any = any;
  function snapshot(event, disposable) {
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
  eventNamespace.toPromise = toPromise;
  function buffer(event, _flushAfterTimeout = false, _buffer = [], disposable) {
    let bufferedEvents = _buffer.slice();
    let listener = event((e) => {
      if (bufferedEvents) {
        bufferedEvents.push(e);
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = () => {
      if (bufferedEvents) {
        for (const e of bufferedEvents) {
          emitter.fire(e);
        }
      }
      bufferedEvents = null;
    };
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (bufferedEvents) {
          flush();
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
        bufferedEvents = [];
      },
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  eventNamespace.buffer = buffer;
  function fromNodeEventEmitter(emitter, eventName, map = (id) => id) {
    const fn = (...args) => result.fire(map(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
    const result = new Emitter({
      onWillAddFirstListener: onFirstListenerAdd,
      onDidRemoveLastListener: onLastListenerRemove,
    });
    return result.event;
  }
  eventNamespace.fromNodeEventEmitter = fromNodeEventEmitter;
  function addAndReturnDisposable(d, store) {
    if (Array.isArray(store)) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
})(VSCodeEvent || (VSCodeEvent = {}));
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
    this._event ??= (listener, thisArgs, disposables) => {
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
        listenerObj = (e) => {
          listener.call(thisArgs, e);
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
      if (disposables instanceof DisposableStore) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
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
        const [listener, eventData] = entry;
        try {
          listener(eventData);
        } catch (e) {
          onListenerError(e);
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
  const handle = setTimeout(callback.bind(context), 0);
  return {
    dispose() {
      clearTimeout(handle);
    },
  };
};
export var CancellationToken;
((CancellationToken) => {
  function isCancellationToken(thing) {
    if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
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
  CancellationToken.isCancellationToken = isCancellationToken;
  CancellationToken.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: VSCodeEvent.None,
  });
  CancellationToken.Cancelled = Object.freeze({
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
      (error) => {
        subscription.dispose();
        source.dispose();
        reject(error);
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
let textEncoder;
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
  static fromString(str, options) {
    const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new VSBuffer(Buffer.from(str));
    } else {
      if (!textEncoder) {
        textEncoder = new globalThis.TextEncoder();
      }
      return new VSBuffer(textEncoder.encode(str));
    }
  }
  static fromByteArray(source) {
    const result = VSBuffer.alloc(source.length);
    for (let i = 0, len = source.length; i < len; i++) {
      result.buffer[i] = source[i];
    }
    return result;
  }
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const result = VSBuffer.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      result.set(element, offset);
      offset += element.byteLength;
    }
    return result;
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
  slice(start, end) {
    const slice = this.buffer.subarray(start, end);
    return new VSBuffer(slice);
  }
  set(array, offset) {
    if (array instanceof VSBuffer) {
      this.buffer.set(array.buffer, offset);
    } else if (array instanceof Uint8Array) {
      this.buffer.set(array, offset);
    } else if (array instanceof ArrayBuffer) {
      this.buffer.set(new Uint8Array(array), offset);
    } else if (ArrayBuffer.isView(array)) {
      this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
    } else {
      throw new Error(`Unknown argument 'array'`);
    }
  }
  readUInt32BE(offset) {
    return readUInt32BE(this.buffer, offset);
  }
  writeUInt32BE(value, offset) {
    writeUInt32BE(this.buffer, value, offset);
  }
  readUInt32LE(offset) {
    return readUInt32LE(this.buffer, offset);
  }
  writeUInt32LE(value, offset) {
    writeUInt32LE(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return this.buffer[offset];
  }
  writeUInt8(value, offset) {
    this.buffer[offset] = value;
  }
}
function readUInt32BE(source, offset) {
  return (
    source[offset] * 2 ** 24 +
    source[offset + 1] * 2 ** 16 +
    source[offset + 2] * 2 ** 8 +
    source[offset + 3]
  );
}
function writeUInt32BE(destination, value, offset) {
  destination[offset + 3] = value;
  value = value >>> 8;
  destination[offset + 2] = value;
  value = value >>> 8;
  destination[offset + 1] = value;
  value = value >>> 8;
  destination[offset] = value;
}
function readUInt32LE(source, offset) {
  return (
    ((source[offset + 0] << 0) >>> 0) |
    ((source[offset + 1] << 8) >>> 0) |
    ((source[offset + 2] << 16) >>> 0) |
    ((source[offset + 3] << 24) >>> 0)
  );
}
function writeUInt32LE(destination, value, offset) {
  destination[offset + 0] = value & 255;
  value = value >>> 8;
  destination[offset + 1] = value & 255;
  value = value >>> 8;
  destination[offset + 2] = value & 255;
  value = value >>> 8;
  destination[offset + 3] = value & 255;
}
export function memoize(_target, key, descriptor) {
  let fnKey = null;
  let fn = null;
  if (typeof descriptor.value === "function") {
    fnKey = "value";
    fn = descriptor.value;
  } else if (typeof descriptor.get === "function") {
    fnKey = "get";
    fn = descriptor.get;
  }
  if (!fn) {
    throw new Error("not supported");
  }
  const memoizeKey = `$memoize$${key}`;
  const memoizedFn = function (...args) {
    if (!Object.hasOwn(this, memoizeKey)) {
      Object.defineProperty(this, memoizeKey, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: fn?.apply(this, args),
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
export function revive(obj, depth = 0) {
  if (!obj || depth > 200) {
    return obj;
  }
  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; ++i) {
        obj[i] = revive(obj[i], depth + 1);
      }
    } else {
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          obj[key] = revive(obj[key], depth + 1);
        }
      }
    }
  }
  return obj;
}
export function isUpperAsciiLetter(code) {
  return code >= 65 && code <= 90;
}
export function isUndefinedOrNull(obj) {
  return obj === void 0 || obj === null;
}
var defineProperty = Object.defineProperty;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
export var applyMemberDecorators = (decorators, target, key, kind) => {
  var result = getOwnPropertyDescriptor(target, key);
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if ((decorator = decorators[i])) result = decorator(target, key, result) || result;
  if (result) defineProperty(target, key, result);
  return result;
};
function readIntVQL(reader) {
  let value = 0;
  for (let n = 0; ; n += 7) {
    const next = reader.read(1);
    value |= (next.buffer[0] & 127) << n;
    if (!(next.buffer[0] & 128)) {
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
  for (let v = value; v !== 0; v = v >>> 7) {
    len++;
  }
  const scratch = VSBuffer.alloc(len);
  for (let i = 0; value !== 0; i++) {
    scratch.buffer[i] = value & 127;
    value = value >>> 7;
    if (value > 0) {
      scratch.buffer[i] |= 128;
    }
  }
  writer.write(scratch);
}
export class BufferReader {
  constructor(buffer) {
    this.buffer = buffer;
  }
  pos = 0;
  read(bytes) {
    const result = this.buffer.slice(this.pos, this.pos + bytes);
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
export function serialize(writer, data) {
  if (typeof data === "undefined") {
    writer.write(BufferPresets.Undefined);
  } else if (typeof data === "string") {
    const buffer = VSBuffer.fromString(data);
    writer.write(BufferPresets.String);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (VSBuffer.isNativeBuffer(data)) {
    const buffer = VSBuffer.wrap(data);
    writer.write(BufferPresets.Buffer);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  } else if (data instanceof VSBuffer) {
    writer.write(BufferPresets.VSBuffer);
    writeInt32VQL(writer, data.byteLength);
    writer.write(data);
  } else if (Array.isArray(data)) {
    writer.write(BufferPresets.Array);
    writeInt32VQL(writer, data.length);
    for (const el of data) {
      serialize(writer, el);
    }
  } else if (typeof data === "number" && (data | 0) === data) {
    writer.write(BufferPresets.Uint);
    writeInt32VQL(writer, data);
  } else {
    const json = JSON.stringify(data);
    if (json === void 0) {
      throw new Error(
        `IPC argument is not serializable (${typeof data}); only JSON-encodable values are supported`,
      );
    }
    const buffer = VSBuffer.fromString(json);
    writer.write(BufferPresets.Object);
    writeInt32VQL(writer, buffer.byteLength);
    writer.write(buffer);
  }
}
export function deserialize(reader) {
  const type = reader.read(1).readUInt8(0);
  switch (type) {
    case 0:
      return void 0;
    case 1:
      return reader.read(readIntVQL(reader)).toString();
    case 2:
      return reader.read(readIntVQL(reader)).buffer;
    case 3:
      return reader.read(readIntVQL(reader));
    case 4: {
      const itemCount = readIntVQL(reader);
      const result = [];
      for (let i = 0; i < itemCount; i++) {
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
  constructor(protocol, context, _logger = null, timeoutDelay = 1e3) {
    this.protocol = protocol;
    this.ctx = context;
    this.timeoutDelay = timeoutDelay;
    this.protocolListener = this.protocol.onMessage((message) => this.onRawMessage(message));
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
  sendUnencodableResponseError(id, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    try {
      this.send([202, id], {
        message: `IPC response could not be encoded: ${detail}`,
        name: "Error",
        stack: void 0,
      });
    } catch (err) {
      onUnexpectedError(err);
    }
  }
  send(header, body = void 0) {
    const writer = new BufferWriter();
    serialize(writer, header);
    serialize(writer, body);
    return this.sendBuffer(writer.buffer);
  }
  sendBuffer(message) {
    try {
      this.protocol.send(message);
      return message.byteLength;
    } catch {
      return 0;
    }
  }
  onRawMessage(message) {
    const reader = new BufferReader(message);
    let header;
    try {
      header = deserialize(reader);
    } catch (err) {
      onUnexpectedError(
        new Error(
          `IPC request header could not be decoded (${message.byteLength} bytes): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      return;
    }
    if (!Array.isArray(header)) {
      onUnexpectedError(
        new Error(`IPC request header has an unexpected shape (${message.byteLength} bytes)`),
      );
      return;
    }
    const type = header[0];
    let body;
    try {
      body = deserialize(reader);
    } catch (err) {
      this.onUndecodableRequest(type, header, message.byteLength, err);
      return;
    }
    switch (type) {
      case 100:
        return this.onPromise({
          type,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body,
        });
      case 102:
        return this.onEventListen({
          type,
          id: header[1],
          channelName: header[2],
          name: header[3],
          arg: body,
        });
      case 101:
        return this.disposeActiveRequest({
          type,
          id: header[1],
        });
      case 103:
        return this.disposeActiveRequest({
          type,
          id: header[1],
        });
    }
  }
  /**
   * A request frame whose body could not be decoded. Reply with an error when
   * the request type expects one; a silently dropped frame would otherwise
   * leave the caller awaiting a response that can never arrive.
   */
  onUndecodableRequest(type, header, byteLength, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const channelName = typeof header[2] === "string" ? header[2] : "unknown";
    const methodName = typeof header[3] === "string" ? header[3] : "unknown";
    const error = new Error(
      `IPC request body could not be decoded for ${channelName}.${methodName} (${byteLength} bytes): ${detail}`,
    );
    onUnexpectedError(error);
    if (type !== 100) return;
    const id = header[1];
    if (typeof id !== "number") return;
    this.sendResponse({
      id,
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
    const id = request.id;
    promise
      .then(
        (data) => {
          this.sendResponse({
            id,
            data,
            type: 201,
            /* PromiseSuccess */
          });
        },
        (err) => {
          if (err instanceof Error) {
            this.sendResponse({
              id,
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
              id,
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
    const id = request.id;
    const event = channel.listen(this.ctx, request.name, request.arg);
    const listener = event((data) =>
      this.sendResponse({
        id,
        data,
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
    const timer = setTimeout(() => {
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
      timeoutTimer: timer,
    });
  }
  rejectPendingRequests(channelName, message) {
    const requests = this.pendingRequests.get(channelName);
    if (!requests) return;
    for (const request of requests) {
      clearTimeout(request.timeoutTimer);
      if (request.request.type === 100) {
        this.sendResponse({
          id: request.request.id,
          data: {
            name: "Unknown channel",
            message,
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
