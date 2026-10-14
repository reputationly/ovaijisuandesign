// 下面这些声明形状像已装的库，但还没逐个对上公开实现，先留在这个文件。
// useSensor / useSensors 像 @dnd-kit/core。useVirtualizer 像没安装的 @tanstack/react-virtual。
// m$4 像 react-error-boundary，和已装的 ErrorBoundary 不是同一份。
// M$3、x$4、U$3、z$3 是主题脚本，z$3 被当作 useTheme，仓库里没有 next-themes。
// createFileRoute / lazyRouteComponent 像 @tanstack/react-router 的文件路由，和已装版本对不上。
// ClientOnly 没有调用方，删掉之前留着，避免把它当成应用模块。
import { useHydrated, createRoute, reactUse } from "@tanstack/react-router";
import { isModuleNotFoundError } from "@tanstack/router-core";
import { ErrorBoundary as C$5 } from "react-error-boundary";
import reactExports from "react";

import jsxRuntimeExports from "react/jsx-runtime";

import reactDomExports from "react-dom";

import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@tanstack/virtual-core";

function useSensor(sensor, options) {
  return reactExports.useMemo(() => ({
    sensor,
    options: options != null ? options : {}
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sensor, options]);
}
function useSensors() {
  for (var _len = arguments.length, sensors = new Array(_len), _key = 0; _key < _len; _key++) {
    sensors[_key] = arguments[_key];
  }
  return reactExports.useMemo(() => [...sensors].filter(sensor => sensor != null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [...sensors]);
}

const useIsomorphicLayoutEffect = typeof document !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
function useVirtualizerBase({
  useFlushSync = true,
  ...options
}) {
  const rerender = reactExports.useReducer(() => ({}), {})[1];
  const resolvedOptions = {
    ...options,
    onChange: (instance22, sync) => {
      var _a2;
      if (useFlushSync && sync) {
        reactDomExports.flushSync(rerender);
      } else {
        rerender();
      }
      (_a2 = options.onChange) == null ? void 0 : _a2.call(options, instance22, sync);
    }
  };
  const [instance2] = reactExports.useState(() => new Virtualizer(resolvedOptions));
  instance2.setOptions(resolvedOptions);
  useIsomorphicLayoutEffect(() => {
    return instance2._didMount();
  }, []);
  useIsomorphicLayoutEffect(() => {
    return instance2._willUpdate();
  });
  return instance2;
}
function useVirtualizer(options) {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  });
}

function ClientOnly({
  children: children2,
  fallback = null
}) {
  return useHydrated() ? /* @__PURE__ */jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: children2
  }) : /* @__PURE__ */jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: fallback
  });
}

function createFileRoute(path2) {
  if (typeof path2 === "object") return new FileRoute(path2, {
    silent: true
  }).createRoute(path2);
  return new FileRoute(path2, {
    silent: true
  }).createRoute;
}
var FileRoute = class {
  constructor(path2, _opts) {
    this.path = path2;
    this.createRoute = options => {
      const route = createRoute(options);
      route.isRoot = false;
      return route;
    };
    this.silent = _opts?.silent;
  }
};
function lazyRouteComponent(importer, exportName) {
  let loadPromise;
  let comp;
  let error;
  let reload;
  const load2 = () => {
    if (!loadPromise) loadPromise = importer().then(res => {
      loadPromise = void 0;
      comp = res[exportName];
    }).catch(err => {
      error = err;
      if (isModuleNotFoundError(error)) {
        if (error instanceof Error && typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
          const storageKey2 = `tanstack_router_reload:${error.message}`;
          if (!sessionStorage.getItem(storageKey2)) {
            sessionStorage.setItem(storageKey2, "1");
            reload = true;
          }
        }
      }
    });
    return loadPromise;
  };
  const lazyComp = function Lazy(props) {
    if (reload) {
      window.location.reload();
      throw new Promise(() => {});
    }
    if (error) throw error;
    if (!comp) if (reactUse) reactUse(load2());else throw load2();
    return reactExports.createElement(comp, props);
  };
  lazyComp.preload = load2;
  return lazyComp;
}

