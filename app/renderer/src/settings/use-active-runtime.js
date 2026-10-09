// use-active-runtime.js
import { reactExports, useQuery } from "../vendor.js";
import { BUNDLED_CHANGELOG } from "./bundled-changelog.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";

function isRenderableAssetType(type2) {
  return (
    type2 === "image" ||
    type2 === "video" ||
    type2 === "audio" ||
    type2 === "text" ||
    type2 === "file"
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

const STALE_TIME_MS$3 = 5 * 60 * 1e3;

const UPDATE_CDN = {
  domestic: "https://filecdn.minimax.chat",
  overseas: "https://file.cdn.minimax.io",
};

function changelogUrl(region, channel) {
  const base2 = UPDATE_CDN[region];
  const effectiveChannel = channel === "dev" ? "prod" : channel;
  const appName =
    effectiveChannel === "prod"
      ? "minimax-hub"
      : `minimax-hub-${effectiveChannel}`;
  return `${base2}/public/${appName}/release/${region}/changelog.json`;
}

async function fetchChangelog(url2, signal) {
  const resp = await fetch(url2, {
    signal,
    cache: "no-cache",
  });
  if (!resp.ok) throw new Error(`http ${resp.status}`);
  const data2 = await resp.json();
  if (
    data2?.schemaVersion !== 1 ||
    !Array.isArray(data2.en?.items) ||
    !Array.isArray(data2.zh?.items)
  ) {
    throw new Error("invalid manifest shape");
  }
  return data2;
}

export function useChangelog() {
  const { region, channel } = useRuntimeConfig();
  const url2 = changelogUrl(region, channel);
  const { data: data2, isLoading } = useQuery({
    queryKey: ["changelog", url2],
    queryFn: async () => {
      const ctrl = new AbortController();
      const timer2 = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        return await fetchChangelog(url2, ctrl.signal);
      } finally {
        clearTimeout(timer2);
      }
    },
    staleTime: STALE_TIME_MS$3,
    retry: 1,
    // Network failure must not block the UI — the bundle always wins as fallback.
    throwOnError: false,
  });
  const source = data2 ? "cdn" : isLoading ? "loading" : "bundle";
  reactExports.useEffect(() => {}, [source, url2]);
  return {
    manifest: data2 ?? BUNDLED_CHANGELOG,
    source,
    isLoading,
  };
}

export function isCaseInsensitiveOs(os2) {
  return os2 === "darwin" || os2 === "win32";
}

export const SettingsPanelHeaderContext = reactExports.createContext({
  setHeaderOverride: () => {},
});

const EMPTY_SNAPSHOT = {
  currentWorkspaceId: null,
  activeRuntime: null,
};

export const listeners$7 = new Set();

function emit$4() {
  for (const listener of listeners$7) listener();
}

export let snapshot$2 = EMPTY_SNAPSHOT;

export function setTopbarActiveWorkspaceSnapshot(next2) {
  if (
    snapshot$2.currentWorkspaceId === next2.currentWorkspaceId &&
    snapshot$2.activeRuntime === next2.activeRuntime
  ) {
    return;
  }
  snapshot$2 =
    next2.currentWorkspaceId || next2.activeRuntime ? next2 : EMPTY_SNAPSHOT;
  emit$4();
}

export function useActiveRuntime(currentWorkspaceId, hiloApp2) {
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
      void hiloApp2
        .getWorkspaceRuntime(currentWorkspaceId)
        .then((r2) => {
          if (!disposed && currentRequest === requestId) setRuntime(r2 ?? null);
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
    const disposable = hiloApp2.onWorkspaceEntriesChanged((entries2) => {
      if (entries2.some((entry) => entry.workspaceId === currentWorkspaceId)) {
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
  }, [currentWorkspaceId, hiloApp2]);
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
