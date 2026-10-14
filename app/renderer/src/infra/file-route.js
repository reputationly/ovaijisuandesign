// 文件路由和懒加载组件像 @tanstack/react-router，和已装版本对不上，启动入口还在用。
// ClientOnly 目前没有调用方，留在这里是为了不丢掉这段已有行为。
import { useHydrated, createRoute, reactUse } from "@tanstack/react-router";
import { isModuleNotFoundError } from "@tanstack/router-core";
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";

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

export { ClientOnly, createFileRoute, lazyRouteComponent };
