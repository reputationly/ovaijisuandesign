/**
 * 插件 iframe 里的宿主桥。协议版本和画布宿主一致：握手、RPC、事件。
 * 插件通过 `hub.canvas.getNode()` 这类方法和宿主说话，不直接碰网关地址。
 */
export const HUB_SDK_SOURCE = String.raw`(function () {
  var VERSION = "2";
  var pending = new Map();
  var listeners = new Map();
  var sequence = 0;
  var host = { nodeId: null, app: null };
  var mainHandler = null;

  function post(frame) {
    window.parent.postMessage(frame, "*");
  }

  function call(method, args) {
    var id = "sdk-" + (++sequence);
    return new Promise(function (resolve, reject) {
      pending.set(id, { resolve: resolve, reject: reject });
      post({ kind: "hub:rpc:request", v: VERSION, id: id, method: method, args: args == null ? {} : args });
    });
  }

  function on(topic, listener) {
    var list = listeners.get(topic) || [];
    list.push(listener);
    listeners.set(topic, list);
    return function () {
      var current = listeners.get(topic) || [];
      listeners.set(topic, current.filter(function (item) { return item !== listener; }));
    };
  }

  function namespace(name, extra) {
    return new Proxy(extra || {}, {
      get: function (target, key) {
        if (key in target) return target[key];
        return function (args) { return call(name + "." + key, args); };
      },
    });
  }

  window.addEventListener("message", function (event) {
    var frame = event.data;
    if (!frame || frame.v !== VERSION) return;
    if (frame.kind === "hub:handshake" && frame.from === "host") {
      host.nodeId = frame.nodeId;
      host.app = frame.app;
      return;
    }
    if (frame.kind === "hub:rpc:response") {
      var waiter = pending.get(frame.id);
      if (!waiter) return;
      pending.delete(frame.id);
      if (frame.ok) waiter.resolve(frame.result);
      else {
        var error = new Error((frame.error && frame.error.message) || "hub error");
        error.code = frame.error && frame.error.code;
        waiter.reject(error);
      }
      return;
    }
    if (frame.kind === "hub:event") {
      (listeners.get(frame.topic) || []).forEach(function (listener) { listener(frame.payload); });
      if (frame.topic === "main:invoke" && mainHandler) mainHandler(frame.payload);
    }
  });

  window.hub = {
    get nodeId() { return host.nodeId; },
    get appInfo() { return host.app; },
    call: call,
    on: on,
    canvas: namespace("canvas"),
    storage: namespace("storage"),
    config: namespace("config"),
    billing: namespace("billing"),
    ui: namespace("ui"),
    log: namespace("log"),
    app: namespace("app"),
    chat: namespace("chat"),
    skill: namespace("skill"),
    dag: namespace("dag"),
    files: namespace("files"),
    python: namespace("python"),
    agent: namespace("agent", {
      set: function (handler) {
        post({ kind: "hub:event", v: VERSION, topic: handler ? "agent:registered" : "agent:unregistered", payload: null });
      },
    }),
    main: {
      set: function (handler) {
        mainHandler = handler || null;
        post({ kind: "hub:event", v: VERSION, topic: handler ? "main:registered" : "main:unregistered", payload: null });
      },
    },
  };
  post({ kind: "hub:handshake", v: VERSION, from: "sdk" });
})();
`;
