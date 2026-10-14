// use-warn-missing-asset-meta.jsx
import { toast } from "sonner";
import { MenuRoot, MenuSubmenuRoot, MenuTrigger, reactExports, withAutomaticDedupeId } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn as mergeClassNames } from "../infra/dialog-content.jsx";
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
export function isCloneData(data) {
  return data?.cloneOf != null;
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
  const elapsedMs = Math.max(0, nowMs - originMs);
  if (profile === "h3-max-video") {
    return Math.min(
      H3_MAX_PROGRESS_CAP,
      Math.round(
        (elapsedMs / H3_MAX_PROGRESS_DURATION_MS) * H3_MAX_PROGRESS_CAP,
      ),
    );
  }
  const { ceiling, tau: decayTimeConstantSeconds } = PROFILES[kind];
  const elapsed = elapsedMs / 1e3;
  return Math.min(99, Math.round(ceiling * (1 - Math.exp(-elapsed / decayTimeConstantSeconds))));
}
export function parseGenerationStartedAt(value) {
  if (!value) return void 0;
  const epochMilliseconds = Date.parse(value);
  return Number.isFinite(epochMilliseconds) ? epochMilliseconds : void 0;
}
function calculateInitialProgress(active, kind, startedAt, profile) {
  if (!active) return 0;
  const nowMs = Date.now();
  return calculateProgress(
    kind,
    parseGenerationStartedAt(startedAt) ?? nowMs,
    nowMs,
    profile,
  );
}
export function readGenerationStartedAt(data) {
  const value = data?.generationStartedAt;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationAttemptId(data) {
  const value = data?.generationAttemptId;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationSubmittedAt(data) {
  const receipt = data?.generationTaskReceipt;
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
  const date = new Date(submittedAt);
  return Number.isFinite(date.getTime()) ? date.toISOString() : void 0;
}
export function resolveGenerationProgressStartedAt(
  data,
  persistedActive,
  inMemoryStartedAt,
) {
  return (
    (persistedActive ? readGenerationStartedAt(data) : void 0) ??
    inMemoryStartedAt
  );
}
export function useSimulatedProgress(
  active,
  kind = "image",
  startedAt,
  profile,
  attemptKey,
) {
  const [progress, setProgress] = reactExports.useState(() =>
    calculateInitialProgress(active, kind, startedAt, profile),
  );
  const resolvedAttemptKey = attemptKey ?? startedAt;
  const progressAttemptKeyRef = reactExports.useRef(resolvedAttemptKey);
  reactExports.useEffect(() => {
    const isNewAttempt = progressAttemptKeyRef.current !== resolvedAttemptKey;
    progressAttemptKeyRef.current = resolvedAttemptKey;
    if (!active) {
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
  }, [active, kind, startedAt, profile, resolvedAttemptKey]);
  return progress;
}
const warnedKeys = new Set();
export function useWarnMissingAssetMeta(warningContext) {
  const { nodeId, nodeType, data, meta, isUserEmpty } = warningContext;
  reactExports.useEffect(() => {
    if (meta !== void 0) return;
    if (isUserEmpty) return;
    const key = `${nodeType}:${nodeId}`;
    if (warnedKeys.has(key)) return;
    warnedKeys.add(key);
    const nodeData = data ?? {};
    const path = typeof nodeData.path === "string" ? nodeData.path : "<missing>";
    const modelId =
      typeof nodeData.model_id === "string" ? nodeData.model_id : "<missing>";
    const sourceTool =
      typeof nodeData.source_tool === "string" ? nodeData.source_tool : "<missing>";
    const { assetId } = parseNodeId(nodeId);
    const isClone = assetId !== nodeId;
    console.warn(
      [
        `[canvas/${nodeType}-node] node "${nodeId}" rendered an EMPTY wrapper (return null path).`,
        `  reason: AssetMetadataStore has no entry for assetId="${assetId}"${isClone ? " (clone of base id)" : ""}.`,
        `  data.path=${path}  data.model_id=${modelId}  data.source_tool=${sourceTool}`,
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
  }, [nodeId, nodeType, meta, isUserEmpty, data]);
}
function createDedupedMethod(kind, method) {
  return (message, data) =>
    method(message, withAutomaticDedupeId(kind, message, data));
}
Object.assign(dedupedToast, {
  success: createDedupedMethod("success", toast.success),
  info: createDedupedMethod("info", toast.info),
  warning: createDedupedMethod("warning", toast.warning),
  error: createDedupedMethod("error", toast.error),
  message: (message, data) =>
    toast.message(message, withAutomaticDedupeId("normal", message, data)),
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
  saveDraft,
  markSubmitted,
  submit,
}) {
  saveDraft?.({
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
        .map((chunk) => {
          if (!chunk || typeof chunk !== "object") return "";
          const text = chunk.text;
          return typeof text === "string" ? text.trim() : "";
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
function isInstrumentalAudioAsset(meta) {
  const mode = meta?.params?.is_instrumental;
  return mode !== void 0 && INSTRUMENTAL_PARAM_VALUES.has(mode);
}
export function getDisplayLyrics(meta) {
  if (!meta || isInstrumentalAudioAsset(meta)) return void 0;
  if (meta.lyrics?.trim()) return meta.lyrics;
  return getCompositionPlanLyrics(meta.compositionPlan);
}
export function resolveCanvasPlatform(platform) {
  const value = (
    typeof navigator === "undefined"
      ? ""
      : navigator.platform || navigator.userAgent
  ).toLowerCase();
  if (value.includes("mac")) return "mac";
  if (value.includes("win")) return "windows";
  return "other";
}
export function resolveCanvasShortcut(accelerator, platform) {
  const operatingSystem = resolveCanvasPlatform();
  if (operatingSystem === "mac") {
    if (accelerator === "redo") return ["⇧", "⌘", "Z"];
    if (accelerator === "copyDebug") return ["⌘", "⌥", "C"];
    return ["⌘", accelerator === "paste" ? "V" : "Z"];
  }
  if (accelerator === "redo") return ["Ctrl", "Shift", "Z"];
  if (accelerator === "copyDebug") return ["Ctrl", "Alt", "C"];
  return ["Ctrl", accelerator === "paste" ? "V" : "Z"];
}
export function getCanvasFileManagerLabelKey(platform) {
  const operatingSystem = resolveCanvasPlatform();
  if (operatingSystem === "mac") return "canvas.lightbox.openInFinder";
  if (operatingSystem === "windows") return "canvas.lightbox.openInFileExplorer";
  return "canvas.lightbox.openInFileManager";
}
export function getLightboxSlotKey(slot) {
  return `${slot.round ?? 0}:${slot.id}`;
}
export function lightboxItemFromAssetMeta(kind, meta) {
  if (!meta?.url) return void 0;
  return {
    kind,
    url: meta.url,
    filePath: meta.path,
    fileName: meta.name,
  };
}
function getLightboxNodeAssetId(node) {
  const dataAssetId = node?.data?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0)
    return dataAssetId;
  return typeof node?.assetId === "string" && node.assetId.length > 0
    ? node.assetId
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
  for (const url of urls) {
    if (typeof url !== "string" || url.length === 0) continue;
    const candidate = {
      kind,
      url,
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
    const node = options.nodes?.find((candidate) => {
      const candidateAssetId = getLightboxNodeAssetId(candidate);
      return candidate.id === slot.id || candidateAssetId === slot.id;
    });
    const nodeAssetId = getLightboxNodeAssetId(node);
    const slotMeta =
      options.getMetaById(slot.id) ??
      (nodeAssetId ? options.getMetaById(nodeAssetId) : void 0) ??
      (node ? options.getMetaById(node.id) : void 0) ??
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
  icon: Icon,
  iconElement,
  onClick,
  className,
  disabled = false,
  busy = false,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      aria-label={label}
      aria-busy={busy || void 0}
      title={label}
      disabled={disabled}
      className={mergeClassNames(
        "pointer-events-auto inline-flex h-8 min-w-[8.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 text-xs font-normal text-white/85 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-black/70 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-white/10 disabled:hover:bg-black/55 disabled:hover:text-white/85 disabled:active:scale-100",
        className,
      )}
      onClick={onClick}
    >
      {iconElement ??
        (Icon ? (
          <Icon size={14} strokeWidth={1.25} aria-hidden={true} />
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
      className={mergeClassNames("select-none outline-none", className)}
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
  return incomingPaths.filter((path) => !accepted.has(path));
}
export const IMAGE_MODE_KEY = "image_mode";
export const ASPECT_RATIO_PARAM_KEYS = ["aspect_ratio", "ratio"];
