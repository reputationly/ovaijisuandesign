// audio-action-surface.jsx
import {
  CompositedSvg,
  dedupedToast,
  isUserProvidedAssetModel,
  jsxRuntimeExports,
  reactDomExports,
  reactExports,
  useAssetMetadataApi,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  getDisplayLyrics,
  lightboxItemFromAssetMeta,
  NODE_POPOVER_SAFE_GAP,
  submitAfterOptionalDraftFlush,
} from "./use-warn-missing-asset-meta.jsx";
import {
  AUDIO_FULL_BODY_POPOVER_GAP_OFFSET,
  TxtPopover,
} from "./audio-full-body-popover-gap-offset.js";
import { AUDIO_CARD_SIZE } from "../canvas/compute-group-bounds-from-children.js";
import { PopoverShell } from "../generation/attachment-bar.jsx";
import {
  popoverDraftIsDirty,
  resolveDefaultReferencePaths,
  resolveEditableTextReferencePaths,
} from "../generation/param-label-fallbacks.js";
import {
  getPopoverDraft,
  resolveActiveNodeDraft,
} from "../canvas/is-reexecutable-generation-node.js";
import { useModelForAsset } from "../infra/create-recently-added-store.js";
import { useCanvasBridge, useGeneratingStateApi } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { BACKEND_ELEVENLABS_MUSIC } from "../generation/normalize-skill-detail-metadata.js";
import {
  ToolbarSpinnerIcon,
  VoiceIsolateIcon,
} from "../canvas/file-missing-icon.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { AudioLightbox$1 } from "./audio-lightbox.jsx";
import {
  resolveReferenceTexts,
  usePopoverCloseWithDeselect,
} from "../generation/resolve-reference-texts.js";
import {
  useUpstreamReferenceAudios,
  useUpstreamSameTypeMeta,
  useUpstreamTextContent,
} from "../assets/parse-prompt-to-tiptap.js";
import { AudioClipPanel } from "./audio-preview.jsx";

function resolveEffectiveAudioDraft(draft, meta2, hostStatus) {
  const activeDraft = resolveActiveNodeDraft(draft, hostStatus);
  if (!activeDraft) return void 0;
  if (!meta2?.model_id) return activeDraft;
  if (activeDraft.dirty) return activeDraft;
  const draftPrompt = activeDraft.prompt?.trim() ?? "";
  const metaPrompt = meta2.prompt?.trim() ?? "";
  const hasEditedPrompt = draftPrompt.length > 0 && draftPrompt !== metaPrompt;
  const hasReferenceDraft =
    (activeDraft.imagePaths?.length ?? 0) > 0 ||
    (activeDraft.audioPaths?.length ?? 0) > 0 ||
    activeDraft.textPaths !== void 0;
  return hasEditedPrompt || hasReferenceDraft ? activeDraft : void 0;
}

function normalizeAudioDraftForPersistence(draft, baseline) {
  if (!draft) return void 0;
  const isDirty = popoverDraftIsDirty(
    {
      prompt: baseline.prompt ?? "",
      modelId: baseline.modelId ?? "",
      params: baseline.params ?? {},
      imagePaths: [],
      audioPaths: [],
      textPaths: [],
    },
    {
      prompt: draft.prompt ?? "",
      modelId: draft.modelId ?? "",
      params: draft.params ?? {},
      imagePaths: draft.imagePaths ?? [],
      audioPaths: draft.audioPaths ?? [],
      textPaths: draft.textPaths ?? [],
    },
  );
  return isDirty
    ? {
        ...draft,
        dirty: true,
      }
    : void 0;
}

const AUDIO_GENERATED_WAVEFORM_HEIGHT = 64;

const AUDIO_GENERATED_WAVEFORM_PADDING_Y = 8;

const AUDIO_GENERATED_CARD_PADDING_TOP = 6;

const AUDIO_GENERATED_CARD_PADDING_BOTTOM = 12;

const AUDIO_GENERATED_CONTROLS_MARGIN_TOP = 8;

const AUDIO_GENERATED_CONTROLS_HEIGHT = 20;

const AUDIO_GENERATED_SELECTED_BORDER_WIDTH = 2;

const AUDIO_GENERATED_SELECTED_BODY_HEIGHT =
  AUDIO_GENERATED_CARD_PADDING_TOP +
  AUDIO_GENERATED_WAVEFORM_HEIGHT +
  AUDIO_GENERATED_WAVEFORM_PADDING_Y * 2 +
  AUDIO_GENERATED_CONTROLS_MARGIN_TOP +
  AUDIO_GENERATED_CONTROLS_HEIGHT +
  AUDIO_GENERATED_CARD_PADDING_BOTTOM +
  AUDIO_GENERATED_SELECTED_BORDER_WIDTH * 2;

