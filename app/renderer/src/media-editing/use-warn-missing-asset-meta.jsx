// use-warn-missing-asset-meta.jsx
import {
  dedupedToast,
  MenuRoot,
  MenuSubmenuRoot,
  MenuTrigger,
  reactExports,
  toast,
  withAutomaticDedupeId,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
export function isCloneData(data2) {
  return data2?.cloneOf != null;
}
const PROGRESS_UPDATE_INTERVAL_MS = 500;
const H3_MAX_PROGRESS_DURATION_MS = 4e4;
const H3_MAX_PROGRESS_CAP = 95;
const PROFILES = {
  // 2min→90%, 7min→99%；起步约 2%/s，尾段几十秒涨 1%
  image: {
    ceiling: 99,
    tau: 50,
  },
  // 8min→80%, 18min→99%；起步约 0.3%/s，尾段慢爬
  video: {
    ceiling: 102.5,
    tau: 320,
  },
  // 音频生成通常较快，复用图片档
  audio: {
    ceiling: 99,
    tau: 50,
  },
  // LLM 文本生成很快：30s→~91%, 55s→~98%, ~64s→99%
  text: {
    ceiling: 99,
    tau: 12,
  },
};
function calculateProgress(kind, originMs, nowMs, profile) {
  const elapsedMs2 = Math.max(0, nowMs - originMs);
  if (profile === "h3-max-video") {
    return Math.min(
      H3_MAX_PROGRESS_CAP,
      Math.round(
        (elapsedMs2 / H3_MAX_PROGRESS_DURATION_MS) * H3_MAX_PROGRESS_CAP,
      ),
    );
  }
  const { ceiling, tau } = PROFILES[kind];
  const elapsed = elapsedMs2 / 1e3;
  return Math.min(99, Math.round(ceiling * (1 - Math.exp(-elapsed / tau))));
}
export function parseGenerationStartedAt(value) {
  if (!value) return void 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : void 0;
}
function calculateInitialProgress(active2, kind, startedAt, profile) {
  if (!active2) return 0;
  const nowMs = Date.now();
  return calculateProgress(
    kind,
    parseGenerationStartedAt(startedAt) ?? nowMs,
    nowMs,
    profile,
  );
}
export function readGenerationStartedAt(data2) {
  const value = data2?.generationStartedAt;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationAttemptId(data2) {
  const value = data2?.generationAttemptId;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationSubmittedAt(data2) {
  const receipt = data2?.generationTaskReceipt;
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt))
    return void 0;
  const submittedAt = receipt.submittedAt;
  if (
    typeof submittedAt !== "number" ||
    !Number.isFinite(submittedAt) ||
    submittedAt < 0
  ) {
    return void 0;
  }
  const date2 = new Date(submittedAt);
  return Number.isFinite(date2.getTime()) ? date2.toISOString() : void 0;
}
export function resolveGenerationProgressStartedAt(
  data2,
  persistedActive,
  inMemoryStartedAt,
) {
  return (
    (persistedActive ? readGenerationStartedAt(data2) : void 0) ??
    inMemoryStartedAt
  );
}
export function useSimulatedProgress(
  active2,
  kind = "image",
  startedAt,
  profile,
  attemptKey,
) {
  const [progress, setProgress] = reactExports.useState(() =>
    calculateInitialProgress(active2, kind, startedAt, profile),
  );
  const resolvedAttemptKey = attemptKey ?? startedAt;
  const progressAttemptKeyRef = reactExports.useRef(resolvedAttemptKey);
  reactExports.useEffect(() => {
    const isNewAttempt = progressAttemptKeyRef.current !== resolvedAttemptKey;
    progressAttemptKeyRef.current = resolvedAttemptKey;
    if (!active2) {
      setProgress(0);
      return;
    }
    const originMs = parseGenerationStartedAt(startedAt) ?? Date.now();
    let resetOnNextTick = isNewAttempt;
    const tick = () => {
      const nextProgress = calculateProgress(
        kind,
        originMs,
        Date.now(),
        profile,
      );
      if (resetOnNextTick) {
        resetOnNextTick = false;
        setProgress(nextProgress);
        return;
      }
      setProgress((currentProgress) => Math.max(currentProgress, nextProgress));
    };
    tick();
    const intervalId = window.setInterval(tick, PROGRESS_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [active2, kind, startedAt, profile, resolvedAttemptKey]);
  return progress;
}
const warnedKeys = new Set();
export function useWarnMissingAssetMeta(ctx) {
  const { nodeId, nodeType, data: data2, meta: meta2, isUserEmpty } = ctx;
  reactExports.useEffect(() => {
    if (meta2 !== void 0) return;
    if (isUserEmpty) return;
    const key2 = `${nodeType}:${nodeId}`;
    if (warnedKeys.has(key2)) return;
    warnedKeys.add(key2);
    const obj = data2 ?? {};
    const path2 = typeof obj.path === "string" ? obj.path : "<missing>";
    const modelId =
      typeof obj.model_id === "string" ? obj.model_id : "<missing>";
    const sourceTool =
      typeof obj.source_tool === "string" ? obj.source_tool : "<missing>";
    const { assetId } = parseNodeId(nodeId);
    const isClone = assetId !== nodeId;
    console.warn(
      [
        `[canvas/${nodeType}-node] node "${nodeId}" rendered an EMPTY wrapper (return null path).`,
        `  reason: AssetMetadataStore has no entry for assetId="${assetId}"${isClone ? " (clone of base id)" : ""}.`,
        `  data.path=${path2}  data.model_id=${modelId}  data.source_tool=${sourceTool}`,
        "  likely causes (in order of probability):",
        "    1. incremental WS sync (canvas_updated) or group-execution in-place replace",
        "       added/replaced this node without calling AssetMetadataStore.setMany().",
        "       → reload the workspace; if it renders, this is the bug.",
        "    2. initial buildCanvasNodes seed missed this assetId (asset deleted",
        "       server-side but canvas file still references it).",
        "       → reload won't help; check use-canvas-data buildCanvasNodes.",
        isClone
          ? "    3. clone routing: this is a clone id (assetId~shortUuid). The BASE"
          : "    3. (n/a — this is not a clone id)",
        isClone
          ? `       assetId "${assetId}" itself was never registered.`
          : "",
        "  verify in DevTools console:",
        `    useAssetMetadataStore.getState().assets.get(${JSON.stringify(assetId)})`,
        "  expected: an AssetMeta object with url/name/path/type. actual: undefined.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }, [nodeId, nodeType, meta2, isUserEmpty, data2]);
}
function createDedupedMethod(kind, method) {
  return (message2, data2) =>
    method(message2, withAutomaticDedupeId(kind, message2, data2));
}
Object.assign(dedupedToast, {
  success: createDedupedMethod("success", toast.success),
  info: createDedupedMethod("info", toast.info),
  warning: createDedupedMethod("warning", toast.warning),
  error: createDedupedMethod("error", toast.error),
  message: (message2, data2) =>
    toast.message(message2, withAutomaticDedupeId("normal", message2, data2)),
  loading: toast.loading,
  promise: toast.promise,
  custom: toast.custom,
  dismiss: toast.dismiss,
  getHistory: toast.getHistory,
  getToasts: toast.getToasts,
});
export function isDraftSubmitFormDisabled(modelsLoading, isPreparing) {
  return modelsLoading || isPreparing;
}
export function shouldPersistPopoverDraftOnUnmount(submitted, modelLoaded) {
  return !submitted && modelLoaded;
}
export async function submitWithPersistedPopoverDraft({
  draft,
  saveDraft: saveDraft2,
  markSubmitted,
  submit,
}) {
  saveDraft2?.({
    ...draft,
    source: "submitted",
  });
  const accepted = await submit();
  if (accepted === false) return false;
  markSubmitted();
  return true;
}
async function submitAfterDraftFlush({ flushDraft, submit, onFlushError }) {
  try {
    await flushDraft();
  } catch (error) {
    console.error(
      "[canvas] Failed to persist popover draft before generation",
      error,
    );
    onFlushError(error);
    return false;
  }
  submit();
  return true;
}
export function submitAfterOptionalDraftFlush({ shouldFlush, ...options }) {
  if (!shouldFlush) {
    options.submit();
    return true;
  }
  return submitAfterDraftFlush(options);
}
const INSTRUMENTAL_PARAM_VALUES = new Set(["instrumental", "true"]);
function getCompositionPlanLyrics(compositionPlan) {
  if (!compositionPlan?.trim()) return void 0;
  try {
    const parsed = JSON.parse(compositionPlan);
    if (!parsed || typeof parsed !== "object") return void 0;
    const plan = parsed;
    if (Array.isArray(plan.chunks)) {
      const blocks = plan.chunks
        .map((chunk2) => {
          if (!chunk2 || typeof chunk2 !== "object") return "";
          const text2 = chunk2.text;
          return typeof text2 === "string" ? text2.trim() : "";
        })
        .filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
    if (Array.isArray(plan.sections)) {
      const blocks = plan.sections
        .map((section) => {
          if (!section || typeof section !== "object") return "";
          const lines = section.lines;
          if (!Array.isArray(lines)) return "";
          return lines
            .filter((line) => typeof line === "string")
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
  } catch {
    return void 0;
  }
  return void 0;
}
function isInstrumentalAudioAsset(meta2) {
  const mode2 = meta2?.params?.is_instrumental;
  return mode2 !== void 0 && INSTRUMENTAL_PARAM_VALUES.has(mode2);
}
export function getDisplayLyrics(meta2) {
  if (!meta2 || isInstrumentalAudioAsset(meta2)) return void 0;
  if (meta2.lyrics?.trim()) return meta2.lyrics;
  return getCompositionPlanLyrics(meta2.compositionPlan);
}
export function resolveCanvasPlatform(platform2) {
  const value = (
    typeof navigator === "undefined"
      ? ""
      : navigator.platform || navigator.userAgent
  ).toLowerCase();
  if (value.includes("mac")) return "mac";
  if (value.includes("win")) return "windows";
  return "other";
}
export function resolveCanvasShortcut(accelerator, platform2) {
  const os2 = resolveCanvasPlatform();
  if (os2 === "mac") {
    if (accelerator === "redo") return ["⇧", "⌘", "Z"];
    if (accelerator === "copyDebug") return ["⌘", "⌥", "C"];
    return ["⌘", accelerator === "paste" ? "V" : "Z"];
  }
  if (accelerator === "redo") return ["Ctrl", "Shift", "Z"];
  if (accelerator === "copyDebug") return ["Ctrl", "Alt", "C"];
  return ["Ctrl", accelerator === "paste" ? "V" : "Z"];
}
export function getCanvasFileManagerLabelKey(platform2) {
  const os2 = resolveCanvasPlatform();
  if (os2 === "mac") return "canvas.lightbox.openInFinder";
  if (os2 === "windows") return "canvas.lightbox.openInFileExplorer";
  return "canvas.lightbox.openInFileManager";
}
export function getLightboxSlotKey(slot) {
  return `${slot.round ?? 0}:${slot.id}`;
}
export function lightboxItemFromAssetMeta(kind, meta2) {
  if (!meta2?.url) return void 0;
  return {
    kind,
    url: meta2.url,
    filePath: meta2.path,
    fileName: meta2.name,
  };
}
function getLightboxNodeAssetId(node2) {
  const dataAssetId = node2?.data?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0)
    return dataAssetId;
  return typeof node2?.assetId === "string" && node2.assetId.length > 0
    ? node2.assetId
    : void 0;
}
export function normalizeLegacyLightboxItems(kind, items, item, sources, src) {
  if (items && items.length > 0) {
    return items.filter((candidate) => !!candidate.url);
  }
  if (item?.url) {
    return [item];
  }
  const urls = sources && sources.length > 0 ? sources : src ? [src] : [];
  const normalized = [];
  for (const url2 of urls) {
    if (typeof url2 !== "string" || url2.length === 0) continue;
    const candidate = {
      kind,
      url: url2,
    };
    if (
      normalized.some(
        (existing) =>
          existing.kind === candidate.kind &&
          existing.url === candidate.url &&
          existing.filePath === candidate.filePath,
      )
    ) {
      continue;
    }
    normalized.push(candidate);
  }
  return normalized;
}
export function lightboxItemsFromSlots(kind, slots, options) {
  return slots.flatMap((slot) => {
    if (!slot.url) return [];
    const node2 = options.nodes?.find((candidate) => {
      const candidateAssetId = getLightboxNodeAssetId(candidate);
      return candidate.id === slot.id || candidateAssetId === slot.id;
    });
    const nodeAssetId = getLightboxNodeAssetId(node2);
    const slotMeta =
      options.getMetaById(slot.id) ??
      (nodeAssetId ? options.getMetaById(nodeAssetId) : void 0) ??
      (node2 ? options.getMetaById(node2.id) : void 0) ??
      (slot.id === options.primarySlotId ? options.primaryMeta : void 0);
    return [
      {
        kind,
        slotKey: getLightboxSlotKey(slot),
        url: slot.url,
        filePath: slotMeta?.path,
        fileName: slotMeta?.name,
      },
    ];
  });
}
export function resolveLightboxIndexForSlot(items, slot, fallbackIndex) {
  if (!slot) return fallbackIndex;
  const slotKey = getLightboxSlotKey(slot);
  const stableIndex = items.findIndex((item) => item.slotKey === slotKey);
  if (stableIndex >= 0) return stableIndex;
  if (!slot.url) return fallbackIndex;
  const legacyIndex = items.findIndex((item) => item.url === slot.url);
  return legacyIndex >= 0 ? legacyIndex : fallbackIndex;
}
export function LightboxActionButton({
  label,
  dataActionUiId,
  icon: Icon2,
  iconElement,
  onClick,
  className,
  disabled: disabled2 = false,
  busy = false,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      aria-label={label}
      aria-busy={busy || void 0}
      title={label}
      disabled={disabled2}
      className={cn(
        "pointer-events-auto inline-flex h-8 min-w-[8.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 text-xs font-normal text-white/85 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-black/70 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-white/10 disabled:hover:bg-black/55 disabled:hover:text-white/85 disabled:active:scale-100",
        className,
      )}
      onClick={onClick}
    >
      {iconElement ??
        (Icon2 ? (
          <Icon2 size={14} strokeWidth={1.25} aria-hidden={true} />
        ) : null)}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
export const NODE_POPOVER_SAFE_GAP = 12;
export function DropdownMenu({ ...props }) {
  return <MenuRoot data-slot="dropdown-menu" {...props} />;
}
export function DropdownMenuTrigger({ className, ...props }) {
  return (
    <MenuTrigger
      data-slot="dropdown-menu-trigger"
      className={cn("select-none outline-none", className)}
      {...props}
    />
  );
}
export function DropdownMenuSub({ ...props }) {
  return <MenuSubmenuRoot {...props} />;
}
export function rejectedReferencePaths(
  incomingPaths,
  existingPaths,
  admittedPaths,
) {
  const accepted = new Set([...existingPaths, ...admittedPaths]);
  return incomingPaths.filter((path2) => !accepted.has(path2));
}
export const IMAGE_MODE_KEY = "image_mode";
export const ASPECT_RATIO_PARAM_KEYS = ["aspect_ratio", "ratio"];
