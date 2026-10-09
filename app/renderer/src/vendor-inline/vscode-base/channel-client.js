// channel-client.js
import {
  CancellationError,
  ErrorNoTelemetry,
  createSingleCallFunction,
  dispose,
  onUnexpectedError,
} from "./linked-list.js";
import {
  BufferReader,
  BufferWriter,
  CancellationToken,
  ChannelServer,
  Emitter,
  Event$1,
  __decorateClass$1,
  createCancelablePromise,
  deserialize,
  isUndefinedOrNull,
  isUpperAsciiLetter,
  memoize,
  revive,
  serialize,
} from "./vs-buffer.js";
class ChannelClient {
  constructor(protocol, _logger = null) {
    this.protocol = protocol;
    this.protocolListener = this.protocol.onMessage((msg) => this.onBuffer(msg));
  }
  isDisposed = false;
  state = 0;
  activeRequests = new Set();
  handlers = new Map();
  lastRequestId = 0;
  protocolListener;
  _onDidInitialize = new Emitter();
  onDidInitialize = this._onDidInitialize.event;
  getChannel(channelName) {
    const that = this;
    return {
      call(command2, arg, cancellationToken) {
        if (that.isDisposed) {
          return Promise.reject(new CancellationError());
        }
        return that.requestPromise(channelName, command2, arg, cancellationToken);
      },
      listen(event, arg) {
        if (that.isDisposed) {
          return Event$1.None;
        }
        return that.requestEvent(channelName, event, arg);
      },
    };
  }
  requestPromise(channelName, name2, arg, cancellationToken = CancellationToken.None) {
    const id2 = this.lastRequestId++;
    const type2 = 100;
    const request = {
      id: id2,
      type: type2,
      channelName,
      name: name2,
      arg,
    };
    if (cancellationToken.isCancellationRequested) {
      return Promise.reject(new CancellationError());
    }
    let disposable;
    let disposableWithRequestCancel;
    const result = new Promise((c3, e2) => {
      if (cancellationToken.isCancellationRequested) {
        return e2(new CancellationError());
      }
      const doRequest = () => {
        const handler = (response) => {
          switch (response.type) {
            case 201:
              this.handlers.delete(id2);
              c3(response.data);
              break;
            case 202: {
              this.handlers.delete(id2);
              const error = new Error(response.data.message);
              error.stack = Array.isArray(response.data.stack)
                ? response.data.stack.join("\n")
                : response.data.stack;
              error.name = response.data.name;
              e2(error);
              break;
            }
            case 203:
              this.handlers.delete(id2);
              e2(response.data);
              break;
          }
        };
        this.handlers.set(id2, handler);
        try {
          this.sendRequest(request);
        } catch (err) {
          this.handlers.delete(id2);
          e2(err);
        }
      };
      let uninitializedPromise = null;
      if (this.state === 1) {
        doRequest();
      } else {
        uninitializedPromise = createCancelablePromise((_2) => this.whenInitialized());
        uninitializedPromise.then(() => {
          uninitializedPromise = null;
          doRequest();
        });
      }
      const cancel = () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel();
          uninitializedPromise = null;
        } else {
          this.sendRequest({
            id: id2,
            type: 101,
            /* PromiseCancel */
          });
        }
        e2(new CancellationError());
      };
      disposable = cancellationToken.onCancellationRequested(cancel);
      disposableWithRequestCancel = {
        dispose: createSingleCallFunction(() => {
          cancel();
          disposable.dispose();
        }),
      };
      this.activeRequests.add(disposableWithRequestCancel);
    });
    return result.finally(() => {
      disposable?.dispose();
      this.activeRequests.delete(disposableWithRequestCancel);
    });
  }
  requestEvent(channelName, name2, arg) {
    const id2 = this.lastRequestId++;
    const type2 = 102;
    const request = {
      id: id2,
      type: type2,
      channelName,
      name: name2,
      arg,
    };
    let uninitializedPromise = null;
    const emitter = new Emitter({
      onWillAddFirstListener: () => {
        const doRequest = () => {
          this.activeRequests.add(emitter);
          try {
            this.sendRequest(request);
          } catch (err) {
            this.activeRequests.delete(emitter);
            onUnexpectedError(err);
          }
        };
        if (this.state === 1) {
          doRequest();
        } else {
          uninitializedPromise = createCancelablePromise((_2) => this.whenInitialized());
          uninitializedPromise.then(() => {
            uninitializedPromise = null;
            doRequest();
          });
        }
      },
      onDidRemoveLastListener: () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel();
          uninitializedPromise = null;
        } else {
          this.activeRequests.delete(emitter);
          this.sendRequest({
            id: id2,
            type: 103,
            /* EventDispose */
          });
        }
        this.handlers.delete(id2);
      },
    });
    const handler = (res) => emitter.fire(res.data);
    this.handlers.set(id2, handler);
    return emitter.event;
  }
  sendRequest(request) {
    switch (request.type) {
      case 100:
      case 102: {
        this.send([request.type, request.id, request.channelName, request.name], request.arg);
        return;
      }
      case 101:
      case 103: {
        this.send([request.type, request.id]);
        return;
      }
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
  onBuffer(message2) {
    const reader = new BufferReader(message2);
    let header;
    try {
      header = deserialize(reader);
    } catch (err) {
      onUnexpectedError(
        new Error(
          `IPC response header could not be decoded (${message2.byteLength} bytes): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      return;
    }
    if (!Array.isArray(header)) {
      onUnexpectedError(
        new Error(`IPC response header has an unexpected shape (${message2.byteLength} bytes)`),
      );
      return;
    }
    const type2 = header[0];
    let body2;
    try {
      body2 = deserialize(reader);
    } catch (err) {
      this.onUndecodableResponse(type2, header, message2.byteLength, err);
      return;
    }
    switch (type2) {
      case 200:
        return this.onResponse({
          type: header[0],
        });
      case 201:
      case 202:
      case 204:
      case 203:
        return this.onResponse({
          type: header[0],
          id: header[1],
          data: body2,
        });
    }
  }
  /**
   * A response frame whose body could not be decoded. Reject the pending call
   * so it does not hang forever.
   *
   * Only promise replies are settled here: `handlers` also holds event
   * emitters, whose handler forwards `data` straight to subscribers, so
   * injecting an error there would surface as a bogus event payload.
   */
  onUndecodableResponse(type2, header, byteLength, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const error = new Error(`IPC response could not be decoded (${byteLength} bytes): ${detail}`);
    onUnexpectedError(error);
    if (type2 !== 201 && type2 !== 202 && type2 !== 203) {
      return;
    }
    const id2 = header[1];
    if (typeof id2 !== "number") return;
    const handler = this.handlers.get(id2);
    if (!handler) return;
    handler({
      type: 203,
      id: id2,
      data: error,
    });
  }
  onResponse(response) {
    if (response.type === 200) {
      this.state = 1;
      this._onDidInitialize.fire();
      return;
    }
    const handler = this.handlers.get(response.id);
    handler?.(response);
  }
  get onDidInitializePromise() {
    return Event$1.toPromise(this.onDidInitialize);
  }
  whenInitialized() {
    if (this.state === 1) {
      return Promise.resolve();
    } else {
      return this.onDidInitializePromise;
    }
  }
  dispose() {
    this.isDisposed = true;
    if (this.protocolListener) {
      this.protocolListener.dispose();
      this.protocolListener = null;
    }
    dispose(this.activeRequests.values());
    this.activeRequests.clear();
    this._onDidInitialize.dispose();
  }
}
__decorateClass$1([memoize], ChannelClient.prototype, "onDidInitializePromise");
export class IPCClient {
  channelClient;
  channelServer;
  constructor(protocol, ctx, ipcLogger = null) {
    const writer = new BufferWriter();
    serialize(writer, ctx);
    protocol.send(writer.buffer);
    this.channelClient = new ChannelClient(protocol, ipcLogger);
    this.channelServer = new ChannelServer(protocol, ctx, ipcLogger);
  }
  getChannel(channelName) {
    return this.channelClient.getChannel(channelName);
  }
  registerChannel(channelName, channel) {
    this.channelServer.registerChannel(channelName, channel);
  }
  unregisterChannel(channelName) {
    this.channelServer.unregisterChannel(channelName);
  }
  dispose() {
    this.channelClient.dispose();
    this.channelServer.dispose();
  }
}
export var ProxyChannel;
((ProxyChannel2) => {
  function fromService(service2, disposables2, options) {
    const handler = service2;
    const disableMarshalling = options?.disableMarshalling;
    const mapEventNameToEvent = new Map();
    for (const key2 in handler) {
      if (propertyIsEvent(key2)) {
        mapEventNameToEvent.set(key2, Event$1.buffer(handler[key2], false, void 0, disposables2));
      }
    }
    return new (class {
      listen(_2, event, arg) {
        const eventImpl = mapEventNameToEvent.get(event);
        if (eventImpl) {
          return eventImpl;
        }
        const target = handler[event];
        if (typeof target === "function") {
          if (propertyIsDynamicEvent(event)) {
            return target.call(handler, arg);
          }
          if (propertyIsEvent(event)) {
            mapEventNameToEvent.set(
              event,
              Event$1.buffer(handler[event], false, void 0, disposables2),
            );
            return mapEventNameToEvent.get(event);
          }
        }
        throw new ErrorNoTelemetry(`Event not found: ${event}`);
      }
      call(_2, command2, args) {
        const target = handler[command2];
        if (typeof target === "function") {
          if (!disableMarshalling && Array.isArray(args)) {
            for (let i2 = 0; i2 < args.length; i2++) {
              args[i2] = revive(args[i2]);
            }
          }
          let res = target.apply(handler, args);
          if (!(res instanceof Promise)) {
            res = Promise.resolve(res);
          }
          return res;
        }
        throw new ErrorNoTelemetry(`Method not found: ${command2}`);
      }
    })();
  }
  ProxyChannel2.fromService = fromService;
  function toService(channel, options) {
    const disableMarshalling = options?.disableMarshalling;
    return new Proxy(
      {},
      {
        get(_target, propKey) {
          if (propKey === "then") {
            return void 0;
          }
          if (typeof propKey === "string") {
            if (options?.properties?.has(propKey)) {
              return options.properties.get(propKey);
            }
            if (propertyIsDynamicEvent(propKey)) {
              return (arg) => channel.listen(propKey, arg);
            }
            if (propertyIsEvent(propKey)) {
              return channel.listen(propKey);
            }
            return async (...args) => {
              let methodArgs;
              if (options && !isUndefinedOrNull(options.context)) {
                methodArgs = [options.context, ...args];
              } else {
                methodArgs = args;
              }
              const result = await channel.call(propKey, methodArgs);
              if (!disableMarshalling) {
                return revive(result);
              }
              return result;
            };
          }
          throw new ErrorNoTelemetry(`Property not found: ${String(propKey)}`);
        },
      },
    );
  }
  ProxyChannel2.toService = toService;
  function propertyIsEvent(name2) {
    return name2[0] === "o" && name2[1] === "n" && isUpperAsciiLetter(name2.charCodeAt(2));
  }
  function propertyIsDynamicEvent(name2) {
    return /^onDynamic/.test(name2) && isUpperAsciiLetter(name2.charCodeAt(9));
  }
})(ProxyChannel || (ProxyChannel = {}));