function resolveAudioPromptPopoverState({
  isUserEmpty,
  isGenerating,
  hasAudioContent,
}) {
  if (isGenerating) return "loading";
  if (isUserEmpty || !hasAudioContent) return "empty";
  return "content";
}

function resolveAudioPromptPopoverGapOffset(input) {
  const state2 = resolveAudioPromptPopoverState(input);
  if (state2 !== "content") return AUDIO_FULL_BODY_POPOVER_GAP_OFFSET;
  return (
    (AUDIO_GENERATED_SELECTED_BODY_HEIGHT - AUDIO_CARD_SIZE.height) * input.zoom
  );
}

function CopyIcon$1() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      role="img"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
    </CompositedSvg>
  );
}

function CheckIcon$3() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      role="img"
      aria-hidden="true"
    >
      <path d="M3 8.5L6.5 12L13 4.5" />
    </CompositedSvg>
  );
}

function VoiceCloneInfoCard({ voiceId, sourceLabel, onClose }) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = reactExports.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(voiceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [voiceId]);
  return (
    // Compact shell — read-only card has minimal content (badge, voice_id,
    // optional source label, hint). The default 208px is enough.
    <PopoverShell onClose={onClose}>
      <div className="flex h-full flex-col gap-3 p-1 text-[var(--fg-default,#141414)]">
        <div className="flex items-center gap-2">
          <span
            className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              background: "var(--canvas-accent-soft, rgba(99, 102, 241, 0.12))",
              color: "var(--canvas-accent-strong, rgb(79, 70, 229))",
            }}
          >
            {t2("canvas.voiceClone.badge", "音色克隆")}
          </span>
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceClone.subtitle", "由 voice_clone 工具生成")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceClone.voiceIdLabel", "voice_id")}
          </span>
          <div
            className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1"
            style={{
              borderColor: "var(--canvas-controls-border, #e3e3e3)",
              background: "var(--bg-surface-secondary, #f7f7f7)",
            }}
          >
            <span
              className="flex-1 truncate font-mono text-[12px] text-[var(--fg-default,#141414)]"
              title={voiceId}
            >
              {voiceId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-[11px] text-[var(--fg-muted,#525252)] hover:bg-[var(--bg-surface,#fff)] hover:text-[var(--fg-default,#141414)]"
              title={t2("canvas.voiceClone.copy", "复制 voice_id")}
            >
              {copied ? <CheckIcon$3 /> : <CopyIcon$1 />}
              {copied
                ? t2("canvas.voiceClone.copied", "已复制")
                : t2("canvas.voiceClone.copy", "复制")}
            </button>
          </div>
        </div>
        {sourceLabel && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--fg-muted,#525252)]">
              {t2("canvas.voiceClone.sourceLabel", "克隆来源")}
            </span>
            <p
              className="m-0 truncate rounded-sm border px-2 py-1 text-[12px] text-[var(--fg-default,#141414)]"
              style={{
                borderColor: "var(--canvas-controls-border, #e3e3e3)",
                background: "var(--bg-surface-secondary, #f7f7f7)",
              }}
              title={sourceLabel}
            >
              {sourceLabel}
            </p>
          </div>
        )}
        <div className="mt-auto rounded-sm border-l-2 border-[var(--fg-muted,#525252)] bg-[var(--bg-surface-secondary,#f7f7f7)] px-2 py-1.5 text-[11px] leading-snug text-[var(--fg-muted,#525252)]">
          {t2(
            "canvas.voiceClone.usageHint",
            "复制 voice_id 后，可在 chat 中要求生成 TTS 时指定此音色，或继续在 MCP tool 调用中复用。",
          )}
        </div>
      </div>
    </PopoverShell>
  );
}

function CopyIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      role="img"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
    </CompositedSvg>
  );
}

function CheckIcon$2() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      role="img"
      aria-hidden="true"
    >
      <path d="M3 8.5L6.5 12L13 4.5" />
    </CompositedSvg>
  );
}