var M$3 = (e2, i2, s2, u4, m3, a2, l2, h2) => {
  let d2 = document.documentElement,
    w3 = ["light", "dark"];
  function p3(n2) {
    (Array.isArray(e2) ? e2 : [e2]).forEach(y4 => {
      let k2 = y4 === "class",
        S3 = k2 && a2 ? m3.map(f2 => a2[f2] || f2) : m3;
      k2 ? (d2.classList.remove(...S3), d2.classList.add(a2 && a2[n2] ? a2[n2] : n2)) : d2.setAttribute(y4, n2);
    }), R2(n2);
  }
  function R2(n2) {
    h2 && w3.includes(n2) && (d2.style.colorScheme = n2);
  }
  function c3() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (u4) p3(u4);else try {
    let n2 = localStorage.getItem(i2) || s2,
      y4 = l2 && n2 === "system" ? c3() : n2;
    p3(y4);
  } catch (n2) {}
};
var x$4 = reactExports.createContext(void 0),
  U$3 = {
    setTheme: e2 => {},
    themes: []
  },
  z$3 = () => {
    var e2;
    return (e2 = reactExports.useContext(x$4)) != null ? e2 : U$3;
  };
reactExports.memo(({
  forcedTheme: e2,
  storageKey: i2,
  attribute: s2,
  enableSystem: u4,
  enableColorScheme: m3,
  defaultTheme: a2,
  value: l2,
  themes: h2,
  nonce: d2,
  scriptProps: w3
}) => {
  let p3 = JSON.stringify([s2, i2, a2, e2, h2, l2, u4, m3]).slice(1, -1);
  return reactExports.createElement("script", {
    ...w3,
    suppressHydrationWarning: true,
    nonce: typeof window == "undefined" ? d2 : "",
    dangerouslySetInnerHTML: {
      __html: `(${M$3.toString()})(${p3})`
    }
  });
});

const h$4 = reactExports.createContext(null),
  c$3 = {
    didCatch: false,
    error: null
  };
let m$4 = class m extends reactExports.Component {
  constructor(e2) {
    super(e2), this.resetErrorBoundary = this.resetErrorBoundary.bind(this), this.state = c$3;
  }
  static getDerivedStateFromError(e2) {
    return {
      didCatch: true,
      error: e2
    };
  }
  resetErrorBoundary(...e2) {
    const {
      error: t2
    } = this.state;
    t2 !== null && (this.props.onReset?.({
      args: e2,
      reason: "imperative-api"
    }), this.setState(c$3));
  }
  componentDidCatch(e2, t2) {
    this.props.onError?.(e2, t2);
  }
  componentDidUpdate(e2, t2) {
    const {
        didCatch: o2
      } = this.state,
      {
        resetKeys: s2
      } = this.props;
    o2 && t2.error !== null && C$5(e2.resetKeys, s2) && (this.props.onReset?.({
      next: s2,
      prev: e2.resetKeys,
      reason: "keys"
    }), this.setState(c$3));
  }
  render() {
    const {
        children: e2,
        fallbackRender: t2,
        FallbackComponent: o2,
        fallback: s2
      } = this.props,
      {
        didCatch: n2,
        error: a2
      } = this.state;
    let i2 = e2;
    if (n2) {
      const u4 = {
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      };
      if (typeof t2 == "function") i2 = t2(u4);else if (o2) i2 = reactExports.createElement(o2, u4);else if (s2 !== void 0) i2 = s2;else throw a2;
    }
    return reactExports.createElement(h$4.Provider, {
      value: {
        didCatch: n2,
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      }
    }, i2);
  }
};

export { U$3, createFileRoute, lazyRouteComponent, m$4, useSensor, useSensors, useVirtualizer, x$4, z$3 };

