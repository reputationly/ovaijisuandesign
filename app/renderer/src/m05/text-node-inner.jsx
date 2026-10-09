// text-node-inner.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  Trash2,
  dedupedToast,
  Dialog$1,
  Sparkles,
  useCanvasBridge,
  Markdown$1,
  remarkGfm,
  useDiffReviewStore,
  useCanvasActive,
  Clapperboard,
  ClipboardList,
  PenLine,
  useAssetMeta,
  useCanvasIsMultiSelect,
  useCanvasIsDragging,
  useCanvasIsBoxSelecting,
  TEXT_CARD_DEFAULT_SIZE,
  useFileVersion,
  useGenerating,
  useGeneratingStateApi,
  isGenerationErrorStatus,
  useCanvasActions,
  useAssetMetadataApi,
  useNodeRename,
  NodeResizeFrame,
  useEmitDerivedFromBlob,
  useNodeId,
  useStore$3,
  NodeToolbar$1,
  Position,
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  Stamp,
  useVideoToolbarCustomizationStore,
  VIDEO_TOOLBAR_TOOLS,
  PlaybackPauseIcon$1,
  PlaybackPlayIcon$1,
  normToPxRect,
  ResizeHandle,
} from "../vendor.js";
import {
  CloseIcon$1,
  TextPlaceholderIcon,
  TextEditIcon,
  PromoteToAssetIcon,
  CopyIcon$2,
  AddToChatIcon,
  GeneratingMediaArea,
  areNodePropsEqual,
  SendArrowIcon,
  SuperResolutionIcon,
  ClipIcon,
  ExtractFrameIcon,
  ExtractAudioIcon,
  EraseSubtitleIcon,
  AsrIcon,
  ColorAdjustIcon,
  AddToClipNodeIcon,
  FullscreenIcon$1,
} from "../m01/generating-media-area.jsx";
import {
  AGENT_CANVAS_TEXT_SOURCE_TOOL,
  CANVAS_TEXT_AGENT_PROMPT_SOURCE,
  getPopoverDraftMap,
  TEXT_CARD_MIN_SIZE,
} from "../m01/prune-persisted-node-data.js";
import {
  useSimulatedProgress,
  resolveGenerationProgressStartedAt,
  isCloneData,
  NodeToolbar,
  NODE_POPOVER_SAFE_GAP,
} from "../m01/use-lightbox-media-actions.jsx";
import { MediaGenerationErrorOverlay, CreditCostBadge } from "../m01/create-tracker.jsx";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogFooter$1,
} from "../m02/thumb-chip.jsx";
import {
  Button$2,
  NodeEmptyState,
  useAddToChat,
  NodeShell,
  NodeBody,
} from "../m01/use-media-node-actions.jsx";
import {
  resolveTextEditorMode,
  isTextEditorContentReady,
  deriveMdDir,
  resolveMarkdownAssetUrl,
  classifyMarkdownAsset,
} from "../m04/table-node-inner.jsx";
import {
  useSuspendCanvasInteractions,
  NodeHeader,
  NodeHandles,
} from "../m01/use-inline-rename.jsx";
import { useReferenceNavigationSnapshot } from "../m02/decode-worker-pool.jsx";
import {
  resolveReferenceImages,
  resolveReferenceVideos,
  selectBestBackend,
  isWebGPUSupported,
  isWebGLSupported,
  parseCubeLUT,
} from "../m03/base-backend.jsx";
import {
  resolveReferenceAudios,
  resolveReferenceTexts,
  restoreDirectReferencePaths,
  usePopoverCloseWithDeselect,
} from "../m01/resolve-reference-texts.js";
import { useAttachmentState } from "../m02/use-attachment-state.js";
import { TxtPopover } from "../m02/audio-action-surface.jsx";
import { CustomizeToolbarDialog$2 } from "../m03/color-adjust-dialog.jsx";
import {
  calcVideoCost,
  Select$2,
  SelectTrigger$1,
  SelectValue$1,
  SelectContent$1,
  SelectItem$1,
} from "../m01/calc-video-cost-breakdown.jsx";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { ProgressBar } from "../m04/ready-sub-video-card.jsx";
import { calcToolCost, getModelBaseCost } from "../m01/slider.jsx";
import { defaultSettings, defaultLUTParams } from "../m03/highlights-fragment.js";
import { WebGPUBackend } from "../m03/web-gpu-backend.js";
import { WebGLBackend } from "../m03/web-gl-backend.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { MarkdownFullscreen, SourceTextFullscreen } from "./markdown-fullscreen.jsx";
function TextFullscreenInner({
  initialMarkdown,
  onClose,
  onDraftChange,
  plain,
  externalRevision,
  sourceNodeId,
  documentPath,
  onAnnotationsChange,
  onAnnotationActivate,
  subscribeAnnotationCommand,
  onEditingSelectionChange,
  getCloseBlockReason,
}) {
  const editorModeRef = reactExports.useRef(resolveTextEditorMode(initialMarkdown, plain));
  const editorMode = editorModeRef.current;
  if (editorMode !== "rich-markdown") {
    return (
      <SourceTextFullscreen
        initialMarkdown={initialMarkdown}
        onClose={onClose}
        onDraftChange={onDraftChange}
        externalRevision={externalRevision}
        onEditingSelectionChange={onEditingSelectionChange}
        subscribeAnnotationCommand={subscribeAnnotationCommand}
        sourceNodeId={sourceNodeId}
        documentPath={documentPath}
        getCloseBlockReason={getCloseBlockReason}
        editorKind={editorMode === "source-markdown" ? "codemirror" : "textarea"}
      />
    );
  }
  return (
    <MarkdownFullscreen
      initialMarkdown={initialMarkdown}
      onClose={onClose}
      onDraftChange={onDraftChange}
      externalRevision={externalRevision}
      sourceNodeId={sourceNodeId}
      documentPath={documentPath}
      onAnnotationsChange={onAnnotationsChange}
      onAnnotationActivate={onAnnotationActivate}
      subscribeAnnotationCommand={subscribeAnnotationCommand}
      onEditingSelectionChange={onEditingSelectionChange}
      getCloseBlockReason={getCloseBlockReason}
    />
  );
}
const TextFullscreen = reactExports.memo(TextFullscreenInner);
function pickTextGenerationDefaults(draft, asset) {
  const draftPrompt = typeof draft?.prompt === "string" ? draft.prompt.trim() : "";
  const assetPrompt = typeof asset?.prompt === "string" ? asset.prompt.trim() : "";
  const draftOverridesAsset =
    draftPrompt.length > 0 && assetPrompt.length > 0 && draftPrompt !== assetPrompt;
  if (draftOverridesAsset || !asset?.model_id) {
    return {
      modelId: draft?.modelId ?? asset?.model_id,
      params: draft?.params ?? asset?.params,
    };
  }
  return {
    modelId: asset.model_id,
    params: asset.params,
  };
}
const QUICK_PROMPTS = [
  {
    key: "script",
    icon: Clapperboard,
    labelKey: "canvas.quickAction.script.label",
    labelFallback: "剧本生成",
    promptKey: "canvas.quickAction.script.prompt",
    promptFallback:
      "请创作一个[时长]的[类型]剧本。\n主题：[一句话描述]\n情绪基调：[温暖/悬疑/搞笑/热血]\n特殊要求：[如有]",
  },
  {
    key: "plan",
    icon: ClipboardList,
    labelKey: "canvas.quickAction.plan.label",
    labelFallback: "策划案生成",
    promptKey: "canvas.quickAction.plan.prompt",
    promptFallback:
      "请撰写一份[项目类型]策划案。\n项目背景：[简述]\n核心目标：[希望达成什么]\n目标受众：[人群描述]",
  },
  {
    key: "prompt",
    icon: Sparkles,
    labelKey: "canvas.quickAction.prompt.label",
    labelFallback: "提示词生成",
    promptKey: "canvas.quickAction.prompt.prompt",
    promptFallback:
      "根据以下创意需求，生成一组适用于[目标工具]的高质量提示词。\n创意需求：[描述你想要的画面/音乐/视频]\n风格偏好：[写实/插画/3D/动漫/其他]",
  },
];
function TextNodeQuickActions({ onQuickPrompt, onWriteOwn }) {
  const { t: t2 } = useTranslation();
  return (
    <NodeEmptyState
      icon={<TextPlaceholderIcon />}
      guidance={t2("canvas.quickAction.try", {
        defaultValue: "试试：",
      })}
      suggestions={[
        {
          id: "canvas.text-quick-write",
          icon: <PenLine size={16} strokeWidth={1.5} />,
          label: t2("canvas.quickAction.write.label", {
            defaultValue: "自己编写内容",
          }),
          onSelect: (event) => {
            event.stopPropagation();
            onWriteOwn();
          },
        },
        ...QUICK_PROMPTS.map((qa) => ({
          id: `canvas.text-quick-${qa.key}`,
          icon: <qa.icon size={16} strokeWidth={1.5} />,
          label: t2(qa.labelKey, {
            defaultValue: qa.labelFallback,
          }),
          onSelect: (event) => {
            event.stopPropagation();
            onQuickPrompt(
              t2(qa.promptKey, {
                defaultValue: qa.promptFallback,
              }),
            );
          },
        })),
      ]}
    />
  );
}
const LEGACY_AGENT_DESCRIPTION_LIMIT = 100;
function hasAgentTextProvenance({ sourceTool, promptSeedSource }) {
  return (
    sourceTool === AGENT_CANVAS_TEXT_SOURCE_TOOL ||
    promptSeedSource === CANVAS_TEXT_AGENT_PROMPT_SOURCE
  );
}
function resolveTextPromptSeed({
  quickPrompt,
  draftPrompt,
  nodePrompt,
  upstreamPresetPrompt,
  markdown: markdown2,
  sourceTool,
  promptSeedSource,
  description,
}) {
  const trimmedBody = markdown2.trim();
  const legacyAgentDescription =
    trimmedBody.length > LEGACY_AGENT_DESCRIPTION_LIMIT
      ? `${trimmedBody.slice(0, LEGACY_AGENT_DESCRIPTION_LIMIT)}…`
      : trimmedBody;
  const isLegacyAgentText =
    sourceTool === void 0 &&
    promptSeedSource === void 0 &&
    legacyAgentDescription.length > 0 &&
    description?.trim() === legacyAgentDescription;
  const isAgentText =
    hasAgentTextProvenance({
      sourceTool,
      promptSeedSource,
    }) || isLegacyAgentText;
  if (quickPrompt !== void 0)
    return {
      prompt: quickPrompt,
      source: "quick",
    };
  if (draftPrompt !== void 0 && draftPrompt !== markdown2) {
    return {
      prompt: draftPrompt,
      source: "draft",
    };
  }
  if (isAgentText)
    return {
      prompt: "",
      source: "none",
    };
  if (nodePrompt !== void 0 && nodePrompt !== markdown2) {
    return {
      prompt: nodePrompt,
      source: "node",
    };
  }
  if (upstreamPresetPrompt !== void 0) {
    return {
      prompt: upstreamPresetPrompt,
      source: "upstream",
    };
  }
  return {
    prompt: "",
    source: "none",
  };
}
function shouldAutoOpenTextPopover({
  selected: selected2,
  canSubmit,
  isMultiSelect,
  isBoxSelecting,
  isPopoverOpen,
  isFullscreen,
  sourceTool,
  promptSeedSource,
}) {
  if (
    hasAgentTextProvenance({
      sourceTool,
      promptSeedSource,
    })
  )
    return false;
  return (
    selected2 && canSubmit && !isMultiSelect && !isBoxSelecting && !isPopoverOpen && !isFullscreen
  );
}
const TEXT_REF_MAX_IMAGES = 6;
const TEXT_REF_MAX_VIDEOS = 2;
const TEXT_REF_MAX_AUDIOS = 2;
const TEXT_REF_MAX_TEXTS = 5;
function TextNodeInner({ id: id2, selected: selected2, width, height, data: data2 }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMeta(id2);
  const dataPath = data2?.path;
  const textPath = meta2?.path ?? dataPath;
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasIsDragging();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isPreviewInteractive = !!selected2 && !isMultiSelect && !isDragging && !isBoxSelecting;
  const [nodeWidth, setNodeWidth] = reactExports.useState(width || TEXT_CARD_DEFAULT_SIZE.width);
  const [nodeHeight, setNodeHeight] = reactExports.useState(
    height || TEXT_CARD_DEFAULT_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setNodeWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setNodeHeight(height);
  }, [height]);
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const [markdown2, setMarkdown] = reactExports.useState("");
  const [loaded, setLoaded] = reactExports.useState(false);
  const [loadedTextPath, setLoadedTextPath] = reactExports.useState(null);
  const editorContentReady = isTextEditorContentReady(loaded, textPath, loadedTextPath);
  const editSessionRef = reactExports.useRef(null);
  const openFullscreen = reactExports.useCallback(() => {
    if (!editorContentReady) return;
    editSessionRef.current = {
      nodeId: id2,
      editSessionId: globalThis.crypto?.randomUUID?.() ?? `text-edit-${Date.now().toString(36)}`,
    };
    setFullscreen(true);
  }, [editorContentReady, id2]);
  const pendingOpenNodeId = useDiffReviewStore((state2) => state2.pendingOpenNodeId);
  reactExports.useEffect(() => {
    if (!editorContentReady || fullscreen || pendingOpenNodeId !== id2) return;
    if (useDiffReviewStore.getState().consumeOpenEditor(id2)) openFullscreen();
  }, [editorContentReady, fullscreen, pendingOpenNodeId, id2, openFullscreen]);
  const { snapshot: referenceReturnText } = useReferenceNavigationSnapshot(id2, "text");
  const [showT2TPopover, setShowT2TPopover] = reactExports.useState(!!referenceReturnText);
  const [t2tPopoverKey, setT2TPopoverKey] = reactExports.useState(0);
  const textRevision = data2?.textRevision;
  const fileVersion = useFileVersion(textPath);
  const generating = useGenerating(id2);
  const generatingStateStore = useGeneratingStateApi();
  const nodeStatus = data2?.status;
  const dataGenerating = nodeStatus === "generating";
  const dataIncomplete = isGenerationErrorStatus(nodeStatus);
  const persistedErrorMessage =
    dataIncomplete && typeof data2.errorMessage === "string" ? data2.errorMessage : void 0;
  const persistedErrorReason =
    dataIncomplete && typeof data2.errorReason === "string" ? data2.errorReason : void 0;
  const persistedRetryPayload =
    dataIncomplete && data2.retryPayload && typeof data2.retryPayload === "object"
      ? data2.retryPayload
      : void 0;
  reactExports.useEffect(() => {
    if (persistedErrorMessage !== void 0) {
      generatingStateStore.getState().clear(id2);
    }
  }, [persistedErrorMessage, id2, generatingStateStore]);
  const isGenerating = persistedErrorMessage === void 0 && (dataGenerating || !!generating);
  const generatingProgress = useSimulatedProgress(
    isGenerating,
    "text",
    resolveGenerationProgressStartedAt(data2, dataGenerating, generating?.generationStartedAt),
  );
  const generationErrorMessage = isGenerating ? generating?.error : persistedErrorMessage;
  const hasGenerationError = !!generationErrorMessage;
  const generationErrorStatus = generationErrorMessage
    ? isGenerating
      ? (generating?.errorStatus ?? "error")
      : isGenerationErrorStatus(nodeStatus)
        ? nodeStatus
        : "error"
    : void 0;
  const {
    createTextFile,
    loadTextContent,
    onAddToChat,
    saveTextContent,
    submitTxt2Text,
    fetchTextModels,
    resolveFileUrl,
    onPromoteToAsset,
    onTextEditActiveChange,
    isWorkspaceActive,
    getTextEditCloseBlockReason,
    onTextEditSelectionChange,
    onAnnotationsChange,
    onAnnotationActivate,
    subscribeAnnotationCommand,
  } = useCanvasBridge();
  const {
    savePopoverDraft,
    getIncomingSourceIds,
    getNodeById,
    subscribeGraphChange,
    selectNodeExclusive,
    fillEmptyPlaceholder,
    flushPersist,
    closeContextMenus,
  } = useCanvasActions();
  const popoverDraft = getPopoverDraftMap(data2);
  const t2tDraft = popoverDraft?.t2t;
  const sourceTool =
    meta2?.source_tool ?? (typeof data2?.source_tool === "string" ? data2.source_tool : void 0);
  const promptSeedSource =
    typeof data2?.promptSeedSource === "string" ? data2.promptSeedSource : void 0;
  const assetMetadataStore = useAssetMetadataApi();
  const reversePromptRef = reactExports.useRef(void 0);
  const [refRevision, setRefRevision] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!showT2TPopover) return;
    return subscribeGraphChange(() => setRefRevision((v2) => v2 + 1));
  }, [showT2TPopover, subscribeGraphChange]);
  const { defaultImagePaths, defaultVideoPaths, defaultAudioPaths, defaultTextPaths } =
    // biome-ignore lint/correctness/useExhaustiveDependencies: trigger-only deps
    reactExports.useMemo(() => {
      const sources = getIncomingSourceIds(id2);
      return {
        defaultImagePaths: resolveReferenceImages(sources, void 0, assetMetadataStore, getNodeById),
        defaultVideoPaths: resolveReferenceVideos(sources, void 0, assetMetadataStore),
        defaultAudioPaths: resolveReferenceAudios(sources, void 0, assetMetadataStore),
        defaultTextPaths: resolveReferenceTexts(
          sources,
          Array.isArray(data2.referenceTextIds) ? data2.referenceTextIds : void 0,
          assetMetadataStore,
          getNodeById,
        ),
      };
    }, [id2, getIncomingSourceIds, getNodeById, assetMetadataStore, refRevision, showT2TPopover]);
  const attachmentDefaults = reactExports.useMemo(
    () => ({
      defaultImagePaths: restoreDirectReferencePaths(t2tDraft?.imagePaths, defaultImagePaths),
      defaultVideoPaths: restoreDirectReferencePaths(t2tDraft?.videoPaths, defaultVideoPaths),
      defaultAudioPaths: restoreDirectReferencePaths(t2tDraft?.audioPaths, defaultAudioPaths),
      defaultTextPaths: restoreDirectReferencePaths(t2tDraft?.textPaths, defaultTextPaths),
    }),
    [
      t2tDraft?.imagePaths,
      t2tDraft?.videoPaths,
      t2tDraft?.audioPaths,
      t2tDraft?.textPaths,
      defaultImagePaths,
      defaultVideoPaths,
      defaultAudioPaths,
      defaultTextPaths,
    ],
  );
  const attachment = useAttachmentState({
    ...attachmentDefaults,
    maxImageRefs: TEXT_REF_MAX_IMAGES,
    maxVideoRefs: TEXT_REF_MAX_VIDEOS,
    maxAudioRefs: TEXT_REF_MAX_AUDIOS,
    maxTextRefs: TEXT_REF_MAX_TEXTS,
    imageMode: "reference",
    hostNodeId: id2,
    resolveFileUrl,
  });
  const referenceItems = attachment.items;
  const t2tMentionPicker = reactExports.useMemo(
    () => ({
      addPaths: attachment.addPaths,
      constraints: attachment.pickerConstraints,
      supportedKinds: attachment.modelSupportedKindsForAtPicker,
    }),
    [attachment.addPaths, attachment.pickerConstraints, attachment.modelSupportedKindsForAtPicker],
  );
  const handleAddToChat = useAddToChat(id2, meta2, onAddToChat, dataPath);
  const onRename = useNodeRename(id2, isCloneData(data2));
  const isPlainText = !!textPath && textPath.toLowerCase().endsWith(".txt");
  const lastLoadedFromServerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!textPath || !loadTextContent) {
      setLoadedTextPath(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    setLoadedTextPath(null);
    let cancelled = false;
    loadTextContent(textPath)
      .then((md) => {
        if (cancelled) return;
        lastLoadedFromServerRef.current = md;
        setMarkdown(md);
        setLoadedTextPath(textPath);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedTextPath(textPath);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [textPath, loadTextContent, textRevision, fileVersion]);
  const pendingLazyCreateRef = reactExports.useRef(null);
  const latestLazyDraftRef = reactExports.useRef("");
  const lazyCreatedPathRef = reactExports.useRef(null);
  const ensureBackingFileAndOpen = reactExports.useCallback(async () => {
    if (textPath || lazyCreatedPathRef.current) {
      openFullscreen();
      return;
    }
    if (!createTextFile) return;
    let pending2 = pendingLazyCreateRef.current;
    if (!pending2) {
      pending2 = (async () => {
        try {
          const created = await createTextFile();
          if (!created) return;
          const attached = fillEmptyPlaceholder(id2, {
            assetId: created.assetId,
            type: "text",
            name: created.name,
            path: created.path,
          });
          if (!attached) return;
          await flushPersist();
          lazyCreatedPathRef.current = created.path;
          lastLoadedFromServerRef.current = "";
        } catch {
        } finally {
          pendingLazyCreateRef.current = null;
        }
      })();
      pendingLazyCreateRef.current = pending2;
    }
    await pending2;
    if (lazyCreatedPathRef.current) openFullscreen();
  }, [textPath, createTextFile, fillEmptyPlaceholder, flushPersist, id2, openFullscreen]);
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (isGenerating) return;
      void ensureBackingFileAndOpen();
    },
    [ensureBackingFileAndOpen, isGenerating],
  );
  const handleResize = reactExports.useCallback((newW, newH) => {
    setNodeWidth(newW);
    setNodeHeight(newH);
  }, []);
  const onTextEditActiveChangeRef = reactExports.useRef(onTextEditActiveChange);
  onTextEditActiveChangeRef.current = onTextEditActiveChange;
  const closeContextMenusRef = reactExports.useRef(closeContextMenus);
  closeContextMenusRef.current = closeContextMenus;
  reactExports.useEffect(() => {
    if (!fullscreen || !editSessionRef.current) return;
    const session = editSessionRef.current;
    closeContextMenusRef.current();
    onTextEditActiveChangeRef.current?.(session, true);
    return () => {
      onTextEditActiveChangeRef.current?.(session, false);
    };
  }, [fullscreen]);
  const handleTextSubmit = reactExports.useCallback(
    async (prompt, modelId, params) => {
      if (pendingLazyCreateRef.current) await pendingLazyCreateRef.current;
      submitTxt2Text?.(
        id2,
        prompt,
        modelId,
        params,
        attachment.imagePaths,
        attachment.textPaths,
        attachment.videoPaths,
        attachment.audioPaths,
      );
    },
    [
      id2,
      submitTxt2Text,
      attachment.imagePaths,
      attachment.textPaths,
      attachment.videoPaths,
      attachment.audioPaths,
    ],
  );
  reactExports.useEffect(() => {
    if (
      !shouldAutoOpenTextPopover({
        selected: !!selected2,
        canSubmit: !!submitTxt2Text,
        isMultiSelect,
        isBoxSelecting,
        isPopoverOpen: showT2TPopover,
        isFullscreen: fullscreen,
        sourceTool,
        promptSeedSource,
      })
    )
      return;
    setShowT2TPopover(true);
  }, [
    selected2,
    submitTxt2Text,
    isMultiSelect,
    isBoxSelecting,
    showT2TPopover,
    fullscreen,
    sourceTool,
    promptSeedSource,
  ]);
  const baseT2TClose = usePopoverCloseWithDeselect(id2, setShowT2TPopover);
  const handleT2TClose = reactExports.useCallback(() => {
    reversePromptRef.current = void 0;
    baseT2TClose();
  }, [baseT2TClose]);
  const handleWriteOwn = reactExports.useCallback(async () => {
    setShowT2TPopover(false);
    await ensureBackingFileAndOpen();
  }, [ensureBackingFileAndOpen]);
  const persistMarkdownDraft = reactExports.useCallback(
    (nextMarkdown) => {
      setMarkdown((current2) => (current2 === nextMarkdown ? current2 : nextMarkdown));
      const filePath = textPath ?? lazyCreatedPathRef.current;
      if (!filePath) {
        if (!nextMarkdown.trim() || !createTextFile || !saveTextContent) return Promise.resolve();
        latestLazyDraftRef.current = nextMarkdown;
        if (pendingLazyCreateRef.current) return pendingLazyCreateRef.current;
        const pending2 = (async () => {
          try {
            const created = await createTextFile();
            if (!created) return;
            lazyCreatedPathRef.current = created.path;
            const latest2 = latestLazyDraftRef.current;
            lastLoadedFromServerRef.current = latest2;
            await saveTextContent(created.path, latest2).catch(() => {});
            fillEmptyPlaceholder(id2, {
              assetId: created.assetId,
              type: "text",
              name: created.name,
              path: created.path,
            });
          } catch {
          } finally {
            pendingLazyCreateRef.current = null;
          }
        })();
        pendingLazyCreateRef.current = pending2;
        return pending2;
      }
      if (!saveTextContent) return Promise.resolve();
      if (
        lastLoadedFromServerRef.current !== null &&
        nextMarkdown === lastLoadedFromServerRef.current
      ) {
        return Promise.resolve();
      }
      return saveTextContent(filePath, nextMarkdown).then(() => {
        lastLoadedFromServerRef.current = nextMarkdown;
      });
    },
    [textPath, saveTextContent, createTextFile, fillEmptyPlaceholder, id2],
  );
  const handleCloseFullscreen = reactExports.useCallback(
    (nextMarkdown) => {
      setFullscreen(false);
      if (nextMarkdown === void 0) return;
      void persistMarkdownDraft(nextMarkdown).catch(() => {});
    },
    [persistMarkdownDraft],
  );
  const getFullscreenCloseBlockReason = reactExports.useCallback(() => {
    const session = editSessionRef.current;
    return session ? (getTextEditCloseBlockReason?.(session) ?? null) : null;
  }, [getTextEditCloseBlockReason]);
  reactExports.useEffect(() => {
    if (isWorkspaceActive !== false || !fullscreen) return;
    handleCloseFullscreen();
  }, [fullscreen, handleCloseFullscreen, isWorkspaceActive]);
  const markdownRef = reactExports.useRef(markdown2);
  markdownRef.current = markdown2;
  const toolbarItems = reactExports.useMemo(() => {
    const items = [];
    items.push({
      id: "text-edit",
      label: t2("canvas.textEdit"),
      icon: <TextEditIcon />,
      forceLabel: true,
      dataActionUiId: "canvas-text-edit",
      onClick: () => {
        void handleWriteOwn();
      },
    });
    const hasContent2 = markdown2.trim().length > 0;
    const showPromote = !!onPromoteToAsset && !!meta2 && hasContent2;
    if (showPromote) {
      items.push({
        id: "promote-to-asset",
        label: t2("canvas.promoteToAsset"),
        icon: <PromoteToAssetIcon />,
        forceLabel: true,
        separator: true,
        dataActionUiId: "canvas.node-promote-to-asset",
        onClick: (e2) => {
          onPromoteToAsset?.([id2], {
            x: e2.clientX,
            y: e2.clientY,
          });
        },
      });
    }
    items.push({
      id: "copy",
      label: t2("canvas.copyContent"),
      icon: <CopyIcon$2 />,
      dataActionUiId: "canvas-text-copy",
      onClick: () => {
        navigator.clipboard.writeText(markdownRef.current);
        dedupedToast.success(t2("fileExplorer.copiedToClipboard"));
      },
    });
    items.push({
      id: "add-to-chat",
      label: t2("canvas.addToChat"),
      icon: <AddToChatIcon />,
      dataActionUiId: "canvas-text-add-to-chat",
      onClick: handleAddToChat,
      separator: !showPromote,
    });
    return items;
  }, [t2, handleAddToChat, handleWriteOwn, id2, onPromoteToAsset, meta2, markdown2]);
  const hasVideoRef = attachment.videoPaths.length > 0;
  const hasAudioRef = attachment.audioPaths.length > 0;
  const [textModels, setTextModels] = reactExports.useState([]);
  reactExports.useEffect(() => {
    if (!showT2TPopover || !fetchTextModels) return;
    let cancelled = false;
    fetchTextModels()
      .then((list2) => {
        if (!cancelled) setTextModels(list2);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showT2TPopover, fetchTextModels]);
  const fetchTextModelsAsModelInfo = reactExports.useMemo(() => {
    if (!fetchTextModels) return void 0;
    return async () => (await fetchTextModels()).map(mapTextModelInfoToModelInfo);
  }, [fetchTextModels]);
  const disabledTextModelIds = reactExports.useMemo(() => {
    if (!hasVideoRef && !hasAudioRef) return void 0;
    const disabled2 = new Set();
    for (const m3 of textModels) {
      if ((hasVideoRef && !m3.supportsVideo) || (hasAudioRef && !m3.supportsAudio)) {
        disabled2.add(m3.id);
        if (m3.id.includes("/")) disabled2.add(m3.id.slice(m3.id.indexOf("/") + 1));
      }
    }
    return disabled2.size > 0 ? disabled2 : void 0;
  }, [hasVideoRef, hasAudioRef, textModels]);
  const t2tDraftPrompt =
    typeof t2tDraft?.prompt === "string" && t2tDraft.prompt.trim().length > 0
      ? t2tDraft.prompt
      : void 0;
  const t2tDefaults = pickTextGenerationDefaults(t2tDraft, meta2);
  const upstreamPresetPrompt = reactExports.useMemo(() => {
    const img = attachment.imagePaths.length;
    const vid = attachment.videoPaths.length;
    const aud = attachment.audioPaths.length;
    const txt = attachment.textPaths.length;
    if ([img, vid, aud, txt].filter((n2) => n2 > 0).length !== 1) return void 0;
    if (txt > 0)
      return t2("canvas.upstreamPreset.text", {
        defaultValue: "请优化已上传文本，提升方向为[提升可读性/增强感染力/精简篇幅/调整风格]。",
      });
    if (img > 0)
      return img === 1
        ? t2("canvas.upstreamPreset.imageSingle", {
            defaultValue: "分析这张图片，反推出适用于[目标工具]的生成提示词，附中文释义。",
          })
        : t2("canvas.upstreamPreset.imageMulti", {
            defaultValue:
              "分析这组参考图，提取共性风格要素（色彩、光影、构图、质感、情绪），归纳为统一风格描述和可复用的提示词模板。",
          });
    if (vid > 0)
      return t2("canvas.upstreamPreset.video", {
        defaultValue:
          "分析这段视频的内容、镜头语言和视觉风格，按镜头反推出适用于[目标工具]的生成提示词。",
      });
    return t2("canvas.upstreamPreset.audio", {
      defaultValue:
        "分析这段音乐的曲风、情绪、节奏和乐器特征，反推出可生成类似风格的AI音乐提示词。",
    });
  }, [
    attachment.imagePaths.length,
    attachment.videoPaths.length,
    attachment.audioPaths.length,
    attachment.textPaths.length,
    t2,
  ]);
  const dataDisplayPrompt = typeof data2?.displayPrompt === "string" ? data2.displayPrompt : void 0;
  const metaPrompt = typeof meta2?.prompt === "string" ? meta2.prompt : void 0;
  const nodePrompt = [dataDisplayPrompt, metaPrompt].find((p3) => p3 && p3.trim().length > 0);
  const t2tPromptSeed = resolveTextPromptSeed({
    quickPrompt: reversePromptRef.current,
    draftPrompt: t2tDraftPrompt,
    nodePrompt,
    upstreamPresetPrompt,
    markdown: markdown2,
    sourceTool,
    promptSeedSource,
    description:
      meta2?.description ?? (typeof data2?.description === "string" ? data2.description : void 0),
  });
  const t2tDefaultPromptJson = t2tPromptSeed.source === "draft" ? t2tDraft?.promptJson : void 0;
  const t2tAutoPresetKey = t2tPromptSeed.source === "upstream" ? t2tPromptSeed.prompt : "";
  return (
    <NodeShell id={id2} tagIds={meta2?.tagIds} width={nodeWidth} dataActionUiId="canvas.text-node">
      <NodeHeader
        nodeType="text"
        tagIds={meta2?.tagIds}
        name={meta2?.name || t2("canvas.text")}
        selected={selected2}
        maxWidth={nodeWidth}
        onRename={onRename}
      />
      {isPreviewInteractive && <NodeToolbar items={toolbarItems} visible={true} />}
      <NodeHandles nodeId={id2} selected={!!selected2} />
      <NodeBody
        width={nodeWidth}
        tagIds={meta2?.tagIds}
        height={nodeHeight}
        selected={!!selected2}
        variant={hasGenerationError || isGenerating ? "media" : "panel"}
        onDoubleClick={hasGenerationError || isGenerating ? void 0 : handleDoubleClick2}
      >
        {hasGenerationError ? (
          <MediaGenerationErrorOverlay
            nodeId={id2}
            nodeType="text"
            message={generationErrorMessage ?? ""}
            errorReason={isGenerating ? generating?.errorReason : persistedErrorReason}
            retryPayload={isGenerating ? generating?.retryPayload : persistedRetryPayload}
            recoverable={generationErrorStatus === "recoverable_error"}
            uncertain={generationErrorStatus === "status_unknown"}
          />
        ) : isGenerating ? (
          <GeneratingMediaArea
            width="100%"
            height="100%"
            radius={0}
            icon={<TextPlaceholderIcon />}
            progress={generatingProgress}
          />
        ) : loaded && !markdown2 && !isMultiSelect && !isBoxSelecting ? (
          <TextNodeQuickActions
            onQuickPrompt={(prompt) => {
              selectNodeExclusive(id2);
              reversePromptRef.current = prompt;
              setRefRevision((v2) => v2 + 1);
              setT2TPopoverKey((v2) => v2 + 1);
              setShowT2TPopover(true);
            }}
            onWriteOwn={() => {
              void handleWriteOwn();
            }}
          />
        ) : (
          <TextPreview$2
            markdown={markdown2}
            loaded={loaded}
            plain={isPlainText}
            interactive={isPreviewInteractive}
            mdPath={textPath}
            resolveFileUrl={resolveFileUrl}
          />
        )}
      </NodeBody>
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={TEXT_CARD_MIN_SIZE.width}
          minHeight={TEXT_CARD_MIN_SIZE.height}
          onResize={handleResize}
        />
      )}
      {fullscreen && (
        <TextFullscreen
          initialMarkdown={markdown2}
          externalRevision={textRevision}
          onClose={handleCloseFullscreen}
          onDraftChange={persistMarkdownDraft}
          plain={isPlainText}
          sourceNodeId={id2}
          documentPath={textPath ?? lazyCreatedPathRef.current ?? void 0}
          getCloseBlockReason={getFullscreenCloseBlockReason}
          onEditingSelectionChange={(selection2) => {
            const session = editSessionRef.current;
            if (session) onTextEditSelectionChange?.(session, selection2);
          }}
          onAnnotationsChange={(snapshots2) => {
            const session = editSessionRef.current;
            if (session) onAnnotationsChange?.(session, snapshots2);
          }}
          onAnnotationActivate={(annotationId) => {
            const session = editSessionRef.current;
            if (session) onAnnotationActivate?.(session, annotationId);
          }}
          subscribeAnnotationCommand={(callback) => {
            const session = editSessionRef.current;
            return session
              ? (subscribeAnnotationCommand?.(session, callback) ?? (() => {}))
              : () => {};
          }}
        />
      )}
      {showT2TPopover && (
        <TxtPopover
          key={`${t2tPopoverKey}:${t2tAutoPresetKey}`}
          mode="text"
          onSubmit={handleTextSubmit}
          onClose={handleT2TClose}
          listModels={fetchTextModelsAsModelInfo}
          defaultPrompt={t2tPromptSeed.prompt}
          defaultModelId={t2tDefaults.modelId}
          defaultParams={t2tDefaults.params}
          onSaveDraft={(draft) =>
            savePopoverDraft(
              id2,
              "t2t",
              draft
                ? {
                    ...draft,
                    imagePaths: attachment.imagePaths,
                    videoPaths: attachment.videoPaths,
                    audioPaths: attachment.audioPaths,
                    textPaths: attachment.textPaths,
                  }
                : draft,
            )
          }
          isGenerating={isGenerating && !hasGenerationError}
          replaceNodeId={id2}
          referenceItems={referenceItems}
          resolveFileUrl={resolveFileUrl}
          mentionPicker={t2tMentionPicker}
          defaultPromptJson={t2tDefaultPromptJson}
          onAddReference={attachment.openPicker}
          onReplaceReference={attachment.replacePath}
          onEditReference={attachment.editImage}
          onRemoveReference={(path2) =>
            attachment.removePath(path2, {
              tearEdge: true,
            })
          }
          showReferenceAddButton={attachment.showAddButton}
          disabledModelIds={disabledTextModelIds}
          disabledModelReason={
            hasVideoRef && hasAudioRef
              ? t2("canvas.txt.modelNoVideoAudioSupport", {
                  defaultValue: "该模型不支持当前连入的视频/音频素材",
                })
              : hasVideoRef
                ? t2("canvas.txt.modelNoVideoSupport", {
                    defaultValue: "该模型不支持当前连入的视频素材",
                  })
                : hasAudioRef
                  ? t2("canvas.txt.modelNoAudioSupport", {
                      defaultValue: "该模型不支持当前连入的音频素材",
                    })
                  : void 0
          }
          hidePromptUtilities={true}
          compactPromptExtraHeight={60}
        />
      )}
    </NodeShell>
  );
}
const PREVIEW_CHAR_LIMIT = 2e3;
const PREVIEW_MIN_CUT_RATIO = 0.7;
function truncateForPreview(md) {
  if (md.length <= PREVIEW_CHAR_LIMIT)
    return {
      text: md,
      truncated: false,
    };
  const head2 = md.slice(0, PREVIEW_CHAR_LIMIT);
  const minCut = Math.floor(PREVIEW_CHAR_LIMIT * PREVIEW_MIN_CUT_RATIO);
  const paragraphIdx = head2.lastIndexOf("\n\n");
  if (paragraphIdx >= minCut)
    return {
      text: md.slice(0, paragraphIdx).trimEnd(),
      truncated: true,
    };
  const lineIdx = head2.lastIndexOf("\n");
  if (lineIdx >= minCut)
    return {
      text: md.slice(0, lineIdx).trimEnd(),
      truncated: true,
    };
  return {
    text: head2.trimEnd(),
    truncated: true,
  };
}
function TextPreviewInner({
  markdown: markdown2,
  loaded,
  plain,
  interactive,
  mdPath,
  resolveFileUrl,
}) {
  const { t: t2 } = useTranslation();
  const { text: previewText, truncated } = reactExports.useMemo(
    () => truncateForPreview(markdown2),
    [markdown2],
  );
  const mdDir = reactExports.useMemo(() => deriveMdDir(mdPath), [mdPath]);
  const urlTransform2 = reactExports.useMemo(
    () => (url2) => resolveMarkdownAssetUrl(url2, mdDir, resolveFileUrl),
    [mdDir, resolveFileUrl],
  );
  const components2 = reactExports.useMemo(
    () => ({
      img: ({ src, alt, title }) => {
        const kind = classifyMarkdownAsset(src);
        if (kind === "video") {
          return (
            // biome-ignore lint/a11y/useMediaCaption: markdown media previews do not carry caption sidecars.
            <video
              src={src}
              title={title ?? alt}
              controls={true}
              preload="metadata"
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            />
          );
        }
        if (kind === "audio") {
          return (
            // biome-ignore lint/a11y/useMediaCaption: markdown media previews do not carry caption sidecars.
            <audio
              src={src}
              title={title ?? alt}
              controls={true}
              preload="metadata"
              style={{
                maxWidth: "100%",
              }}
            />
          );
        }
        return <img src={src} alt={alt ?? ""} title={title} />;
      },
    }),
    [],
  );
  const markdownEl = reactExports.useMemo(
    () => (
      <div
        className="ProseMirror cv-skip text-xs"
        style={{
          color: "var(--fg-default, #141414)",
        }}
      >
        <Markdown$1
          remarkPlugins={[remarkGfm]}
          urlTransform={urlTransform2}
          components={components2}
        >
          {previewText}
        </Markdown$1>
      </div>
    ),
    [previewText, urlTransform2, components2],
  );
  return (
    <div className="tiptap-editor-wrapper -mr-4 h-full overflow-hidden">
      <div
        className={`${interactive ? "nowheel " : ""}autohide-scrollbar h-full overflow-y-auto pr-4`}
      >
        {loaded && !markdown2 ? (
          <p
            className="ProseMirror text-xs pointer-events-none select-none"
            style={{
              color: "var(--fg-muted, #525252)",
            }}
          >
            {t2("canvas.editorPlaceholder")}
          </p>
        ) : (
          <>
            {plain ? (
              <pre
                className="cv-skip text-xs whitespace-pre-wrap break-words font-sans m-0"
                style={{
                  color: "var(--fg-default, #141414)",
                }}
              >
                {previewText}
              </pre>
            ) : (
              markdownEl
            )}
            {truncated && (
              <div
                className="mt-2 pt-2 text-center text-xs pointer-events-none select-none"
                style={{
                  color: "var(--fg-muted, #525252)",
                  borderTop: "1px dashed var(--border-muted, #e5e5e5)",
                }}
              >
                {t2("canvas.previewTruncated")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
const TextPreview$2 = reactExports.memo(TextPreviewInner);
export const TextNode3 = reactExports.memo(TextNodeInner, areNodePropsEqual);
function mapTextModelInfoToModelInfo(m3) {
  return {
    id: m3.id,
    name: m3.name,
    backend: m3.provider,
    max_refs: 0,
    params: m3.params ?? {},
    promptMaxLength: m3.promptMaxLength,
    region: m3.region,
    subtitle: m3.subtitle,
  };
}
export function useVideoColorAdjust({
  id: id2,
  meta: meta2,
  nodeWidth,
  reactFlow,
  cropImage,
  lut,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const openDialog = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    setOpen(true);
  }, [meta2?.url]);
  const onConfirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "color",
        ext: "mp4",
        baseFallback: "video",
      });
    },
    [emitDerived],
  );
  return {
    open,
    openDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
      onConfirm,
      lut,
    },
  };
}
const ASR_LANGUAGES = ["zh", "en", "other"];
export const DEFAULT_ASR_LANGUAGE = "en";
const ASR_LANGUAGE_LABEL_KEYS = {
  zh: "canvas.asr.language.zh",
  en: "canvas.asr.language.en",
  other: "canvas.asr.language.other",
};
const ASR_LANGUAGE_LABEL_FALLBACKS = {
  zh: "中文",
  en: "英文",
  other: "其他",
};
export const AsrPopover = reactExports.memo(function AsrPopover2({
  onSubmit,
  onClose,
  defaultLanguage = DEFAULT_ASR_LANGUAGE,
}) {
  const { t: t2 } = useTranslation();
  const [language2, setLanguage] = reactExports.useState(defaultLanguage);
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const handleSubmit = reactExports.useCallback(() => {
    onSubmit({
      language: language2,
    });
  }, [onSubmit, language2]);
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
    >
      <div
        className="flex w-72 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.asr.title", "字幕生成")}
        </div>
        <div className="rounded-md bg-[var(--canvas-controls-hover)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--canvas-controls-text-muted)]">
          {t2(
            "canvas.asr.description",
            "基于视频音轨自动识别并生成字幕文件（SRT 格式）。处理时长需要几分钟，结果会作为派生文件出现在画布上。",
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.asr.languageLabel", "识别语言")}
          </span>
          <LanguageToggle value={language2} onChange={setLanguage} />
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.asr.cancel"
            aria-label={t2("canvas.asr.cancel", "取消")}
            title={t2("canvas.asr.cancel", "取消")}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon$1 />
          </button>
          <Button$2
            variant="default"
            size="icon"
            onClick={handleSubmit}
            data-action-ui-id="canvas.asr.submit"
            aria-label={t2("canvas.asr.submit", "开始")}
          >
            <SendArrowIcon />
          </Button$2>
        </div>
      </div>
    </NodeToolbar$1>
  );
});
function LanguageToggle({ value, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active)",
      }}
    >
      {ASR_LANGUAGES.map((option2) => {
        const active2 = option2 === value;
        return (
          <button
            key={option2}
            type="button"
            onClick={() => {
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.asr.language-${option2}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active2 ? "var(--canvas-primary-btn-bg)" : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon)"
                : "var(--canvas-controls-text-muted)",
              cursor: "pointer",
            }}
          >
            {t2(ASR_LANGUAGE_LABEL_KEYS[option2], ASR_LANGUAGE_LABEL_FALLBACKS[option2])}
          </button>
        );
      })}
    </div>
  );
}
const VIDEO_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED;
const VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS;
export const VIDEO_TOOL_META = {
  "enhance-video": {
    id: "enhance-video",
    labelKey: "canvas.enhanceVideo.label",
    defaultLabel: "高清 & 补帧",
    icon: <SuperResolutionIcon />,
  },
  "hailuo03-super-resolution": {
    id: "hailuo03-super-resolution",
    labelKey: "canvas.hailuo03SuperResolution.label",
    defaultLabel: "H3 2K 超分",
    icon: <SuperResolutionIcon />,
  },
  clip: {
    id: "clip",
    labelKey: "canvas.clip",
    defaultLabel: "Clip",
    icon: <ClipIcon />,
  },
  watermark: {
    id: "watermark",
    labelKey: "canvas.watermark.label",
    defaultLabel: "Watermark",
    icon: <Stamp size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
  "extract-frame": {
    id: "extract-frame",
    labelKey: "canvas.extractFrame",
    defaultLabel: "Extract frame",
    icon: <ExtractFrameIcon />,
  },
  "extract-audio": {
    id: "extract-audio",
    labelKey: "canvas.extractAudio",
    defaultLabel: "Extract Audio",
    icon: <ExtractAudioIcon />,
  },
  "erase-subtitle": {
    id: "erase-subtitle",
    labelKey: "canvas.eraseSubtitle.label",
    defaultLabel: "字幕消除",
    icon: <EraseSubtitleIcon />,
  },
  asr: {
    id: "asr",
    labelKey: "canvas.asr.label",
    defaultLabel: "字幕生成",
    icon: <AsrIcon />,
  },
  "color-adjust": {
    id: "color-adjust",
    labelKey: "canvas.colorAdjust",
    defaultLabel: "Color Adjust",
    icon: <ColorAdjustIcon />,
  },
};
const DEFAULTS$1 = {
  pinned: VIDEO_TOOLBAR_DEFAULT_PINNED,
  showLabels: VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS,
};
export function CustomizeToolbarDialog({
  open,
  onOpenChange,
  hasPromoteToAsset = true,
  onApply,
  onAbandon,
}) {
  const { t: t2 } = useTranslation();
  const store = useVideoToolbarCustomizationStore();
  const fixedRightChips = [];
  if (hasPromoteToAsset) {
    fixedRightChips.push({
      id: "promote-to-asset",
      icon: <PromoteToAssetIcon />,
      label: t2("canvas.promoteToAsset"),
      showLabel: true,
    });
  }
  fixedRightChips.push({
    id: "add-to-clip-node",
    icon: <AddToClipNodeIcon />,
    label: t2("canvas.addToClipNode", "添加到剪辑节点"),
    showLabel: false,
  });
  fixedRightChips.push({
    id: "add-to-chat",
    icon: <AddToChatIcon />,
    label: t2("canvas.addToChat"),
    showLabel: false,
  });
  fixedRightChips.push({
    id: "fullscreen",
    icon: <FullscreenIcon$1 />,
    label: t2("canvas.fullscreen"),
    showLabel: false,
  });
  return (
    <CustomizeToolbarDialog$2
      open={open}
      onOpenChange={onOpenChange}
      allToolIds={VIDEO_TOOLBAR_TOOLS}
      toolMeta={VIDEO_TOOL_META}
      store={store}
      defaults={DEFAULTS$1}
      fixedRightChips={fixedRightChips}
      onApply={onApply}
      onAbandon={onAbandon}
    />
  );
}
const ENHANCE_VIDEO_RESOLUTIONS = ["720p", "1080p", "2k", "4k"];
const ENHANCE_VIDEO_FPS_OPTIONS = [30, 60];
const DEFAULT_ENHANCE_VIDEO_RESOLUTION = "1080p";
const DEFAULT_ENHANCE_VIDEO_FPS = 60;
const RESOLUTION_LABELS = {
  "720p": "720p",
  "1080p": "1080p",
  "2k": "2K",
  "4k": "4K",
};
function formatEnhanceVideoResolution(value) {
  return RESOLUTION_LABELS[value];
}
const RESOLUTION_RANK = {
  "720p": 0,
  "1080p": 1,
  "2k": 2,
  "4k": 3,
};
export function suggestNextResolution(currentHeight) {
  if (!currentHeight || currentHeight <= 0) return DEFAULT_ENHANCE_VIDEO_RESOLUTION;
  const tiers = [
    [720, "1080p"],
    [1080, "2k"],
    [1440, "4k"],
  ];
  for (const [threshold, next2] of tiers) {
    if (currentHeight <= threshold) return next2;
  }
  return "4k";
}
function isEnhanceVideoNoop(currentResolution, currentFps, nextResolution, nextFps) {
  if (!currentResolution || !currentFps) return false;
  return (
    RESOLUTION_RANK[currentResolution] === RESOLUTION_RANK[nextResolution] && currentFps === nextFps
  );
}
function isResolutionBelowCurrent(option2, current2) {
  if (!current2) return false;
  return RESOLUTION_RANK[option2] < RESOLUTION_RANK[current2];
}
function isFpsBelowCurrent(option2, current2) {
  if (!current2) return false;
  return option2 < current2;
}
export function parseEnhanceResolution(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.toLowerCase();
  return ENHANCE_VIDEO_RESOLUTIONS.includes(normalized) ? normalized : void 0;
}
export function parseEnhanceFps(value) {
  const n2 = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n2)) return void 0;
  return ENHANCE_VIDEO_FPS_OPTIONS.includes(n2) ? n2 : void 0;
}
const ENHANCE_VIDEO_PRICING_MODEL_ID = "mediakit-enhance-video";
export const EnhanceVideoPopover = reactExports.memo(function EnhanceVideoPopover2({
  onSubmit,
  onClose,
  currentResolution,
  currentFps,
  defaultResolution = DEFAULT_ENHANCE_VIDEO_RESOLUTION,
  defaultFps = DEFAULT_ENHANCE_VIDEO_FPS,
  durationSec,
  renderShell,
}) {
  const { t: t2 } = useTranslation();
  const [resolution, setResolution] = reactExports.useState(defaultResolution);
  const [fps, setFps] = reactExports.useState(defaultFps);
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (renderShell) return;
    if (!selected2) onCloseRef.current();
  }, [renderShell, selected2]);
  const hidden = !renderShell && (isDragging || isMultiSelect || isBoxSelecting);
  const isNoop = isEnhanceVideoNoop(currentResolution, currentFps, resolution, fps);
  const {
    accountSubmissionAllowed = true,
    beforeAccountSubmission = () => true,
    pricingConfig,
  } = useCanvasBridge();
  const computedCreditCost = reactExports.useMemo(() => {
    if (!pricingConfig) return void 0;
    if (durationSec == null || durationSec <= 0) return void 0;
    return calcVideoCost(
      pricingConfig,
      ENHANCE_VIDEO_PRICING_MODEL_ID,
      resolution,
      durationSec,
      false,
      false,
      0,
      fps,
    );
  }, [pricingConfig, resolution, fps, durationSec]);
  const handleSubmit = reactExports.useCallback(() => {
    if (isNoop) return;
    if (!beforeAccountSubmission()) return;
    onSubmit({
      resolution,
      fps,
    });
  }, [isNoop, beforeAccountSubmission, onSubmit, resolution, fps]);
  const body2 = (
    // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
    <div
      className="flex w-64 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
      style={{
        display: hidden ? "none" : void 0,
      }}
      onPointerDown={(e2) => e2.stopPropagation()}
      onDoubleClick={(e2) => e2.stopPropagation()}
    >
      <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
        {t2("canvas.enhanceVideo.title", "高清 & 补帧")}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
          {t2("canvas.enhanceVideo.resolutionLabel", "分辨率")}
        </span>
        <Select$2 value={resolution} onValueChange={(v2) => setResolution(v2)}>
          <SelectTrigger$1
            size="sm"
            data-action-ui-id="canvas.enhance-video.resolution-select"
            className="w-full"
          >
            <SelectValue$1 />
          </SelectTrigger$1>
          <SelectContent$1>
            {ENHANCE_VIDEO_RESOLUTIONS.map((option2) => (
              <SelectItem$1
                key={option2}
                value={option2}
                disabled={isResolutionBelowCurrent(option2, currentResolution)}
              >
                {formatEnhanceVideoResolution(option2)}
              </SelectItem$1>
            ))}
          </SelectContent$1>
        </Select$2>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
          {t2("canvas.enhanceVideo.fpsLabel", "帧率")}
        </span>
        <FpsToggle value={fps} currentFps={currentFps} onChange={setFps} />
      </div>
      <div className="flex w-full items-center justify-between pt-1">
        <button
          type="button"
          onClick={onClose}
          data-action-ui-id="canvas.enhance-video.cancel"
          aria-label={t2("canvas.enhanceVideo.cancel", "取消")}
          title={t2("canvas.enhanceVideo.cancel", "取消")}
          className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
        >
          <CloseIcon$1 />
        </button>
        <div className="flex items-center gap-1.5">
          <CreditCostBadge cost={computedCreditCost} compact={true} />
          <Button$2
            variant="default"
            size="icon"
            disabled={isNoop || !accountSubmissionAllowed}
            onClick={handleSubmit}
            data-action-ui-id="canvas.enhance-video.submit"
            aria-label={t2("canvas.enhanceVideo.submit", "生成")}
            title={
              isNoop ? t2("canvas.enhanceVideo.noChange", "目标分辨率与帧率与原视频相同") : void 0
            }
          >
            <SendArrowIcon />
          </Button$2>
        </div>
      </div>
    </div>
  );
  if (renderShell)
    return (
      <>
        {renderShell({
          onClose,
          children: body2,
        })}
      </>
    );
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
    >
      {body2}
    </NodeToolbar$1>
  );
});
function FpsToggle({ value, currentFps, onChange }) {
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active, #ffffff14)",
      }}
    >
      {ENHANCE_VIDEO_FPS_OPTIONS.map((option2) => {
        const active2 = option2 === value;
        const disabled2 = isFpsBelowCurrent(option2, currentFps);
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            onClick={() => {
              if (disabled2) return;
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.enhance-video.fps-${option2}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active2 ? "var(--canvas-primary-btn-bg, #ffffff)" : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon, #000)"
                : "var(--canvas-controls-text, #fff)",
              cursor: disabled2 ? "not-allowed" : "pointer",
              opacity: disabled2 ? 0.5 : 1,
            }}
          >
            {option2}
          </button>
        );
      })}
    </div>
  );
}
const MIN_BOX_SIZE = 0.02;
function clamp$3(v2, lo, hi) {
  if (v2 < lo) return lo;
  if (v2 > hi) return hi;
  return v2;
}
function getVideoLetterboxRect(videoWidth, videoHeight, stageWidth, stageHeight) {
  if (
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    stageWidth <= 0 ||
    stageHeight <= 0
  ) {
    return {
      x: 0,
      y: 0,
      w: stageWidth,
      h: stageHeight,
    };
  }
  const r2 = videoWidth / videoHeight;
  const sR = stageWidth / stageHeight;
  if (r2 >= sR) {
    const w22 = stageWidth;
    const h22 = stageWidth / r2;
    return {
      x: 0,
      y: (stageHeight - h22) / 2,
      w: w22,
      h: h22,
    };
  }
  const h2 = stageHeight;
  const w3 = stageHeight * r2;
  return {
    x: (stageWidth - w3) / 2,
    y: 0,
    w: w3,
    h: h2,
  };
}
function pxToNorm(px, py, vr) {
  if (vr.w <= 0 || vr.h <= 0)
    return {
      x: 0,
      y: 0,
    };
  return {
    x: clamp$3((px - vr.x) / vr.w, 0, 1),
    y: clamp$3((py - vr.y) / vr.h, 0, 1),
  };
}
function createBoxFromDrag(anchor, current2) {
  return {
    tlx: Math.min(anchor.x, current2.x),
    tly: Math.min(anchor.y, current2.y),
    brx: Math.max(anchor.x, current2.x),
    bry: Math.max(anchor.y, current2.y),
  };
}
function isBoxBigEnough(box2) {
  return box2.brx - box2.tlx >= MIN_BOX_SIZE && box2.bry - box2.tly >= MIN_BOX_SIZE;
}
function moveBox(initial, dxNorm, dyNorm) {
  const w3 = initial.brx - initial.tlx;
  const h2 = initial.bry - initial.tly;
  const tlx = clamp$3(initial.tlx + dxNorm, 0, 1 - w3);
  const tly = clamp$3(initial.tly + dyNorm, 0, 1 - h2);
  return {
    tlx,
    tly,
    brx: tlx + w3,
    bry: tly + h2,
  };
}
function resizeBoxByHandle(initial, handle2, dxNorm, dyNorm) {
  let { tlx, tly, brx, bry } = initial;
  const movesL = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesR = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesT = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesB = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  if (movesL) tlx = clamp$3(initial.tlx + dxNorm, 0, initial.brx - MIN_BOX_SIZE);
  if (movesR) brx = clamp$3(initial.brx + dxNorm, initial.tlx + MIN_BOX_SIZE, 1);
  if (movesT) tly = clamp$3(initial.tly + dyNorm, 0, initial.bry - MIN_BOX_SIZE);
  if (movesB) bry = clamp$3(initial.bry + dyNorm, initial.tly + MIN_BOX_SIZE, 1);
  return {
    tlx,
    tly,
    brx,
    bry,
  };
}
function toEraseBox(box2) {
  return {
    top_left_x: box2.tlx,
    top_left_y: box2.tly,
    bottom_right_x: box2.brx,
    bottom_right_y: box2.bry,
  };
}
function fromEraseBox(box2) {
  return {
    tlx: box2.top_left_x,
    tly: box2.top_left_y,
    brx: box2.bottom_right_x,
    bry: box2.bottom_right_y,
  };
}
function isValidBox(box2) {
  return (
    box2.tlx >= 0 &&
    box2.tly >= 0 &&
    box2.brx <= 1 &&
    box2.bry <= 1 &&
    box2.brx - box2.tlx >= MIN_BOX_SIZE &&
    box2.bry - box2.tly >= MIN_BOX_SIZE
  );
}
let __idSeq = 0;
function nextRegionId() {
  __idSeq += 1;
  return `region-${Date.now().toString(36)}-${__idSeq}`;
}
export const EraseSubtitleEditor = reactExports.memo(function EraseSubtitleEditorImpl({
  videoSrc,
  videoName,
  initialRegions,
  onCancel,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  useSuspendCanvasInteractions(true);
  const active2 = useCanvasActive();
  const stageRef = reactExports.useRef(null);
  const videoRef = reactExports.useRef(null);
  const [regions, setRegions] = reactExports.useState(() =>
    (initialRegions ?? []).filter(isValidBoxFromWire).map((b3) => ({
      id: nextRegionId(),
      box: fromEraseBox(b3),
    })),
  );
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const [interaction, setInteraction] = reactExports.useState({
    kind: "idle",
  });
  const [draftBox, setDraftBox] = reactExports.useState(null);
  const [isPlaying, setIsPlaying] = reactExports.useState(false);
  const [stageRect, setStageRect] = reactExports.useState(null);
  const [videoMeta, setVideoMeta] = reactExports.useState({
    w: 0,
    h: 0,
  });
  const videoRect = reactExports.useMemo(() => {
    if (!stageRect)
      return {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
      };
    return getVideoLetterboxRect(videoMeta.w, videoMeta.h, stageRect.width, stageRect.height);
  }, [stageRect, videoMeta]);
  reactExports.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update2 = () => setStageRect(el.getBoundingClientRect());
    update2();
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(update2);
      cancelAnimationFrame(raf2);
      update2();
    });
    const ro = new ResizeObserver(update2);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf1);
      ro.disconnect();
    };
  }, []);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const v2 = videoRef.current;
    if (!v2) return;
    setVideoMeta({
      w: v2.videoWidth,
      h: v2.videoHeight,
    });
  }, []);
  reactExports.useEffect(() => {
    const v2 = videoRef.current;
    if (!v2) return;
    if (v2.readyState >= 1 && v2.videoWidth > 0 && v2.videoHeight > 0) {
      setVideoMeta({
        w: v2.videoWidth,
        h: v2.videoHeight,
      });
    }
    const onLoadedData = () => {
      if (v2.videoWidth > 0 && v2.videoHeight > 0) {
        setVideoMeta({
          w: v2.videoWidth,
          h: v2.videoHeight,
        });
      }
    };
    v2.addEventListener("loadeddata", onLoadedData);
    return () => v2.removeEventListener("loadeddata", onLoadedData);
  }, []);
  const togglePlay = reactExports.useCallback(() => {
    const v2 = videoRef.current;
    if (!v2) return;
    if (v2.paused) void v2.play();
    else v2.pause();
  }, []);
  reactExports.useEffect(() => {
    const v2 = videoRef.current;
    if (!v2) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v2.addEventListener("play", onPlay);
    v2.addEventListener("pause", onPause);
    return () => {
      v2.removeEventListener("play", onPlay);
      v2.removeEventListener("pause", onPause);
    };
  }, []);
  const stageLocal = reactExports.useCallback((e2) => {
    const r2 = stageRef.current?.getBoundingClientRect();
    if (!r2)
      return {
        x: 0,
        y: 0,
      };
    return {
      x: e2.clientX - r2.left,
      y: e2.clientY - r2.top,
    };
  }, []);
  const handleStagePointerDown = reactExports.useCallback((e2) => {
    if (e2.button !== 0) return;
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage) return;
    const liveStageRect = stage.getBoundingClientRect();
    if (liveStageRect.width <= 0 || liveStageRect.height <= 0) return;
    const liveVideoRect = getVideoLetterboxRect(
      video?.videoWidth ?? 0,
      video?.videoHeight ?? 0,
      liveStageRect.width,
      liveStageRect.height,
    );
    setStageRect(liveStageRect);
    const local = {
      x: e2.clientX - liveStageRect.left,
      y: e2.clientY - liveStageRect.top,
    };
    if (
      local.x < liveVideoRect.x ||
      local.x > liveVideoRect.x + liveVideoRect.w ||
      local.y < liveVideoRect.y ||
      local.y > liveVideoRect.y + liveVideoRect.h
    ) {
      setSelectedId(null);
      return;
    }
    const norm = pxToNorm(local.x, local.y, liveVideoRect);
    setSelectedId(null);
    setInteraction({
      kind: "creating",
      anchor: norm,
    });
    setDraftBox({
      tlx: norm.x,
      tly: norm.y,
      brx: norm.x,
      bry: norm.y,
    });
    stageRef.current?.setPointerCapture(e2.pointerId);
  }, []);
  const handleStagePointerMove = reactExports.useCallback(
    (e2) => {
      if (interaction.kind === "idle") return;
      const stage = stageRef.current;
      const video = videoRef.current;
      if (!stage) return;
      const liveStageRect = stage.getBoundingClientRect();
      if (liveStageRect.width <= 0 || liveStageRect.height <= 0) return;
      const liveVideoRect = getVideoLetterboxRect(
        video?.videoWidth ?? 0,
        video?.videoHeight ?? 0,
        liveStageRect.width,
        liveStageRect.height,
      );
      const local = {
        x: e2.clientX - liveStageRect.left,
        y: e2.clientY - liveStageRect.top,
      };
      if (interaction.kind === "creating") {
        const cur = pxToNorm(local.x, local.y, liveVideoRect);
        setDraftBox(createBoxFromDrag(interaction.anchor, cur));
        return;
      }
      if (interaction.kind === "moving") {
        const dx = (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
        const dy = (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
        const moved = moveBox(interaction.initial, dx, dy);
        setRegions((rs2) =>
          rs2.map((r2) =>
            r2.id === interaction.boxId
              ? {
                  id: r2.id,
                  box: moved,
                }
              : r2,
          ),
        );
        return;
      }
      if (interaction.kind === "resizing") {
        const dx = (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
        const dy = (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
        const resized = resizeBoxByHandle(interaction.initial, interaction.handle, dx, dy);
        setRegions((rs2) =>
          rs2.map((r2) =>
            r2.id === interaction.boxId
              ? {
                  id: r2.id,
                  box: resized,
                }
              : r2,
          ),
        );
      }
    },
    [interaction],
  );
  const handleStagePointerUp = reactExports.useCallback(
    (e2) => {
      if (interaction.kind === "creating" && draftBox) {
        if (isBoxBigEnough(draftBox)) {
          const id2 = nextRegionId();
          setRegions((rs2) => [
            ...rs2,
            {
              id: id2,
              box: draftBox,
            },
          ]);
          setSelectedId(id2);
        }
        setDraftBox(null);
      }
      setInteraction({
        kind: "idle",
      });
      try {
        stageRef.current?.releasePointerCapture(e2.pointerId);
      } catch {}
    },
    [interaction, draftBox],
  );
  const handleBoxPointerDown = reactExports.useCallback(
    (e2, regionId) => {
      if (e2.button !== 0) return;
      e2.stopPropagation();
      const region = regions.find((r2) => r2.id === regionId);
      if (!region) return;
      setSelectedId(regionId);
      const start2 = stageLocal(e2);
      setInteraction({
        kind: "moving",
        boxId: regionId,
        initial: region.box,
        pointerStart: start2,
      });
      stageRef.current?.setPointerCapture(e2.pointerId);
    },
    [regions, stageLocal],
  );
  const handleResizeHandlePointerDown = reactExports.useCallback(
    (e2, regionId, handle2) => {
      if (e2.button !== 0) return;
      e2.stopPropagation();
      const region = regions.find((r2) => r2.id === regionId);
      if (!region) return;
      setSelectedId(regionId);
      const start2 = stageLocal(e2);
      setInteraction({
        kind: "resizing",
        boxId: regionId,
        handle: handle2,
        initial: region.box,
        pointerStart: start2,
      });
      stageRef.current?.setPointerCapture(e2.pointerId);
    },
    [regions, stageLocal],
  );
  reactExports.useEffect(() => {
    if (!selectedId || !active2) return;
    const onKey = (e2) => {
      if (e2.key === "Delete" || e2.key === "Backspace") {
        e2.preventDefault();
        e2.stopPropagation();
        setRegions((rs2) => rs2.filter((r2) => r2.id !== selectedId));
        setSelectedId(null);
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selectedId, active2]);
  const validRegions = reactExports.useMemo(
    () => regions.filter((r2) => isValidBox(r2.box)),
    [regions],
  );
  const canSubmit = validRegions.length > 0;
  const handleConfirm = reactExports.useCallback(() => {
    if (!canSubmit) return;
    onConfirm(validRegions.map((r2) => toEraseBox(r2.box)));
  }, [canSubmit, validRegions, onConfirm]);
  const handleClearAll = reactExports.useCallback(() => {
    setRegions([]);
    setSelectedId(null);
  }, []);
  const showDraftBox = interaction.kind === "creating" && draftBox && isBoxBigEnough(draftBox);
  return (
    <Dialog$1
      open={true}
      onOpenChange={(o2) => {
        if (!o2) onCancel();
      }}
    >
      <DialogContent$1
        className={cn$5(
          "grid h-[80vh] gap-0 overflow-hidden p-0",
          "sm:!max-w-[min(1280px,90vw)]",
          "grid-rows-[auto_minmax(0,1fr)_auto]",
        )}
      >
        <DialogHeader$1 className="gap-1 border-b border-border/40 px-5 py-3 pr-12">
          <DialogTitle$1 className="text-sm font-medium">
            {t2("canvas.eraseSubtitle.editor.title", "框选要消除的文字区域")}
            {videoName && (
              <span className="ml-2 truncate text-xs font-normal text-muted-foreground">
                {"— "}
                {videoName}
              </span>
            )}
          </DialogTitle$1>
          <span className="text-xs text-muted-foreground">
            {t2(
              "canvas.eraseSubtitle.editor.hint",
              "在视频上拖拽创建框；选中后可拖动 / 缩放，按 Delete 删除",
            )}
          </span>
        </DialogHeader$1>
        <div className="relative flex min-h-0 flex-col bg-black">
          <div
            ref={stageRef}
            className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden"
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            style={{
              touchAction: "none",
              // crosshair signals "drag here to draw a box" while idle.
              // Region body / handles override locally to move/resize cursors.
              cursor: "crosshair",
            }}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              className="pointer-events-none block h-full w-full object-contain"
              playsInline={true}
              onLoadedMetadata={handleLoadedMetadata}
            />
            {videoRect.w > 0 &&
              regions.map((r2) => (
                <RegionView
                  key={r2.id}
                  box={r2.box}
                  videoRect={videoRect}
                  selected={r2.id === selectedId}
                  onPointerDown={(e2) => handleBoxPointerDown(e2, r2.id)}
                  onHandlePointerDown={(e2, handle2) =>
                    handleResizeHandlePointerDown(e2, r2.id, handle2)
                  }
                />
              ))}
            {showDraftBox && draftBox && videoRect.w > 0 && (
              <DraftBoxView box={draftBox} videoRect={videoRect} />
            )}
            <button
              type="button"
              onClick={togglePlay}
              className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center justify-center size-8 rounded-full bg-transparent p-0 text-[var(--canvas-media-control-fg)] opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-100"
              aria-label={
                isPlaying ? t2("canvas.video.pause", "Pause") : t2("canvas.video.play", "Play")
              }
              data-action-ui-id="canvas.erase-subtitle.editor.play-pause"
              onPointerDown={(e2) => e2.stopPropagation()}
            >
              {isPlaying ? (
                <PlaybackPauseIcon$1 size={16} className="drop-shadow-sm" />
              ) : (
                <PlaybackPlayIcon$1 size={16} className="drop-shadow-sm" />
              )}
            </button>
          </div>
          <div className="border-t border-border/40 px-5 py-2">
            <ProgressBar videoRef={videoRef} isPlaying={isPlaying} tone="light" />
          </div>
        </div>
        <DialogFooter$1 className="flex-row items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {t2("canvas.eraseSubtitle.editor.boxCount", "已选 {{count}} 个框", {
                count: regions.length,
              })}
            </span>
            {regions.length > 0 && (
              <Button$2
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                data-action-ui-id="canvas.erase-subtitle.editor.clear-all"
              >
                <Trash2 className="size-3.5" />
                <span className="ml-1">{t2("canvas.eraseSubtitle.editor.clearAll", "清空")}</span>
              </Button$2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button$2
              variant="ghost"
              size="sm"
              onClick={onCancel}
              data-action-ui-id="canvas.erase-subtitle.editor.cancel"
            >
              {t2("canvas.eraseSubtitle.editor.cancel", "取消")}
            </Button$2>
            <Button$2
              variant="default"
              size="sm"
              disabled={!canSubmit}
              onClick={handleConfirm}
              data-action-ui-id="canvas.erase-subtitle.editor.submit"
            >
              {t2("canvas.eraseSubtitle.editor.submit", "开始消除")}
            </Button$2>
          </div>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
});
function RegionView({
  box: box2,
  videoRect,
  selected: selected2,
  onPointerDown: onPointerDown2,
  onHandlePointerDown,
}) {
  const px = normToPxRect(box2, videoRect);
  return (
    // biome-ignore lint/a11y/useSemanticElements: native <button> swallows pointer + child handle events; this is a generic interactive surface, not a button-style action
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown2}
      onKeyDown={(e2) => {
        if (e2.key === "Enter" || e2.key === " ") e2.preventDefault();
      }}
      className={cn$5(
        "absolute box-border cursor-move border-2 transition-colors",
        selected2
          ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          : "border-white/80 bg-white/5 hover:border-white",
      )}
      style={{
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
        // Disable native drag to avoid Chrome's ghost image when starting a
        // pointer drag on the rectangle.
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {selected2 && (
        <>
          <ResizeHandle handle="tl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="tr" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="bl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="br" onPointerDown={onHandlePointerDown} />
          {px.w > 32 && <ResizeHandle handle="t" onPointerDown={onHandlePointerDown} />}
          {px.w > 32 && <ResizeHandle handle="b" onPointerDown={onHandlePointerDown} />}
          {px.h > 32 && <ResizeHandle handle="l" onPointerDown={onHandlePointerDown} />}
          {px.h > 32 && <ResizeHandle handle="r" onPointerDown={onHandlePointerDown} />}
        </>
      )}
    </div>
  );
}
function DraftBoxView({ box: box2, videoRect }) {
  const px = normToPxRect(box2, videoRect);
  return (
    <div
      className="pointer-events-none absolute box-border border-2 border-dashed border-primary bg-primary/10"
      style={{
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
      }}
    />
  );
}
function isValidBoxFromWire(b3) {
  return (
    b3.top_left_x >= 0 &&
    b3.top_left_y >= 0 &&
    b3.bottom_right_x <= 1 &&
    b3.bottom_right_y <= 1 &&
    b3.bottom_right_x - b3.top_left_x >= MIN_BOX_SIZE &&
    b3.bottom_right_y - b3.top_left_y >= MIN_BOX_SIZE
  );
}
const MODES = ["auto", "manual"];
const MODE_LABEL_KEYS = {
  auto: "canvas.eraseSubtitle.mode.auto",
  manual: "canvas.eraseSubtitle.mode.manual",
};
const MODE_LABEL_FALLBACKS = {
  auto: "自动识别字幕",
  manual: "手动框选",
};
const MODE_DESC_KEYS = {
  auto: "canvas.eraseSubtitle.mode.auto.desc",
  manual: "canvas.eraseSubtitle.mode.manual.desc",
};
const MODE_DESC_FALLBACKS = {
  auto: "自动识别并去除视频底部字幕条文字（OCR + AIGC 修复）。处理耗时与视频时长相关，约为原视频时长的 6～10 倍（1 分钟以内的短视频相对更久），请耐心等待。",
  manual: "点击下方「开始」后，在视频上手动框选要消除的文字区域。",
};
export const EraseSubtitlePopover = reactExports.memo(function EraseSubtitlePopover2({
  mode: mode2,
  onModeChange,
  onSubmit,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const handleSubmit = reactExports.useCallback(() => {
    onSubmit(mode2);
  }, [onSubmit, mode2]);
  const submitLabel =
    mode2 === "manual"
      ? t2("canvas.eraseSubtitle.submitManual", "下一步")
      : t2("canvas.eraseSubtitle.submit", "开始");
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
    >
      <div
        className="flex w-72 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.eraseSubtitle.title", "字幕消除")}
        </div>
        <div className="rounded-md bg-[var(--canvas-controls-hover)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--canvas-controls-text-muted)]">
          {t2(MODE_DESC_KEYS[mode2], MODE_DESC_FALLBACKS[mode2])}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.eraseSubtitle.modeLabel", "处理方式")}
          </span>
          <ModeToggle value={mode2} onChange={onModeChange} />
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.erase-subtitle.cancel"
            aria-label={t2("canvas.eraseSubtitle.cancel", "取消")}
            title={t2("canvas.eraseSubtitle.cancel", "取消")}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon$1 />
          </button>
          <Button$2
            variant="default"
            size="icon"
            onClick={handleSubmit}
            data-action-ui-id="canvas.erase-subtitle.submit"
            aria-label={submitLabel}
          >
            <SendArrowIcon />
          </Button$2>
        </div>
      </div>
    </NodeToolbar$1>
  );
});
function ModeToggle({ value, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active)",
      }}
    >
      {MODES.map((option2) => {
        const active2 = option2 === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: native <input type="radio"> would clash with the segmented-toggle visual + add a hidden a11y tree; ARIA radio role is the correct primitive here
          <button
            key={option2}
            type="button"
            role="radio"
            aria-checked={active2}
            onClick={() => {
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.erase-subtitle.mode-${option2}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active2 ? "var(--canvas-primary-btn-bg)" : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon)"
                : "var(--canvas-controls-text-muted)",
              cursor: "pointer",
            }}
          >
            {t2(MODE_LABEL_KEYS[option2], MODE_LABEL_FALLBACKS[option2])}
          </button>
        );
      })}
    </div>
  );
}
const HAILUO03_BACKEND = "minimax_v3";
const HAILUO03_GENERATED_768P = "768P";
const HAILUO03_MODEL_ID = "MiniMax-H3";
function modelField(value, key2) {
  return value && typeof value === "object" ? value[key2] : void 0;
}
function isHailuo03ModelValue(value) {
  return typeof value === "string" && value === HAILUO03_MODEL_ID;
}
function isGenerated768P(meta2) {
  return meta2.params?.resolution === HAILUO03_GENERATED_768P;
}
export function resolveHailuo03SuperResolutionDuration(meta2) {
  const duration = Number(meta2?.params?.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : void 0;
}
export function isHailuo03SuperResolutionEligible(meta2, modelInfo) {
  if (!meta2?.path || !meta2.providerTaskId || meta2.backend !== HAILUO03_BACKEND) return false;
  if (!isGenerated768P(meta2)) return false;
  return [
    meta2.model_id,
    meta2.model,
    meta2.params?.model_name,
    modelField(modelInfo, "id"),
    modelField(modelInfo, "model_name"),
    modelField(modelInfo, "pricingId"),
    modelField(modelInfo, "name"),
  ].some(isHailuo03ModelValue);
}
const VIDEO_TOOL_PRICING = {
  "enhance-video": {
    kind: "video",
    modelId: "mediakit-enhance-video",
  },
  "hailuo03-super-resolution": {
    kind: "tool",
    modelId: "h3_video_super_resolution",
    resolution: "2K",
  },
};
function resolveVideoEditCost(pricingConfig, tool2, sourceDurationSec) {
  const pricing = VIDEO_TOOL_PRICING[tool2];
  if (!pricing) return void 0;
  if (pricing.kind === "tool") {
    if (!pricing.resolution) return void 0;
    return calcToolCost(pricingConfig, pricing.modelId, pricing.resolution, sourceDurationSec);
  }
  return getModelBaseCost(pricingConfig, pricing.modelId);
}
function resolveVideoEditRate(pricingConfig, tool2) {
  const pricing = VIDEO_TOOL_PRICING[tool2];
  if (!pricingConfig?.tool || pricing?.kind !== "tool" || !pricing.resolution) return void 0;
  const resolution = pricing.resolution;
  const model = pricingConfig.tool.find((entry) => entry.modelID === pricing.modelId);
  const cost = model?.costs?.find((entry) => entry.resolutions?.includes(resolution));
  return cost?.costPerSecond && cost.costPerSecond > 0 ? cost.costPerSecond : void 0;
}
export function useVideoEditCost(tool2, sourceDurationSec) {
  const { pricingConfig } = useCanvasBridge();
  return reactExports.useMemo(
    () => resolveVideoEditCost(pricingConfig, tool2, sourceDurationSec),
    [pricingConfig, sourceDurationSec, tool2],
  );
}
export function useVideoEditRate(tool2) {
  const { pricingConfig } = useCanvasBridge();
  return reactExports.useMemo(
    () => resolveVideoEditRate(pricingConfig, tool2),
    [pricingConfig, tool2],
  );
}
const H3_TARGET_RESOLUTION = "2K";
export const Hailuo03SuperResolutionPopover = reactExports.memo(
  function Hailuo03SuperResolutionPopover2({ onSubmit, onClose, durationSec, renderShell }) {
    const { t: t2 } = useTranslation();
    const { accountSubmissionAllowed = true, beforeAccountSubmission = () => true } =
      useCanvasBridge();
    const creditCost = useVideoEditCost("hailuo03-super-resolution", durationSec);
    const onCloseRef = reactExports.useRef(onClose);
    onCloseRef.current = onClose;
    const nodeId = useNodeId();
    const selectedSelector = reactExports.useCallback(
      (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const selected2 = useStore$3(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (renderShell) return;
      if (!selected2) onCloseRef.current();
    }, [renderShell, selected2]);
    const hidden = !renderShell && (isDragging || isMultiSelect || isBoxSelecting);
    const handleSubmit = reactExports.useCallback(() => {
      if (!beforeAccountSubmission()) return;
      onSubmit();
    }, [beforeAccountSubmission, onSubmit]);
    const nativeBadge = (
      <span className="rounded-full border border-brand-accent px-1.5 py-px text-[10px] leading-[14px] text-brand-accent">
        {t2("canvas.hailuo03SuperResolution.nativeBadge", "H3 原生超分")}
      </span>
    );
    const body2 = (
      // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
      <div
        className="flex w-64 flex-col gap-3 rounded-lg bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.hailuo03SuperResolution.title", "H3 2K超分")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.hailuo03SuperResolution.resolutionLabel", "分辨率")}
          </span>
          <Select$2 value={H3_TARGET_RESOLUTION}>
            <SelectTrigger$1
              size="sm"
              data-action-ui-id="canvas.hailuo03-super-resolution.resolution-select"
              className="w-full"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                <span>{H3_TARGET_RESOLUTION}</span>
                {nativeBadge}
              </span>
            </SelectTrigger$1>
            <SelectContent$1>
              <SelectItem$1 value={H3_TARGET_RESOLUTION}>
                <span className="flex items-center gap-1.5">
                  <span>{H3_TARGET_RESOLUTION}</span>
                  {nativeBadge}
                </span>
              </SelectItem$1>
            </SelectContent$1>
          </Select$2>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button$2
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-action-ui-id="canvas.hailuo03-super-resolution.cancel"
          >
            {t2("canvas.hailuo03SuperResolution.cancel", "取消")}
          </Button$2>
          <Button$2
            variant="default"
            size="sm"
            disabled={!accountSubmissionAllowed}
            onClick={handleSubmit}
            data-action-ui-id="canvas.hailuo03-super-resolution.submit"
            className="inline-flex items-center gap-1.5"
          >
            <span>{t2("canvas.hailuo03SuperResolution.submit", "生成")}</span>
            {creditCost != null && creditCost > 0 && (
              <CreditCostBadge cost={creditCost} className="text-[12px] opacity-90" />
            )}
          </Button$2>
        </div>
      </div>
    );
    if (renderShell)
      return (
        <>
          {renderShell({
            onClose,
            children: body2,
          })}
        </>
      );
    return (
      <NodeToolbar$1
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        {body2}
      </NodeToolbar$1>
    );
  },
);
function resolveAsrSourcePath(submitAsr, meta2) {
  if (!submitAsr) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}
export function useAsrSubmit({ id: id2, meta: meta2, submitAsr }) {
  const { focusNextDerivedFrom } = useCanvasActions();
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveAsrSourcePath(submitAsr, meta2);
      if (!sourcePath || !submitAsr) return;
      focusNextDerivedFrom(id2);
      void submitAsr(id2, sourcePath, params.language);
    },
    [id2, meta2, submitAsr, focusNextDerivedFrom],
  );
  return {
    submit,
  };
}
function resolveEnhanceVideoSourcePath(submitEnhanceVideo, meta2) {
  if (!submitEnhanceVideo) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}
