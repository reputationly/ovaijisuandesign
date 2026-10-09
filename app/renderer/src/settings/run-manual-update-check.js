// run-manual-update-check.js
import { reactExports, getRuntimeConfig, useQuery } from "../vendor.js";
import { isRenderableAssetType } from "../workspace/record-recent-workspace-opened.jsx";
import { useRuntimeConfig } from "../generation/use-resizable-width.js";
export const UPDATE_CHECK_TIMED_OUT = "Update check timed out";
const UPDATE_CHECK_RESULT_TIMEOUT_MS = 3e4;
export async function runManualUpdateCheck(service2) {
  try {
    const { state: state2 } = await service2.getState();
    if (hasResolvedUpdateFlow(state2)) {
      return {
        accepted: true,
        state: state2,
      };
    }
  } catch {}
  const pendingState = waitForUpdateCheckResult(service2);
  const checkOutcome = service2
    .check({
      userTriggered: true,
    })
    .then(
      (result2) => ({
        type: "check",
        result: result2,
      }),
      (error) => ({
        type: "check-error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  const stateOutcome = pendingState.promise.then((state2) => ({
    type: "state",
    state: state2,
  }));
  const firstOutcome = await Promise.race([checkOutcome, stateOutcome]);
  if (firstOutcome.type === "state") {
    if (!firstOutcome.state) {
      return {
        accepted: false,
        error: UPDATE_CHECK_TIMED_OUT,
      };
    }
    return {
      accepted: true,
      state: firstOutcome.state,
    };
  }
  if (firstOutcome.type === "check-error") {
    pendingState.dispose();
    return {
      accepted: false,
      error: firstOutcome.error,
    };
  }
  const { result } = firstOutcome;
  if (!result.accepted) {
    pendingState.dispose();
    try {
      const { state: state2 } = await service2.getState();
      if (hasActiveUpdateFlow(state2)) {
        return {
          accepted: true,
          state: state2,
        };
      }
    } catch {}
    return {
      accepted: false,
      error: result.error,
    };
  }
  try {
    let { state: state2 } = await service2.getState();
    if (state2.phase === "checking") {
      const resolved = await pendingState.promise;
      if (resolved) {
        state2 = resolved;
      } else {
        return {
          accepted: false,
          error: UPDATE_CHECK_TIMED_OUT,
        };
      }
    } else {
      pendingState.dispose();
    }
    return {
      accepted: true,
      state: state2,
    };
  } catch (error) {
    pendingState.dispose();
    return {
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
function hasActiveUpdateFlow(state2) {
  return state2.phase === "checking" || hasResolvedUpdateFlow(state2);
}
function hasResolvedUpdateFlow(state2) {
  return (
    state2.phase === "available" || state2.phase === "downloading" || state2.phase === "downloaded"
  );
}
function waitForUpdateCheckResult(service2) {
  let timeout2;
  let disposable;
  const promise = new Promise((resolve) => {
    const settle2 = (state2) => {
      if (timeout2) {
        clearTimeout(timeout2);
        timeout2 = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
      resolve(state2);
    };
    timeout2 = setTimeout(() => settle2(null), UPDATE_CHECK_RESULT_TIMEOUT_MS);
    timeout2.unref?.();
    disposable = service2.onStateChanged((event) => {
      if (event.state.phase === "checking") return;
      settle2(event.state);
    });
  });
  return {
    promise,
    dispose: () => {
      if (timeout2) {
        clearTimeout(timeout2);
        timeout2 = void 0;
      }
      disposable?.dispose();
      disposable = void 0;
    },
  };
}
export const UpdaterContext = reactExports.createContext(null);
export function createInitialState() {
  const bootstrap = window.__HILO_UPDATER_BOOTSTRAP__;
  if (bootstrap && typeof bootstrap === "object" && "phase" in bootstrap) {
    return bootstrap;
  }
  return {
    phase: "idle",
    forced: false,
    policyStatus: "checking",
    forceSource: "none",
    manualDownloadUrl: null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: 0,
    // Best-effort version from runtime config; getVersion() IPC will override.
    currentVersion: getRuntimeConfig().appVersion,
    targetVersion: null,
    subtitle: null,
    requiredReason: null,
    changelog: null,
    progress: null,
    error: null,
    lastCheckAt: 0,
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    availableSince: 0,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}
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
export const BUNDLED_CHANGELOG = {
  schemaVersion: 1,
  updatedAt: "2026-08-29T07:17:25.658Z",
  en: {
    badge: "UPDATE",
    title: "What's New",
    items: [
      {
        version: "3.0.4",
        date: "Aug 27",
        subtitle: "Multi-angle image tool; subject library; local model reuse",
        changelog: [
          "New multi-angle image generation tool",
          "Assets renamed to subject library with grid view and search",
          "Workflow plugin supports custom folders and local model reuse",
          "Next-generation image model now available",
          "Project member roster and invite panels upgraded",
          "Canvas generations survive after stopping chat",
        ],
        featured: true,
      },
      {
        version: "3.0.3",
        date: "Aug 25",
        subtitle: "Frame swap; richer references; better question cards",
        changelog: [
          "Swap first and last frames in one click on canvas",
          "Adjust prompt font size and copy prompts",
          "Switch and replace inline reference assets",
          "Text nodes can be referenced in media generation",
          "Question cards support keyboard input and image upload",
          "Grouped images support lightbox preview actions",
        ],
      },
      {
        version: "3.0.2",
        date: "Aug 21",
        subtitle: "Education video upgrades; Windows install fixes",
        changelog: [
          "Better script editing and duration planning for education videos",
          "Fixed shortcut recovery during Windows install",
          "Stronger shared-folder protection during upgrades",
        ],
      },
      {
        version: "3.0.1",
        date: "Aug 20",
        subtitle: "Agent mode memory; community attribution; faster asset loading",
        changelog: [
          "Your last agent mode choice is remembered",
          "Community attribution previews for workflows",
          "Polished creation guides and chat actions",
          "Faster asset list loading",
          "Fixed clip node export and creation flow",
        ],
      },
      {
        version: "3.0.0",
        date: "Aug 19",
        subtitle: "Message quick actions; generation recovery; in-app update fix",
        changelog: [
          "Chat messages support quick actions and feedback",
          "Interrupted generations auto-recover in session",
          "Fixed in-app update failures",
          "Fixed size detection for rotated images",
          "Unified layout across skills and asset center",
        ],
      },
    ],
  },
  zh: {
    badge: "更新",
    title: "最近更新",
    items: [
      {
        version: "3.0.4",
        date: "8月27日",
        subtitle: "图片多角度生成；主体库上线；本地模型复用",
        changelog: [
          "新增图片多角度生成工具",
          "资产库焕新为主体库，支持网格与搜索",
          "工作流插件支持自定义目录与本地模型复用",
          "新一代图片模型接入",
          "项目成员名单与邀请面板升级",
          "停止会话后画布生成继续保留",
        ],
        featured: true,
      },
      {
        version: "3.0.3",
        date: "8月25日",
        subtitle: "首尾帧交换；引用编辑增强；提问体验升级",
        changelog: [
          "画布支持首尾帧一键交换",
          "提示词支持调整字号与复制",
          "支持切换与替换内联引用素材",
          "文本节点可作为媒体生成引用",
          "提问卡片支持键盘操作与图片上传",
          "分组图片支持大图预览操作",
        ],
      },
      {
        version: "3.0.2",
        date: "8月21日",
        subtitle: "教学视频升级；Windows 安装修复",
        changelog: [
          "教学视频脚本编辑与时长规划增强",
          "Windows 安装快捷方式恢复修复",
          "升级过程共享目录保护加强",
        ],
      },
      {
        version: "3.0.1",
        date: "8月20日",
        subtitle: "记住 Agent 模式；社区来源展示；资产加载提速",
        changelog: [
          "自动记住上次选择的 Agent 模式",
          "工作流社区来源展示上线",
          "创作指引与会话操作打磨",
          "资产列表加载提速",
          "剪辑节点导出与创建流程修复",
        ],
      },
      {
        version: "3.0.0",
        date: "8月19日",
        subtitle: "消息快捷操作；生成中断恢复；应用内更新修复",
        changelog: [
          "会话消息支持快捷操作与反馈",
          "生成中断后会话内自动恢复",
          "应用内更新失败问题修复",
          "旋转图片尺寸识别修复",
          "技能与资产中心页面布局统一",
        ],
      },
    ],
  },
};
const FETCH_TIMEOUT_MS = 1500;
const STALE_TIME_MS$3 = 5 * 60 * 1e3;
const UPDATE_CDN = {
  domestic: "https://filecdn.minimax.chat",
  overseas: "https://file.cdn.minimax.io",
};
function changelogUrl(region, channel) {
  const base2 = UPDATE_CDN[region];
  const effectiveChannel = channel === "dev" ? "prod" : channel;
  const appName = effectiveChannel === "prod" ? "minimax-hub" : `minimax-hub-${effectiveChannel}`;
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
export function useSettingsPanelHeader() {
  return reactExports.useContext(SettingsPanelHeaderContext);
}
const EMPTY_SNAPSHOT = {
  currentWorkspaceId: null,
  activeRuntime: null,
};
let snapshot$2 = EMPTY_SNAPSHOT;
const listeners$7 = new Set();
function emit$4() {
  for (const listener of listeners$7) listener();
}
function getTopbarActiveWorkspaceSnapshot() {
  return snapshot$2;
}
export function setTopbarActiveWorkspaceSnapshot(next2) {
  if (
    snapshot$2.currentWorkspaceId === next2.currentWorkspaceId &&
    snapshot$2.activeRuntime === next2.activeRuntime
  ) {
    return;
  }
  snapshot$2 = next2.currentWorkspaceId || next2.activeRuntime ? next2 : EMPTY_SNAPSHOT;
  emit$4();
}
function subscribeTopbarActiveWorkspaceSnapshot(listener) {
  listeners$7.add(listener);
  return () => listeners$7.delete(listener);
}
export function useTopbarActiveWorkspaceSnapshot() {
  return reactExports.useSyncExternalStore(
    subscribeTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
  );
}
export function useWindowTitleSync(entries2, currentWorkspaceId, platform2) {
  reactExports.useEffect(() => {
    const active2 = entries2.find((e2) => e2.workspaceId === currentWorkspaceId);
    const title = active2 ? `${active2.projectName} - MiniMax Design` : "MiniMax Design";
    platform2.window.setTitle(title);
  }, [currentWorkspaceId, entries2, platform2.window]);
}
export function useLastActivePersistence(currentWorkspaceId, platform2) {
  reactExports.useEffect(() => {
    if (currentWorkspaceId) {
      platform2.storage?.globalSet("lastActiveWorkspacePath", currentWorkspaceId).catch(() => {});
    }
  }, [currentWorkspaceId, platform2.storage]);
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
