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
  VSCodeEvent as eventApi,
  applyMemberDecorators as applyMemberDecorators,
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
    this.protocolListener = this.protocol.onMessage((message) => this.onBuffer(message));
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
      call(command, argument, cancellationToken) {
        if (that.isDisposed) {
          return Promise.reject(new CancellationError());
        }
        return that.requestPromise(channelName, command, argument, cancellationToken);
      },
      listen(event, argument) {
        if (that.isDisposed) {
          return eventApi.None;
        }
        return that.requestEvent(channelName, event, argument);
      },
    };
  }
  requestPromise(channelName, commandName, argument, cancellationToken = CancellationToken.None) {
    const id = this.lastRequestId++;
    const type = 100;
    const request = {
      id,
      type,
      channelName,
      name: commandName,
      arg: argument,
    };
    if (cancellationToken.isCancellationRequested) {
      return Promise.reject(new CancellationError());
    }
    let disposable;
    let disposableWithRequestCancel;
    const result = new Promise((c, e) => {
      if (cancellationToken.isCancellationRequested) {
        return e(new CancellationError());
      }
      const doRequest = () => {
        const handler = (response) => {
          switch (response.type) {
            case 201:
              this.handlers.delete(id);
              c(response.data);
              break;
            case 202: {
              this.handlers.delete(id);
              const error = new Error(response.data.message);
              error.stack = Array.isArray(response.data.stack)
                ? response.data.stack.join("\n")
                : response.data.stack;
              error.name = response.data.name;
              e(error);
              break;
            }
            case 203:
              this.handlers.delete(id);
              e(response.data);
              break;
          }
        };
        this.handlers.set(id, handler);
        try {
          this.sendRequest(request);
        } catch (error) {
          this.handlers.delete(id);
          e(error);
        }
      };
      let uninitializedPromise = null;
      if (this.state === 1) {
        doRequest();
      } else {
        uninitializedPromise = createCancelablePromise((_token) => this.whenInitialized());
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
            id,
            type: 101,
            /* PromiseCancel */
          });
        }
        e(new CancellationError());
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
  requestEvent(channelName, eventName, argument) {
    const id = this.lastRequestId++;
    const type = 102;
    const request = {
      id,
      type,
      channelName,
      name: eventName,
      arg: argument,
    };
    let uninitializedPromise = null;
    const emitter = new Emitter({
      onWillAddFirstListener: () => {
        const doRequest = () => {
          this.activeRequests.add(emitter);
          try {
            this.sendRequest(request);
          } catch (error) {
            this.activeRequests.delete(emitter);
            onUnexpectedError(error);
          }
        };
        if (this.state === 1) {
          doRequest();
        } else {
          uninitializedPromise = createCancelablePromise((_token) => this.whenInitialized());
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
            id,
            type: 103,
            /* EventDispose */
          });
        }
        this.handlers.delete(id);
      },
    });
    const handler = (response) => emitter.fire(response.data);
    this.handlers.set(id, handler);
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
  onBuffer(message) {
    const reader = new BufferReader(message);
    let header;
    try {
      header = deserialize(reader);
    } catch (error) {
      onUnexpectedError(
        new Error(
          `IPC response header could not be decoded (${message.byteLength} bytes): ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return;
    }
    if (!Array.isArray(header)) {
      onUnexpectedError(
        new Error(`IPC response header has an unexpected shape (${message.byteLength} bytes)`),
      );
      return;
    }
    const type = header[0];
    let body;
    try {
      body = deserialize(reader);
    } catch (error) {
      this.onUndecodableResponse(type, header, message.byteLength, error);
      return;
    }
    switch (type) {
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
          data: body,
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
  onUndecodableResponse(type, header, byteLength, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const error = new Error(`IPC response could not be decoded (${byteLength} bytes): ${detail}`);
    onUnexpectedError(error);
    if (type !== 201 && type !== 202 && type !== 203) {
      return;
    }
    const id = header[1];
    if (typeof id !== "number") return;
    const handler = this.handlers.get(id);
    if (!handler) return;
    handler({
      type: 203,
      id,
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
    return eventApi.toPromise(this.onDidInitialize);
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
applyMemberDecorators([memoize], ChannelClient.prototype, "onDidInitializePromise");
export class IPCClient {
  channelClient;
  channelServer;
  constructor(protocol, context, ipcLogger = null) {
    const writer = new BufferWriter();
    serialize(writer, context);
    protocol.send(writer.buffer);
    this.channelClient = new ChannelClient(protocol, ipcLogger);
    this.channelServer = new ChannelServer(protocol, context, ipcLogger);
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
((ProxyChannel) => {
  function fromService(service, disposables, options) {
    const handler = service;
    const disableMarshalling = options?.disableMarshalling;
    const mapEventNameToEvent = new Map();
    for (const key in handler) {
      if (propertyIsEvent(key)) {
        mapEventNameToEvent.set(key, eventApi.buffer(handler[key], false, void 0, disposables));
      }
    }
    return new (class {
      listen(_context, event, argument) {
        const eventImpl = mapEventNameToEvent.get(event);
        if (eventImpl) {
          return eventImpl;
        }
        const target = handler[event];
        if (typeof target === "function") {
          if (propertyIsDynamicEvent(event)) {
            return target.call(handler, argument);
          }
          if (propertyIsEvent(event)) {
            mapEventNameToEvent.set(
              event,
              eventApi.buffer(handler[event], false, void 0, disposables),
            );
            return mapEventNameToEvent.get(event);
          }
        }
        throw new ErrorNoTelemetry(`Event not found: ${event}`);
      }
      call(_context, command, args) {
        const target = handler[command];
        if (typeof target === "function") {
          if (!disableMarshalling && Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
              args[i] = revive(args[i]);
            }
          }
          let result = target.apply(handler, args);
          if (!(result instanceof Promise)) {
            result = Promise.resolve(result);
          }
          return result;
        }
        throw new ErrorNoTelemetry(`Method not found: ${command}`);
      }
    })();
  }
  ProxyChannel.fromService = fromService;
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
              return (argument) => channel.listen(propKey, argument);
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
  ProxyChannel.toService = toService;
  function propertyIsEvent(propertyName) {
    return propertyName[0] === "o" && propertyName[1] === "n" && isUpperAsciiLetter(propertyName.charCodeAt(2));
  }
  function propertyIsDynamicEvent(propertyName) {
    return /^onDynamic/.test(propertyName) && isUpperAsciiLetter(propertyName.charCodeAt(9));
  }
})(ProxyChannel || (ProxyChannel = {}));
