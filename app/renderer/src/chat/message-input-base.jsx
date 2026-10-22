// message-input-base.jsx
import { DOMParser, Slice } from "prosemirror-model";
import { EditorContent, useEditor } from "@tiptap/react";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { Placeholder } from "@tiptap/extensions";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { useTranslation } from "react-i18next";
import { ArrowUp } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  chatLog,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MAX_ATTACHMENTS,
  useMentionModels,
} from "../generation/use-mention-models.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import {
  isAnnotatableImage,
  isSameImageAnnotationTarget,
  useAssetSourcePicker,
  useAttachmentLocator,
  usePreviewTextLoader,
} from "../text-editor/read-preview-text-response.jsx";
import { ImageAnnotationDialog } from "../text-editor/image-annotation-dialog.jsx";
import {
  buildFileMentionAttrs,
  ComposerActionsCompactProvider,
  computeComposerActions,
  createExpandedComposerActionsMeasurer,
  remapCommittedMentionPaths,
  resolveComposerActionsCompact,
  restoreMentionDraft,
} from "./create-expanded-composer-actions-measurer.jsx";
import { MentionPopover } from "./mention-popover.jsx";
import { useUpload } from "../assets/use-upload.js";
import {
  fileMatchesAccept,
  UploadCommitUnsupportedFilesystemError,
} from "../assets/classify-upload-error.js";
import { useDropHandler } from "./use-drop-handler.js";
import { useLocalComfyUiWorkflows } from "./use-local-comfy-ui-workflows.js";
import { findMentionTrigger } from "./find-trailing-trigger.js";
import { useMention } from "./use-mention.js";
import {
  basename,
  FileDropFeedback,
  MENTION_POPOVER_ID,
  mentionKindFromFileType,
  mentionKindFromPath,
  MESSAGE_ACTION_BUTTON_CLASS,
  MESSAGE_ACTION_LABEL_BUTTON_CLASS,
  POPOVER_ID,
  workflowAttachmentName,
} from "../text-editor/file-drop-feedback.jsx";
import { buildDocContentFromInput } from "../text-editor/build-doc-content-from-input.js";
import { src_default } from "../generation/attachment-bar.jsx";
import { MentionRefNode } from "./mention-ref-node.js";
import { HighlightDecoration } from "./highlight-decoration.js";
import {
  folderBaseName,
  getDocLanguageDetectionText,
  highlightPluginKey,
  pmPosToTextOffset,
  scheduleEditorFocus,
  useComposerPlaceholderActions,
} from "./use-composer-placeholder-actions.jsx";
import {
  ColorVisualDecoration,
  connectorMentionToken,
  getDocText,
  getDocTriggerText,
  getDocWireText,
  getWireFragmentText,
  GhostTextDecoration,
  ghostTextPluginKey,
  useConnectorReferences,
} from "../text-editor/get-wire-content-text.jsx";
import { AttachmentPreview } from "../text-editor/attachment-preview.jsx";
import { findAllMentions } from "../text-editor/table-document-to-llm-content.js";
import { useSlashCommand } from "../workspace/use-slash-command.js";
import {
  attachmentsFromHistory,
  filenameFromPath,
  useMessageHistory,
} from "../workspace/use-message-history.js";
import { SlashCommandPopover } from "../workspace/slash-command-popover.jsx";
import { MediaHoverPreview } from "../media-editing/media-hover-preview.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
export const MessageInputBase = reactExports.forwardRef(function MessageInput(
  {
    onSend,
    onSendPreparingChange,
    onCancel,
    busy = false,
    sendDisabled = false,
    previewActive = true,
    sendGuard,
    sendLabel,
    sendTooltip,
    hideSubmitAction = false,
    submitOnEnter = true,
    onPlainEnter,
    enableSlashCommands = true,
    allowEmptySend = false,
    running,
    placeholder,
    placeholderBusy,
    showBusyPlaceholder = true,
    autoFocus = false,
    rows: _rows,
    slashPopoverPosition = "up",
    pageContext = "project",
    skillPopoverMode = "default",
    toolbar,
    guard,
    className = "",
    pendingInput,
    pendingEditorDoc,
    onPendingInputConsumed,
    useDefaultDir,
    attachmentMaxCount,
    attachmentAccept,
    replacementAccept,
    onExploreSkills,
    onCreateSkill,
    placeholderNode,
    clearOnSend = true,
    messageHistory,
    messageHistoryResetKey,
    selectedMediaModels,
    onSelectedMediaModelsChange,
    onInputChange,
    editorAriaLabel,
    editorActionId = "message-input",
    showCompactPromptPreview = false,
    pendingAttachments,
    onPendingAttachmentsConsumed,
    footerSlot,
    onAttachmentsChange,
    rightSlot,
    hideAttachmentSources,
    readOnlyAttachmentSources,
    hideAssetMention,
    showCurrentCanvasWorkflowTab = true,
    onFolderChipClick,
    fileDropScope = "input",
  },
  forwardedRef,
) {
  const { t: translate } = useTranslation();
  const loadPreviewText = usePreviewTextLoader();
  const mountedRef = reactExports.useRef(false);
  reactExports.useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const sendInFlightRef = reactExports.useRef(false);
  const submitRef = reactExports.useRef(async () => false);
  const sendTransactionGenerationRef = reactExports.useRef(0);
  const sendPhaseRef = reactExports.useRef("idle");
  const deferredResetRef = reactExports.useRef(null);
  const appliedPendingAttachmentsRef = reactExports.useRef(null);
  const blockedPendingAttachmentsRef = reactExports.useRef(null);
  const appliedPendingInputRef = reactExports.useRef(null);
  const [sendPreparing, setSendPreparing] = reactExports.useState(false);
  const [annotationTarget, setAnnotationTarget] = reactExports.useState(null);
  const annotationOpen = annotationTarget !== null;
  const baseInteractionLocked = busy || sendPreparing;
  const interactionLocked = baseInteractionLocked || annotationOpen;
  const agentRunning = running ?? busy;
  const dropFoldersUnsupportedText = translate("chat.dropFoldersUnsupported");
  const [input, setInput] = reactExports.useState("");
  const [directSelectedSkill, setDirectSelectedSkill] =
    reactExports.useState(null);
  const inputRootRef = reactExports.useRef(null);
  const editorWrapperRef = reactExports.useRef(null);
  const actionRowRef = reactExports.useRef(null);
  const leftActionsRef = reactExports.useRef(null);
  const [actionsCompact, setActionsCompact] = reactExports.useState(false);
  const actionsCompactRef = reactExports.useRef(false);
  const skillTriggerRef = reactExports.useRef(null);
  const suppressSyncRef = reactExports.useRef(false);
  const isUnmountingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    isUnmountingRef.current = false;
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);
  const pmKeyHandlerRef = reactExports.useRef(() => false);
  const mentionFileRef = reactExports.useRef(new Map());
  const selectedAssetEntityIdsRef = reactExports.useRef([]);
  const inlineAssetTopRef = reactExports.useRef(null);
  const handleInlineAssetTopChange = reactExports.useCallback((target) => {
    inlineAssetTopRef.current = target;
  }, []);
  reactExports.useLayoutEffect(() => {
    const actionRow = actionRowRef.current;
    const left = leftActionsRef.current;
    if (!actionRow || !left) return;
    let frame = 0;
    let disposed = false;
    const expandedActionsMeasurer = createExpandedComposerActionsMeasurer(actionRow);
    const applyCompact = (next) => {
      if (actionsCompactRef.current === next) return;
      actionsCompactRef.current = next;
      setActionsCompact(next);
      scheduleMeasure();
    };
    const measure = () => {
      if (disposed) return;
      const hasOptionalActions = Boolean(
        actionRow.querySelector("[data-composer-optional]"),
      );
      if (!hasOptionalActions) {
        applyCompact(false);
        return;
      }
      const availableWidth = actionRow.clientWidth;
      if (availableWidth <= 0) return;
      const expandedRequiredWidth = expandedActionsMeasurer.measure();
      const next = resolveComposerActionsCompact({
        availableWidth,
        expandedRequiredWidth,
        compact: actionsCompactRef.current,
      });
      applyCompact(next);
    };
    function scheduleMeasure() {
      if (disposed || frame) return;
      if (typeof requestAnimationFrame === "undefined") {
        measure();
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    }
    measure();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(actionRow);
    resizeObserver?.observe(left);
    resizeObserver?.observe(expandedActionsMeasurer.element);
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            expandedActionsMeasurer.refresh();
            scheduleMeasure();
          });
    mutationObserver?.observe(actionRow, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => {
      disposed = true;
      if (frame && typeof cancelAnimationFrame !== "undefined")
        cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      expandedActionsMeasurer.dispose();
    };
  }, []);
  const parseInputRef = reactExports.useRef((text) => ({
    type: "doc",
    content: [
      text
        ? {
            type: "paragraph",
            content: [
              {
                type: "text",
                text,
              },
            ],
          }
        : {
            type: "paragraph",
          },
    ],
  }));
  const placeholderTextRef = reactExports.useRef("");
  const ghostTextRef = reactExports.useRef(null);
  const addFromLocalRef = reactExports.useRef(() => {});
  const addFromAssetPathRef = reactExports.useRef(() => {});
  const guardRef = reactExports.useRef(guard);
  const onInputChangeRef = reactExports.useRef(onInputChange);
  const onFolderChipClickRef = reactExports.useRef(onFolderChipClick);
  const busyRef = reactExports.useRef(interactionLocked);
  busyRef.current = interactionLocked;
  guardRef.current = guard;
  onInputChangeRef.current = onInputChange;
  onFolderChipClickRef.current = onFolderChipClick;
  const [mentionPreview, setMentionPreview] = reactExports.useState(null);
  const {
    attachments,
    uploading,
    addFromLocal,
    replaceFromLocal,
    replacingIds,
    applyEditedFile,
    addFromAssetPath,
    renameAttachment,
    addFromPluginNode,
    remove,
    clear,
    replaceAttachments,
    replaceSourceAttachmentPlaceholders,
    prepareSourceAttachmentReplacement,
    commitPreparedSourceAttachments,
    rollbackPreparedSourceAttachments,
    commitFiles,
    finalizeCommit,
  } = useUpload({
    useDefaultDir,
    onAttachmentsChange,
    maxAttachments: attachmentMaxCount,
    attachmentAccept,
    replacementAccept,
  });
  const attachmentOwnershipKey = attachments
    .flatMap((attachment) =>
      attachment.commitOperationId
        ? [`${attachment.id}\0${attachment.commitOperationId}`]
        : [],
    )
    .join("\0");
  const handleOpenAnnotation = reactExports.useCallback(
    (attachment) => {
      if (
        sendInFlightRef.current ||
        baseInteractionLocked ||
        !isAnnotatableImage(attachment) ||
        (attachment.source &&
          readOnlyAttachmentSources?.includes(attachment.source))
      ) {
        return;
      }
      setAnnotationTarget(attachment);
    },
    [baseInteractionLocked, readOnlyAttachmentSources],
  );
  const annotationApplyGuardRef = reactExports.useRef(() => false);
  annotationApplyGuardRef.current = (snapshot, mode) => {
    if (
      sendInFlightRef.current ||
      baseInteractionLocked ||
      (mode === "append" &&
        attachments.length >= (attachmentMaxCount ?? MAX_ATTACHMENTS))
    )
      return false;
    const current = attachments.find(
      (attachment) => attachment.id === snapshot.id,
    );
    return Boolean(
      current &&
      isSameImageAnnotationTarget(current, snapshot) &&
      isAnnotatableImage(current) &&
      !(
        current.source && readOnlyAttachmentSources?.includes(current.source)
      ),
    );
  };
  const handleApplyAnnotation = reactExports.useCallback(
    async (snapshot, file, mode, signal) => {
      if (!annotationApplyGuardRef.current(snapshot, mode)) return false;
      return applyEditedFile(snapshot.id, file, {
        mode,
        signal,
        canApply: () => annotationApplyGuardRef.current(snapshot, mode),
      });
    },
    [applyEditedFile],
  );
  const dropGuard = reactExports.useCallback(
    () =>
      !sendInFlightRef.current &&
      !busyRef.current &&
      (guardRef.current ? guardRef.current() : true),
    [],
  );
  const getDropTransactionGeneration = reactExports.useCallback(
    () => sendTransactionGenerationRef.current,
    [],
  );
  const { isDragging, dragHandlers } = useDropHandler({
    guard: dropGuard,
    getTransactionGeneration: getDropTransactionGeneration,
    addFromLocal,
    addFromAssetPath,
    folderWarningText: dropFoldersUnsupportedText,
  });
  const mentionReferenceFiles = reactExports.useMemo(
    () =>
      attachments
        .filter((attachment) => attachment.status === "done" && Boolean(attachment.relativePath))
        .map((attachment) => {
          const path = attachment.relativePath;
          return {
            name: attachment.filename,
            path,
            kind: mentionKindFromFileType(attachment.fileType, path),
            ...(attachment.attachmentId
              ? {
                  attachment_id: attachment.attachmentId,
                }
              : {}),
          };
        }),
    [attachments],
  );
  addFromLocalRef.current = addFromLocal;
  addFromAssetPathRef.current = addFromAssetPath;
  const attachPastedFiles = reactExports.useCallback((event) => {
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return false;
    const hasNonText = Array.from(files).some(
      (file) => !file.type.startsWith("text/"),
    );
    if (!hasNonText) return false;
    if (busyRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    const currentGuard = guardRef.current;
    if (currentGuard && !currentGuard()) return true;
    event.preventDefault();
    event.stopPropagation();
    addFromLocalRef.current(files);
    return true;
  }, []);
  const resolvedPlaceholder = agentRunning
    ? showBusyPlaceholder
      ? (placeholderBusy ?? translate("chat.placeholderBusy"))
      : ""
    : (placeholder ?? translate("chat.placeholder"));
  const placeholderDecorationKey = placeholderNode ? "" : resolvedPlaceholder;
  placeholderTextRef.current = ghostTextRef.current
    ? ""
    : placeholderDecorationKey;
  const editor = useEditor(
    {
      extensions: [
        src_default.configure({
          dropcursor: {
            color: "var(--brand-accent)",
            width: 2,
            class: "message-input-dropcursor",
          },
          heading: false,
          bold: false,
          italic: false,
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: () => placeholderTextRef.current,
          showOnlyWhenEditable: false,
        }),
        MentionRefNode,
        HighlightDecoration,
        ColorVisualDecoration,
        GhostTextDecoration,
      ],
      content: "",
      editable: !busy,
      onUpdate({ editor, transaction }) {
        if (isUnmountingRef.current || editor.isDestroyed) return;
        if (!transaction.docChanged) return;
        const text = getDocText(editor.state.doc);
        suppressSyncRef.current = true;
        setInput(text);
        onInputChangeRef.current?.(text, editor.getJSON());
        queueMicrotask(() => {
          suppressSyncRef.current = false;
        });
      },
      editorProps: {
        clipboardTextSerializer: (slice) =>
          getWireFragmentText(slice.content),
        handleKeyDown: (_view, event) => pmKeyHandlerRef.current(event),
        handlePaste: (view, event) => {
          if (attachPastedFiles(event)) return true;
          const text = event.clipboardData?.getData("text/plain") ?? "";
          const html = event.clipboardData?.getData("text/html") ?? "";
          const container = document.createElement("div");
          container.innerHTML = html;
          const ownChips = container.querySelector("mention-ref");
          if (
            !ownChips &&
            (!text.includes("@") || findAllMentions(text).length === 0)
          )
            return false;
          const parser = parseInputRef.current;
          if (!parser) return false;
          const parsedDocument = ownChips
            ? DOMParser.fromSchema(view.state.schema)
                .parse(container, {
                  preserveWhitespace: "full",
                })
                .toJSON()
            : parser(text);
          const inlineJSON = (parsedDocument.content ?? []).flatMap((block, index) => [
            ...(index > 0
              ? [
                  {
                    type: "hardBreak",
                  },
                ]
              : []),
            ...(block.content ?? []),
          ]);
          if (inlineJSON.length === 0) return false;
          try {
            const nodes = inlineJSON
              .map((nodeJson) => view.state.schema.nodeFromJSON(nodeJson))
              .filter((node) => !!node);
            if (nodes.length === 0) return false;
            event.preventDefault();
            const transaction = view.state.tr.replaceSelectionWith(nodes[0], false);
            for (let nodeIndex = 1; nodeIndex < nodes.length; nodeIndex++) {
              transaction.insert(transaction.selection.to, nodes[nodeIndex]);
            }
            view.dispatch(transaction);
            queueMicrotask(() => {
              const addMentionedFileFromPath = addFromAssetPathRef.current;
              const seen = new Set();
              for (const nodeJson of inlineJSON) {
                if (nodeJson.type !== "mentionRef") continue;
                const attrs = nodeJson.attrs;
                if (
                  !attrs ||
                  ["model", "connector", "asset"].includes(attrs.kind) ||
                  attrs.isFolder
                )
                  continue;
                if (!attrs.path || seen.has(attrs.path)) continue;
                seen.add(attrs.path);
                addMentionedFileFromPath(attrs.path, attrs.name || basename(attrs.path));
              }
            });
            return true;
          } catch {
            return false;
          }
        },
        transformPasted: (slice) => {
          if (
            slice.content.childCount === 1 &&
            slice.content.firstChild?.type.name === "paragraph" &&
            slice.openStart === 0 &&
            slice.openEnd === 0
          ) {
            return new Slice(slice.content.firstChild.content, 0, 0);
          }
          return slice;
        },
        attributes: {
          "data-action-ui-id": editorActionId,
          ...(editorAriaLabel
            ? {
                "aria-label": editorAriaLabel,
              }
            : {}),
          role: "combobox",
          class:
            "message-input-prosemirror relative z-[1] bg-transparent text-foreground resize-none focus:outline-none",
        },
      },
    },
    [attachPastedFiles],
  );
  reactExports.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!interactionLocked);
  }, [editor, interactionLocked]);
  reactExports.useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr);
  }, [editor, placeholderDecorationKey]);
  const handleRemoveAttachment = reactExports.useCallback(
    (attachmentId) => {
      if (sendInFlightRef.current) return;
      const target = attachments.find((attachment) => attachment.id === attachmentId);
      if (target?.source && readOnlyAttachmentSources?.includes(target.source))
        return;
      if (busyRef.current || !target || target.commitOperationId) return;
      if (target.relativePath && editor) {
        const transaction = editor.state.tr;
        const ranges = [];
        editor.state.doc.descendants((node, nodePosition) => {
          if (
            node.type.name === "mentionRef" &&
            node.attrs.path === target.relativePath &&
            !["asset", "model", "connector", "folder"].includes(
              node.attrs.kind,
            )
          )
            ranges.push({
              from: nodePosition,
              to: nodePosition + node.nodeSize,
            });
        });
        for (const range of ranges.reverse())
          transaction.delete(range.from, range.to);
        if (transaction.docChanged) editor.view.dispatch(transaction);
        mentionFileRef.current.delete(target.relativePath);
      }
      remove(attachmentId);
    },
    [attachments, editor, readOnlyAttachmentSources, remove],
  );
  reactExports.useEffect(() => {
    if (suppressSyncRef.current || !editor) return;
    const current = getDocText(editor.state.doc);
    if (current !== input) {
      suppressSyncRef.current = true;
      editor.commands.setContent(parseInputRef.current(input || ""), {
        parseOptions: {
          preserveWhitespace: "full",
        },
      });
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
    }
  }, [input, editor]);
  const hasReadyAttachments = attachments.some(
    (attachment) =>
      (attachment.status === "done" && !!attachment.relativePath) ||
      (attachment.kind === "plugin-node" && !!attachment.pluginNodeId),
  );
  const canSend =
    (!!input.trim() || hasReadyAttachments || allowEmptySend) &&
    !interactionLocked &&
    !sendDisabled &&
    !uploading;
  const { showSendButton, showStopButton } = computeComposerActions({
    agentRunning,
    canSend,
    hasCancel: !!onCancel,
  });
  const nodeSkillGuidePrompt =
    skillPopoverMode === "director-stage" || skillPopoverMode === "clip-editor"
      ? translate("chat.nodeSkillGuidePrompt")
      : void 0;
  const {
    open: slashOpen,
    allSkills: slashAllSkills,
    tabFiltered: slashTabFiltered,
    activeIndex: slashActiveIndex,
    setActiveIndex: slashSetActiveIndex,
    selectedSkill,
    close: slashClose,
    openPopover: slashOpenPopover,
    onInputChange: slashOnInputChange,
    onKeyDown: slashOnKeyDown,
    selectSkill,
    ghostText,
    setGhostText: slashSetGhostText,
    isSelectSkillPending: slashIsSelectSkillPending,
    openedByButton: slashOpenedByButton,
    query: slashQuery,
    setQuery: slashSetQuery,
  } = useSlashCommand(input, setInput, pageContext, nodeSkillGuidePrompt);
  const workspace = useCurrentWorkspace();
  const {
    data: mentionModels,
    isFetching: mentionModelsFetching,
    refetch: refetchMentionModels,
  } = useMentionModels();
  const {
    connectors: mentionConnectors,
    loading: mentionConnectorsLoading,
    refresh: refreshMentionConnectors,
  } = useConnectorReferences();
  const {
    workflows: localComfyUiWorkflows,
    currentCanvasWorkflows,
    currentCanvasWorkflowNodeIds,
    loading: localComfyUiWorkflowsLoading,
    refresh: refreshLocalComfyUiWorkflows,
    loadGraph: loadLocalComfyUiWorkflowGraph,
  } = useLocalComfyUiWorkflows();
  const scopedGatewayUrl = useGatewayUrl();
  const attachmentSourcePicker = useAssetSourcePicker();
  const attachmentLocator = useAttachmentLocator();
  const replacementContextRef = reactExports.useRef({
    workspace,
    messageHistoryResetKey,
    replacementAccept,
    attachments,
    readOnlyAttachmentSources,
  });
  replacementContextRef.current = {
    workspace,
    messageHistoryResetKey,
    replacementAccept,
    attachments,
    readOnlyAttachmentSources,
  };
  const replacementOptions = reactExports.useCallback(
    (target) => ({
      canApply: () =>
        !isUnmountingRef.current &&
        !sendInFlightRef.current &&
        !busyRef.current &&
        replacementContextRef.current.workspace === workspace &&
        replacementContextRef.current.messageHistoryResetKey ===
          messageHistoryResetKey &&
        replacementContextRef.current.replacementAccept === replacementAccept &&
        replacementContextRef.current.attachments.some(
          (item) =>
            item.id === target.id && item.relativePath === target.relativePath,
        ) &&
        !(
          target.source &&
          replacementContextRef.current.readOnlyAttachmentSources?.includes(
            target.source,
          )
        ),
      onReplaced: (previous, next) => {
        if (!editor || !previous.relativePath || !next.relativePath) return;
        const file = {
          path: next.relativePath,
          name: next.filename,
          kind: mentionKindFromFileType(next.fileType, next.relativePath),
        };
        const attrs = buildFileMentionAttrs(file, scopedGatewayUrl);
        const transaction = editor.state.tr;
        editor.state.doc.descendants((node, nodePosition) => {
          if (
            node.type.name === "mentionRef" &&
            node.attrs.path === previous.relativePath &&
            !["asset", "model", "connector", "folder"].includes(
              node.attrs.kind,
            )
          )
            transaction.setNodeMarkup(nodePosition, void 0, {
              ...node.attrs,
              ...attrs,
            });
        });
        mentionFileRef.current.delete(previous.relativePath);
        mentionFileRef.current.set(next.relativePath, file);
        if (transaction.docChanged) editor.view.dispatch(transaction);
      },
    }),
    [
      workspace,
      messageHistoryResetKey,
      replacementAccept,
      editor,
      scopedGatewayUrl,
    ],
  );
  const handleReplaceLocal = reactExports.useCallback(
    (attachmentId, file) => {
      const target = attachments.find((item) => item.id === attachmentId);
      return target
        ? replaceFromLocal(attachmentId, file, replacementOptions(target))
        : Promise.resolve(false);
    },
    [attachments, replaceFromLocal, replacementOptions],
  );
  const handleRequestReplacement = reactExports.useCallback(
    async (target, _anchor, openLocal) => {
      const options = replacementOptions(target);
      if (!options.canApply()) return;
      openLocal();
    },
    [replacementOptions],
  );
  const visibleModels = reactExports.useMemo(
    () => (mentionModels ?? []).filter((modelCandidate) => modelCandidate.visibility !== "hidden"),
    [mentionModels],
  );
  const handleSelectModel = reactExports.useCallback(
    (model) => {
      if (sendInFlightRef.current) return;
      if (!selectedMediaModels || !onSelectedMediaModelsChange) return;
      const mediaType = model.mediaType;
      const list = selectedMediaModels[mediaType];
      if (list === void 0) return;
      const targetId = model.modelName || model.id;
      if (list.includes(targetId)) return;
      onSelectedMediaModelsChange({
        ...selectedMediaModels,
        [mediaType]: [...list, targetId],
      });
    },
    [selectedMediaModels, onSelectedMediaModelsChange],
  );
  const handleInsertMentionItem = reactExports.useCallback(
    (item) => {
      if (sendInFlightRef.current) return false;
      if (!editor) return false;
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        void 0,
        "￼",
      );
      const match = findMentionTrigger(textBefore);
      const triggerStart = match
        ? $from.pos - (textBefore.length - match.start)
        : $from.pos;
      const triggerEnd = $from.pos;
      let attrs;
      if (item.category === "connector") {
        attrs = {
          path: item.connector.connectorId ?? item.connector.serverName,
          name: item.connector.displayName,
          modelName: null,
          mentionName: null,
          kind: "connector",
          mediaType: null,
          thumbUrl: item.connector.iconUrl,
          previewUrl: null,
          mediaUrl: null,
        };
      } else if (item.category === "model") {
        const mediaModel = item.model;
        attrs = {
          path: mediaModel.id,
          name: mediaModel.displayName,
          modelName: mediaModel.modelName,
          mentionName: mediaModel.mentionName ?? mediaModel.modelName,
          kind: "model",
          mediaType: mediaModel.mediaType,
          thumbUrl: mediaModel.iconUrl || null,
          previewUrl: null,
          mediaUrl: null,
        };
      } else if (item.category === "workflow") {
        if (item.context === "current-canvas") {
          return editor
            .chain()
            .deleteRange({
              from: triggerStart,
              to: triggerEnd,
            })
            .focus()
            .run();
        }
        attrs = {
          path: item.workflow.id,
          name: item.workflow.title,
          modelName: null,
          mentionName: null,
          kind: "workflow",
          mediaType: null,
          thumbUrl: null,
          previewUrl: null,
          mediaUrl: null,
        };
      } else {
        const attachmentFile = item.file;
        mentionFileRef.current.set(attachmentFile.path, attachmentFile);
        attrs = buildFileMentionAttrs(attachmentFile, scopedGatewayUrl);
      }
      return editor
        .chain()
        .replaceTriggerWithMentionRef(attrs, triggerStart, triggerEnd)
        .focus()
        .run();
    },
    [editor, scopedGatewayUrl],
  );
  const handleSelectWorkflowMention = reactExports.useCallback(
    (item) => {
      if (item.context === "current-canvas" && item.canvasNodeId) {
        addFromPluginNode(item.canvasNodeId, "comfyui", item.workflow.title);
        return;
      }
      const { workflow } = item;
      void loadLocalComfyUiWorkflowGraph(workflow.id)
        .then((graph) => {
          const file = new File(
            [JSON.stringify(graph, null, 2)],
            workflowAttachmentName(workflow),
            {
              type: "application/json",
            },
          );
          addFromLocal([file], {
            source: "workflow",
          });
        })
        .catch(() => {
          dedupedToast.error(translate("mention.popover.workflowAttachFailed"));
        });
    },
    [addFromLocal, addFromPluginNode, loadLocalComfyUiWorkflowGraph, translate],
  );
  const handleInsertAssetMention = reactExports.useCallback(
    (target) => {
      if (!editor) return false;
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        void 0,
        "￼",
      );
      const match = findMentionTrigger(textBefore);
      const triggerStart = match
        ? $from.pos - (textBefore.length - match.start)
        : $from.pos;
      const triggerEnd = $from.pos;
      return editor.commands.replaceTriggerWithMentionRef(
        {
          path: `asset:${target.entityId}`,
          name: target.entityName,
          modelName: null,
          mentionName: null,
          kind: "asset",
          mediaType: null,
          thumbUrl: null,
          previewUrl: null,
          mediaUrl: null,
          entityType: target.entityType,
        },
        triggerStart,
        triggerEnd,
      );
    },
    [editor],
  );
  const editorCaretGetter = reactExports.useCallback(
    () =>
      editor
        ? pmPosToTextOffset(
            editor.state.doc,
            editor.state.selection.$anchor.pos,
          )
        : 0,
    [editor],
  );
  const {
    state: mentionState,
    setActiveIndex: mentionSetActiveIndex,
    setFileKindFilter: mentionSetFileKindFilter,
    onChange: mentionOnChange,
    onKeyDown: mentionOnKeyDown,
    onSelect: mentionOnSelect,
    openPopover: mentionOpenPopover,
    close: mentionClose,
  } = useMention(input, setInput, workspace, editorWrapperRef, {
    getCaret: editorCaretGetter,
    onSelectMedia: (item) =>
      addFromAssetPath(item.path, item.name, void 0, item.attachment_id),
    models: visibleModels,
    connectors: mentionConnectors,
    connectorsLoading: mentionConnectorsLoading,
    workflows: localComfyUiWorkflows,
    currentCanvasWorkflows,
    currentCanvasWorkflowNodeIds,
    referenceFiles: mentionReferenceFiles,
    onSelectModel: handleSelectModel,
    onSelectWorkflow: handleSelectWorkflowMention,
    onAfterSelect: () => editor?.commands.focus(),
    onInsertItem: (item) => handleInsertMentionItem(item),
    includeProjectAssets: !hideAssetMention,
  });
  const mentionVisible =
    mentionState.open &&
    (mentionState.openedByButton || mentionState.items.length > 0);
  reactExports.useEffect(() => {
    if (!mentionState.open) return;
    void refreshLocalComfyUiWorkflows();
    void refreshMentionConnectors();
  }, [
    mentionState.open,
    refreshLocalComfyUiWorkflows,
    refreshMentionConnectors,
  ]);
  const mentionModelsRetriedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!mentionState.open) {
      mentionModelsRetriedRef.current = false;
      return;
    }
    if (mentionModelsRetriedRef.current) return;
    if (mentionModelsFetching || (mentionModels?.length ?? 0) > 0) return;
    mentionModelsRetriedRef.current = true;
    void refetchMentionModels?.();
  }, [
    mentionState.open,
    mentionModels,
    mentionModelsFetching,
    refetchMentionModels,
  ]);
  const handleSelectMention = reactExports.useCallback(
    (item) => {
      if (sendInFlightRef.current) return;
      mentionOnSelect(item);
    },
    [mentionOnSelect],
  );
  const handleSelectSkill = reactExports.useCallback(
    (...args) => {
      if (sendInFlightRef.current) return "";
      return selectSkill(...args);
    },
    [selectSkill],
  );
  const handleSelectAssetMention = reactExports.useCallback(
    (target) => {
      if (sendInFlightRef.current) return;
      handleInsertAssetMention(target);
      if (!selectedAssetEntityIdsRef.current.includes(target.entityId)) {
        selectedAssetEntityIdsRef.current = [
          ...selectedAssetEntityIdsRef.current,
          target.entityId,
        ];
      }
      mentionClose();
    },
    [handleInsertAssetMention, mentionClose],
  );
  const addFromEntity = reactExports.useCallback(
    (entityId, entityName, entityType) => {
      if (editor) {
        const caret = editor.state.selection.$anchor.pos;
        editor.commands.replaceTriggerWithMentionRef(
          {
            path: `asset:${entityId}`,
            name: entityName,
            modelName: null,
            mentionName: null,
            kind: "asset",
            mediaType: null,
            thumbUrl: null,
            previewUrl: null,
            mediaUrl: null,
            entityType: entityType ?? null,
          },
          caret,
          caret,
        );
        editor.commands.focus();
      }
      if (!selectedAssetEntityIdsRef.current.includes(entityId)) {
        selectedAssetEntityIdsRef.current = [
          ...selectedAssetEntityIdsRef.current,
          entityId,
        ];
      }
    },
    [editor],
  );
  const messageHistoryController = useMessageHistory(messageHistory, messageHistoryResetKey);
  reactExports.useEffect(() => {
    if (enableSlashCommands && mentionState.open && slashOpen) {
      slashClose();
    }
  }, [enableSlashCommands, mentionState.open, slashOpen, slashClose]);
  reactExports.useEffect(() => {
    if (!mentionVisible) inlineAssetTopRef.current = null;
  }, [mentionVisible]);
  reactExports.useEffect(() => {
    let editorElement = null;
    try {
      editorElement = editor?.view.dom ?? null;
    } catch {
      return;
    }
    if (!editorElement) return;
    const slashVisible = enableSlashCommands && slashOpen;
    const expanded = slashVisible || mentionVisible;
    editorElement.setAttribute("aria-expanded", String(expanded));
    const controls = mentionVisible
      ? MENTION_POPOVER_ID
      : slashVisible
        ? POPOVER_ID
        : void 0;
    if (controls) {
      editorElement.setAttribute("aria-controls", controls);
    } else {
      editorElement.removeAttribute("aria-controls");
    }
    const descendant =
      mentionVisible && mentionState.items[mentionState.activeIndex]
        ? `mention-opt-${mentionState.activeIndex}`
        : slashVisible &&
            !slashOpenedByButton &&
            slashTabFiltered[slashActiveIndex]
          ? `slash-opt-${slashTabFiltered[slashActiveIndex].name}`
          : void 0;
    if (descendant) {
      editorElement.setAttribute("aria-activedescendant", descendant);
    } else {
      editorElement.removeAttribute("aria-activedescendant");
    }
  }, [
    editor,
    enableSlashCommands,
    slashOpen,
    slashOpenedByButton,
    mentionVisible,
    mentionState,
    slashTabFiltered,
    slashActiveIndex,
  ]);
  reactExports.useEffect(() => {
    if (!editor) return;
    const handler = ({ transaction }) => {
      if (transaction.docChanged) {
        setMentionPreview(null);
      }
      if (suppressSyncRef.current) return;
      if (!transaction.docChanged && !transaction.selectionSet) return;
      const caret = pmPosToTextOffset(
        editor.state.doc,
        editor.state.selection.$anchor.pos,
      );
      if (enableSlashCommands)
        slashOnInputChange(getDocTriggerText(editor.state.doc), caret, {
          syncInput: false,
        });
      mentionOnChange(getDocTriggerText(editor.state.doc), caret);
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, enableSlashCommands, slashOnInputChange, mentionOnChange]);
  const skillHighlights = reactExports.useMemo(() => {
    if (!enableSlashCommands) return [];
    if (!input) return [];
    const skillsToScan = Array.from(
      new Map(
        [selectedSkill, directSelectedSkill, ...slashAllSkills]
          .filter((skill) => skill !== null)
          .map((skill) => [skill.name, skill]),
      ).values(),
    );
    if (!skillsToScan.length) return [];
    const ranges = [];
    for (const skill of skillsToScan) {
      const slashCommandText = `/${skill.name}`;
      let searchPosition = 0;
      while (searchPosition <= input.length - slashCommandText.length) {
        const matchIndex = input.indexOf(slashCommandText, searchPosition);
        if (matchIndex === -1) break;
        const endPos = matchIndex + slashCommandText.length;
        if (
          endPos === input.length ||
          input[endPos] === " " ||
          input[endPos] === "/"
        ) {
          ranges.push({
            start: matchIndex,
            end: endPos,
          });
        }
        searchPosition = matchIndex + 1;
      }
    }
    return ranges.sort((leftRange, rightRange) => leftRange.start - rightRange.start);
  }, [
    enableSlashCommands,
    input,
    slashAllSkills,
    selectedSkill,
    directSelectedSkill,
  ]);
  const parseInputToDocContent = reactExports.useCallback(
    (text) =>
      buildDocContentFromInput(text, {
        mentionModels: mentionModels ?? [],
        workflows: localComfyUiWorkflows,
        connectors: mentionConnectors,
        cachedFiles: mentionFileRef.current,
        scopedGatewayUrl,
      }),
    [mentionModels, localComfyUiWorkflows, mentionConnectors, scopedGatewayUrl],
  );
  parseInputRef.current = parseInputToDocContent;
  const allHighlights = reactExports.useMemo(
    () =>
      skillHighlights
        .map((range) => ({
          ...range,
          kind: "skill",
        }))
        .sort((leftRange, rightRange) => leftRange.start - rightRange.start),
    [skillHighlights],
  );
  reactExports.useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(
      editor.state.tr.setMeta(highlightPluginKey, allHighlights),
    );
  }, [editor, allHighlights]);
  reactExports.useEffect(() => {
    if (!editor) return;
    ghostTextRef.current = ghostText ?? null;
    editor.view.dispatch(
      editor.state.tr.setMeta(ghostTextPluginKey, ghostText ?? null),
    );
  }, [editor, ghostText]);
  reactExports.useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;
    const findChip = (target) => {
      if (!(target instanceof Element)) return null;
      return target.closest(".hl-mention-file[data-mention-name]");
    };
    const handleOver = (event) => {
      const chip = findChip(event.target);
      if (!chip) return;
      const mentionName = chip.getAttribute("data-mention-name");
      if (!mentionName) return;
      const kind = chip.getAttribute("data-mention-kind") ?? "other";
      if (kind === "asset") return;
      const isMedia = kind === "image" || kind === "video" || kind === "audio";
      if (!isMedia) return;
      const rect = chip.getBoundingClientRect();
      setMentionPreview({
        anchorElement: chip,
        anchorRect: rect,
        name: mentionName,
        kind,
        url: chip.getAttribute("data-mention-preview-url"),
        mediaUrl: chip.getAttribute("data-mention-media-url"),
      });
    };
    const handleOut = (event) => {
      const chip = findChip(event.target);
      if (!chip) return;
      const related = event.relatedTarget;
      if (related instanceof Node && chip.contains(related)) return;
      setMentionPreview(null);
    };
    wrapper.addEventListener("mouseover", handleOver);
    wrapper.addEventListener("mouseout", handleOut);
    return () => {
      wrapper.removeEventListener("mouseover", handleOver);
      wrapper.removeEventListener("mouseout", handleOut);
    };
  }, []);
  reactExports.useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;
    const handleClick = (event) => {
      if (!(event.target instanceof Element)) return;
      const chip = event.target.closest(
        '[data-mention-folder="1"][data-folder-id]',
      );
      if (!chip) return;
      event.preventDefault();
      event.stopPropagation();
      const folderId = chip.getAttribute("data-folder-id");
      if (!folderId) return;
      const currentPath = chip.getAttribute("title");
      onFolderChipClickRef.current?.({
        folderId,
        currentPath: currentPath ?? null,
      });
    };
    wrapper.addEventListener("click", handleClick);
    return () => wrapper.removeEventListener("click", handleClick);
  }, []);
  reactExports.useEffect(() => {
    const hasPendingAttachments =
      pendingAttachments !== void 0 && pendingAttachments !== null;
    const hasPendingInput = Boolean(pendingInput || pendingEditorDoc);
    if (hasPendingInput && !editor) return;
    let attachmentsApplied = false;
    if (!hasPendingAttachments) {
      appliedPendingAttachmentsRef.current = null;
      blockedPendingAttachmentsRef.current = null;
    } else if (appliedPendingAttachmentsRef.current !== pendingAttachments) {
      if (
        blockedPendingAttachmentsRef.current?.attachments ===
          pendingAttachments &&
        blockedPendingAttachmentsRef.current.ownershipKey ===
          attachmentOwnershipKey
      ) {
        return;
      }
      if (replaceAttachments(pendingAttachments) === false) {
        blockedPendingAttachmentsRef.current = {
          attachments: pendingAttachments,
          ownershipKey: attachmentOwnershipKey,
        };
        return;
      }
      blockedPendingAttachmentsRef.current = null;
      appliedPendingAttachmentsRef.current = pendingAttachments;
      attachmentsApplied = true;
      for (const attachment of pendingAttachments) {
        if (!attachment.relativePath) continue;
        const path = attachment.relativePath;
        mentionFileRef.current.set(path, {
          name: attachment.filename,
          path,
          kind: mentionKindFromFileType(attachment.fileType, path),
        });
      }
    }
    const inputPairAttachments = hasPendingAttachments
      ? pendingAttachments
      : null;
    const inputAlreadyApplied =
      hasPendingInput &&
      appliedPendingInputRef.current?.input === pendingInput &&
      appliedPendingInputRef.current?.editorDoc === pendingEditorDoc &&
      appliedPendingInputRef.current?.attachments === inputPairAttachments;
    let inputApplied = false;
    if (hasPendingInput && editor && !inputAlreadyApplied) {
      const draftText = pendingInput ?? "";
      const restored = restoreMentionDraft(
        editor.schema,
        pendingEditorDoc,
        draftText,
        (attrs) => {
          if (
            ["model", "connector", "asset"].includes(attrs.kind) ||
            attrs.isFolder
          )
            return attrs;
          return {
            ...attrs,
            ...buildFileMentionAttrs(
              {
                path: attrs.path,
                name: attrs.name,
                kind: attrs.kind,
              },
              scopedGatewayUrl,
            ),
          };
        },
      );
      editor.commands.setContent(restored ?? parseInputRef.current(draftText), {
        emitUpdate: false,
        parseOptions: {
          preserveWhitespace: "full",
        },
      });
      suppressSyncRef.current = true;
      setInput(draftText);
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
      appliedPendingInputRef.current = {
        input: pendingInput,
        editorDoc: pendingEditorDoc,
        attachments: inputPairAttachments,
      };
      inputApplied = true;
    } else if (!hasPendingInput) {
      appliedPendingInputRef.current = null;
    }
    if (attachmentsApplied) onPendingAttachmentsConsumed?.();
    if (inputApplied) onPendingInputConsumed?.();
  }, [
    attachmentOwnershipKey,
    editor,
    onPendingAttachmentsConsumed,
    onPendingInputConsumed,
    pendingAttachments,
    pendingInput,
    pendingEditorDoc,
    scopedGatewayUrl,
    replaceAttachments,
  ]);
  const prevModelsCountRef = reactExports.useRef(mentionModels?.length ?? 0);
  reactExports.useEffect(() => {
    const count = mentionModels?.length ?? 0;
    const justLoaded = prevModelsCountRef.current === 0 && count > 0;
    prevModelsCountRef.current = count;
    if (!justLoaded || !editor || !input.includes("@model:")) return;
    let needsModelRepair = false;
    editor.state.doc.descendants((node) => {
      if (
        node.type.name === "mentionRef" &&
        node.attrs.kind !== "model" &&
        String(node.attrs.path).startsWith("model:")
      )
        needsModelRepair = true;
    });
    if (!needsModelRepair || getDocText(editor.state.doc) !== input) return;
    suppressSyncRef.current = true;
    editor.commands.setContent(parseInputRef.current(input), {
      emitUpdate: false,
      parseOptions: {
        preserveWhitespace: "full",
      },
    });
    queueMicrotask(() => {
      suppressSyncRef.current = false;
    });
  }, [mentionModels, editor, input]);
  reactExports.useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus();
    }
  }, [autoFocus, editor]);
  const selectSkillByName = reactExports.useCallback(
    (skillName) => {
      const skill = slashAllSkills.find((skill) => skill.name === skillName);
      if (skill) {
        selectSkill(skill);
        editor?.commands.focus();
      }
    },
    [slashAllSkills, selectSkill, editor],
  );
  const selectSkillDirect = reactExports.useCallback(
    (skill, prompt) => {
      setDirectSelectedSkill(skill);
      const nextInput = selectSkill(
        skill,
        pageContext === "home" ? "home_input_slash" : "project_sidebar_select",
        prompt,
      );
      editor?.commands.focus();
      return nextInput;
    },
    [pageContext, selectSkill, editor],
  );
  const setInputText = reactExports.useCallback(
    (text) => {
      setInput(text);
      editor?.commands.focus();
    },
    [editor],
  );
  const setEditorSegments = reactExports.useCallback(
    (segments, options) => {
      if (!editor) return;
      suppressSyncRef.current = true;
      const content = [];
      for (const segment of segments) {
        if (segment.type === "text") {
          if (segment.text)
            content.push({
              type: "text",
              text: segment.text,
            });
        } else {
          content.push({
            type: "mentionRef",
            attrs: segment.attrs,
          });
        }
      }
      const chain = editor.chain().setContent(
        {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content,
            },
          ],
        },
        {
          emitUpdate: false,
        },
      );
      if (options?.focus === false) {
        chain.run();
      } else {
        chain.focus("end").run();
      }
      const text = getDocText(editor.state.doc);
      setInput(text);
      if (options?.notifyInputChange !== false)
        onInputChangeRef.current?.(text, editor.getJSON());
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
    },
    [editor],
  );
  const selectConnectorDirect = reactExports.useCallback(
    (connector, prompt) => {
      const nextInput = `${connectorMentionToken(connector.connectorId ?? connector.serverName, connector.displayName)}${prompt ? ` ${prompt}` : " "}`;
      setEditorSegments(
        [
          {
            type: "mentionRef",
            attrs: {
              path: connector.connectorId ?? connector.serverName,
              name: connector.displayName,
              modelName: null,
              mentionName: null,
              kind: "connector",
              mediaType: null,
              thumbUrl: connector.iconUrl,
              previewUrl: null,
              mediaUrl: null,
            },
          },
          ...(prompt
            ? [
                {
                  type: "text",
                  text: ` ${prompt}`,
                },
              ]
            : []),
        ],
        {
          focus: true,
        },
      );
      return nextInput;
    },
    [setEditorSegments],
  );
  const resetInput = reactExports.useCallback(() => {
    if (!mountedRef.current || editor?.isDestroyed) return;
    suppressSyncRef.current = true;
    try {
      editor?.commands.clearContent();
      setInput("");
      slashSetGhostText(null);
    } finally {
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
    }
  }, [editor, slashSetGhostText]);
  const resolveFolderChip = reactExports.useCallback(
    (folderId, absPath) => {
      if (!editor) return;
      const base = folderBaseName(absPath);
      let transaction = editor.state.tr;
      let hasMatchingFolder = false;
      editor.state.doc.descendants((node, nodePosition) => {
        if (node.type.name !== "mentionRef") return;
        const attrs = node.attrs;
        if (!attrs.isFolder || attrs.folderId !== folderId) return;
        transaction = transaction.setNodeMarkup(nodePosition, void 0, {
          ...attrs,
          name: base,
          path: absPath,
          folderResolvedPath: absPath,
        });
        hasMatchingFolder = true;
      });
      if (!hasMatchingFolder || !transaction.docChanged) return;
      suppressSyncRef.current = true;
      editor.view.dispatch(transaction);
      const text = getDocText(editor.state.doc);
      setInput(text);
      onInputChangeRef.current?.(text, editor.getJSON());
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
    },
    [editor],
  );
  const reset = reactExports.useCallback(() => {
    if (!mountedRef.current) return;
    resetInput();
    onInputChangeRef.current?.("");
    clear();
    selectedAssetEntityIdsRef.current = [];
  }, [resetInput, clear]);
  reactExports.useImperativeHandle(
    forwardedRef,
    () => ({
      submit: () => submitRef.current(),
      addFromAssetPath: (...args) => {
        return !sendInFlightRef.current && addFromAssetPath(...args);
      },
      renameAttachment: (...args) => {
        if (!sendInFlightRef.current) renameAttachment(...args);
      },
      addFromLocal: (...args) => {
        if (!sendInFlightRef.current) addFromLocal(...args);
      },
      addFromPluginNode: (...args) => {
        if (!sendInFlightRef.current) addFromPluginNode(...args);
      },
      addFromEntity: (...args) => {
        if (!sendInFlightRef.current) addFromEntity(...args);
      },
      setInputText: (...args) => {
        if (!sendInFlightRef.current) setInputText(...args);
      },
      setEditorSegments: (...args) => {
        if (!sendInFlightRef.current) setEditorSegments(...args);
      },
      resolveFolderChip: (...args) => {
        if (!sendInFlightRef.current) resolveFolderChip(...args);
      },
      selectSkillByName: (...args) => {
        if (!sendInFlightRef.current) selectSkillByName(...args);
      },
      selectSkillDirect: (...args) => {
        if (sendInFlightRef.current) return "";
        return selectSkillDirect(...args);
      },
      selectConnectorDirect: (...args) => {
        if (sendInFlightRef.current) return "";
        return selectConnectorDirect(...args);
      },
      isSelectSkillPending: slashIsSelectSkillPending,
      setGhostText: (...args) => {
        if (!sendInFlightRef.current) slashSetGhostText(...args);
      },
      focus: () => editor?.commands.focus(),
      resetInput: () => {
        if (sendInFlightRef.current) {
          deferredResetRef.current ??= "input";
        } else {
          resetInput();
        }
      },
      reset: () => {
        if (sendInFlightRef.current) {
          deferredResetRef.current = "all";
        } else {
          reset();
        }
      },
      clearAttachments: (...args) => {
        if (!sendInFlightRef.current) clear(...args);
      },
      replaceSourceAttachmentPlaceholders: (...args) => {
        if (!sendInFlightRef.current)
          replaceSourceAttachmentPlaceholders(...args);
      },
      prepareSourceAttachmentReplacement: (...args) => {
        if (sendInFlightRef.current)
          return Promise.resolve({
            status: "upload-failed",
          });
        return prepareSourceAttachmentReplacement(...args);
      },
      commitPreparedSourceAttachments: (...args) =>
        !sendInFlightRef.current && commitPreparedSourceAttachments(...args),
      rollbackPreparedSourceAttachments,
      handleFileDrop: dragHandlers.onDrop,
    }),
    [
      addFromAssetPath,
      renameAttachment,
      addFromLocal,
      addFromPluginNode,
      addFromEntity,
      setInputText,
      setEditorSegments,
      resolveFolderChip,
      selectSkillByName,
      selectSkillDirect,
      selectConnectorDirect,
      slashIsSelectSkillPending,
      slashSetGhostText,
      resetInput,
      reset,
      clear,
      replaceSourceAttachmentPlaceholders,
      prepareSourceAttachmentReplacement,
      commitPreparedSourceAttachments,
      rollbackPreparedSourceAttachments,
      dragHandlers.onDrop,
      editor,
    ],
  );
  const handleSend = reactExports.useCallback(async () => {
    if (!mountedRef.current || editor?.isDestroyed) return false;
    if (guard && !guard()) return false;
    const editorDocSnapshot = editor?.state.doc;
    const text = editorDocSnapshot
      ? getDocWireText(editorDocSnapshot).trim()
      : input.trim();
    if (!text && !hasReadyAttachments && !allowEmptySend) return false;
    if (
      sendInFlightRef.current ||
      busy ||
      sendDisabled ||
      uploading ||
      annotationOpen
    )
      return false;
    if (sendGuard && !sendGuard()) return false;
    const entityIds = new Set();
    editorDocSnapshot?.descendants((node) => {
      if (
        node.type.name === "mentionRef" &&
        node.attrs.kind === "asset" &&
        typeof node.attrs.path === "string" &&
        node.attrs.path.startsWith("asset:")
      ) {
        entityIds.add(node.attrs.path.slice("asset:".length));
      }
    });
    const entityRefsSnapshot = entityIds.size > 0 ? [...entityIds] : void 0;
    sendInFlightRef.current = true;
    sendTransactionGenerationRef.current += 1;
    sendPhaseRef.current = "committing";
    deferredResetRef.current = null;
    setSendPreparing(true);
    let accepted = false;
    let phase = "preparing";
    const logFailure = (error, failurePhase) => {
      const cleanupFailure = accepted || failurePhase === "settling";
      const frames =
        error instanceof Error ? error.stack?.split("\n").slice(1, 4) : void 0;
      chatLog[cleanupFailure ? "warn" : "error"](
        cleanupFailure
          ? "message-input send cleanup failed"
          : "message-input send failed",
        {
          phase: failurePhase,
          accepted,
          mounted: mountedRef.current,
          editor_destroyed: editor?.isDestroyed ?? true,
          error,
          error_name: error instanceof Error ? error.name : typeof error,
          // Each frame has its own field so persistent-log's value limit
          // preserves the useful call sites without logging the prompt.
          stack_frame_1: frames?.[0]?.trim(),
          stack_frame_2: frames?.[1]?.trim(),
          stack_frame_3: frames?.[2]?.trim(),
        },
      );
    };
    try {
      messageHistoryController.reset();
      onSendPreparingChange?.(true);
      phase = "committing";
      const {
        filePaths,
        canvasNodeAttachments,
        pluginNodeAttachments,
        committed,
        commitOperationIds,
        attachmentRefs,
      } = await commitFiles();
      if (!mountedRef.current || editor?.isDestroyed) return false;
      if (
        editorDocSnapshot &&
        (!editor || !editorDocSnapshot.eq(editor.state.doc))
      ) {
        throw new Error("composer changed while committing attachments");
      }
      remapCommittedMentionPaths(editor, committed, scopedGatewayUrl);
      const finalText = editor
        ? getDocWireText(editor.state.doc).trim()
        : text;
      const languageDetectionText = editor
        ? getDocLanguageDetectionText(editor.state.doc).trim()
        : finalText;
      sendPhaseRef.current = "dispatching";
      phase = "dispatching";
      const sendAccepted = await onSend(
        finalText,
        filePaths,
        canvasNodeAttachments,
        entityRefsSnapshot,
        pluginNodeAttachments,
        void 0,
        languageDetectionText,
        attachmentRefs,
      );
      if (sendAccepted === false) return false;
      accepted = true;
      phase = "cleanup";
      void finalizeCommit(commitOperationIds).catch((error) => {
        logFailure(error, "finalizing");
      });
      const pendingReset = deferredResetRef.current;
      deferredResetRef.current = null;
      if (!mountedRef.current) return true;
      if (clearOnSend || pendingReset === "all") {
        reset();
        scheduleEditorFocus(editor);
      } else if (pendingReset === "input") {
        resetInput();
      }
      return true;
    } catch (error) {
      logFailure(error, phase);
      if (accepted) return true;
      dedupedToast.error(
        error instanceof UploadCommitUnsupportedFilesystemError
          ? translate("chat.uploadCommitUnsupportedFilesystem")
          : translate("chat.sendFailed"),
      );
      return false;
    } finally {
      sendPhaseRef.current = "idle";
      deferredResetRef.current = null;
      sendInFlightRef.current = false;
      if (mountedRef.current) {
        setSendPreparing(false);
        try {
          onSendPreparingChange?.(false);
        } catch (error) {
          logFailure(error, "settling");
        }
      }
    }
  }, [
    guard,
    sendGuard,
    input,
    editor,
    scopedGatewayUrl,
    busy,
    sendDisabled,
    allowEmptySend,
    uploading,
    annotationOpen,
    hasReadyAttachments,
    messageHistoryController,
    commitFiles,
    finalizeCommit,
    onSend,
    onSendPreparingChange,
    clearOnSend,
    reset,
    resetInput,
    translate,
  ]);
  submitRef.current = handleSend;
  const loadHistoryMessage = reactExports.useCallback(
    (message, cursorTo) => {
      clear();
      const historyAttachments = attachmentsFromHistory(
        message.type === "text" ? message.attachments : void 0,
      );
      for (const attachment of historyAttachments) {
        mentionFileRef.current.set(attachment.path, {
          name: attachment.filename,
          path: attachment.path,
          kind: mentionKindFromPath(attachment.path),
        });
      }
      editor?.commands.setContent(parseInputRef.current(message.content), {
        parseOptions: {
          preserveWhitespace: "full",
        },
      });
      suppressSyncRef.current = true;
      setInput(message.content);
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
      for (const attachment of historyAttachments) {
        addFromAssetPath(attachment.path, attachment.filename, void 0, attachment.attachmentId);
      }
      scheduleEditorFocus(editor, cursorTo === "start" ? "start" : "end");
    },
    [clear, addFromAssetPath, editor],
  );
  reactExports.useEffect(() => {
    pmKeyHandlerRef.current = (event) => {
      const keyboardEvent = event;
      if (
        mentionVisible &&
        inlineAssetTopRef.current &&
        (keyboardEvent.key === "Enter" || keyboardEvent.key === "Tab") &&
        !keyboardEvent.shiftKey
      ) {
        keyboardEvent.preventDefault();
        handleSelectAssetMention(inlineAssetTopRef.current);
        return true;
      }
      if (mentionOnKeyDown(keyboardEvent)) return true;
      if (enableSlashCommands && slashOnKeyDown(keyboardEvent)) return true;
      if (
        event.key === "ArrowUp" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const cursorPosition = editor ? editor.state.selection.$anchor.pos - 1 : 0;
        if (cursorPosition === 0) {
          const currentPaths = attachments
            .filter((attachment) => attachment.status === "done" && attachment.relativePath)
            .map((attachment) => attachment.relativePath);
          const historyMessage = messageHistoryController.navigateUp(input, currentPaths);
          if (historyMessage) {
            event.preventDefault();
            loadHistoryMessage(historyMessage, "start");
            return true;
          }
        }
        return false;
      }
      if (
        event.key === "ArrowDown" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        messageHistoryController.isActive
      ) {
        const cursorPosition = editor
          ? pmPosToTextOffset(
              editor.state.doc,
              editor.state.selection.$anchor.pos,
            )
          : 0;
        if (cursorPosition >= input.length) {
          event.preventDefault();
          const historyNavigationResult = messageHistoryController.navigateDown();
          if (historyNavigationResult) {
            if (historyNavigationResult.type === "history") {
              loadHistoryMessage(historyNavigationResult.message, "end");
            } else {
              clear();
              setInput(historyNavigationResult.text);
              for (const attachmentPath of historyNavigationResult.attachmentPaths) {
                addFromAssetPath(attachmentPath, filenameFromPath(attachmentPath));
              }
            }
          }
          return true;
        }
        return false;
      }
      const isImeConfirmation = event.isComposing || event.keyCode === 229;
      const isPlainEnter =
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isImeConfirmation;
      if (isPlainEnter && onPlainEnter) {
        event.preventDefault();
        onPlainEnter(event);
        return true;
      }
      if (
        submitOnEnter &&
        event.key === "Enter" &&
        !event.shiftKey &&
        !isImeConfirmation
      ) {
        event.preventDefault();
        handleSend();
        return true;
      }
      return false;
    };
  }, [
    mentionOnKeyDown,
    slashOnKeyDown,
    editor,
    input,
    attachments,
    messageHistoryController,
    loadHistoryMessage,
    clear,
    addFromAssetPath,
    handleSend,
    mentionVisible,
    handleSelectAssetMention,
    enableSlashCommands,
    onPlainEnter,
    submitOnEnter,
  ]);
  const handlePaste = reactExports.useCallback(
    (clipboardEvent) => {
      attachPastedFiles(clipboardEvent);
    },
    [attachPastedFiles],
  );
  const guardedAddFromLocal = reactExports.useCallback(
    (files) => {
      if (sendInFlightRef.current || interactionLocked) return;
      if (guard && !guard()) return;
      addFromLocal(files);
    },
    [interactionLocked, guard, addFromLocal],
  );
  const guardedAddFromAssetPath = reactExports.useCallback(
    (relativePath, assetName, nodeId, attachmentId) => {
      if (sendInFlightRef.current || interactionLocked) return;
      if (guard && !guard()) return;
      addFromAssetPath(relativePath, assetName, nodeId, attachmentId);
    },
    [interactionLocked, guard, addFromAssetPath],
  );
  const { triggerMention, triggerSlash } = useComposerPlaceholderActions({
    sendInFlightRef,
    interactionLocked,
    enableSlashCommands,
    slashOpen,
    mentionOpen: mentionState.open,
    editor,
    openSlash: slashOpenPopover,
    closeSlash: slashClose,
    closeMention: mentionClose,
    openMention: mentionOpenPopover,
  });
  const attachmentPaths = reactExports.useMemo(
    () =>
      attachments.flatMap((item) =>
        item.relativePath ? [item.relativePath] : [],
      ),
    [attachments],
  );
  const remainingAttachments = Math.max(
    0,
    (attachmentMaxCount ?? MAX_ATTACHMENTS) - attachments.length,
  );
  const requestAssetSource = reactExports.useCallback(
    (anchor, onLocal) => {
      if (remainingAttachments <= 0) {
        dedupedToast.warning(
          translate("assetPicker.limitReached", "最多只能选 {{max}} 项", {
            max: attachmentMaxCount ?? MAX_ATTACHMENTS,
          }),
        );
        return;
      }
      const pick = attachmentSourcePicker?.current;
      if (!pick) {
        onLocal();
        return;
      }
      void pick(
        {
          multiple: true,
          maxCount: remainingAttachments,
          tabs: ["canvas"],
          uploadMode: "attach",
        },
        {
          anchor,
          appearance: "agent-chat",
          existingPaths: attachmentPaths,
          onLocal,
          accepts: (resource) =>
            fileMatchesAccept(
              {
                name: resource.name,
                type: "",
              },
              attachmentAccept,
            ),
        },
      )
        .then((resources) => {
          if (!resources) return;
          for (const resource of resources.slice(0, remainingAttachments)) {
            guardedAddFromAssetPath(
              resource.path,
              resource.name,
              resource.nodeId,
              resource.assetId,
            );
          }
        })
        .catch((error) => {
          if (error?.code !== "picker_busy")
            dedupedToast.error(translate("assetPicker.source.error"));
        });
    },
    [
      attachmentAccept,
      attachmentPaths,
      attachmentSourcePicker,
      guardedAddFromAssetPath,
      remainingAttachments,
      translate,
      attachmentMaxCount,
    ],
  );
  const toolbarCtx = reactExports.useMemo(
    () => ({
      addFromLocal: guardedAddFromLocal,
      addFromAssetPath: guardedAddFromAssetPath,
      requestAssetSource,
      attachmentAccept,
      attachmentPaths,
      remainingAttachments,
      uploading,
      interactionLocked,
      triggerSlash,
      skillTriggerRef,
    }),
    [
      guardedAddFromLocal,
      guardedAddFromAssetPath,
      requestAssetSource,
      attachmentPaths,
      remainingAttachments,
      attachmentAccept,
      uploading,
      interactionLocked,
      triggerSlash,
    ],
  );
  const handleSelectAttachment = reactExports.useCallback(
    (attachment) => {
      if (guard && !guard()) return;
      if (
        sendInFlightRef.current ||
        !editor ||
        interactionLocked ||
        attachment.status !== "done" ||
        !attachment.relativePath
      )
        return;
      const path = attachment.relativePath;
      const file = {
        path,
        name: attachment.filename,
        kind: mentionKindFromFileType(attachment.fileType, path),
      };
      mentionFileRef.current.set(path, file);
      const attrs = buildFileMentionAttrs(file, scopedGatewayUrl);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "mentionRef",
          attrs,
        })
        .run();
    },
    [interactionLocked, editor, guard, scopedGatewayUrl],
  );
  return (
    <div
      ref={inputRootRef}
      data-message-input-root="true"
      data-actions-compact={actionsCompact ? "true" : "false"}
      data-file-drop-scope={fileDropScope}
      className={`group/composer relative transition-colors ${isDragging ? "file-drop-active" : ""} ${className}`}
      {...(fileDropScope === "input" ? dragHandlers : {})}
    >
      {fileDropScope === "input" && isDragging && (
        <FileDropFeedback label={translate("chat.dropFilesHere")} />
      )}
      <AttachmentPreview
        active={previewActive}
        loadTextContent={loadPreviewText}
        attachments={attachments}
        onRemove={handleRemoveAttachment}
        onReplace={handleReplaceLocal}
        onRequestReplace={handleRequestReplacement}
        replacingIds={replacingIds}
        disabled={interactionLocked}
        onLocate={(attachment) =>
          attachment.relativePath
            ? attachmentLocator?.current?.(attachment.relativePath)
            : void 0
        }
        onAnnotate={handleOpenAnnotation}
        replacementAccept={replacementAccept}
        onSelect={handleSelectAttachment}
        hiddenSources={hideAttachmentSources}
        readOnlySources={readOnlyAttachmentSources}
      />
      {annotationTarget ? (
        <ImageAnnotationDialog
          key={annotationTarget.id}
          attachment={annotationTarget}
          canAppend={
            attachments.length < (attachmentMaxCount ?? MAX_ATTACHMENTS)
          }
          applyDisabled={baseInteractionLocked}
          onClose={() => setAnnotationTarget(null)}
          onApply={handleApplyAnnotation}
        />
      ) : null}
      <div data-message-input-composer-body="true" className="relative">
        {enableSlashCommands && (
          <SlashCommandPopover
            open={slashOpen && !mentionState.open}
            id={POPOVER_ID}
            skills={slashTabFiltered}
            allSkills={slashAllSkills}
            activeIndex={slashActiveIndex}
            onSelect={handleSelectSkill}
            onHover={slashSetActiveIndex}
            position={slashOpenedByButton ? slashPopoverPosition : "up"}
            displayMode={slashOpenedByButton ? "full" : "inline"}
            anchorRef={
              slashOpenedByButton && slashPopoverPosition === "down"
                ? inputRootRef
                : editorWrapperRef
            }
            triggerRef={skillTriggerRef}
            onClose={slashClose}
            onCreate={sendPreparing ? void 0 : onCreateSkill}
            onExplore={sendPreparing ? void 0 : onExploreSkills}
            searchable={slashOpenedByButton}
            searchQuery={slashOpenedByButton ? slashQuery : ""}
            onSearchChange={slashSetQuery}
            skillPopoverMode={skillPopoverMode}
          />
        )}
        {mentionVisible && (
          <MentionPopover
            id={MENTION_POPOVER_ID}
            items={mentionState.items}
            activeIndex={mentionState.activeIndex}
            loading={mentionState.loading}
            workflowLoading={localComfyUiWorkflowsLoading}
            truncated={mentionState.truncated}
            query={mentionState.query}
            fileKindFilter={mentionState.fileKindFilter}
            onFileKindFilterChange={mentionSetFileKindFilter}
            onSelect={handleSelectMention}
            onAssetSelect={handleSelectAssetMention}
            onInlineAssetTopChange={handleInlineAssetTopChange}
            hideAssetMention={hideAssetMention}
            showCurrentCanvasWorkflowTab={showCurrentCanvasWorkflowTab}
            onHover={mentionSetActiveIndex}
            position={slashPopoverPosition}
            anchorRef={
              slashPopoverPosition === "down" ? inputRootRef : editorWrapperRef
            }
            onClose={mentionClose}
          />
        )}
        <div
          ref={editorWrapperRef}
          className="relative message-input-editor grid grid-cols-1 px-2 pt-1 pb-2"
          onPaste={handlePaste}
        >
          {placeholderNode && !input && !agentRunning && (
            <div
              data-message-input-placeholder="true"
              className="col-start-1 row-start-1 min-w-0 z-2 text-[length:var(--message-input-editor-font-size)] font-normal text-muted-foreground/50 pointer-events-none"
            >
              {typeof placeholderNode === "function"
                ? placeholderNode({
                    triggerMention,
                    triggerSlash,
                  })
                : placeholderNode}
            </div>
          )}
          {placeholderNode && !input && agentRunning && showBusyPlaceholder && (
            <div
              data-message-input-placeholder="true"
              className="absolute top-1 left-2 right-2 z-2 text-[length:var(--message-input-editor-font-size)] font-normal text-muted-foreground/50 pointer-events-none"
            >
              {placeholderBusy ?? translate("chat.placeholderBusy")}
            </div>
          )}
          <EditorContent
            editor={editor}
            className="col-start-1 row-start-1 min-w-0"
          />
          {showCompactPromptPreview && input ? (
            <div
              aria-hidden="true"
              className="message-input-compact-preview"
              data-message-input-compact-preview="true"
            >
              {input}
            </div>
          ) : null}
        </div>
        {mentionPreview && (mentionPreview.mediaUrl || mentionPreview.url) && (
          <MediaHoverPreview
            kind={mentionPreview.kind}
            url={mentionPreview.mediaUrl ?? mentionPreview.url ?? ""}
            posterUrl={
              mentionPreview.kind === "video"
                ? (mentionPreview.url ?? void 0)
                : void 0
            }
            name={mentionPreview.name}
            anchorElement={mentionPreview.anchorElement}
            anchorRect={mentionPreview.anchorRect}
            testId="mention-hover-preview"
          />
        )}
        <ComposerActionsCompactProvider compact={actionsCompact}>
          <div
            ref={actionRowRef}
            data-composer-action-row="true"
            className="flex min-w-0 items-end justify-between gap-2"
          >
            <div
              ref={leftActionsRef}
              data-composer-actions-left="true"
              className="flex min-w-0 flex-1"
            >
              {toolbar(toolbarCtx)}
            </div>
            <div
              data-composer-actions-right="true"
              className="flex shrink-0 items-end gap-2"
            >
              {rightSlot}
              {!hideSubmitAction && showStopButton && (
                <button
                  type="button"
                  data-action-ui-id="message-stop-btn"
                  aria-label={translate("chat.stop")}
                  className={MESSAGE_ACTION_BUTTON_CLASS}
                  onClick={onCancel}
                >
                  <span className="block size-2.5 rounded-[1px] bg-current" />
                </button>
              )}
              {!hideSubmitAction && showSendButton && (
                <Tooltip disabled={!sendTooltip}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        data-action-ui-id="message-send-btn"
                        aria-label={sendLabel ?? translate("common.send")}
                        className={`${sendLabel ? MESSAGE_ACTION_LABEL_BUTTON_CLASS : MESSAGE_ACTION_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                        onClick={handleSend}
                        disabled={!canSend}
                      />
                    }
                  >
                    {sendLabel ? (
                      <>
                        <span className="group-data-[actions-compact=true]/composer:hidden">
                          {sendLabel}
                        </span>
                        <ArrowUp
                          size={16}
                          strokeWidth={2}
                          className="hidden group-data-[actions-compact=true]/composer:block"
                        />
                      </>
                    ) : (
                      <ArrowUp size={16} strokeWidth={2} />
                    )}
                  </TooltipTrigger>
                  {sendTooltip && (
                    <TooltipContent>{sendTooltip}</TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          </div>
        </ComposerActionsCompactProvider>
      </div>
      {footerSlot}
    </div>
  );
});
