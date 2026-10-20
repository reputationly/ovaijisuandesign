/**
 * esbuild `--inject` 的最小 DOM 桩（第 206 轮）。
 *
 * 为什么需要：`canvas-v3/*` 里有些模块在**求值期**就访问 `document` / `window`
 * （主题订阅、`matchMedia` 等）。自检只测纯逻辑，不需要真 DOM，但需要这些全局
 * 存在，否则模块一加载就抛 `ReferenceError`。
 *
 * 之前这个桩放在 `/tmp/dom-stub.mjs`，没进仓库 —— 临时目录被清理后
 * 自检就全部失败。现在入库，`run-all.mjs` 用仓库内路径。
 */

const noop = () => {};

globalThis.document ??= {
  documentElement: { classList: { contains: () => false, add: noop, remove: noop }, style: {} },
  body: { appendChild: noop, removeChild: noop, addEventListener: noop, removeEventListener: noop },
  createElement: () => ({
    style: {},
    setAttribute: noop,
    appendChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
  }),
  createElementNS: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
  createTextNode: (text) => ({ nodeValue: text, textContent: text }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  visibilityState: "visible",
  head: { appendChild: noop },
};

globalThis.window ??= {
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
  addEventListener: noop,
  removeEventListener: noop,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  location: { href: "http://localhost/", origin: "http://localhost", search: "" },
  devicePixelRatio: 1,
};

globalThis.navigator ??= { onLine: true, userAgent: "node", clipboard: undefined };
globalThis.localStorage ??= { getItem: () => null, setItem: noop, removeItem: noop, length: 0 };
globalThis.matchMedia ??= globalThis.window.matchMedia;
globalThis.getComputedStyle ??= globalThis.window.getComputedStyle;
globalThis.requestAnimationFrame ??= (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);

// preload 桥：有些 canvas-v3 模块在求值期就取 `window.hilo.ipcRenderer`，
// 自检不测 IPC，但需要一个不会抛的占位。
const ipcStub = {
  invoke: async () => undefined,
  send: noop,
  on: noop,
  off: noop,
  once: noop,
  removeListener: noop,
  removeAllListeners: noop,
};
globalThis.window.hilo ??= {
  ipcRenderer: ipcStub,
  browser: undefined,
  logger: { warn: noop, error: noop, info: noop, debug: noop },
  platform: {},
};
globalThis.hilo ??= globalThis.window.hilo;
