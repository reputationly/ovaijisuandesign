// text-node-inner.jsx
import Markdown from "react-markdown";
import { ClipboardList, jsxRuntimeExports, reactExports, remarkGfm, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  classifyMarkdownAsset,
  deriveMdDir,
  isTextEditorContentReady,
  resolveMarkdownAssetUrl,
  resolveTextEditorMode,
} from "../text-editor/annotation-gutter.jsx";
import {
  AGENT_CANVAS_TEXT_SOURCE_TOOL,
  CANVAS_TEXT_AGENT_PROMPT_SOURCE,
  getPopoverDraftMap,
  TEXT_CARD_MIN_SIZE,
} from "../canvas/is-reexecutable-generation-node.js";
import {
  Clapperboard,
  PenLine,
  Sparkles,
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
  useGenerating,
  useGeneratingStateApi,
} from "./package.jsx";
import {
  GeneratingMediaArea,
  PromoteToAssetIcon,
  TextPlaceholderIcon,
} from "../canvas/generating-media-area.jsx";
import {
  NodeEmptyState,
  NodeShell,
  useAddToChat,
} from "../canvas/node-shell-inner.jsx";
import { MarkdownFullscreen } from "../text-editor/markdown-fullscreen.jsx";
import { SourceTextFullscreen } from "../text-editor/source-text-fullscreen.jsx";
import { useFileVersion } from "../infra/use-plugin-metadata-store.js";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import { useNodeRename } from "../infra/use-node-rename.js";
import {
  isGenerationErrorStatus,
  TEXT_CARD_DEFAULT_SIZE,
} from "../canvas/compute-group-bounds-from-children.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { useDiffReviewStore } from "../text-editor/use-diff-review-store.js";
import {
  AddToChatIcon,
  CopyIcon,
  TextEditIcon,
} from "../canvas/fullscreen-icon.jsx";
import {
  isCloneData,
  resolveGenerationProgressStartedAt,
  useSimulatedProgress,
} from "./use-warn-missing-asset-meta.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { MediaGenerationErrorOverlay } from "../generation/media-generation-error-overlay.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { useReferenceNavigationSnapshot } from "./get-reference-navigation-defaults.jsx";
import {
  resolveReferenceImages,
  resolveReferenceVideos,
} from "./base-backend.jsx";
import {
  resolveReferenceAudios,
  resolveReferenceTexts,
  usePopoverCloseWithDeselect,
} from "../generation/resolve-reference-texts.js";
import { restoreDirectReferencePaths } from "../generation/param-label-fallbacks.js";
import { useAttachmentState } from "../assets/use-attachment-state.js";
import { TxtPopover } from "./audio-full-body-popover-gap-offset.js";
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
  const editorModeRef = reactExports.useRef(
    resolveTextEditorMode(initialMarkdown, plain),
  );
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
        editorKind={
          editorMode === "source-markdown" ? "codemirror" : "textarea"
        }
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
  const draftPrompt =
    typeof draft?.prompt === "string" ? draft.prompt.trim() : "";
  const assetPrompt =
    typeof asset?.prompt === "string" ? asset.prompt.trim() : "";
  const draftOverridesAsset =
    draftPrompt.length > 0 &&
    assetPrompt.length > 0 &&
    draftPrompt !== assetPrompt;
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
  const { t } = useTranslation();
  return (
    <NodeEmptyState
      icon={<TextPlaceholderIcon />}
      guidance={t("canvas.quickAction.try", {
        defaultValue: "试试：",
      })}
      suggestions={[
        {
          id: "canvas.text-quick-write",
          icon: <PenLine size={16} strokeWidth={1.5} />,
          label: t("canvas.quickAction.write.label", {
            defaultValue: "自己编写内容",
          }),
          onSelect: (event) => {
            event.stopPropagation();
            onWriteOwn();
          },
        },
        ...QUICK_PROMPTS.map((quickAction) => ({
          id: `canvas.text-quick-${quickAction.key}`,
          icon: <quickAction.icon size={16} strokeWidth={1.5} />,
          label: t(quickAction.labelKey, {
            defaultValue: quickAction.labelFallback,
          }),
          onSelect: (event) => {
            event.stopPropagation();
            onQuickPrompt(
              t(quickAction.promptKey, {
                defaultValue: quickAction.promptFallback,
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
  markdown,
  sourceTool,
  promptSeedSource,
  description,
}) {
  const trimmedBody = markdown.trim();
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
  if (draftPrompt !== void 0 && draftPrompt !== markdown) {
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
  if (nodePrompt !== void 0 && nodePrompt !== markdown) {
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
  selected,
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
    selected &&
    canSubmit &&
    !isMultiSelect &&
    !isBoxSelecting &&
    !isPopoverOpen &&
    !isFullscreen
  );
}
const TEXT_REF_MAX_IMAGES = 6;
const TEXT_REF_MAX_VIDEOS = 2;
const TEXT_REF_MAX_AUDIOS = 2;
const TEXT_REF_MAX_TEXTS = 5;
const PREVIEW_CHAR_LIMIT = 2e3;
const PREVIEW_MIN_CUT_RATIO = 0.7;
function truncateForPreview(markdownText) {
  if (markdownText.length <= PREVIEW_CHAR_LIMIT)
    return {
      text: markdownText,
      truncated: false,
    };
  const head = markdownText.slice(0, PREVIEW_CHAR_LIMIT);
  const minCut = Math.floor(PREVIEW_CHAR_LIMIT * PREVIEW_MIN_CUT_RATIO);
  const paragraphIdx = head.lastIndexOf("\n\n");
  if (paragraphIdx >= minCut)
    return {
      text: markdownText.slice(0, paragraphIdx).trimEnd(),
      truncated: true,
    };
  const lineIdx = head.lastIndexOf("\n");
  if (lineIdx >= minCut)
    return {
      text: markdownText.slice(0, lineIdx).trimEnd(),
      truncated: true,
    };
  return {
    text: head.trimEnd(),
    truncated: true,
  };
}
function TextPreviewInner({
  markdown,
  loaded,
  plain,
  interactive,
  mdPath,
  resolveFileUrl,
}) {
  const { t } = useTranslation();
  const { text: previewText, truncated } = reactExports.useMemo(
    () => truncateForPreview(markdown),
    [markdown],
  );
  const mdDir = reactExports.useMemo(() => deriveMdDir(mdPath), [mdPath]);
  const urlTransform = reactExports.useMemo(
    () => (url) => resolveMarkdownAssetUrl(url, mdDir, resolveFileUrl),
    [mdDir, resolveFileUrl],
  );
  const components = reactExports.useMemo(
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
        <Markdown
          remarkPlugins={[remarkGfm]}
          urlTransform={urlTransform}
          components={components}
        >
          {previewText}
        </Markdown>
      </div>
    ),
    [previewText, urlTransform, components],
  );
  return (
    <div className="tiptap-editor-wrapper -mr-4 h-full overflow-hidden">
      <div
        className={`${interactive ? "nowheel " : ""}autohide-scrollbar h-full overflow-y-auto pr-4`}
      >
        {loaded && !markdown ? (
          <p
            className="ProseMirror text-xs pointer-events-none select-none"
            style={{
              color: "var(--fg-muted, #525252)",
            }}
          >
            {t("canvas.editorPlaceholder")}
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
                {t("canvas.previewTruncated")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
const TextPreview = reactExports.memo(TextPreviewInner);
function mapTextModelInfoToModelInfo(modelInfo) {
  return {
    id: modelInfo.id,
    name: modelInfo.name,
    backend: modelInfo.provider,
    max_refs: 0,
    params: modelInfo.params ?? {},
    promptMaxLength: modelInfo.promptMaxLength,
    region: modelInfo.region,
    subtitle: modelInfo.subtitle,
  };
}
export function TextNodeInner({
  id: textNodeId,
  selected,
  width,
  height,
  data,
}) {
  const { t } = useTranslation();
  const meta = useAssetMeta(textNodeId);
  const dataPath = data?.path;
  const textPath = meta?.path ?? dataPath;
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasIsDragging();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isPreviewInteractive =
    !!selected && !isMultiSelect && !isDragging && !isBoxSelecting;
  const [nodeWidth, setNodeWidth] = reactExports.useState(
    width || TEXT_CARD_DEFAULT_SIZE.width,
  );
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
  const [markdown, setMarkdown] = reactExports.useState("");
  const [loaded, setLoaded] = reactExports.useState(false);
  const [loadedTextPath, setLoadedTextPath] = reactExports.useState(null);
  const editorContentReady = isTextEditorContentReady(
    loaded,
    textPath,
    loadedTextPath,
  );
  const editSessionRef = reactExports.useRef(null);
  const openFullscreen = reactExports.useCallback(() => {
    if (!editorContentReady) return;
    editSessionRef.current = {
      nodeId: textNodeId,
      editSessionId:
        globalThis.crypto?.randomUUID?.() ??
        `text-edit-${Date.now().toString(36)}`,
    };
    setFullscreen(true);
  }, [editorContentReady, textNodeId]);
  const pendingOpenNodeId = useDiffReviewStore(
    (state) => state.pendingOpenNodeId,
  );
  reactExports.useEffect(() => {
    if (!editorContentReady || fullscreen || pendingOpenNodeId !== textNodeId) return;
    if (useDiffReviewStore.getState().consumeOpenEditor(textNodeId)) openFullscreen();
  }, [editorContentReady, fullscreen, pendingOpenNodeId, textNodeId, openFullscreen]);
  const { snapshot: referenceReturnText } = useReferenceNavigationSnapshot(
    textNodeId,
    "text",
  );
  const [showT2TPopover, setShowT2TPopover] =
    reactExports.useState(!!referenceReturnText);
  const [t2tPopoverKey, setT2tPopoverKey] = reactExports.useState(0);
  const textRevision = data?.textRevision;
  const fileVersion = useFileVersion(textPath);
  const generating = useGenerating(textNodeId);
  const generatingStateStore = useGeneratingStateApi();
  const nodeStatus = data?.status;
  const dataGenerating = nodeStatus === "generating";
  const dataIncomplete = isGenerationErrorStatus(nodeStatus);
  const persistedErrorMessage =
    dataIncomplete && typeof data.errorMessage === "string"
      ? data.errorMessage
      : void 0;
  const persistedErrorReason =
    dataIncomplete && typeof data.errorReason === "string"
      ? data.errorReason
      : void 0;
  const persistedRetryPayload =
    dataIncomplete &&
    data.retryPayload &&
    typeof data.retryPayload === "object"
      ? data.retryPayload
      : void 0;
  reactExports.useEffect(() => {
    if (persistedErrorMessage !== void 0) {
      generatingStateStore.getState().clear(textNodeId);
    }
  }, [persistedErrorMessage, textNodeId, generatingStateStore]);
  const isGenerating =
    persistedErrorMessage === void 0 && (dataGenerating || !!generating);
  const generatingProgress = useSimulatedProgress(
    isGenerating,
    "text",
    resolveGenerationProgressStartedAt(
      data,
      dataGenerating,
      generating?.generationStartedAt,
    ),
  );
  const generationErrorMessage = isGenerating
    ? generating?.error
    : persistedErrorMessage;
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
  const popoverDraft = getPopoverDraftMap(data);
  const t2tDraft = popoverDraft?.t2t;
  const sourceTool =
    meta?.source_tool ??
    (typeof data?.source_tool === "string" ? data.source_tool : void 0);
  const promptSeedSource =
    typeof data?.promptSeedSource === "string"
      ? data.promptSeedSource
      : void 0;
  const assetMetadataStore = useAssetMetadataApi();
  const reversePromptRef = reactExports.useRef(void 0);
  const [refRevision, setRefRevision] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!showT2TPopover) return;
    return subscribeGraphChange(() => setRefRevision((revision) => revision + 1));
  }, [showT2TPopover, subscribeGraphChange]);
  const {
    defaultImagePaths,
    defaultVideoPaths,
    defaultAudioPaths,
    defaultTextPaths,
  } =
    // biome-ignore lint/correctness/useExhaustiveDependencies: trigger-only deps
    reactExports.useMemo(() => {
      const sources = getIncomingSourceIds(textNodeId);
      return {
        defaultImagePaths: resolveReferenceImages(
          sources,
          void 0,
          assetMetadataStore,
          getNodeById,
        ),
        defaultVideoPaths: resolveReferenceVideos(
          sources,
          void 0,
          assetMetadataStore,
        ),
        defaultAudioPaths: resolveReferenceAudios(
          sources,
          void 0,
          assetMetadataStore,
        ),
        defaultTextPaths: resolveReferenceTexts(
          sources,
          Array.isArray(data.referenceTextIds)
            ? data.referenceTextIds
            : void 0,
          assetMetadataStore,
          getNodeById,
        ),
      };
    }, [
      textNodeId,
      getIncomingSourceIds,
      getNodeById,
      assetMetadataStore,
      refRevision,
      showT2TPopover,
    ]);
  const attachmentDefaults = reactExports.useMemo(
    () => ({
      defaultImagePaths: restoreDirectReferencePaths(
        t2tDraft?.imagePaths,
        defaultImagePaths,
      ),
      defaultVideoPaths: restoreDirectReferencePaths(
        t2tDraft?.videoPaths,
        defaultVideoPaths,
      ),
      defaultAudioPaths: restoreDirectReferencePaths(
        t2tDraft?.audioPaths,
        defaultAudioPaths,
      ),
      defaultTextPaths: restoreDirectReferencePaths(
        t2tDraft?.textPaths,
        defaultTextPaths,
      ),
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
    hostNodeId: textNodeId,
    resolveFileUrl,
  });
  const referenceItems = attachment.items;
  const t2tMentionPicker = reactExports.useMemo(
    () => ({
      addPaths: attachment.addPaths,
      constraints: attachment.pickerConstraints,
      supportedKinds: attachment.modelSupportedKindsForAtPicker,
    }),
    [
      attachment.addPaths,
      attachment.pickerConstraints,
      attachment.modelSupportedKindsForAtPicker,
    ],
  );
  const handleAddToChat = useAddToChat(textNodeId, meta, onAddToChat, dataPath);
  const onRename = useNodeRename(textNodeId, isCloneData(data));
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
      .then((loadedMarkdown) => {
        if (cancelled) return;
        lastLoadedFromServerRef.current = loadedMarkdown;
        setMarkdown(loadedMarkdown);
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
    let pending = pendingLazyCreateRef.current;
    if (!pending) {
      pending = (async () => {
        try {
          const created = await createTextFile();
          if (!created) return;
          const attached = fillEmptyPlaceholder(textNodeId, {
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
      pendingLazyCreateRef.current = pending;
    }
    await pending;
    if (lazyCreatedPathRef.current) openFullscreen();
  }, [
    textPath,
    createTextFile,
    fillEmptyPlaceholder,
    flushPersist,
    textNodeId,
    openFullscreen,
  ]);
  const handleDoubleClick = reactExports.useCallback(
    (mouseEvent) => {
      mouseEvent.stopPropagation();
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
        textNodeId,
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
      textNodeId,
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
        selected: !!selected,
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
    selected,
    submitTxt2Text,
    isMultiSelect,
    isBoxSelecting,
    showT2TPopover,
    fullscreen,
    sourceTool,
    promptSeedSource,
  ]);
  const baseT2TClose = usePopoverCloseWithDeselect(textNodeId, setShowT2TPopover);
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
      setMarkdown((current) =>
        current === nextMarkdown ? current : nextMarkdown,
      );
      const filePath = textPath ?? lazyCreatedPathRef.current;
      if (!filePath) {
        if (!nextMarkdown.trim() || !createTextFile || !saveTextContent)
          return Promise.resolve();
        latestLazyDraftRef.current = nextMarkdown;
        if (pendingLazyCreateRef.current) return pendingLazyCreateRef.current;
        const pending = (async () => {
          try {
            const created = await createTextFile();
            if (!created) return;
            lazyCreatedPathRef.current = created.path;
            const latest = latestLazyDraftRef.current;
            lastLoadedFromServerRef.current = latest;
            await saveTextContent(created.path, latest).catch(() => {});
            fillEmptyPlaceholder(textNodeId, {
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
        pendingLazyCreateRef.current = pending;
        return pending;
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
    [textPath, saveTextContent, createTextFile, fillEmptyPlaceholder, textNodeId],
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
  const markdownRef = reactExports.useRef(markdown);
  markdownRef.current = markdown;
  const toolbarItems = reactExports.useMemo(() => {
    const items = [];
    items.push({
      id: "text-edit",
      label: t("canvas.textEdit"),
      icon: <TextEditIcon />,
      forceLabel: true,
      dataActionUiId: "canvas-text-edit",
      onClick: () => {
        void handleWriteOwn();
      },
    });
    const hasContent = markdown.trim().length > 0;
    const showPromote = !!onPromoteToAsset && !!meta && hasContent;
    if (showPromote) {
      items.push({
        id: "promote-to-asset",
        label: t("canvas.promoteToAsset"),
        icon: <PromoteToAssetIcon />,
        forceLabel: true,
        separator: true,
        dataActionUiId: "canvas.node-promote-to-asset",
        onClick: (clickEvent) => {
          onPromoteToAsset?.([textNodeId], {
            x: clickEvent.clientX,
            y: clickEvent.clientY,
          });
        },
      });
    }
    items.push({
      id: "copy",
      label: t("canvas.copyContent"),
      icon: <CopyIcon />,
      dataActionUiId: "canvas-text-copy",
      onClick: () => {
        navigator.clipboard.writeText(markdownRef.current);
        dedupedToast.success(t("fileExplorer.copiedToClipboard"));
      },
    });
    items.push({
      id: "add-to-chat",
      label: t("canvas.addToChat"),
      icon: <AddToChatIcon />,
      dataActionUiId: "canvas-text-add-to-chat",
      onClick: handleAddToChat,
      separator: !showPromote,
    });
    return items;
  }, [
    t,
    handleAddToChat,
    handleWriteOwn,
    textNodeId,
    onPromoteToAsset,
    meta,
    markdown,
  ]);
  const hasVideoRef = attachment.videoPaths.length > 0;
  const hasAudioRef = attachment.audioPaths.length > 0;
  const [textModels, setTextModels] = reactExports.useState([]);
  reactExports.useEffect(() => {
    if (!showT2TPopover || !fetchTextModels) return;
    let cancelled = false;
    fetchTextModels()
      .then((list) => {
        if (!cancelled) setTextModels(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showT2TPopover, fetchTextModels]);
  const fetchTextModelsAsModelInfo = reactExports.useMemo(() => {
    if (!fetchTextModels) return void 0;
    return async () =>
      (await fetchTextModels()).map(mapTextModelInfoToModelInfo);
  }, [fetchTextModels]);
  const disabledTextModelIds = reactExports.useMemo(() => {
    if (!hasVideoRef && !hasAudioRef) return void 0;
    const disabled = new Set();
    for (const modelInfo of textModels) {
      if (
        (hasVideoRef && !modelInfo.supportsVideo) ||
        (hasAudioRef && !modelInfo.supportsAudio)
      ) {
        disabled.add(modelInfo.id);
        if (modelInfo.id.includes("/"))
          disabled.add(modelInfo.id.slice(modelInfo.id.indexOf("/") + 1));
      }
    }
    return disabled.size > 0 ? disabled : void 0;
  }, [hasVideoRef, hasAudioRef, textModels]);
  const t2tDraftPrompt =
    typeof t2tDraft?.prompt === "string" && t2tDraft.prompt.trim().length > 0
      ? t2tDraft.prompt
      : void 0;
  const t2tDefaults = pickTextGenerationDefaults(t2tDraft, meta);
  const upstreamPresetPrompt = reactExports.useMemo(() => {
    const imageCount = attachment.imagePaths.length;
    const videoCount = attachment.videoPaths.length;
    const audioCount = attachment.audioPaths.length;
    const textCount = attachment.textPaths.length;
    if ([imageCount, videoCount, audioCount, textCount].filter((pathCount) => pathCount > 0).length !== 1) return void 0;
    if (textCount > 0)
      return t("canvas.upstreamPreset.text", {
        defaultValue:
          "请优化已上传文本，提升方向为[提升可读性/增强感染力/精简篇幅/调整风格]。",
      });
    if (imageCount > 0)
      return imageCount === 1
        ? t("canvas.upstreamPreset.imageSingle", {
            defaultValue:
              "分析这张图片，反推出适用于[目标工具]的生成提示词，附中文释义。",
          })
        : t("canvas.upstreamPreset.imageMulti", {
            defaultValue:
              "分析这组参考图，提取共性风格要素（色彩、光影、构图、质感、情绪），归纳为统一风格描述和可复用的提示词模板。",
          });
    if (videoCount > 0)
      return t("canvas.upstreamPreset.video", {
        defaultValue:
          "分析这段视频的内容、镜头语言和视觉风格，按镜头反推出适用于[目标工具]的生成提示词。",
      });
    return t("canvas.upstreamPreset.audio", {
      defaultValue:
        "分析这段音乐的曲风、情绪、节奏和乐器特征，反推出可生成类似风格的AI音乐提示词。",
    });
  }, [
    attachment.imagePaths.length,
    attachment.videoPaths.length,
    attachment.audioPaths.length,
    attachment.textPaths.length,
    t,
  ]);
  const dataDisplayPrompt =
    typeof data?.displayPrompt === "string" ? data.displayPrompt : void 0;
  const metaPrompt = typeof meta?.prompt === "string" ? meta.prompt : void 0;
  const nodePrompt = [dataDisplayPrompt, metaPrompt].find(
    (promptText) => promptText && promptText.trim().length > 0,
  );
  const t2tPromptSeed = resolveTextPromptSeed({
    quickPrompt: reversePromptRef.current,
    draftPrompt: t2tDraftPrompt,
    nodePrompt,
    upstreamPresetPrompt,
    markdown,
    sourceTool,
    promptSeedSource,
    description:
      meta?.description ??
      (typeof data?.description === "string" ? data.description : void 0),
  });
  const t2tDefaultPromptJson =
    t2tPromptSeed.source === "draft" ? t2tDraft?.promptJson : void 0;
  const t2tAutoPresetKey =
    t2tPromptSeed.source === "upstream" ? t2tPromptSeed.prompt : "";
  return (
    <NodeShell
      id={textNodeId}
      tagIds={meta?.tagIds}
      width={nodeWidth}
      dataActionUiId="canvas.text-node"
    >
      <NodeHeader
        nodeType="text"
        tagIds={meta?.tagIds}
        name={meta?.name || t("canvas.text")}
        selected={selected}
        maxWidth={nodeWidth}
        onRename={onRename}
      />
      {isPreviewInteractive && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      <NodeHandles nodeId={textNodeId} selected={!!selected} />
      <NodeBody
        width={nodeWidth}
        tagIds={meta?.tagIds}
        height={nodeHeight}
        selected={!!selected}
        variant={hasGenerationError || isGenerating ? "media" : "panel"}
        onDoubleClick={
          hasGenerationError || isGenerating ? void 0 : handleDoubleClick
        }
      >
        {hasGenerationError ? (
          <MediaGenerationErrorOverlay
            nodeId={textNodeId}
            nodeType="text"
            message={generationErrorMessage ?? ""}
            errorReason={
              isGenerating ? generating?.errorReason : persistedErrorReason
            }
            retryPayload={
              isGenerating ? generating?.retryPayload : persistedRetryPayload
            }
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
        ) : loaded && !markdown && !isMultiSelect && !isBoxSelecting ? (
          <TextNodeQuickActions
            onQuickPrompt={(prompt) => {
              selectNodeExclusive(textNodeId);
              reversePromptRef.current = prompt;
              setRefRevision((revision) => revision + 1);
              setT2tPopoverKey((popoverKey) => popoverKey + 1);
              setShowT2TPopover(true);
            }}
            onWriteOwn={() => {
              void handleWriteOwn();
            }}
          />
        ) : (
          <TextPreview
            markdown={markdown}
            loaded={loaded}
            plain={isPlainText}
            interactive={isPreviewInteractive}
            mdPath={textPath}
            resolveFileUrl={resolveFileUrl}
          />
        )}
      </NodeBody>
      {selected && (
        <NodeResizeFrame
          nodeId={textNodeId}
          minWidth={TEXT_CARD_MIN_SIZE.width}
          minHeight={TEXT_CARD_MIN_SIZE.height}
          onResize={handleResize}
        />
      )}
      {fullscreen && (
        <TextFullscreen
          initialMarkdown={markdown}
          externalRevision={textRevision}
          onClose={handleCloseFullscreen}
          onDraftChange={persistMarkdownDraft}
          plain={isPlainText}
          sourceNodeId={textNodeId}
          documentPath={textPath ?? lazyCreatedPathRef.current ?? void 0}
          getCloseBlockReason={getFullscreenCloseBlockReason}
          onEditingSelectionChange={(selection) => {
            const session = editSessionRef.current;
            if (session) onTextEditSelectionChange?.(session, selection);
          }}
          onAnnotationsChange={(snapshots) => {
            const session = editSessionRef.current;
            if (session) onAnnotationsChange?.(session, snapshots);
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
              textNodeId,
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
          replaceNodeId={textNodeId}
          referenceItems={referenceItems}
          resolveFileUrl={resolveFileUrl}
          mentionPicker={t2tMentionPicker}
          defaultPromptJson={t2tDefaultPromptJson}
          onAddReference={attachment.openPicker}
          onReplaceReference={attachment.replacePath}
          onEditReference={attachment.editImage}
          onRemoveReference={(path) =>
            attachment.removePath(path, {
              tearEdge: true,
            })
          }
          showReferenceAddButton={attachment.showAddButton}
          disabledModelIds={disabledTextModelIds}
          disabledModelReason={
            hasVideoRef && hasAudioRef
              ? t("canvas.txt.modelNoVideoAudioSupport", {
                  defaultValue: "该模型不支持当前连入的视频/音频素材",
                })
              : hasVideoRef
                ? t("canvas.txt.modelNoVideoSupport", {
                    defaultValue: "该模型不支持当前连入的视频素材",
                  })
                : hasAudioRef
                  ? t("canvas.txt.modelNoAudioSupport", {
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