export function useEnhanceVideoSubmit({ id: id2, meta: meta2, submitEnhanceVideo }) {
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveEnhanceVideoSourcePath(submitEnhanceVideo, meta2);
      if (!sourcePath || !submitEnhanceVideo) return;
      void submitEnhanceVideo(id2, sourcePath, params);
    },
    [id2, meta2, submitEnhanceVideo],
  );
  return {
    submit,
  };
}
function resolveEraseSubtitleSourcePath(submitEraseSubtitle, meta2) {
  if (!submitEraseSubtitle) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}
export function useEraseSubtitleSubmit({ id: id2, meta: meta2, submitEraseSubtitle }) {
  const { focusNextDerivedFrom } = useCanvasActions();
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveEraseSubtitleSourcePath(submitEraseSubtitle, meta2);
      if (!sourcePath || !submitEraseSubtitle) return;
      focusNextDerivedFrom(id2);
      void submitEraseSubtitle(id2, sourcePath, {
        mode: params.mode,
        regions: params.regions,
      });
    },
    [id2, meta2, submitEraseSubtitle, focusNextDerivedFrom],
  );
  return {
    submit,
  };
}
function looksLikeUrl(input) {
  return /^(?:https?:|blob:|data:|file:|\/|\.\.?\/)/.test(input.trim());
}
export class VideoColorGrading {
  canvas;
  backend = null;
  backendType;
  settings = {
    ...defaultSettings,
  };
  currentLUT = null;
  lutParams = {
    ...defaultLUTParams,
  };
  video = null;
  videoReady = false;
  rafId = null;
  rvfcId = null;
  initPromise = null;
  renderErrorLogged = false;
  constructor(options = {}) {
    this.canvas = options.canvas || document.createElement("canvas");
    this.backendType = selectBestBackend(options.backend);
  }
  getCanvas() {
    return this.canvas;
  }
  getBackendType() {
    return this.backendType;
  }
  static isWebGPUSupported() {
    return isWebGPUSupported();
  }
  static isWebGLSupported() {
    return isWebGLSupported();
  }
  getSettings() {
    return {
      ...this.settings,
    };
  }
  setSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
  }
  resetSettings() {
    this.settings = {
      ...defaultSettings,
    };
  }
  /**
   * 绑定视频元素，建立纹理资源。
   * 内部确保视频真正解码出第一帧（GPU 已有 backing resource）后再上传到纹理，
   * 避免 WebGPU copyExternalImageToTexture 因 video 无 backing resource 而抛错。
   */
  async attachVideo(video) {
    this.stop();
    this.videoReady = false;
    await this.ensureBackend();
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("loadeddata", onReady);
          video.removeEventListener("canplay", onReady);
          video.removeEventListener("error", onErr);
        };
        const onReady = () => {
          if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            cleanup();
            resolve();
          }
        };
        const onErr = () => {
          cleanup();
          reject(new Error("Video failed to load"));
        };
        video.addEventListener("loadeddata", onReady);
        video.addEventListener("canplay", onReady);
        video.addEventListener("error", onErr);
        if (video.networkState === 0 && video.src) video.load();
      });
    }
    await this.ensureFirstFrameOnGPU(video);
    this.video = video;
    await this.tryLoadVideoToBackend(video, 3);
    if (this.currentLUT) {
      this.backend?.setLUTParams(this.lutParams);
    }
    this.videoReady = true;
    this.renderOnce();
  }
  /**
   * 加载 LUT（接受 .cube 文本、File、URL 字符串或已解析的 CubeLUT 对象）
   *
   * 字符串歧义解析：以 http(s)/blob/data/file/绝对或相对路径开头视为 URL，
   * 否则视为 .cube 文本内容。
   */
  async loadLUT(input) {
    await this.ensureBackend();
    let lut;
    if (typeof input === "string") {
      if (looksLikeUrl(input)) {
        const text2 = await fetch(input).then((r2) => r2.text());
        lut = parseCubeLUT(text2);
      } else {
        lut = parseCubeLUT(input);
      }
    } else if (input instanceof File) {
      const text2 = await input.text();
      lut = parseCubeLUT(text2);
    } else {
      lut = input;
    }
    if (lut === this.currentLUT) return;
    this.backend?.setLUT(lut);
    this.backend?.setLUTParams(this.lutParams);
    this.currentLUT = lut;
  }
  clearLUT() {
    if (!this.currentLUT) return;
    this.backend?.setLUT(null);
    this.currentLUT = null;
  }
  setLUTIntensity(intensity) {
    const next2 = Math.max(0, Math.min(100, intensity)) / 100;
    if (this.lutParams.intensity === next2) return;
    this.lutParams = {
      ...this.lutParams,
      intensity: next2,
    };
    this.backend?.setLUTParams(this.lutParams);
  }
  hasLUT() {
    return this.currentLUT !== null;
  }
  /**
   * 启动渲染循环：每一帧视频画面到来时上传到 GPU 并渲染。
   * 优先 video.requestVideoFrameCallback（精确到帧），否则 fallback 到 rAF。
   *
   * 闭包内 capture 当前 video / backend，避免 attachVideo 被快速重复调用时 tick 内
   * 读到混合的实例（旧 video + 新 backend，或反之）。源切换前应先调 stop()。
   */
  start() {
    if (!this.video || !this.backend || !this.videoReady) {
      return;
    }
    this.stop();
    const video = this.video;
    const backend = this.backend;
    const host = video;
    const useRVFC = typeof host.requestVideoFrameCallback === "function";
    if (useRVFC) {
      const tick = () => {
        if (this.video !== video || this.backend !== backend) return;
        try {
          backend.updateFromVideo(video);
          backend.render(this.settings);
        } catch (err) {
          this.logRenderError(err);
        }
        this.rvfcId = host.requestVideoFrameCallback(tick);
      };
      this.rvfcId = host.requestVideoFrameCallback(tick);
    } else {
      const loop = () => {
        if (this.video !== video || this.backend !== backend) return;
        try {
          backend.updateFromVideo(video);
          backend.render(this.settings);
        } catch (err) {
          this.logRenderError(err);
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }
  stop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.rvfcId != null && this.video) {
      const host = this.video;
      host.cancelVideoFrameCallback?.(this.rvfcId);
      this.rvfcId = null;
    }
  }
  /**
   * 同步渲染当前视频帧一次。导出/seek 场景使用。
   */
  renderOnce() {
    if (!this.video || !this.backend || !this.videoReady) return;
    try {
      this.backend.updateFromVideo(this.video);
      this.backend.render(this.settings);
    } catch (err) {
      this.logRenderError(err);
    }
  }
  /**
   * 离线导出场景：保证 backend 就绪，并以传入的 source 尺寸初始化纹理资源。
   * 调用方拿到的 backend 不再绑定 <video>，可任意 renderFromSource。
   */
  async ensureReadyForSource(width, height) {
    await this.ensureBackend();
    const backend = this.backend;
    if (!backend) throw new Error("Backend not available");
    const placeholder = await createImageBitmap(new ImageData(width, height));
    try {
      backend.loadFromSource(placeholder, width, height);
    } finally {
      placeholder.close();
    }
    if (this.currentLUT) {
      backend.setLUT(this.currentLUT);
      backend.setLUTParams(this.lutParams);
    }
  }
  /**
   * 离线导出每一帧：上传任意 CanvasImageSource（VideoFrame、Canvas 等），渲染当前 settings。
   * 必须先调用 ensureReadyForSource 完成尺寸协商。
   */
  renderFromSource(source) {
    if (!this.backend) throw new Error("Backend not initialized");
    this.backend.updateFromSource(source);
    this.backend.render(this.settings);
  }
  getSize() {
    return (
      this.backend?.getSize() ?? {
        width: 0,
        height: 0,
      }
    );
  }
  dispose() {
    this.stop();
    if (this.backend) {
      this.backend.dispose();
      this.backend = null;
    }
    this.video = null;
    this.videoReady = false;
    this.currentLUT = null;
    this.initPromise = null;
  }
  async initBackend() {
    if (this.backend) return;
    if (this.backendType === "webgpu") {
      this.backend = new WebGPUBackend(this.canvas);
      try {
        await this.backend.init();
      } catch {
        this.backend = new WebGLBackend(this.canvas);
        this.backend.init();
        this.backendType = "webgl";
      }
    } else {
      this.backend = new WebGLBackend(this.canvas);
      this.backend.init();
    }
  }
  /**
   * 调用 backend.loadFromVideo，如失败则等下一帧重试，最多 attempts 次。
   * Chrome 偶发：seek 完成但 GPU 合成器还没拿到帧。
   */
  async tryLoadVideoToBackend(video, attempts) {
    let lastErr;
    for (let i2 = 0; i2 < attempts; i2++) {
      try {
        this.backend?.loadFromVideo(video);
        return;
      } catch (e2) {
        lastErr = e2;
        await new Promise((resolve) => {
          const host = video;
          if (typeof host.requestVideoFrameCallback === "function") {
            let done = false;
            host.requestVideoFrameCallback(() => {
              if (done) return;
              done = true;
              resolve();
            });
            setTimeout(() => {
              if (done) return;
              done = true;
              resolve();
            }, 200);
          } else {
            setTimeout(resolve, 100);
          }
        });
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`Failed to upload video to GPU after ${attempts} attempts`);
  }
  async ensureBackend() {
    if (!this.initPromise) {
      this.initPromise = this.initBackend();
    }
    await this.initPromise;
  }
  logRenderError(err) {
    if (this.renderErrorLogged) return;
    this.renderErrorLogged = true;
    console.error("[VideoColorGrading] render failed (further errors suppressed):", err);
  }
  /**
   * 确保 video 的第一帧已经解码并上传到 GPU 合成器层。
   * Chrome 在 video 元素从未参与渲染（display:none、未播放、未 seek）时,
   * 即使 readyState=4 也可能没有 GPU backing texture, 导致
   * WebGPU copyExternalImageToTexture 抛 "external image without back resource"。
   * 解决：play→pause 触发 GPU 解码会话建立 + seek + RVFC 三重保险。
   */
  async ensureFirstFrameOnGPU(video) {
    const wasPaused = video.paused;
    try {
      await video.play();
      if (wasPaused) video.pause();
    } catch {}
    await new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        const target = video.currentTime > 1e-3 ? video.currentTime : 1e-3;
        video.currentTime = target;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }, 800);
    });
    const host = video;
    if (typeof host.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => {
        let done = false;
        host.requestVideoFrameCallback(() => {
          if (done) return;
          done = true;
          resolve();
        });
        setTimeout(() => {
          if (done) return;
          done = true;
          resolve();
        }, 500);
      });
    }
  }
}
