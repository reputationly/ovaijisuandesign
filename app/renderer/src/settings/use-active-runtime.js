// use-active-runtime.js
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { BUNDLED_CHANGELOG } from "./bundled-changelog.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
function isRenderableAssetType(type) {
  return (
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "text" ||
    type === "file"
  );
}
export const UPDATE_CHECK_TIMED_OUT = "Update check timed out";
export const UpdaterContext = reactExports.createContext(null);
export function useUpdaterContext() {
  const ctx = reactExports.useContext(UpdaterContext);
  if (!ctx) {
    throw new Error("useUpdaterContext must be used within <UpdaterProvider>");
  }
  return ctx;
}
export function useOptionalUpdaterContext() {
  return reactExports.useContext(UpdaterContext);
}
const FETCH_TIMEOUT_MS = 1500;
const STALE_TIME_MS = 5 * 60 * 1e3;
const UPDATE_CDN = {
  domestic: "https://filecdn.minimax.chat",
  overseas: "https://file.cdn.minimax.io",
};
function changelogUrl(region, channel) {
  const base = UPDATE_CDN[region];
  const effectiveChannel = channel === "dev" ? "prod" : channel;
  const appName =
    effectiveChannel === "prod"
      ? "minimax-hub"
      : `minimax-hub-${effectiveChannel}`;
  return `${base}/public/${appName}/release/${region}/changelog.json`;
}
async function fetchChangelog(url, signal) {
  const resp = await fetch(url, {
    signal,
    cache: "no-cache",
  });
  if (!resp.ok) throw new Error(`http ${resp.status}`);
  const data = await resp.json();
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.en?.items) ||
    !Array.isArray(data.zh?.items)
  ) {
    throw new Error("invalid manifest shape");
  }
  return data;
}
export function useChangelog() {
  const { region, channel } = useRuntimeConfig();
  const url = changelogUrl(region, channel);
  const { data, isLoading } = useQuery({
    queryKey: ["changelog", url],
    queryFn: async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        return await fetchChangelog(url, ctrl.signal);
      } finally {
        clearTimeout(timer);
      }
    },
    staleTime: STALE_TIME_MS,
    retry: 1,
    // Network failure must not block the UI — the bundle always wins as fallback.
    throwOnError: false,
  });
  const source = data ? "cdn" : isLoading ? "loading" : "bundle";
  reactExports.useEffect(() => {}, [source, url]);
  return {
    manifest: data ?? BUNDLED_CHANGELOG,
    source,
    isLoading,
  };
}
export function isCaseInsensitiveOs(os) {
  return os === "darwin" || os === "win32";
}
export const SettingsPanelHeaderContext = reactExports.createContext({
  setHeaderOverride: () => {},
});
const EMPTY_SNAPSHOT = {
  currentWorkspaceId: null,
  activeRuntime: null,
};
export const listeners = new Set();
function emit() {
  for (const listener of listeners) listener();
}
export let snapshot = EMPTY_SNAPSHOT;
export function setTopbarActiveWorkspaceSnapshot(next) {
  if (
    snapshot.currentWorkspaceId === next.currentWorkspaceId &&
    snapshot.activeRuntime === next.activeRuntime
  ) {
    return;
  }
  snapshot =
    next.currentWorkspaceId || next.activeRuntime ? next : EMPTY_SNAPSHOT;
  emit();
}
export function useActiveRuntime(currentWorkspaceId, hiloApp) {
  const [runtime, setRuntime] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!currentWorkspaceId) {
      setRuntime(null);
      return;
    }
    setRuntime(null);
    let disposed = false;
    let requestId = 0;
    const refresh = () => {
      const currentRequest = ++requestId;
      void hiloApp
        .getWorkspaceRuntime(currentWorkspaceId)
        .then((runtime) => {
          if (!disposed && currentRequest === requestId) setRuntime(runtime ?? null);
        })
        .catch(() => {
          if (!disposed && currentRequest === requestId) setRuntime(null);
        });
    };
    const clear = () => {
      requestId += 1;
      setRuntime(null);
    };
    refresh();
    const disposable = hiloApp.onWorkspaceEntriesChanged((entries) => {
      if (entries.some((entry) => entry.workspaceId === currentWorkspaceId)) {
        refresh();
      } else {
        clear();
      }
    });
    return () => {
      disposed = true;
      requestId += 1;
      disposable.dispose();
    };
  }, [currentWorkspaceId, hiloApp]);
  return runtime;
}
export function normalizeWorkspaceId(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function assetInfoToAssetMeta(asset, fileUrlById) {
  if (!asset.id) return void 0;
  if (!isRenderableAssetType(asset.type)) return void 0;
  return {
    url: fileUrlById(asset.id),
    name: asset.name ?? asset.path.split("/").pop() ?? "",
    path: asset.path,
    type: asset.type,
    prompt: asset.prompt || void 0,
    description: asset.description || void 0,
    model: asset.model || void 0,
    time: asset.time || void 0,
    voiceId: asset.voice_id || void 0,
    lyrics: asset.lyrics || void 0,
    compositionPlan: asset.composition_plan || void 0,
    params: asset.params,
    backend: asset.backend,
    model_id: asset.model_id,
    source_tool: asset.source_tool,
    cloudTraceId: asset.cloud_trace_id,
    cloudTaskId: asset.cloud_task_id,
    providerTaskId: asset.provider_task_id,
    width: asset.width,
    height: asset.height,
    durationSec: asset.duration,
    fileSize: asset.fileSize,
    referenceImageIds: asset.reference_images,
    referenceAudioIds: asset.reference_audios,
    referenceVideoIds: asset.reference_videos,
    tagIds: asset.tagIds,
  };
}
