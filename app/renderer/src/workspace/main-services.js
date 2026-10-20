/**
 * 主进程服务令牌与运行时配置（第 236 轮从 use-window-chrome chunk 取回）。
 *
 * 参考：use-window-chrome-DbNyfMCt.js
 *   IHiloApp 60924 / INativeWorkbenchService 60974 / IRendererPersistenceMainService 60978
 *   IResourceImageMainService 63079 / IResourceMediaMainService 63082 / disposables 63102
 *   instantiationService 63250 / useCurrentWorkspace 64952 / getRuntimeConfig 27047
 *
 * 这些是 DI 令牌与单例，占位为空会让工作台拿不到服务，所以必须取真实现。
 */

import reactExports from "react";
import { services } from "../canvas-v3/desktop-host-services.js";
import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_KEY, _cachedConfig } from "../infra/runtime-config.js";
import { InstantiationService } from "../settings/instantiation-service.js";
import { createDecorator } from "../settings/parse-custom-mcp-arguments.js";
import { CurrentWorkspaceContext } from "../infra/shared-runtime.js";
import { DisposableStore } from "../vendor-inline/vscode-base/linked-list.js";


export const INativeWorkbenchService = createDecorator("nativeWorkbenchService");
createDecorator(
  "rendererPersistenceService"
);

export const IRendererPersistenceMainService = createDecorator(
  "rendererPersistenceMainService"
);

export const IResourceMediaMainService = createDecorator(
  "resourceMediaMainService"
);

export const IResourceImageMainService = createDecorator(
  "resourceImageMainService"
);

export const IHiloApp = createDecorator("hiloApp");

export const instantiationService = new InstantiationService(services);
disposables.add(instantiationService);

export const disposables = new DisposableStore();

export function useCurrentWorkspace() {
  return reactExports.useContext(CurrentWorkspaceContext);
}

export function getRuntimeConfig() {
  if (_cachedConfig) return _cachedConfig;
  let raw = null;
  if (typeof window !== "undefined" && RUNTIME_CONFIG_KEY in window) {
    raw = window[RUNTIME_CONFIG_KEY];
  }
  if (!raw && typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="hilo-config"]');
    if (meta) {
      try {
        raw = JSON.parse(meta.getAttribute("content") ?? "{}");
      } catch {
      }
    }
  }
  if (raw) {
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null));
    _cachedConfig = { ...DEFAULT_RUNTIME_CONFIG, ...cleaned };
  } else {
    _cachedConfig = DEFAULT_RUNTIME_CONFIG;
  }
  return _cachedConfig;
}

