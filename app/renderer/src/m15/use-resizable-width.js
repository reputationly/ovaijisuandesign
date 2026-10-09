// use-resizable-width.js
import {
  reactExports,
  useRenderElement,
  API_PATHS,
  useGatewayScope,
  useQuery,
  QUERY_KEY$1,
  ProgressRootContext,
  formatErrorMessage,
  progressStateAttributesMapping,
  valueToPercent,
  reactDomExports,
} from "../vendor.js";
import { gatewayFetchFromBase, gatewayUrlFromBase } from "./agent-ws-client.jsx";
import { AuthContext, useOptionalTeamAccount } from "./apply-asset-change.jsx";
import { canUseDebugTooling } from "./create-visible-preview-tabs-store.js";
import { RuntimeConfigContext } from "./graph.jsx";
export function useGatewayScopeKey() {
  return useGatewayScope().scopeKey;
}
export function useGatewayReady$1() {
  return useGatewayScope().gatewayReady;
}
export function useGatewayUrl() {
  const { baseUrl, gatewayBinding, workspaceClaim, workspaceClient } = useGatewayScope();
  return reactExports.useCallback(
    (path2) =>
      workspaceClient?.url(path2) ??
      gatewayUrlFromBase(baseUrl, path2, gatewayBinding ?? workspaceClaim),
    [baseUrl, gatewayBinding, workspaceClaim, workspaceClient],
  );
}
export function useGatewayFetch() {
  const { baseUrl, gatewayBinding, workspaceClaim, workspaceClient, recoverWorkspace } =
    useGatewayScope();
  return reactExports.useCallback(
    (path2, options) =>
      gatewayFetchFromBase(baseUrl, path2, {
        ...options,
        workspaceBinding: options?.workspaceBinding ?? gatewayBinding,
        workspaceClaim: options?.workspaceClaim ?? workspaceClaim,
        workspaceClient: options?.workspaceClient ?? workspaceClient,
        recoverWorkspace: options?.recoverWorkspace ?? recoverWorkspace,
      }),
    [baseUrl, gatewayBinding, recoverWorkspace, workspaceClaim, workspaceClient],
  );
}
const authSessionKeys = new WeakMap();
let nextAuthSessionKey = 1;
function getAuthSessionKey(user) {
  if (!user) return "anonymous";
  const existing = authSessionKeys.get(user);
  if (existing !== void 0) return `session:${existing}`;
  const created = nextAuthSessionKey;
  nextAuthSessionKey += 1;
  authSessionKeys.set(user, created);
  return `session:${created}`;
}
export function useModelCatalogScopeKey() {
  const auth = reactExports.useContext(AuthContext);
  const teamAccount = useOptionalTeamAccount();
  const authSessionKey = getAuthSessionKey(auth?.user);
  const identityKey = teamAccount?.snapshot?.identityKey ?? auth?.user?.userID ?? "no-identity";
  const activeContext = teamAccount?.snapshot?.activeContext;
  return reactExports.useMemo(
    () =>
      JSON.stringify([
        authSessionKey,
        identityKey,
        activeContext?.groupId ?? "no-group",
        activeContext?.epoch ?? "no-epoch",
        activeContext?.membershipRevision ?? "no-membership-revision",
      ]),
    [
      activeContext?.epoch,
      activeContext?.groupId,
      activeContext?.membershipRevision,
      authSessionKey,
      identityKey,
    ],
  );
}
const STALE_24H$1 = 24 * 60 * 60 * 1e3;
const REGISTRY_RETRY_COUNT = 5;
const REGISTRY_RETRY_DELAY_MS = 300;
function normalizeMediaModelParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const params = value;
  const resolution = params.resolution;
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) return void 0;
  const options = resolution.options;
  if (!Array.isArray(options)) return void 0;
  return {
    resolution: {
      options: options.filter((option2) => typeof option2 === "string"),
    },
  };
}
function normalizePromotion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const promotion = value;
  if (
    typeof promotion.toastTitle !== "string" ||
    typeof promotion.toast !== "string" ||
    typeof promotion.startTime !== "number" ||
    typeof promotion.endTime !== "number"
  ) {
    return void 0;
  }
  return {
    toastTitle: promotion.toastTitle,
    toast: promotion.toast,
    startTime: promotion.startTime,
    endTime: promotion.endTime,
    ...(typeof promotion.cost === "number"
      ? {
          cost: promotion.cost,
        }
      : {}),
    ...(typeof promotion.costPerSecond === "number"
      ? {
          costPerSecond: promotion.costPerSecond,
        }
      : {}),
    ...(typeof promotion.costPerImage === "number"
      ? {
          costPerImage: promotion.costPerImage,
        }
      : {}),
  };
}
function normalizeModelInfo(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const model = value;
  if (
    typeof model.id !== "string" ||
    typeof model.type !== "string" ||
    typeof model.display_name !== "string"
  ) {
    return null;
  }
  const promotion = normalizePromotion(model.promotion);
  const params = normalizeMediaModelParams(model.params);
  return {
    id: model.id,
    type: model.type,
    display_name: model.display_name,
    ...(typeof model.model_name === "string"
      ? {
          model_name: model.model_name,
        }
      : {}),
    description: typeof model.description === "string" ? model.description : "",
    tool_names: Array.isArray(model.tool_names)
      ? model.tool_names.filter((name2) => typeof name2 === "string")
      : [],
    visibility: typeof model.visibility === "string" ? model.visibility : "",
    icon_url: typeof model.icon_url === "string" ? model.icon_url : "",
    series_id: typeof model.series_id === "string" ? model.series_id : "",
    hot: model.hot === true,
    ...(promotion
      ? {
          promotion,
        }
      : {}),
    ...(params
      ? {
          params,
        }
      : {}),
  };
}
function normalizeMediaModelsResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("media model registry returned an invalid response");
  }
  const models = value.models;
  if (!Array.isArray(models)) {
    throw new Error("media model registry response is missing models");
  }
  const normalized = models.flatMap((model) => {
    const normalized2 = normalizeModelInfo(model);
    return normalized2 ? [normalized2] : [];
  });
  if (normalized.length === 0) {
    throw new Error("media model registry returned no valid models");
  }
  return normalized;
}
export function useMediaModels() {
  const gatewayFetch2 = useGatewayFetch();
  const catalogScopeKey = useModelCatalogScopeKey();
  const { gatewayReady, scopeKey, gatewayBinding } = useGatewayScope();
  const registryScopeKey = [
    scopeKey,
    gatewayBinding?.instanceId ?? "pending",
    gatewayBinding?.generation ?? 0,
  ].join(":");
  return useQuery({
    queryKey: [...QUERY_KEY$1, catalogScopeKey, registryScopeKey],
    queryFn: async ({ signal }) => {
      const resp = await gatewayFetch2(API_PATHS.modelsConfig, {
        signal,
      });
      if (!resp.ok) throw new Error(`model registry failed with HTTP ${resp.status}`);
      const payload = await resp.json();
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const typed = payload;
        const grouped = ["imageModels", "videoModels", "audioModels"].flatMap((key2) =>
          Array.isArray(typed[key2]) ? typed[key2] : [],
        );
        if (grouped.length > 0) {
          return normalizeMediaModelsResponse({
            models: grouped,
          });
        }
      }
      return normalizeMediaModelsResponse(payload);
    },
    staleTime: STALE_24H$1,
    retry: REGISTRY_RETRY_COUNT,
    retryDelay: REGISTRY_RETRY_DELAY_MS,
    enabled: gatewayReady,
  });
}
function useProgressRootContext() {
  const context = reactExports.useContext(ProgressRootContext);
  if (context === void 0) {
    throw new Error(formatErrorMessage(51));
  }
  return context;
}
export const ProgressTrack$1 = reactExports.forwardRef(
  function ProgressTrack2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { state: state2 } = useProgressRootContext();
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: elementProps,
      stateAttributesMapping: progressStateAttributesMapping,
    });
    return element2;
  },
);
export const ProgressIndicator$1 = reactExports.forwardRef(
  function ProgressIndicator2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { max: max2, min: min2, value, state: state2 } = useProgressRootContext();
    const percentageValue =
      Number.isFinite(value) && value !== null ? valueToPercent(value, min2, max2) : null;
    const getStyles2 = reactExports.useCallback(() => {
      if (percentageValue == null) {
        return {};
      }
      return {
        insetInlineStart: 0,
        height: "inherit",
        width: `${percentageValue}%`,
      };
    }, [percentageValue]);
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: [
        {
          style: getStyles2(),
        },
        elementProps,
      ],
      stateAttributesMapping: progressStateAttributesMapping,
    });
    return element2;
  },
);
export function folderNameFromPath(fullPath) {
  return fullPath.split(/[/\\]/).filter(Boolean).pop() || fullPath;
}
export function workspaceDisplayName(workspace) {
  const custom = workspace.displayName?.trim();
  return custom ? custom : folderNameFromPath(workspace.path);
}
export function formatTimestampDot(ts2) {
  const d2 = new Date(ts2);
  return `${d2.getFullYear()}.${d2.getMonth() + 1}.${d2.getDate()}`;
}
export const ACTIVE_CUSTOM_MODEL_QUERY_KEY = ["active-custom-model"];
export function resolveActiveModelId(selected2, _active) {
  return selected2 ?? null;
}
function clamp$2(value, min2, max2) {
  return Math.min(max2, Math.max(min2, value));
}
export function useResizableWidth({
  defaultWidth,
  minWidth,
  maxWidth,
  storage,
  externalValue,
  invertDelta = false,
}) {
  const [width, setWidth] = reactExports.useState(() => {
    const seed = externalValue ?? storage?.read();
    return typeof seed === "number" && Number.isFinite(seed)
      ? clamp$2(seed, minWidth, maxWidth)
      : defaultWidth;
  });
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const draggingRef = reactExports.useRef(false);
  const startX = reactExports.useRef(0);
  const startW = reactExports.useRef(0);
  const latestW = reactExports.useRef(width);
  const storageRef = reactExports.useRef(storage);
  storageRef.current = storage;
  const activeDragRef = reactExports.useRef(null);
  const releaseActiveDrag = reactExports.useCallback((persist2, updateState = true) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag) return;
    document.removeEventListener("mousemove", activeDrag.onMove);
    document.removeEventListener("mouseup", activeDrag.onUp);
    window.removeEventListener("blur", activeDrag.onBlur);
    document.body.style.cursor = activeDrag.previousCursor;
    document.body.style.userSelect = activeDrag.previousUserSelect;
    if (activeDrag.previousColumnResizeActive === void 0) {
      delete document.documentElement.dataset.columnResizeActive;
    } else {
      document.documentElement.dataset.columnResizeActive = activeDrag.previousColumnResizeActive;
    }
    activeDragRef.current = null;
    draggingRef.current = false;
    if (updateState) setIsDragging(false);
    if (persist2) storageRef.current?.write(Math.round(latestW.current));
  }, []);
  reactExports.useEffect(
    () => () => {
      releaseActiveDrag(false, false);
    },
    [releaseActiveDrag],
  );
  reactExports.useEffect(() => {
    if (
      draggingRef.current ||
      typeof externalValue !== "number" ||
      !Number.isFinite(externalValue)
    ) {
      return;
    }
    const next2 = clamp$2(externalValue, minWidth, maxWidth);
    latestW.current = next2;
    setWidth((previous2) => (previous2 === next2 ? previous2 : next2));
  }, [externalValue, maxWidth, minWidth]);
  const onValueChange = reactExports.useCallback(
    (value) => {
      const next2 = clamp$2(value, minWidth, maxWidth);
      latestW.current = next2;
      setWidth(next2);
      storage?.write(Math.round(next2));
    },
    [maxWidth, minWidth, storage],
  );
  const onMouseDown = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      releaseActiveDrag(false);
      draggingRef.current = true;
      setIsDragging(true);
      startX.current = e2.clientX;
      startW.current = width;
      latestW.current = width;
      const onMove = (ev) => {
        if (!draggingRef.current) return;
        const delta = invertDelta ? startX.current - ev.clientX : ev.clientX - startX.current;
        const next2 = clamp$2(startW.current + delta, minWidth, maxWidth);
        latestW.current = next2;
        reactDomExports.flushSync(() => setWidth(next2));
      };
      const onUp = () => releaseActiveDrag(true);
      const onBlur = () => releaseActiveDrag(true);
      activeDragRef.current = {
        onMove,
        onUp,
        onBlur,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
        previousColumnResizeActive: document.documentElement.dataset.columnResizeActive,
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      window.addEventListener("blur", onBlur);
      document.documentElement.dataset.columnResizeActive = "true";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, minWidth, maxWidth, invertDelta, releaseActiveDrag],
  );
  const reset2 = reactExports.useCallback(() => {
    latestW.current = defaultWidth;
    setWidth(defaultWidth);
    storage?.write(defaultWidth);
  }, [defaultWidth, storage]);
  return {
    width,
    isDragging,
    onMouseDown,
    onValueChange,
    reset: reset2,
  };
}
export function useRuntimeConfig() {
  const ctx = reactExports.useContext(RuntimeConfigContext);
  if (!ctx) throw new Error("useRuntimeConfig must be used within AppProviders");
  return ctx;
}
export const ThemeCtx = reactExports.createContext(null);
export function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function resolveTheme(theme2) {
  return theme2 === "system" ? getSystemTheme() : theme2;
}
export function applyClass(resolved) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
export function useTheme() {
  const ctx = reactExports.useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within AppProviders");
  return ctx;
}
const UPDATER_DEV_PREVIEW_EVENT = "hub:updater-dev-preview-change";
const STORAGE_KEY$5 = "hilo-updater-preview";
function canUseUpdaterDevPreview() {
  return canUseDebugTooling();
}
function getUpdaterDevPreviewMode() {
  if (!canUseUpdaterDevPreview()) return null;
  const value = globalThis.sessionStorage?.getItem(STORAGE_KEY$5);
  return value === "forced" ||
    value === "normal" ||
    value === "downloading" ||
    value === "downloaded" ||
    value === "error"
    ? value
    : null;
}
export function setUpdaterDevPreviewMode(mode2) {
  if (!canUseUpdaterDevPreview()) return;
  if (mode2 === "off") {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY$5);
  } else {
    globalThis.sessionStorage?.setItem(STORAGE_KEY$5, mode2);
  }
  globalThis.window?.dispatchEvent(
    new CustomEvent(UPDATER_DEV_PREVIEW_EVENT, {
      detail: {
        mode: mode2,
      },
    }),
  );
}
function subscribeUpdaterDevPreview(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(UPDATER_DEV_PREVIEW_EVENT, listener);
  return () => window.removeEventListener(UPDATER_DEV_PREVIEW_EVENT, listener);
}
export function useUpdaterDevPreviewMode() {
  return reactExports.useSyncExternalStore(
    subscribeUpdaterDevPreview,
    getUpdaterDevPreviewMode,
    () => null,
  );
}
export function createUpdaterDevPreviewState(mode2) {
  const phase =
    mode2 === "downloading"
      ? "downloading"
      : mode2 === "downloaded"
        ? "downloaded"
        : mode2 === "error"
          ? "error"
          : "available";
  const progress =
    mode2 === "downloading"
      ? {
          percent: 55,
          bytesPerSecond: 1.7 * 1024 * 1024,
          transferred: 55 * 1024 * 1024,
          total: 100 * 1024 * 1024,
          delta: 1.7 * 1024 * 1024,
        }
      : null;
  return {
    phase,
    forced: mode2 === "forced",
    policyStatus: "ready",
    forceSource: mode2 === "forced" ? "cdn" : "none",
    manualDownloadUrl: mode2 === "forced" ? "https://example.com/download" : null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: Date.now(),
    currentVersion: "0.1.20",
    targetVersion: "0.2.0",
    subtitle:
      mode2 === "forced"
        ? "关键兼容性更新，需要升级后继续使用。"
        : "修复稳定性问题并优化启动体验。",
    requiredReason: mode2 === "forced" ? "关键服务协议升级" : null,
    changelog: {
      version: "0.2.0",
      date: "2026-05-21",
      subtitle: "本地预览更新",
      changelog: ["优化更新提示体验", "修复若干稳定性问题", "提升桌面端启动速度"],
    },
    progress,
    error:
      mode2 === "error"
        ? {
            code: "DOWNLOAD_FAILED",
            message: "模拟下载失败，请重试。",
            retryCount: 1,
            canRetry: true,
          }
        : null,
    lastCheckAt: Date.now(),
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    availableSince: Date.now() - 1e3 * 60 * 60 * 24,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}