function VoiceDesignInfoCard({
  voiceId,
  voiceDescription,
  trialText,
  onRedesign,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  const [draftPrompt, setDraftPrompt] = reactExports.useState(
    voiceDescription ?? "",
  );
  const [draftPreview, setDraftPreview] = reactExports.useState(
    trialText ?? "",
  );
  const handleCopy = reactExports.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(voiceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [voiceId]);
  const canSubmit =
    draftPrompt.trim().length > 0 && draftPreview.trim().length > 0;
  const isUnchanged =
    draftPrompt.trim() === (voiceDescription ?? "").trim() &&
    draftPreview.trim() === (trialText ?? "").trim();
  const handleSubmit = reactExports.useCallback(() => {
    if (!canSubmit) return;
    onRedesign(draftPrompt, draftPreview);
  }, [canSubmit, draftPrompt, draftPreview, onRedesign]);
  return (
    // Compact (208px) shell + 60px extra for the two textareas + badge row.
    // Avoids the empty bottom strip we'd see with `expanded` (500px).
    <PopoverShell onClose={onClose} extraHeight={60}>
      <div className="flex h-full flex-col gap-3 p-1 text-[var(--fg-default,#141414)]">
        <div className="flex items-center gap-2">
          <span
            className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              background: "var(--canvas-accent-soft, rgba(99, 102, 241, 0.12))",
              color: "var(--canvas-accent-strong, rgb(79, 70, 229))",
            }}
          >
            {t2("canvas.voiceDesign.badge", "音色设计")}
          </span>
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceDesign.subtitle", "由 design_voice 工具生成")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceDesign.voiceIdLabel", "voice_id")}
          </span>
          <div
            className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1"
            style={{
              borderColor: "var(--canvas-controls-border, #e3e3e3)",
              background: "var(--bg-surface-secondary, #f7f7f7)",
            }}
          >
            <span
              className="flex-1 truncate font-mono text-[12px] text-[var(--fg-default,#141414)]"
              title={voiceId}
            >
              {voiceId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-[11px] text-[var(--fg-muted,#525252)] hover:bg-[var(--bg-surface,#fff)] hover:text-[var(--fg-default,#141414)]"
              title={t2("canvas.voiceDesign.copy", "复制 voice_id")}
            >
              {copied ? <CheckIcon$2 /> : <CopyIcon />}
              {copied
                ? t2("canvas.voiceDesign.copied", "已复制")
                : t2("canvas.voiceDesign.copy", "复制")}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceDesign.descriptionLabel", "音色描述")}
          </span>
          <textarea
            className="nopan nodrag nowheel resize-none rounded-sm border bg-[var(--bg-surface-secondary,#f7f7f7)] px-2 py-1 text-[12px] leading-snug text-[var(--fg-default,#141414)] outline-none focus:border-[var(--fg-default,#141414)]"
            style={{
              borderColor: "var(--canvas-controls-border, #e3e3e3)",
              height: 56,
            }}
            value={draftPrompt}
            onChange={(e2) => setDraftPrompt(e2.target.value)}
            placeholder={t2(
              "canvas.voiceDesign.descriptionPlaceholder",
              "例: 温暖低沉的成年男声，语速稍慢，带轻微北京口音",
            )}
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {t2("canvas.voiceDesign.trialTextLabel", "试听文本")}
          </span>
          <textarea
            className="nopan nodrag nowheel resize-none rounded-sm border bg-[var(--bg-surface-secondary,#f7f7f7)] px-2 py-1 text-[12px] leading-snug text-[var(--fg-default,#141414)] outline-none focus:border-[var(--fg-default,#141414)]"
            style={{
              borderColor: "var(--canvas-controls-border, #e3e3e3)",
              height: 44,
            }}
            value={draftPreview}
            onChange={(e2) => setDraftPreview(e2.target.value)}
            placeholder={t2(
              "canvas.voiceDesign.trialTextPlaceholder",
              "例: 你好，今天天气真不错",
            )}
            rows={2}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-[var(--fg-muted,#525252)]">
            {isUnchanged
              ? t2(
                  "canvas.voiceDesign.willRedesignSame",
                  "将用相同描述重新生成一个音色（保留当前节点）",
                )
              : t2(
                  "canvas.voiceDesign.willCreateNew",
                  "将生成新的音色节点（当前节点保留）",
                )}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-sm border px-3 py-1.5 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90"
            style={{
              background: "var(--fg-default, #141414)",
              color: "var(--bg-default, #fff)",
              borderColor: "var(--fg-default, #141414)",
            }}
          >
            {t2("canvas.voiceDesign.redesign", "重新设计音色")}
          </button>
        </div>
      </div>
    </PopoverShell>
  );
}

const PORTAL_POPOVER_Z$1 = 9998;

const PORTAL_TOOLBAR_Z$1 = 9999;

const TOOLBAR_HEIGHT$1 = 40;

const TOOLBAR_GAP$4 = 6;

const VIEWPORT_MARGIN$2 = 8;

const T2A_POPOVER_WIDTH = 580;

const T2A_POPOVER_HEIGHT_COMPACT = 254;

const T2A_POPOVER_HEIGHT_EXPANDED = 500;

const zoomSelector$7 = (s2) => s2.transform[2];

const SECONDS_PER_MINUTE = 60;

const MIN_MUSIC_DURATION_SECONDS = 3;

function formatActualMusicLength(durationSec) {
  if (durationSec === void 0 || !Number.isFinite(durationSec)) return void 0;
  const totalSeconds = Math.round(durationSec);
  if (totalSeconds < MIN_MUSIC_DURATION_SECONDS) return void 0;
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildMetaAudioParams(meta2, isElevenLabsInstrumental) {
  let params = meta2?.lyrics
    ? {
        ...(meta2?.params ?? {}),
        lyrics: meta2.lyrics,
      }
    : meta2?.params;
  const actualInstrumentalLength = isElevenLabsInstrumental
    ? formatActualMusicLength(meta2?.durationSec)
    : void 0;
  if (actualInstrumentalLength) {
    params = {
      ...(params ?? {}),
      music_length_ms: actualInstrumentalLength,
    };
  }
  return params;
}

function resolveDefaultAudioParams(draft, metaParams, upstreamParams, meta2) {
  let base2 = draft?.params ?? metaParams ?? upstreamParams;
  if (base2 && !base2.lyrics && meta2?.lyrics) {
    base2 = {
      ...base2,
      lyrics: meta2.lyrics,
    };
  }
  if (base2 && meta2?.params?.voice_id) {
    return {
      ...base2,
      voice_id: meta2.params.voice_id,
    };
  }
  return base2;
}

function AudioPromptPopoverPlacement({
  isUserEmpty,
  isGenerating,
  hasAudioContent,
  children: children2,
}) {
  const zoom2 = useStore$3(zoomSelector$7);
  const popoverGapOffset = resolveAudioPromptPopoverGapOffset({
    isUserEmpty,
    isGenerating,
    hasAudioContent,
    zoom: zoom2,
  });
  return <>{children2(popoverGapOffset)}</>;
}

function buildPopoverPosition$1(rect, width, height) {
  const placeBelow = window.innerHeight - rect.bottom > height + 24;
  const desiredLeft = rect.left + rect.width / 2 - width / 2;
  const clampedLeft = Math.max(
    VIEWPORT_MARGIN$2,
    Math.min(window.innerWidth - width - VIEWPORT_MARGIN$2, desiredLeft),
  );
  const top2 = placeBelow
    ? rect.bottom + NODE_POPOVER_SAFE_GAP
    : Math.max(VIEWPORT_MARGIN$2, rect.top - height - NODE_POPOVER_SAFE_GAP);
  return {
    top: top2,
    left: clampedLeft,
    height,
  };
}

function FixedPortalCard$1({
  top: top2,
  left,
  width,
  height,
  transitionHeight,
  promptLayout = false,
  children: children2,
}) {
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: portaled popover frame; child popover owns all interactive surfaces
    // biome-ignore lint/a11y/useKeyWithClickEvents: outer card stops mouse propagation only; keyboard handled by inner controls
    <div
      className={`nodrag nowheel${promptLayout ? " gap-2" : ""}`}
      data-clip-popover-portal="true"
      data-action-ui-id={promptLayout ? "popover.shell" : void 0}
      style={{
        position: "fixed",
        top: top2,
        left,
        width,
        height,
        zIndex: PORTAL_POPOVER_Z$1,
        background: "var(--canvas-controls-bg)",
        border: "1.5px solid rgba(0,0,0,0.1)",
        borderRadius: 8,
        padding: promptLayout ? 8 : 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "i2v-popover-in 0.15s ease-out",
        transition: transitionHeight ? "height 250ms ease-out" : void 0,
      }}
      onMouseDown={(e2) => e2.stopPropagation()}
      onClick={(e2) => e2.stopPropagation()}
    >
      {children2}
    </div>,
    document.body,
  );
}

export function AudioActionSurface({
  nodeId,
  meta: meta2,
  data: data2,
  nodeWidth: _nodeWidth = AUDIO_CARD_SIZE.width,
  selected: selected2,
  generating,
  isGenerating,
  isUserEmpty,
  isInteractiveSelect,
  anchor,
  mediaActions,
}) {
  const generatingStateStore = useGeneratingStateApi();
  const { t: t2 } = useTranslation();
  const {
    submitTxt2Audio,
    submitDesignVoice,
    submitVoiceIsolation,
    fetchAudioModels,
    fetchTtsVoices,
    getLastUsedModelParams,
    resolveFileUrl,
  } = useCanvasBridge();
  const {
    flushPersist,
    savePopoverDraft,
    getIncomingSourceIds,
    getNodeById,
    subscribeGraphChange,
  } = useCanvasActions();
  const assetMetadataStore = useAssetMetadataApi();
  const modelInfo = useModelForAsset(meta2?.backend, meta2?.model_id, "audio");
  const [showT2APopover, setShowT2APopover] = reactExports.useState(false);
  const [referenceTextPaths, setReferenceTextPaths] = reactExports.useState([]);
  const [referenceRevision, setReferenceRevision] = reactExports.useState(0);
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  reactExports.useEffect(
    () =>
      subscribeGraphChange(() => setReferenceRevision((value) => value + 1)),
    [subscribeGraphChange],
  );
  reactExports.useEffect(() => {
    if (!showT2APopover && !selected2) return;
    const sources = getIncomingSourceIds(nodeId);
    const persistedTextIds = data2?.referenceTextIds;
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(persistedTextIds)
          ? persistedTextIds
          : meta2?.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    refreshUpstreamText(sources);
  }, [
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    nodeId,
    referenceRevision,
    refreshUpstreamText,
    selected2,
    showT2APopover,
  ]);
  const t2aDraft = getPopoverDraft(data2, "t2a");
  const [initialAudioMode, setInitialAudioMode] = reactExports.useState("tts");
  const [showVoiceDesignInfo, setShowVoiceDesignInfo] =
    reactExports.useState(false);
  const [showVoiceCloneInfo, setShowVoiceCloneInfo] =
    reactExports.useState(false);
  const isVoiceDesign =
    meta2?.model_id === "voice-design" || meta2?.source_tool === "design_voice";
  const isVoiceClone =
    meta2?.model_id === "voice-clone" || meta2?.source_tool === "voice_clone";
  const isElevenLabsMusic =
    !isUserEmpty && meta2?.backend === BACKEND_ELEVENLABS_MUSIC;
  const isElevenLabsInstrumental =
    meta2?.params?.is_instrumental === "instrumental";
  const isElevenLabsVocal = isElevenLabsMusic && !isElevenLabsInstrumental;
  const displayLyrics = getDisplayLyrics(meta2);
  const {
    showLightbox,
    showClipPanel,
    closeLightbox,
    closeClipPanel,
    handleClipExport,
    toolbarItems: baseToolbarItems,
  } = mediaActions;
  const handleAudioSubmit = reactExports.useCallback(
    (
      prompt,
      modelId,
      params,
      replaceNodeId,
      imagePaths,
      audioPaths,
      textPaths,
    ) => {
      const submit = () => {
        submitTxt2Audio?.(
          nodeId,
          prompt,
          modelId,
          params,
          replaceNodeId,
          void 0,
          void 0,
          imagePaths,
          audioPaths,
          textPaths,
        );
        if (replaceNodeId) {
          generatingStateStore.getState().mark(nodeId, {
            phase: "generating",
            prompt,
            model: modelId,
            prevUrl: meta2?.url,
            generationStartedAt: new Date().toISOString(),
          });
        }
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () =>
          dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [
      nodeId,
      submitTxt2Audio,
      meta2?.url,
      generatingStateStore,
      flushPersist,
      t2,
    ],
  );
  const [isolatingVoice, setIsolatingVoice] = reactExports.useState(false);
  const handleVoiceIsolate = reactExports.useCallback(async () => {
    if (!submitVoiceIsolation || !meta2?.path || isolatingVoice) return;
    setIsolatingVoice(true);
    try {
      await submitVoiceIsolation(nodeId, meta2.path);
    } finally {
      setIsolatingVoice(false);
    }
  }, [submitVoiceIsolation, meta2?.path, nodeId, isolatingVoice]);
  const voiceIsolateCost =
    meta2?.durationSec != null ? Math.ceil(meta2.durationSec / 15) : void 0;
  const voiceIsolateAllowed =
    !!submitVoiceIsolation &&
    meta2?.durationSec != null &&
    meta2.durationSec <= 300;
  const voiceIsolateOverLimit =
    !!submitVoiceIsolation &&
    meta2?.durationSec != null &&
    meta2.durationSec > 300;
  reactExports.useCallback(() => {
    setShowVoiceDesignInfo(false);
    setShowVoiceCloneInfo(false);
    setInitialAudioMode("extension");
    setShowT2APopover(true);
  }, []);
  const toolbarItems = (() => {
    const findItem = (id2) => baseToolbarItems.find((i2) => i2.id === id2);
    const clip2 = findItem("clip");
    const addToChat = findItem("add-to-chat");
    const fullscreen = findItem("fullscreen");
    const promote = findItem("promote-to-asset");
    let voiceIsolate;
    if (voiceIsolateOverLimit) {
      voiceIsolate = {
        id: "voice-isolate",
        label: t2("canvas.voiceIsolate.overLimit", {
          defaultValue: "Audio over 300s is not supported",
        }),
        icon: <VoiceIsolateIcon />,
        onClick: () => {},
        disabled: true,
        // Match video toolbar's left-half "label + icon" pattern — design
        // wants 剪辑 / 语音分离 to render with their text labels.
        forceLabel: true,
      };
    } else if (voiceIsolateAllowed) {
      voiceIsolate = {
        id: "voice-isolate",
        label: isolatingVoice
          ? t2("canvas.voiceIsolating", {
              defaultValue: "Isolating...",
            })
          : t2("canvas.voiceIsolate", {
              defaultValue: "Voice Isolator",
            }),
        icon: isolatingVoice ? <ToolbarSpinnerIcon /> : <VoiceIsolateIcon />,
        onClick: handleVoiceIsolate,
        disabled: isolatingVoice,
        // 15s/credit billing — shown via trailing badge inside the dropdown
        // entry / tooltip, matching the image + video toolbar convention.
        trailing: <CreditCostBadge cost={voiceIsolateCost} />,
        forceLabel: true,
      };
    }
    const left = [];
    if (clip2)
      left.push({
        ...clip2,
        forceLabel: true,
      });
    if (voiceIsolate) left.push(voiceIsolate);
    const right = [];
    if (promote) {
      right.push({
        ...promote,
        separator: true,
      });
    }
    if (addToChat) {
      right.push({
        ...addToChat,
        // If promote isn't present, addToChat anchors the divider.
        separator: !promote,
      });
    }
    if (fullscreen) right.push(fullscreen);
    return [...left, ...right];
  })();
  const upstreamAudioMeta = useUpstreamSameTypeMeta(nodeId, "audio");
  const upstreamReferenceAudioPaths = useUpstreamReferenceAudios(nodeId);
  const lastUsedAudio = getLastUsedModelParams?.("t2a");
  const actualAudioModelId =
    modelInfo?.id ?? meta2?.model_id ?? upstreamAudioMeta?.modelId;
  const effectiveT2ADraft = isElevenLabsVocal
    ? void 0
    : resolveEffectiveAudioDraft(t2aDraft, meta2, data2?.status);
  const defaultTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    resolveReferenceTexts(
      getIncomingSourceIds(nodeId),
      void 0,
      assetMetadataStore,
      getNodeById,
    ),
    effectiveT2ADraft?.textPaths,
  );
  const metaAudioParams = buildMetaAudioParams(meta2, isElevenLabsInstrumental);
  const defaultAudioParams = resolveDefaultAudioParams(
    effectiveT2ADraft,
    metaAudioParams,
    upstreamAudioMeta?.params,
    meta2,
  );
  const handleSaveT2ADraft = reactExports.useCallback(
    (draft) => {
      if (!meta2?.model_id) {
        savePopoverDraft(nodeId, "t2a", draft);
        return;
      }
      if (!draft) {
        savePopoverDraft(nodeId, "t2a", void 0);
        return;
      }
      savePopoverDraft(
        nodeId,
        "t2a",
        normalizeAudioDraftForPersistence(draft, {
          prompt: meta2.prompt,
          modelId: actualAudioModelId,
          params: metaAudioParams,
        }),
      );
    },
    [actualAudioModelId, meta2, metaAudioParams, nodeId, savePopoverDraft],
  );
  const canOpenPopover =
    isUserEmpty ||
    (!!meta2?.model &&
      !isUserProvidedAssetModel(meta2.model) &&
      meta2.model !== "voice-isolation");
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (!canOpenPopover) return;
    if (!isInteractiveSelect) return;
    if (isVoiceDesign) {
      if (showVoiceDesignInfo) return;
      setShowVoiceDesignInfo(true);
      return;
    }
    if (isVoiceClone) {
      if (showVoiceCloneInfo) return;
      setShowVoiceCloneInfo(true);
      return;
    }
    if (showT2APopover) return;
    setShowT2APopover(true);
  }, [
    selected2,
    canOpenPopover,
    isInteractiveSelect,
    isVoiceDesign,
    isVoiceClone,
    showT2APopover,
    showVoiceDesignInfo,
    showVoiceCloneInfo,
  ]);
  const deselectT2AClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowT2APopover,
  );
  const handleT2AClose = reactExports.useCallback(() => {
    setInitialAudioMode("tts");
    if (anchor.kind === "rect") {
      setShowT2APopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectT2AClose();
  }, [anchor, deselectT2AClose]);
  const deselectVoiceDesignClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowVoiceDesignInfo,
  );
  const handleVoiceDesignInfoClose = reactExports.useCallback(() => {
    if (anchor.kind === "rect") {
      setShowVoiceDesignInfo(false);
      anchor.onCloseAll();
      return;
    }
    deselectVoiceDesignClose();
  }, [anchor, deselectVoiceDesignClose]);
  const deselectVoiceCloneClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowVoiceCloneInfo,
  );
  const handleVoiceCloneInfoClose = reactExports.useCallback(() => {
    if (anchor.kind === "rect") {
      setShowVoiceCloneInfo(false);
      anchor.onCloseAll();
      return;
    }
    deselectVoiceCloneClose();
  }, [anchor, deselectVoiceCloneClose]);
  const handleElevenLabsRegenerate = reactExports.useCallback(
    (replace2) => {
      const modelId = meta2?.model_id ?? modelInfo?.id;
      if (!submitTxt2Audio || !modelId) return;
      const prompt = meta2?.prompt ?? "";
      const plan = meta2?.compositionPlan?.trim();
      const params = {
        ...(meta2?.params ?? {}),
        ...(plan
          ? {
              composition_plan_json: plan,
            }
          : {}),
      };
      submitTxt2Audio(
        nodeId,
        prompt,
        modelId,
        params,
        replace2 ? nodeId : void 0,
        void 0,
        BACKEND_ELEVENLABS_MUSIC,
      );
      if (replace2) {
        generatingStateStore.getState().mark(nodeId, {
          prompt,
          model: modelId,
          prevUrl: meta2?.url,
          generationStartedAt: new Date().toISOString(),
        });
      }
    },
    [
      submitTxt2Audio,
      meta2?.model_id,
      meta2?.prompt,
      meta2?.params,
      meta2?.compositionPlan,
      meta2?.url,
      modelInfo?.id,
      nodeId,
      generatingStateStore,
    ],
  );
  const handleRedesignVoice = reactExports.useCallback(
    (prompt, previewText) => {
      submitDesignVoice?.(nodeId, prompt, previewText);
    },
    [nodeId, submitDesignVoice],
  );
  const toolbarVisible =
    anchor.kind === "rect"
      ? !isGenerating && !isUserEmpty
      : selected2 && !isGenerating && !isUserEmpty && isInteractiveSelect;
  const toolbarRenderShell =
    anchor.kind === "rect"
      ? (children2) => {
          const rect = anchor.rect;
          const placeAbove = rect.top > TOOLBAR_HEIGHT$1 + 16;
          const top2 = placeAbove
            ? rect.top - TOOLBAR_HEIGHT$1 - TOOLBAR_GAP$4
            : rect.bottom + TOOLBAR_GAP$4;
          const left = rect.left + rect.width / 2;
          return reactDomExports.createPortal(
            // biome-ignore lint/a11y/noStaticElementInteractions: anchor wrapper; child palette owns all interactive surfaces
            // biome-ignore lint/a11y/useKeyWithClickEvents: wrapper stops mouse propagation only; keyboard handled by inner controls
            <div
              className="nodrag nowheel"
              data-clip-popover-portal="true"
              style={{
                position: "fixed",
                top: top2,
                left,
                transform: "translateX(-50%)",
                zIndex: PORTAL_TOOLBAR_Z$1,
              }}
              onMouseDown={(e2) => e2.stopPropagation()}
              onClick={(e2) => e2.stopPropagation()}
            >
              {children2}
            </div>,
            document.body,
          );
        }
      : void 0;
  const t2aRenderShell =
    anchor.kind === "rect"
      ? (props) => {
          const baseHeight = props.expanded
            ? T2A_POPOVER_HEIGHT_EXPANDED
            : T2A_POPOVER_HEIGHT_COMPACT;
          const pos = buildPopoverPosition$1(
            anchor.rect,
            T2A_POPOVER_WIDTH,
            baseHeight + props.extraHeight,
          );
          return (
            <FixedPortalCard$1
              top={pos.top}
              left={pos.left}
              width={T2A_POPOVER_WIDTH}
              height={pos.height}
              transitionHeight={true}
              promptLayout={true}
            >
              {props.children}
            </FixedPortalCard$1>
          );
        }
      : void 0;
  const t2aNodeId =
    anchor.kind === "rect" || isUserEmpty || initialAudioMode === "extension"
      ? void 0
      : nodeId;
  const t2aReplaceNodeId =
    anchor.kind === "rect" || isUserEmpty ? nodeId : void 0;
  return (
    <>
      {toolbarVisible && (
        <NodeToolbar
          items={toolbarItems}
          visible={true}
          renderShell={toolbarRenderShell}
        />
      )}
      {showLightbox && meta2?.url && (
        <AudioLightbox$1
          item={lightboxItemFromAssetMeta("audio", meta2)}
          name={meta2.name}
          lyrics={displayLyrics}
          onClose={closeLightbox}
        />
      )}
      {showClipPanel && meta2?.url && (
        <AudioClipPanel
          audioUrl={meta2.url}
          audioName={meta2.name ?? "audio"}
          onClose={closeClipPanel}
          onExport={handleClipExport}
        />
      )}
      {showT2APopover && (
        <AudioPromptPopoverPlacement
          isUserEmpty={isUserEmpty}
          isGenerating={isGenerating}
          hasAudioContent={!!meta2?.url}
        >
          {(popoverGapOffset) => (
            <TxtPopover
              key={initialAudioMode ?? "default"}
              mode="audio"
              onSubmit={
                isElevenLabsVocal
                  ? (_prompt, _modelId, _params, replaceNodeId) =>
                      handleElevenLabsRegenerate(!!replaceNodeId)
                  : handleAudioSubmit
              }
              onClose={handleT2AClose}
              listModels={fetchAudioModels}
              fetchTtsVoices={fetchTtsVoices}
              defaultPrompt={
                isElevenLabsVocal
                  ? meta2?.prompt
                  : (effectiveT2ADraft?.prompt ?? meta2?.prompt)
              }
              defaultModelId={
                isElevenLabsVocal
                  ? modelInfo?.id
                  : (effectiveT2ADraft?.modelId ?? actualAudioModelId)
              }
              initialAudioMode={initialAudioMode}
              defaultParams={defaultAudioParams}
              lastUsedModelId={lastUsedAudio?.modelId}
              lastUsedParams={lastUsedAudio?.params}
              nodeId={t2aNodeId}
              replaceNodeId={t2aReplaceNodeId}
              isGenerating={isGenerating}
              readOnly={isElevenLabsVocal}
              readOnlyLyrics={isElevenLabsVocal ? displayLyrics : void 0}
              readOnlyHint={
                isElevenLabsVocal
                  ? t2("canvas.elevenLabsMusic.editUnsupported", {
                      defaultValue: "暂不支持编辑",
                    })
                  : void 0
              }
              onSaveDraft={
                !isElevenLabsVocal && anchor.kind === "node"
                  ? handleSaveT2ADraft
                  : void 0
              }
              submitLabel={
                anchor.kind === "rect"
                  ? t2("canvas.clipUpstream.submitGenerate", {
                      defaultValue: "生成",
                    })
                  : void 0
              }
              popoverGapOffset={popoverGapOffset}
              renderShell={t2aRenderShell}
              resolveFileUrl={resolveFileUrl}
              defaultImagePaths={effectiveT2ADraft?.imagePaths}
              defaultAudioPaths={resolveDefaultReferencePaths(
                initialAudioMode === "extension" && meta2?.path
                  ? [meta2.path]
                  : upstreamReferenceAudioPaths,
                effectiveT2ADraft?.audioPaths,
              )}
              defaultTextPaths={defaultTextPaths}
              referenceTextContent={upstreamTextContent}
            />
          )}
        </AudioPromptPopoverPlacement>
      )}
      {showVoiceDesignInfo && meta2?.voiceId && (
        <VoiceDesignInfoCard
          voiceId={meta2.voiceId}
          voiceDescription={meta2.description}
          trialText={meta2.prompt}
          onRedesign={handleRedesignVoice}
          onClose={handleVoiceDesignInfoClose}
        />
      )}
      {showVoiceCloneInfo && meta2?.voiceId && (
        <VoiceCloneInfoCard
          voiceId={meta2.voiceId}
          sourceLabel={meta2.description}
          onClose={handleVoiceCloneInfoClose}
        />
      )}
      {void generating}
    </>
  );
}
