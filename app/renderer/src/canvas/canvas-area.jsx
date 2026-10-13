// canvas-area.jsx
import { API_PATHS, browserAssetSourceMetadata, CanvasNodeType, FolderClosed, getRuntimeConfig, inferMediaKind, reactExports, useCurrentWorkspace, useGatewayScope, usePlatform, useTranslation } from "../vendor.js";
import { canvasLog, dedupedToast, logMediaLineage, useAssetMetadataApi, useScopedHttpClient } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  blobToDataUri,
  buildImageCopyPayload,
  computeEnhanceGridTarget,
  GATEWAY_NOT_READY_HTTP_CLIENT,
  mapPluginDataReadResult,
  measureMediaSize,
  pickCanvasNodeToolApplyDetails,
  pluginStorageHttpError,
  resizeImageBlob,
  resolveNodeSize,
  useNodeContextMenuState,
  usePluginEditorActiveChangeTracking,
  usePluginNavigate,
} from "./pick-canvas-node-tool-apply-details.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
import { useAccountSubmissionControls } from "../assets/gateway-scope-provider.jsx";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { createHtmlFullscreenStore } from "../infra/create-html-fullscreen-store.js";
import {
  HtmlFullscreenStoreProvider,
  setPluginMetas,
  usePluginMetadataStore,
} from "../infra/use-plugin-metadata-store.js";
import {
  stripErrorHtml,
  useModelRegistryApi,
} from "../infra/create-recently-added-store.js";
import {
  computeNodeSize,
  TABLE_CARD_DEFAULT_SIZE,
  TEXT_CARD_DEFAULT_SIZE,
} from "./compute-group-bounds-from-children.js";
import { FolderOpen } from "../media-editing/package.jsx";
import { pickUserMessage } from "../generation/normalize-skill-detail-metadata.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { usePricingConfig } from "./use-pricing-config.js";
import { pluginEvents } from "./resolve-workspace-failure-diagnosis.js";
import {
  useTopbarActions,
  useTopbarState,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { useWorkspaceFocusNavigation } from "../workspace/use-workspace-focus-navigation.js";
import {
  folderNameFromPath,
  useGatewayFetch,
  useGatewayUrl,
  useModelCatalogScopeKey,
  useTheme,
} from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceWSConnection } from "../settings/changelog-table.jsx";
import {
  CanvasLoadingState,
  subscribeAddEntityToCanvas,
  useSessionStore,
} from "../workspace/resolve-retry-message-payload.jsx";
import { useWorkspaceCanvasPersistence } from "../workspace/use-workspace-canvas-persistence.js";
import { fetchVideoStarterRefs } from "../workspace/read-bounded-blob.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { AssetPickerDialog } from "../assets/asset-picker-dialog.jsx";
import { getAssetMetaByNodeIdFromStore } from "./fullscreen-icon.jsx";
import {
  homeService,
  IClipboardService,
  instantiationService,
} from "../workspace/home-service.jsx";
import { ILogService } from "../settings/parse-custom-mcp-arguments.js";
import {
  uploadCanvasFileToCdn,
  uploadCanvasReferenceFile,
  useAttachmentLocator,
  useBrowserCanvasImport,
  usePreviewTextLoader,
} from "../text-editor/read-preview-text-response.jsx";
import { useMediaActions } from "../settings/use-media-actions.js";
import { useAssets } from "../settings/use-assets.js";
import {
  generateCopyName,
  getParentDir,
  joinFilePath,
} from "../assets/use-file-explorer-canvas-integration.js";
import { getFileName as uploadedFileName } from "./uploading-assets.jsx";
import { requestNodeRename } from "./use-inline-rename.jsx";
import { hiloMediaPlugin } from "./hilo-media-plugin.js";
import {
  HtableParseError,
  importHtableToCanvas,
  isHtableFileName,
  uploadResponseMediaResourceFields,
  useAssetMutator,
  useCanvasResourceResolvers,
  useImportExternalFiles,
  usePlaceholderAssetSource,
} from "../text-editor/use-placeholder-asset-source.jsx";
import { useCanvasReferenceBridge } from "../text-editor/use-project-asset-references.jsx";
import { useCanvasImageAnnotationHost } from "../text-editor/use-canvas-image-annotation-host.jsx";
import {
  trackAssetUse,
  useDropEntityToCanvas,
} from "../assets/use-materialized-entities.jsx";
import { isPluginAgentRegistered } from "../media-editing/input.jsx";
import { QuickZoomPresence } from "./canvas-high-blast-delete-dialog.jsx";
import { setCopiedSystemText } from "./remap-clipboard.js";
import {
  defaultNodeSizeForKind,
  newTablePath,
} from "./is-reexecutable-generation-node.js";
import {
  PLUGIN_DRAG_MIME,
  SKILL_DRAG_MIME,
  useCanvasSidebar,
} from "../workspace/workspace-asset-center-relocation-coach-mark.jsx";
import { getCanvasToastId } from "./resolve-canvas-focus-targets.js";
import { useGenerationLifecycleActions } from "./use-generation-lifecycle-actions.js";
import { useCanvasNodeErrorFeedback } from "./use-canvas-node-error-feedback.js";
import { usePluginDagBridge } from "./use-plugin-dag-bridge.js";
import { useAnchorProjectAssets } from "../assets/rename-local-node-dialog.jsx";
import { useMaterializeEntity } from "../assets/use-materialize-entity.js";
import { useHubClientConfig } from "../settings/parse-home-survey.js";
import {
  TrialGrantedPopup,
  useTrialGrantedPopup,
} from "../settings/trial-granted-popup.jsx";
import {
  compositeOutpaintCanvas,
  loadSourceAsPngBlob,
} from "./load-source-as-png-blob.js";
import {
  ALL_MEDIA_FILE_ACCEPT,
  buildAsrGatewayRequest,
} from "../text-editor/build-asr-gateway-request.js";
import { readEntityDragData } from "../assets/read-entity-drag-data.js";
import { ENTITY_DRAG_MIME } from "../infra/use-online.jsx";
import { CanvasHelpButton } from "../settings/canvas-help-button.jsx";
import {
  HiloCanvasView,
  normalizeCanvasNodeTool,
} from "../i18n/canvas-node-tools.jsx";
import { usePluginChatBridge } from "../media-editing/use-plugin-chat-bridge.js";
import { SaveToProjectAssetsDialog } from "../workspace/save-to-project-assets-dialog.jsx";
import {
  pickEditErrorMessage,
  useCanvasGenerationReconcile,
  useCanvasLastUsedModelParams,
  useCanvasModelRegistryHydration,
} from "../assets/use-canvas-model-registry-hydration.js";
import { useAssetPickerHost } from "../assets/use-asset-picker-host.js";
import {
  notifyFromPlugin,
  resolvePluginSourcePath,
  runAfterProjectAssetAnchor,
  savePluginFile,
  usePluginEditorOutputSelection,
} from "../assets/use-plugin-editor-output-selection.js";
import { useCanvasAssetPromotion } from "../assets/use-canvas-asset-promotion.jsx";
import { useComfyUiCanvasTracking } from "../assets/use-comfy-ui-canvas-tracking.js";
import { useCanvasQuickTags } from "../media-editing/use-canvas-quick-tags.jsx";
import {
  useHailuo03VideoSuperResolutionSubmit,
  useHailuo03VideoTrial,
} from "../media-editing/use-hailuo03-video-trial.js";
import { useHailuo03VideoTrialConsumptionRefresh } from "../media-editing/use-hailuo03-video-trial-consumption-refresh.js";
import { useImg2Image } from "../media-editing/use-img2-image.js";
import { useImg2Video } from "../media-editing/use-img2-video.js";
import { useTxt2Audio } from "../media-editing/use-txt2-audio.js";
import {
  asMediaType,
  CanvasHostToolbarButton,
  CanvasWatermarkChip,
  computeGridDropPositions,
  GroupCoachMark,
} from "../text-editor/canvas-host-toolbar-button.jsx";
import { CanvasWorkflowBridge } from "../text-editor/use-comfy-ui-workflow-bridge.jsx";
import { NodeContextMenu } from "../text-editor/node-context-menu.jsx";
import { buildComfyUiNodePriceDescription } from "../text-editor/collect-video-rows.js";
import { instantiatePluginOnCanvas } from "../text-editor/instantiate-plugin-on-canvas.js";
import { useTxt2Text } from "../text-editor/use-txt2-text.js";
export function CanvasArea({
  onCanvasTasksChange,
  onRenderableContentChange,
  assetPanelOpen = false,
  assetPanelControlsId,
  onToggleAssetPanel,
  isActive,
  isPresented,
  workspaceId,
  workspaceName,
  getTextEditCloseBlockReason,
  toolbarPlacement = "top-right",
  layoutRelocationKey,
}) {
  const { openTab } = useCanvasSidebar();
  const { t: translate, i18n } = useTranslation();
  const canvasSubmissionControls = useAccountSubmissionControls("canvas");
  const { resolved: resolvedTheme } = useTheme();
  const sessionStore = useSessionStore();
  const currentWorkspace = useCurrentWorkspace();
  const loadPreviewTextContent = usePreviewTextLoader();
  const canvasGenerationErrorToastId = getCanvasToastId(
    "generation-error",
    currentWorkspace,
  );
  const canvasLocateMissingToastId = getCanvasToastId(
    "locate-not-on-canvas",
    currentWorkspace,
  );
  const assetMetadataStore = useAssetMetadataApi();
  const [htmlFullscreenStore] = reactExports.useState(
    createHtmlFullscreenStore,
  );
  const htmlFullscreenApi = htmlFullscreenStore;
  reactExports.useEffect(() => {
    if (isActive !== false) return;
    const fullscreenNodeId = htmlFullscreenApi.getState().nodeId;
    if (fullscreenNodeId) htmlFullscreenApi.getState().exit(fullscreenNodeId);
  }, [htmlFullscreenApi, isActive]);
  reactExports.useEffect(() => {
    if (isActive === false) return;
    return sessionStore.onPluginEditorOpen(({ nodeId, initialMessage }) => {
      if (initialMessage) {
        workspaceEvents.queuePluginDispatchMessage(nodeId, initialMessage);
      }
      htmlFullscreenApi.getState().enter(nodeId);
    });
  }, [htmlFullscreenApi, isActive, sessionStore]);
  const modelRegistryStore = useModelRegistryApi();
  const platform = usePlatform();
  const clipboardService = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IClipboardService),
      ),
    [],
  );
  const logService = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(ILogService),
      ),
    [],
  );
  const pluginLogRateRef = reactExports.useRef(new Map());
  const { gatewayBinding, gatewayReady } = useGatewayScope();
  const accountCatalogScopeKey = useModelCatalogScopeKey();
  const canvasCatalogScopeKey = reactExports.useMemo(
    () =>
      JSON.stringify([
        accountCatalogScopeKey,
        workspaceId,
        gatewayBinding?.instanceId ?? "gateway-unbound",
        gatewayBinding?.generation ?? 0,
      ]),
    [
      accountCatalogScopeKey,
      gatewayBinding?.generation,
      gatewayBinding?.instanceId,
      workspaceId,
    ],
  );
  const gatewayFetch = useGatewayFetch();
  const { handleCancelGeneration, handleDismissUnknownGeneration } =
    useGenerationLifecycleActions({
      gatewayFetch,
      t: translate,
    });
  const importExternalToVault = useImportExternalFiles();
  const anchorProjectAssets = useAnchorProjectAssets();
  const gatewayUrl = useGatewayUrl();
  const dropEntityMutation = useDropEntityToCanvas();
  const materializeEntityMutation = useMaterializeEntity();
  const {
    assets: workspaceAssets,
    readContent: readAssetContent,
    remove: removeAsset,
  } = useAssets();
  const [assetSourceStatus, setAssetSourceStatus] =
    reactExports.useState("loading");
  const [canvasHelpOpen, setCanvasHelpOpen] = reactExports.useState(false);
  const { contextMenu, setContextMenu, closeNodeContextMenu } =
    useNodeContextMenuState(isActive);
  const canvasViewRef = reactExports.useRef(null);
  const quickTags = useCanvasQuickTags({
    canvasViewRef,
    closeNodeContextMenu,
    isActive,
    isPresented,
    toolbarPlacement,
    workspaceAssets,
    workspaceId,
    workspaceRoot: currentWorkspace ?? void 0,
  });
  const [saveToProjectAssets, setSaveToProjectAssets] =
    reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const uploadPositionRef = reactExports.useRef({
    x: 0,
    y: 0,
  });
  const groupCoachAnchorRef = reactExports.useRef(null);
  const {
    copyImage,
    copyFile,
    saveAs,
    saveManyAs,
    showInFolder,
    isImageExtension,
    getFileName,
  } = useMediaActions();
  const { data: pricingData } = usePricingConfig();
  const { videoStarterPresets } = useHubClientConfig();
  const {
    status: hailuo03VideoTrialStatus,
    claim: claimHailuo03VideoTrial,
    refresh: refreshHailuo03VideoTrial,
  } = useHailuo03VideoTrial();
  const nodeErrorFeedback = useCanvasNodeErrorFeedback();
  const { user } = useAuth();
  const trialGranted = useTrialGrantedPopup(user?.userID);
  const { currentWorkspaceId } = useTopbarState();
  const { activateWorkspace } = useTopbarActions();
  const isActiveRef = reactExports.useRef(isActive ?? false);
  isActiveRef.current = isActive ?? false;
  const {
    handleToolbarPromoteToAsset,
    promoteMenuActions,
    promotePopoverElement,
  } = useCanvasAssetPromotion({
    canvasViewRef,
    workspaceRoot: currentWorkspace ?? null,
    workspaceAssets,
    closeNodeContextMenu,
    openSaveToProjectAssets: setSaveToProjectAssets,
  });
  const { navigateAndFocusCanvas } = useWorkspaceFocusNavigation(
    currentWorkspaceId,
    activateWorkspace,
  );
  const handleNewNodesNavigate = reactExports.useCallback(
    (nodeIds) => {
      if (!workspaceId || nodeIds.length === 0) return;
      const firstId = nodeIds[0];
      navigateAndFocusCanvas(workspaceId, firstId);
    },
    [workspaceId, navigateAndFocusCanvas],
  );
  const handleCanvasTasksChange = useCanvasGenerationReconcile({
    onCanvasTasksChange,
  });
  reactExports.useEffect(() => {
    assetMetadataStore.getState().clear();
    modelRegistryStore.setState({
      image: [],
      video: [],
      audio: [],
    });
    return () => {
      assetMetadataStore.getState().clear();
      modelRegistryStore.setState({
        image: [],
        video: [],
        audio: [],
      });
    };
  }, [assetMetadataStore, modelRegistryStore]);
  const handleNodeContextMenu = reactExports.useCallback(
    (event, nodes, actions) => {
      const targets = nodes.map((node) => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        filePath: node.filePath,
        absolutePath:
          node.filePath && currentWorkspace
            ? joinFilePath(currentWorkspace, node.filePath)
            : node.filePath,
        fileType: node.fileType,
        title: node.title,
        width: node.width,
        height: node.height,
        isMultiImage: node.isMultiImage,
        isGenerating: node.isGenerating,
        generationErrorStatus: node.generationErrorStatus,
      }));
      const point = {
        x: event.clientX,
        y: event.clientY,
      };
      setContextMenu({
        ...point,
        targets,
        // Merge in the desktop-side save actions — canvas doesn't know about
        // the material library / project assets, so the right-click items
        // route through useCanvasAssetPromotion's menu actions.
        actions: {
          ...actions,
          ...promoteMenuActions(point),
        },
      });
    },
    [currentWorkspace, promoteMenuActions, setContextMenu],
  );
  const handleMenuCopy = reactExports.useCallback(
    (target) => {
      if (!target.absolutePath) return;
      const ext = target.absolutePath.split(".").pop()?.toLowerCase() ?? "";
      if (isImageExtension(ext)) {
        copyImage(target.absolutePath);
      } else {
        copyFile(target.absolutePath);
      }
    },
    [copyImage, copyFile, isImageExtension],
  );
  const handleMenuSaveAs = reactExports.useCallback(
    (target) => {
      if (!target.absolutePath) return;
      const fileName = getFileName(target.absolutePath);
      saveAs(target.absolutePath, fileName);
    },
    [saveAs, getFileName],
  );
  const handleMenuShowInFolder = reactExports.useCallback(
    (target) => {
      if (!target.absolutePath) return;
      showInFolder(target.absolutePath);
    },
    [showInFolder],
  );
  const handleMenuRename = reactExports.useCallback((target) => {
    requestNodeRename(target.nodeId);
  }, []);
  const handleNodeShowInFolder = reactExports.useCallback(
    (filePath) => {
      if (!filePath) return;
      const absolutePath = currentWorkspace
        ? joinFilePath(currentWorkspace, filePath)
        : filePath;
      showInFolder(absolutePath);
    },
    [currentWorkspace, showInFolder],
  );
  const handleNodeSaveAs = reactExports.useCallback(
    (filePath, fileName) => {
      if (!filePath) return;
      const absolutePath = currentWorkspace
        ? joinFilePath(currentWorkspace, filePath)
        : filePath;
      saveAs(absolutePath, fileName ?? getFileName(absolutePath));
    },
    [currentWorkspace, saveAs, getFileName],
  );
  const handleNodeSaveUrlAs = reactExports.useCallback(
    (url, fileName) => {
      if (!url) return;
      const resolvedUrl =
        url.startsWith("/files/") || url.startsWith("/api/")
          ? (gatewayUrl(url) ?? url)
          : url;
      saveAs(resolvedUrl, fileName ?? getFileName(resolvedUrl));
    },
    [gatewayUrl, saveAs, getFileName],
  );
  const resolveDownloadSource = reactExports.useCallback(
    (filePath) => {
      if (filePath.startsWith("/files/") || filePath.startsWith("/api/")) {
        return gatewayUrl(filePath) ?? filePath;
      }
      if (/^[a-z][a-z\d+.-]*:/i.test(filePath) || filePath.startsWith("/")) {
        return filePath;
      }
      return currentWorkspace
        ? joinFilePath(currentWorkspace, filePath)
        : filePath;
    },
    [currentWorkspace, gatewayUrl],
  );
  const handleNodeSaveManyAs = reactExports.useCallback(
    (files) => {
      const resolvedFiles = files
        .filter((file) => file.filePath)
        .map((file) => {
          const absolutePath = resolveDownloadSource(file.filePath);
          return {
            filePath: absolutePath,
            fileName: file.fileName ?? getFileName(absolutePath),
          };
        });
      saveManyAs(resolvedFiles);
    },
    [resolveDownloadSource, saveManyAs, getFileName],
  );
  const handleNodeCopyImage = reactExports.useCallback(
    (source) => {
      if (!source) return;
      copyImage(resolveDownloadSource(source));
    },
    [copyImage, resolveDownloadSource],
  );
  const handleMenuAddToChat = reactExports.useCallback(
    (targets) => {
      for (const target of targets) {
        if (!target.filePath) continue;
        const filename =
          target.fileType === "table"
            ? `${target.title || translate("canvas.table.untitled", "Untitled table")}.htable`
            : (target.filePath.split("/").pop() ?? target.filePath);
        workspaceEvents.fireAddToChat(target.filePath, filename, target.nodeId);
      }
    },
    [translate],
  );
  const handleAddToChatFromNode = reactExports.useCallback(
    (filePath, filename, nodeId) => {
      workspaceEvents.fireAddToChat(filePath, filename, nodeId);
    },
    [],
  );
  const handleAddPluginNodeToChat = reactExports.useCallback((args) => {
    workspaceEvents.fireAddPluginNodeToChat(args);
  }, []);
  const handleTextEditActiveChange = reactExports.useCallback(
    (session, active) => {
      if (!workspaceId) return;
      if (active) closeNodeContextMenu();
      workspaceEvents.fireTextEditActive(workspaceId, session, active);
      gatewayFetch("/api/canvas/text-edit-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: session.nodeId,
          editSessionId: session.editSessionId,
          active,
        }),
      }).catch((err) => {
        console.warn("[CanvasArea] text-edit-state sync failed:", err);
      });
    },
    [workspaceId, gatewayFetch, closeNodeContextMenu],
  );
  const trackPluginEditActiveChange = usePluginEditorActiveChangeTracking(
    workspaceId,
    closeNodeContextMenu,
  );
  const {
    handleActiveChange: handlePluginEditActiveChange,
    rememberOutput: rememberPluginOutput,
  } = usePluginEditorOutputSelection(
    trackPluginEditActiveChange,
    canvasViewRef,
  );
  const handleTextNodeRemoved = reactExports.useCallback(
    (nodeId) => {
      if (!workspaceId) return;
      workspaceEvents.fireTextNodeRemoved(workspaceId, nodeId);
    },
    [workspaceId],
  );
  const handleTextEditSelectionChange = reactExports.useCallback(
    (session, selection) => {
      if (!workspaceId) return;
      workspaceEvents.fireTextEditSelection(workspaceId, session, selection);
    },
    [workspaceId],
  );
  const handleAnnotationsChange = reactExports.useCallback(
    (session, annotations) => {
      if (!workspaceId) return;
      workspaceEvents.fireAnnotationsChanged(
        workspaceId,
        session,
        annotations,
      );
    },
    [workspaceId],
  );
  const handleAnnotationActivate = reactExports.useCallback(
    (session, id) => {
      if (!workspaceId) return;
      workspaceEvents.fireAnnotationActivated(workspaceId, session, id);
    },
    [workspaceId],
  );
  const subscribeAnnotationCommand = reactExports.useCallback(
    (session, cb) => {
      const subscription = workspaceEvents.onAnnotationCommand((commandEvent) => {
        if (
          commandEvent.workspaceId !== workspaceId ||
          commandEvent.nodeId !== session.nodeId ||
          commandEvent.editSessionId !== session.editSessionId
        ) {
          return;
        }
        cb(commandEvent.command);
      });
      return () => subscription.dispose();
    },
    [workspaceId],
  );
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await gatewayFetch("/api/plugins");
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        const list = data.plugins ?? [];
        setPluginMetas(
          list.map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            iconUrl: plugin.iconUrl,
            version: plugin.version,
            source: plugin.source,
            displayMode: plugin.displayMode,
            agent: plugin.agent,
          })),
        );
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [gatewayFetch]);
  const scopedHttpClient = useScopedHttpClient();
  const httpClient = scopedHttpClient ?? GATEWAY_NOT_READY_HTTP_CLIENT;
  const assetMutator = useAssetMutator(httpClient);
  const sessionStoreBridge = reactExports.useMemo(
    () => ({
      onFileChanged: (callback) => sessionStore.onFileChanged(callback),
      onCanvasUpdated: (callback) => sessionStore.onCanvasUpdated(callback),
      onAssetChanged: (callback) => sessionStore.onAssetChanged(callback),
      onCanvasFocus: (callback) => sessionStore.onCanvasFocus(callback),
      onCanvasNodeGenerating: (callback) =>
        sessionStore.onCanvasNodeGenerating(callback),
    }),
    [sessionStore],
  );
  const {
    dataSource,
    handlePersistenceControllerChange,
    handlePersistenceStatusChange,
  } = useWorkspaceCanvasPersistence({
    workspaceId,
    gatewayInstanceId: gatewayBinding?.instanceId,
    httpClient: scopedHttpClient,
    sessionStore: sessionStoreBridge,
  });
  const plugins = reactExports.useMemo(() => [hiloMediaPlugin], []);
  const handleHailuo03VideoTrialMaybeConsumed =
    useHailuo03VideoTrialConsumptionRefresh({
      sessionStore,
      status: hailuo03VideoTrialStatus,
      refresh: refreshHailuo03VideoTrial,
      t: translate,
    });
  const { handleImg2Video, listVideoModels } = useImg2Video({
    httpClient,
    catalogScopeKey: canvasCatalogScopeKey,
    hailuo03VideoTrialStatus,
    onHailuo03VideoTrialMaybeConsumed: handleHailuo03VideoTrialMaybeConsumed,
  });
  const { handleImg2Image, listImageModels } = useImg2Image({
    httpClient,
    catalogScopeKey: canvasCatalogScopeKey,
  });
  const {
    handleTxt2Audio,
    handleDesignVoice,
    fetchAudioModels,
    fetchTtsVoices,
  } = useTxt2Audio({
    httpClient,
    catalogScopeKey: canvasCatalogScopeKey,
  });
  const { handleTxt2Text, listTextModels } = useTxt2Text({
    httpClient,
    catalogScopeKey: canvasCatalogScopeKey,
  });
  const [retryGenerationNodeIds, setRetryGenerationNodeIds] =
    reactExports.useState(() => new Set());
  const retryGenerationNodeIdsRef = reactExports.useRef(new Set());
  const [cancelQueueNodeIds, setCancelQueueNodeIds] = reactExports.useState(
    () => new Set(),
  );
  const cancelQueueNodeIdsRef = reactExports.useRef(new Set());
  const setRetryGenerationPending = reactExports.useCallback(
    (nodeId, pending) => {
      const current = retryGenerationNodeIdsRef.current;
      if (current.has(nodeId) === pending) return;
      const next = new Set(current);
      if (pending) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      retryGenerationNodeIdsRef.current = next;
      setRetryGenerationNodeIds(next);
    },
    [],
  );
  const isRetryGenerationPending = reactExports.useCallback(
    (nodeId) => retryGenerationNodeIds.has(nodeId),
    [retryGenerationNodeIds],
  );
  const setCancelQueuePending = reactExports.useCallback((nodeId, pending) => {
    const current = cancelQueueNodeIdsRef.current;
    if (current.has(nodeId) === pending) return;
    const next = new Set(current);
    if (pending) {
      next.add(nodeId);
    } else {
      next.delete(nodeId);
    }
    cancelQueueNodeIdsRef.current = next;
    setCancelQueueNodeIds(next);
  }, []);
  const isCancelGenerationQueuePending = reactExports.useCallback(
    (nodeId) => cancelQueueNodeIds.has(nodeId),
    [cancelQueueNodeIds],
  );
  const handleCancelGenerationQueue = reactExports.useCallback(
    async (nodeId) => {
      if (cancelQueueNodeIdsRef.current.has(nodeId)) return;
      setCancelQueuePending(nodeId, true);
      const startedAt = Date.now();
      try {
        const resp = await gatewayFetch(API_PATHS.generationQueueCancel, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            node_id: nodeId,
          }),
          timeoutMs: 1e4,
        });
        if (!resp.ok) {
          throw new Error(`cancel queue failed: ${resp.status}`);
        }
        const result = await resp.json().catch(() => void 0);
        canvasLog.info("cancel-generation-queue submitted", {
          nodeId,
          elapsedMs: Date.now() - startedAt,
          status: resp.status,
          paused: result?.paused,
        });
        dedupedToast.success(translate("canvas.queueCancelSubmitted"));
      } catch (err) {
        canvasLog.error("cancel-generation-queue failed", {
          nodeId,
          elapsedMs: Date.now() - startedAt,
          online: navigator.onLine,
          errorName: err instanceof Error ? err.name : typeof err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : void 0,
          errorCause:
            err instanceof Error && err.cause ? String(err.cause) : void 0,
        });
        dedupedToast.error(translate("canvas.queueCancelFailed"));
      } finally {
        setCancelQueuePending(nodeId, false);
      }
    },
    [gatewayFetch, setCancelQueuePending, translate],
  );
  const handleRetryGeneration = reactExports.useCallback(
    async (nodeId, payload) => {
      if (retryGenerationNodeIdsRef.current.has(nodeId)) return;
      setRetryGenerationPending(nodeId, true);
      let result;
      try {
        if (payload.kind === "image") {
          result = await handleImg2Image(
            payload.sourceNodeId,
            payload.prompt,
            payload.modelId,
            payload.params,
            payload.imagePaths,
            nodeId,
            payload.count,
            payload.displayPrompt,
            void 0,
            payload.backend,
            payload.textPaths,
          );
        } else if (payload.kind === "video") {
          result = await handleImg2Video(
            payload.sourceNodeId,
            payload.prompt,
            payload.modelId,
            payload.params,
            payload.imagePaths,
            payload.videoPaths,
            payload.audioPaths,
            nodeId,
            payload.displayPrompt,
            payload.count,
            payload.newRound,
            payload.backend,
            payload.textPaths,
            {
              intent: "resume",
            },
          );
        } else if (payload.kind === "text") {
          result = await handleTxt2Text(
            payload.sourceNodeId,
            payload.prompt,
            payload.modelId,
            payload.params,
            payload.imagePaths,
            payload.textPaths,
            payload.videoPaths,
            payload.audioPaths,
          );
        } else {
          result = await handleTxt2Audio(
            payload.sourceNodeId,
            payload.prompt,
            payload.modelId,
            payload.params,
            nodeId,
            void 0,
            payload.backend,
            payload.imagePaths,
            payload.audioPaths,
            payload.textPaths,
          );
        }
        if (result.success) {
          dedupedToast.success(translate("canvas.retryGeneration.submitted"));
        }
      } catch (err) {
        console.error("[canvas] retry generation failed:", err);
        dedupedToast.error(translate("canvas.retryGeneration.failed"));
      } finally {
        setRetryGenerationPending(nodeId, false);
      }
    },
    [
      handleImg2Image,
      handleImg2Video,
      handleTxt2Text,
      handleTxt2Audio,
      setRetryGenerationPending,
      translate,
    ],
  );
  const { getLastUsedModelParams, saveLastUsedModelParams } =
    useCanvasLastUsedModelParams();
  const handleVoiceIsolation = reactExports.useCallback(
    async (nodeId, audioPath) => {
      try {
        const baseName =
          audioPath
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") ?? "audio";
        const res = await httpClient.voiceIsolation({
          audio_path: audioPath,
          filename: `${baseName}-isolated`,
          source_node_id: nodeId,
        });
        if (!res.ok) {
          dedupedToast.error(
            translate("canvas.voiceIsolate.error", {
              defaultValue: "Voice isolation failed",
            }),
          );
        }
      } catch (err) {
        console.error("[canvas] voice isolation failed:", err);
        dedupedToast.error(
          translate("canvas.voiceIsolate.error", {
            defaultValue: "Voice isolation failed",
          }),
        );
      }
    },
    [httpClient, translate],
  );
  useCanvasModelRegistryHydration({
    enabled: Boolean(scopedHttpClient) && gatewayReady,
    // a URL is not a listening gateway
    catalogScopeKey: canvasCatalogScopeKey,
    modelRegistryStore,
    listImageModels,
    listVideoModels,
    fetchAudioModels,
  });
  const handleSaveTextContent = reactExports.useCallback(
    async (filePath, content) => {
      await httpClient.writeContent(filePath, content);
    },
    [httpClient],
  );
  const handleDeleteTextFileIfEmpty = reactExports.useCallback(
    async (filePath) => {
      try {
        const content = await readAssetContent({
          path: filePath,
        });
        if (content.trim().length > 0) return;
        await removeAsset({
          paths: [filePath],
        });
      } catch (err) {
        console.warn("[CanvasArea] failed to delete empty text file:", err);
      }
    },
    [readAssetContent, removeAsset],
  );
  const handleRenameAsset = reactExports.useCallback(
    async (currentPath, newName) => {
      try {
        const res = await httpClient.rename({
          path: currentPath,
          new_name: newName,
        });
        const newPath = res.new_path;
        const newDisplayName = res.new_name ?? newName;
        assetMetadataStore.setState((state) => {
          const next = new Map(state.assets);
          for (const [key, meta] of next) {
            if (meta.path === currentPath) {
              next.set(key, {
                ...meta,
                path: newPath,
                name: newDisplayName,
              });
            }
          }
          return {
            assets: next,
          };
        });
        workspaceEvents.fireAssetRenamed(currentPath, newPath, newDisplayName);
        return res.new_path;
      } catch {
        dedupedToast.error(translate("canvas.renameFailed"));
        return null;
      }
    },
    [assetMetadataStore, httpClient, translate],
  );
  const handleForkAsset = reactExports.useCallback(
    async (sourcePath, newName) => {
      try {
        const res = await assetMutator.fork(
          {
            path: sourcePath,
            new_name: newName,
          },
          {
            timeoutMs: 3e5,
          },
        );
        const store = assetMetadataStore.getState();
        const sourceMeta = Array.from(store.assets.values()).find(
          (asset) => asset.path === sourcePath,
        );
        if (sourceMeta) {
          store.merge(res.new_id, {
            ...sourceMeta,
            type: res.type,
            url: httpClient.fileUrlById(res.new_id),
            name: res.new_name,
            path: res.new_path,
          });
        }
        return {
          id: res.new_id,
          path: res.new_path,
          name: res.new_name,
        };
      } catch {
        dedupedToast.error(translate("canvas.renameFailed"));
        return null;
      }
    },
    [assetMetadataStore, assetMutator, httpClient, translate],
  );
  const handleSplitSubImageToNode = reactExports.useCallback(
    async (nodeId, imageIds) => {
      try {
        const res = await gatewayFetch("/api/canvas/split-sub-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nodeId,
            imageIds,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          splitNodeIds: data.splitNodeIds ?? [],
        };
      } catch {
        return null;
      }
    },
    [gatewayFetch],
  );
  const directReferences = useCanvasReferenceBridge();
  const { handleLoadTextContent, handleResolveFileUrl, handleResolveThumbUrl } =
    useCanvasResourceResolvers(httpClient);
  const textVersionsBridge = reactExports.useMemo(
    () => ({
      list: (path) =>
        httpClient.listTextVersions({
          path,
        }),
      save: (req) => httpClient.saveTextVersion(req),
      readContent: (id, range) =>
        httpClient.readTextVersionContent(id, range),
      diff: (params) => httpClient.diffTextVersion(params),
      restore: (id, body) => httpClient.restoreTextVersion(id, body ?? {}),
      materializeToCanvas: async (id, opts) => {
        const created = await httpClient.materializeTextVersion(id);
        try {
          await httpClient.addCanvasNode({
            assetId: created.assetId,
            position: opts.position,
            ...(opts.sourceNodeId
              ? {
                  sourceNodeId: opts.sourceNodeId,
                }
              : {}),
          });
          sessionStore.notifyFileChanged();
        } catch (err) {
          console.error(
            "[canvas] addCanvasNode for materialized text version failed:",
            err,
          );
          return void 0;
        }
        return created;
      },
      summarize: (req) => httpClient.summarizeTextVersionNote(req),
      update: (id, patch) => httpClient.updateTextVersion(id, patch),
      remove: async (id) => {
        await httpClient.deleteTextVersion(id);
      },
    }),
    [httpClient, sessionStore],
  );
  const handleSaveTableContent = reactExports.useCallback(
    async (filePath, content) => {
      await httpClient.writeContent(filePath, content);
    },
    [httpClient],
  );
  const handleLoadTableContent = reactExports.useCallback(
    async (filePath) => {
      return await httpClient.readContent(filePath);
    },
    [httpClient],
  );
  const handleDuplicateTableAsset = reactExports.useCallback(
    async (filePath, currentTitle) => {
      const content = await httpClient.readContent(filePath);
      const res = await httpClient.writeContent(newTablePath(), content);
      const title = currentTitle
        ? generateCopyName(currentTitle, true)
        : void 0;
      return {
        tablePath: res.path,
        title,
      };
    },
    [httpClient],
  );
  const handleUploadAttachment = reactExports.useCallback(
    async (file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const kind = inferMediaKind(file.type, ext) ?? "image";
      const res = await assetMutator.upload(file, file.name, kind, {
        source: "attachment",
      });
      if (!res.id) throw new Error("Upload returned no asset id");
      const mediaFields = uploadResponseMediaResourceFields(
        res,
        assetMetadataStore.getState().get(res.id),
      );
      return {
        assetId: res.id,
        name: file.name,
        kind,
        path: res.relative,
        url: httpClient.fileUrlById(res.id),
        ...mediaFields,
      };
    },
    [assetMetadataStore, assetMutator, httpClient],
  );
  const handleDuplicateTextAsset = reactExports.useCallback(
    async (filePath) => {
      const content = await httpClient.readContent(filePath);
      const fileName = uploadedFileName(filePath);
      const parentDir = getParentDir(filePath);
      const desiredName = generateCopyName(fileName, false);
      const desiredPath = parentDir
        ? joinFilePath(parentDir, desiredName)
        : desiredName;
      const res = await assetMutator.writeText(desiredPath, content, {
        unique: true,
      });
      if (!res.assetId) {
        throw new Error(
          `Failed to create duplicated text asset for ${filePath}`,
        );
      }
      const finalName = uploadedFileName(res.path);
      return {
        assetId: res.assetId,
        url: httpClient.fileUrlById(res.assetId),
        name: finalName,
        path: res.path,
        type: "text",
      };
    },
    [assetMutator, httpClient],
  );
  const handleDuplicateFileAsset = reactExports.useCallback(
    async (filePath) => {
      const fileName = uploadedFileName(filePath);
      const desiredName = generateCopyName(fileName, false);
      const res = await assetMutator.fork(
        {
          path: filePath,
          new_name: desiredName,
        },
        {
          timeoutMs: 3e5,
        },
      );
      return {
        assetId: res.new_id,
        url: httpClient.fileUrlById(res.new_id),
        name: res.new_name,
        path: res.new_path,
        type: res.type,
      };
    },
    [assetMutator, httpClient],
  );
  const handleDuplicateAssetByPath = reactExports.useCallback(
    async (params) => {
      const baseWorkspace = params.sourceWorkspace ?? currentWorkspace;
      if (!baseWorkspace) {
        throw new Error(
          "duplicateAssetByPath: no source workspace to resolve against",
        );
      }
      const sourceAbsolutePath = joinFilePath(
        baseWorkspace,
        params.sourceRelativePath,
      );
      const resp = await gatewayFetch(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: [sourceAbsolutePath],
        }),
      });
      if (!resp.ok) {
        throw new Error(`importExternal failed: HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const imported = data.imported?.[0];
      if (!imported) {
        const reason = data.errors?.[0]?.error ?? "no imported entry";
        throw new Error(`importExternal returned no asset (${reason})`);
      }
      return {
        assetId: imported.id,
        url: httpClient.fileUrlById(imported.id),
        name: uploadedFileName(imported.path),
        path: imported.path,
        type: imported.type ?? params.expectedKind ?? "file",
        ...(typeof imported.width === "number"
          ? {
              width: imported.width,
            }
          : {}),
        ...(typeof imported.height === "number"
          ? {
              height: imported.height,
            }
          : {}),
        ...(typeof imported.durationMs === "number"
          ? {
              durationSec: imported.durationMs / 1e3,
            }
          : {}),
      };
    },
    [currentWorkspace, gatewayFetch, httpClient],
  );
  const handleGetCurrentWorkspace = reactExports.useCallback(
    () => currentWorkspace ?? void 0,
    [currentWorkspace],
  );
  const handleCropImage = reactExports.useCallback(
    async (sourceNodeId, blob, filename, position) => {
      const endSession = dataSource?.beginCanvasAddSession?.();
      try {
        const file = new File([blob], filename, {
          type: blob.type || "image/png",
        });
        const res = await assetMutator.upload(file, filename, "image", {
          source: "derived",
        });
        if (!res.id) return void 0;
        const { nodeId } = await httpClient.addCanvasNode({
          assetId: res.id,
          position,
          sourceNodeId,
        });
        return nodeId;
      } finally {
        endSession?.();
      }
    },
    [assetMutator, dataSource, httpClient],
  );
  const handleBatchCropAndUpscale = reactExports.useCallback(
    async (sourceNodeId, cells, multiplier, groupLabel) => {
      try {
        const groupResp = await gatewayFetch("/api/canvas/placeholder-group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceNodeId,
            cells: cells.map((cell) => ({
              // AddPlaceholderGroupDto marks prompt/model @IsNotEmpty — use the
              // tool name as the visible footer label (loading card shows it).
              prompt: "Super Resolution",
              model: "Super Resolution",
              ...(cell.aspectRatio
                ? {
                    aspectRatio: cell.aspectRatio,
                  }
                : {}),
            })),
            label: groupLabel,
            layout: "grid",
          }),
        });
        if (!groupResp.ok) {
          console.error(
            "[canvas] grid-split placeholder-group failed:",
            groupResp.status,
            groupResp.statusText,
          );
          dedupedToast.error(
            translate(
              "canvas.splitGrid.placeholderFailed",
              "占位节点创建失败，请重试",
            ),
          );
          return;
        }
        const { placeholderIds } = await groupResp.json();
        if (!placeholderIds || placeholderIds.length === 0) {
          dedupedToast.error(
            translate("canvas.splitGrid.noPlaceholders", "未能创建占位节点，请重试"),
          );
          return;
        }
        setTimeout(() => {
          canvasViewRef.current?.focusNodeIds(placeholderIds);
        }, 150);
        const results = await Promise.allSettled(
          cells.map(async (cell, index) => {
            const pid = placeholderIds[index];
            if (!pid) return;
            const plan = computeEnhanceGridTarget(
              cell.srcWidth,
              cell.srcHeight,
              multiplier,
            );
            if (!plan) {
              throw new Error(
                `grid-split cell has invalid dimensions: ${cell.filename}`,
              );
            }
            let uploadBlob = cell.blob;
            if (
              plan.prepWidth !== cell.srcWidth ||
              plan.prepHeight !== cell.srcHeight
            ) {
              const prepped = await resizeImageBlob(
                cell.blob,
                plan.prepWidth,
                plan.prepHeight,
              );
              if (!prepped) {
                throw new Error(
                  `grid-split cell pre-upscale failed: ${cell.filename}`,
                );
              }
              uploadBlob = prepped;
            }
            const file = new File([uploadBlob], cell.filename, {
              type: uploadBlob.type || "image/png",
            });
            const res = await assetMutator.upload(
              file,
              cell.filename,
              "image",
              {
                staging: true,
              },
            );
            if (!res.path) {
              throw new Error(
                `grid-split cell upload failed (no path) for ${cell.filename}`,
              );
            }
            try {
              await httpClient.enhanceImageMediaKit({
                image_path: res.path,
                source_node_id: sourceNodeId,
                filename: `${cell.filename.replace(/\.[^.]+$/, "")}-hd`,
                tool_version: "professional",
                target_width: plan.targetWidth,
                target_height: plan.targetHeight,
                placeholder_id: pid,
              });
            } finally {
              await assetMutator.deleteStaged([res.path]);
            }
          }),
        );
        let failedCount = 0;
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            failedCount++;
            console.error("[canvas] grid-split cell generation failed:", {
              cellIndex: index,
              reason: result.reason,
            });
          }
        });
        if (failedCount === 0) {
          return;
        }
        if (failedCount < cells.length) {
          dedupedToast.warning(
            translate("canvas.splitGrid.partialFail", "{{count}} 个宫格生成失败", {
              count: failedCount,
            }),
          );
        } else {
          dedupedToast.error(
            translate("canvas.splitGrid.batchFailed", "宫格高清组生成失败，请重试"),
          );
        }
      } catch (err) {
        console.error("[canvas] grid-split batch failed:", err);
        dedupedToast.error(
          translate("canvas.splitGrid.batchFailed", "宫格切分高清生成失败，请重试"),
        );
      }
    },
    [assetMutator, gatewayFetch, httpClient, translate],
  );
  const handleCropSplit = reactExports.useCallback(
    async (sourceNodeId, cells, groupLabel, options) => {
      try {
        const uploads = await Promise.allSettled(
          cells.map(async (cell) => {
            const file = new File([cell.blob], cell.filename, {
              type: cell.blob.type || "image/png",
            });
            const res = await assetMutator.upload(file, cell.filename, "image");
            if (!res.id)
              throw new Error(
                `crop-split cell upload failed (no id) for ${cell.filename}`,
              );
            return res.id;
          }),
        );
        const assetIds = uploads
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
        const failedUploads = uploads.length - assetIds.length;
        if (failedUploads > 0) {
          console.error(
            `[canvas] crop-split: ${failedUploads} cell upload(s) failed`,
          );
        }
        if (assetIds.length === 0) {
          dedupedToast.error(
            translate("canvas.splitGrid.noPlaceholders", "未能创建占位节点，请重试"),
          );
          return;
        }
        const resp = await gatewayFetch("/api/canvas/nodes-group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceNodeId,
            assetIds,
            label: groupLabel,
            layout: "grid",
          }),
        });
        if (!resp.ok) {
          console.error(
            "[canvas] crop-split nodes-group failed:",
            resp.status,
            resp.statusText,
          );
          dedupedToast.error(
            translate("canvas.splitGrid.batchFailed", "宫格高清组生成失败，请重试"),
          );
          return;
        }
        const { nodeIds } = await resp.json();
        if (options?.focusResult !== false && nodeIds && nodeIds.length > 0) {
          setTimeout(() => {
            canvasViewRef.current?.focusNodeIds(nodeIds);
          }, 150);
        }
      } catch (err) {
        console.error("[canvas] crop-split failed:", err);
        dedupedToast.error(
          translate("canvas.splitGrid.batchFailed", "宫格切分高清生成失败，请重试"),
        );
      }
    },
    [assetMutator, gatewayFetch, translate],
  );
  const handleExtractVideoAudio = reactExports.useCallback(
    async (nodeId, videoPath) => {
      try {
        const baseName =
          videoPath
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") ?? "audio";
        const res = await httpClient.extractAudio({
          video_path: videoPath,
          source_node_id: nodeId,
          filename: `${baseName}-audio`,
        });
        if (!res.ok) {
          dedupedToast.error(res.error || translate("canvas.extractAudio.error"));
          return;
        }
        if (res.warnings?.includes("silent_video_failed")) {
          dedupedToast.warning(translate("canvas.extractAudio.silentVideoFailed"));
        }
      } catch (err) {
        console.error("[canvas] extract audio failed:", err);
        dedupedToast.error(translate("canvas.extractAudio.error"));
      }
    },
    [httpClient, translate],
  );
  const handleRedraw = reactExports.useCallback(
    async (nodeId, sourceImagePath, params) => {
      try {
        const srcUrl = httpClient.fileUrl(sourceImagePath);
        const attachment = params.attachments[0];
        const [sourceImage, reference] = await Promise.all([
          loadSourceAsPngBlob(srcUrl),
          attachment
            ? loadSourceAsPngBlob(httpClient.fileUrlById(attachment.assetId), {
                background: "#ffffff",
              })
            : Promise.resolve(null),
        ]);
        const [markedDataUri, referenceDataUri] = await Promise.all([
          blobToDataUri(sourceImage),
          reference ? blobToDataUri(reference) : Promise.resolve(void 0),
        ]);
        await httpClient.redrawBanana({
          model: "seedream_5_pro",
          image_data_uri: markedDataUri,
          bbox: params.bbox,
          reference_image_data_uri: referenceDataUri,
          resolution: params.resolution,
          prompt: params.prompt,
          source_node_id: nodeId,
          filename: `redraw-${nodeId}`,
          // Gateway pins the snapped ratio when needed (nano: reference case;
          // seedream: always); forwarding unconditionally is harmless.
          aspect_ratio: params.aspectRatio,
        });
      } catch (err) {
        console.error("[canvas] redraw failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.redraw.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleOutpaint = reactExports.useCallback(
    async (nodeId, sourceImagePath, params) => {
      try {
        const srcUrl = httpClient.fileUrl(sourceImagePath);
        const composed = await compositeOutpaintCanvas(srcUrl, params);
        const imageDataUri = await blobToDataUri(composed);
        await httpClient.outpaintBanana({
          image_data_uri: imageDataUri,
          resolution: params.resolution,
          aspect_ratio: params.targetWidth / params.targetHeight,
          source_node_id: nodeId,
          filename: `outpaint-${nodeId}`,
        });
      } catch (err) {
        console.error("[canvas] outpaint failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.outpaint.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleErase = reactExports.useCallback(
    async (nodeId, sourceImagePath, params) => {
      try {
        const srcUrl = httpClient.fileUrl(sourceImagePath);
        const imageDataUri = await blobToDataUri(
          await loadSourceAsPngBlob(srcUrl),
        );
        await httpClient.eraseBanana({
          image_data_uri: imageDataUri,
          bboxes: params.bboxes,
          aspect_ratio: params.aspectRatio,
          resolution: params.resolution,
          source_node_id: nodeId,
          filename: `erase-${nodeId}`,
        });
      } catch (err) {
        console.error("[canvas] erase failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.erase.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleSuperResolution = reactExports.useCallback(
    async (nodeId, sourceImagePath, params) => {
      try {
        await httpClient.enhanceImageMediaKit({
          image_path: sourceImagePath,
          source_node_id: nodeId,
          filename: `sr-${nodeId}`,
          // The canvas HD picker is pinned to the professional tier and drives
          // the exact output size via target_width/height (derived from the
          // source aspect ratio), rather than a multiple factor.
          tool_version: "professional",
          ...(params?.targetWidth !== void 0
            ? {
                target_width: params.targetWidth,
              }
            : {}),
          ...(params?.targetHeight !== void 0
            ? {
                target_height: params.targetHeight,
              }
            : {}),
        });
      } catch (err) {
        console.error("[canvas] enhance-image failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.superResolution.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleEnhanceVideo = reactExports.useCallback(
    async (nodeId, sourceVideoPath, params) => {
      try {
        const resp = await httpClient.enhanceVideoMediaKit({
          video_path: sourceVideoPath,
          tool_version: "standard",
          scene: "common",
          resolution: params.resolution,
          fps: params.fps,
          source_node_id: nodeId,
          filename: `enhance-${nodeId}`,
        });
        if (!resp.ok) {
          dedupedToast.error(
            stripErrorHtml(
              pickUserMessage(
                resp,
                translate("canvas.enhanceVideo.error", "高清 & 补帧失败，请重试"),
              ),
            ),
            {
              id: canvasGenerationErrorToastId,
            },
          );
        }
      } catch (err) {
        console.error("[canvas] enhance-video failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(
            err,
            translate("canvas.enhanceVideo.error", "高清 & 补帧失败，请重试"),
          ),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleHailuo03VideoSuperResolution =
    useHailuo03VideoSuperResolutionSubmit({
      httpClient,
      canvasGenerationErrorToastId,
    });
  const handleEraseSubtitle = reactExports.useCallback(
    async (nodeId, sourceVideoPath, params) => {
      try {
        await httpClient.eraseSubtitleMediaKit({
          video_path: sourceVideoPath,
          source_node_id: nodeId,
          filename: `erase-subtitle-${nodeId}`,
          mode: params?.mode,
          regions: params?.regions,
        });
      } catch (err) {
        console.error("[canvas] erase-subtitle failed:", err);
        dedupedToast.error(
          translate("canvas.eraseSubtitle.error", "字幕消除失败，请重试"),
        );
      }
    },
    [httpClient, translate],
  );
  const handleAsr = reactExports.useCallback(
    async (nodeId, sourceVideoPath, language) => {
      const built = buildAsrGatewayRequest({
        mediaPath: sourceVideoPath,
        language,
        sourceNodeId: nodeId,
        filename: `asr-${nodeId}`,
      });
      if (!built.ok) {
        dedupedToast.error(translate("canvas.asr.error", "字幕生成失败，请重试"));
        return;
      }
      try {
        if (built.route === "whisper") {
          await httpClient.asrWhisper(built.request);
        } else {
          await httpClient.asrMediaKit(built.request);
        }
      } catch (err) {
        const errorKey =
          language === "other"
            ? "canvas.asr.error.whisper"
            : "canvas.asr.error";
        const fallback =
          language === "other"
            ? "其他语言识别失败，请重试"
            : "字幕生成失败，请重试";
        console.error("[canvas] asr failed:", err);
        dedupedToast.error(translate(errorKey, fallback));
      }
    },
    [httpClient, translate],
  );
  const handleRemoveBg = reactExports.useCallback(
    async (nodeId, sourceImagePath) => {
      try {
        await httpClient.removeBackground({
          image_path: sourceImagePath,
          source_node_id: nodeId,
          filename: `remove-bg-${nodeId}`,
        });
      } catch (err) {
        console.error("[canvas] remove-background failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.removeBg.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleLayerDecompose = reactExports.useCallback(
    async (nodeId, sourceImagePath, prompt) => {
      try {
        await httpClient.layerDecompose({
          image_path: sourceImagePath,
          prompt: prompt ?? "",
          source_node_id: nodeId,
          filename: `layer-decompose-${nodeId}`,
        });
      } catch (err) {
        console.error("[canvas] layer decomposition failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.layerDecompose.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const handleMoveObject = reactExports.useCallback(
    async (nodeId, sourceImagePath, params) => {
      try {
        const schematicDataUri = await blobToDataUri(params.schematic);
        const payload = {
          image_paths: [schematicDataUri, sourceImagePath],
          resolution: params.resolution,
          source_node_id: nodeId,
          filename: `move-${nodeId}`,
        };
        await httpClient.moveObjectBanana(payload);
      } catch (err) {
        console.error("[move-object] failed:", err);
        dedupedToast.error(
          pickEditErrorMessage(err, translate("canvas.moveObject.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, translate],
  );
  const runCanvasAddSession = reactExports.useCallback(
    async (fn) => {
      const endSession = dataSource?.beginCanvasAddSession?.();
      try {
        return await fn();
      } finally {
        endSession?.();
      }
    },
    [dataSource],
  );
  const handleApplyVideoStarterPreset = reactExports.useCallback(
    async ({
      videoNodeId,
      preset,
      videoNodePosition,
      videoNodeSize,
    }) => {
      await canvasViewRef.current?.flushPersistence().catch(() => void 0);
      const { files, failed } = await fetchVideoStarterRefs(preset.refs);
      if (failed.length > 0) {
        dedupedToast.error(
          translate("canvas.videoStarter.refDownloadFailed", {
            count: failed.length,
          }),
        );
      }
      if (files.length === 0)
        return {
          createdNodeIds: [],
        };
      const measured = await Promise.all(
        files.map(({ file }) => measureMediaSize(file)),
      );
      const sizes = files.map(({ file }, index) =>
        resolveNodeSize(file, measured[index]),
      );
      const GAP_X = 80;
      const GAP_Y = 40;
      const maxRefWidth = Math.max(...sizes.map((size) => size.width));
      const totalRefHeight =
        sizes.reduce((sum, size) => sum + size.height, 0) +
        GAP_Y * (sizes.length - 1);
      const referenceX = videoNodePosition.x - maxRefWidth - GAP_X;
      let referenceY =
        videoNodePosition.y +
        ((videoNodeSize?.height ?? 0) - totalRefHeight) / 2;
      const createdNodeIds = [];
      await runCanvasAddSession(async () => {
        for (let index = 0; index < files.length; index++) {
          const { ref, file } = files[index];
          try {
            const uploadRes = await assetMutator.upload(
              file,
              file.name,
              ref.type,
            );
            if (!uploadRes.id) {
              console.error(
                "[canvas] starter ref upload: missing assetId",
                ref.name,
              );
              dedupedToast.error(
                translate("canvas.videoStarter.refApplyFailed", {
                  name: ref.name,
                }),
              );
              continue;
            }
            const added = await httpClient.addCanvasNode({
              assetId: uploadRes.id,
              position: {
                x: referenceX,
                y: referenceY,
              },
              targetNodeId: videoNodeId,
            });
            if (added.nodeId) createdNodeIds.push(added.nodeId);
            referenceY += sizes[index].height + GAP_Y;
          } catch (err) {
            console.error("[canvas] starter ref add failed:", ref.name, err);
            dedupedToast.error(
              translate("canvas.videoStarter.refApplyFailed", {
                name: ref.name,
              }),
            );
          }
        }
      });
      sessionStore.notifyFileChanged();
      return {
        createdNodeIds,
      };
    },
    [assetMutator, httpClient, runCanvasAddSession, sessionStore, translate],
  );
  const handleUpload = reactExports.useCallback((position, options) => {
    uploadPositionRef.current = position;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = options?.accept ?? ALL_MEDIA_FILE_ACCEPT;
    input.value = "";
    input.click();
  }, []);
  const selectionTimerRef = reactExports.useRef(null);
  const lastSelectionSentRef = reactExports.useRef(null);
  const [selectedNodeCount, setSelectedNodeCount] = reactExports.useState(0);
  const handleSelectionChange = reactExports.useCallback(
    (nodeIds) => {
      setSelectedNodeCount(nodeIds.length);
      quickTags.handleQuickTagSelectionChange(nodeIds);
      const key = nodeIds.join(",");
      if (key === lastSelectionSentRef.current) return;
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        selectionTimerRef.current = null;
        lastSelectionSentRef.current = key;
        gatewayFetch("/api/canvas/selection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nodeIds,
          }),
        }).catch((err) => {
          console.warn("[CanvasArea] selection sync failed:", err);
        });
      }, 80);
    },
    [gatewayFetch, quickTags.handleQuickTagSelectionChange],
  );
  reactExports.useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }
    };
  }, []);
  const handleCreateTextFile = reactExports.useCallback(
    async (content) => {
      try {
        const res = await assetMutator.writeText(
          "Untitled.md",
          content ?? "",
          {
            unique: true,
          },
        );
        if (!res.assetId) {
          console.error(
            "[canvas] Failed to create text file: no assetId returned",
          );
          return void 0;
        }
        const fileName = res.path.split("/").pop() ?? "Untitled.md";
        return {
          assetId: res.assetId,
          name: fileName,
          path: res.path,
        };
      } catch (err) {
        console.error("[canvas] Failed to create text file:", err);
        return void 0;
      }
    },
    [assetMutator],
  );
  const handleCreateTextAsset = reactExports.useCallback(
    async (content) => {
      try {
        return await assetMutator.createTextAsset(content);
      } catch (err) {
        console.error(
          "[canvas] Failed to create text asset from clipboard:",
          err,
        );
        return void 0;
      }
    },
    [assetMutator],
  );
  const handleFileInputChange = reactExports.useCallback(
    async (fileInputEvent) => {
      const files = fileInputEvent.target.files;
      if (!files || files.length === 0) return;
      const position = uploadPositionRef.current;
      const fileList = Array.from(files);
      await runCanvasAddSession(async () => {
        const measured = await Promise.all(
          fileList.map((file) => measureMediaSize(file)),
        );
        const sizes = fileList.map((file, index) =>
          resolveNodeSize(file, measured[index]),
        );
        const positions = computeGridDropPositions(position, sizes);
        for (let index = 0; index < fileList.length; index++) {
          const file = fileList[index];
          try {
            const res = await assetMutator.upload(file, file.name, void 0, {
              source: "file-picker",
            });
            if (!res.id) continue;
            await httpClient.addCanvasNode({
              assetId: res.id,
              position: positions[index],
            });
          } catch (err) {
            console.error("[canvas] File upload failed:", file.name, err);
          }
        }
      });
      fileInputEvent.target.value = "";
      sessionStore.notifyFileChanged();
    },
    [assetMutator, httpClient, sessionStore, runCanvasAddSession],
  );
  const addCanvasAssetsAtPosition = reactExports.useCallback(
    async (assetIds, position, sizes) => {
      const resolvedSizes = assetIds.map(
        (_assetId, index) => sizes?.[index] ?? defaultNodeSizeForKind(void 0),
      );
      const positions = position
        ? computeGridDropPositions(position, resolvedSizes)
        : void 0;
      for (const [index, assetId] of assetIds.entries()) {
        await httpClient.addCanvasNode({
          assetId,
          ...(positions
            ? {
                position: positions[index],
              }
            : {}),
        });
      }
    },
    [httpClient],
  );
  const handleResourceDropToCanvas = reactExports.useCallback(
    async (items, position, source = "resource_drag", onAdded) => {
      await runCanvasAddSession(async () => {
        const assetIds = [];
        const sizes = [];
        const nodeTypes = [];
        const externalPaths = [];
        const externalProjectFiles = [];
        const htableFiles = [];
        for (const item of items) {
          if (item.isDirectory) continue;
          if (item.external) {
            if (!item.absolutePath) continue;
            if (isHtableFileName(item.name)) {
              htableFiles.push({
                absolutePath: item.absolutePath,
                name: item.name,
                projectAsset: item.projectAsset,
              });
            } else if (item.projectAsset) {
              externalProjectFiles.push({
                absolutePath: item.absolutePath,
                name: item.name,
                identity: item.projectAsset,
              });
            } else {
              externalPaths.push(item.absolutePath);
            }
            continue;
          }
          if (item.type === "text") {
            try {
              const duplicated = await handleDuplicateTextAsset(item.path);
              assetIds.push(duplicated.assetId);
              sizes.push(defaultNodeSizeForKind("text"));
              nodeTypes.push("text");
            } catch (err) {
              console.error(
                "[canvas] Text resource drop duplication failed:",
                item.path,
                err,
              );
            }
            continue;
          }
          if (typeof item.assetId === "string" && item.assetId.length > 0) {
            assetIds.push(item.assetId);
            sizes.push(defaultNodeSizeForKind(item.type));
            nodeTypes.push(item.type);
          }
        }
        if (externalPaths.length > 0) {
          try {
            for (const row of await importExternalToVault(externalPaths)) {
              assetIds.push(row.id);
              sizes.push(
                computeNodeSize(row.width, row.height) ??
                  defaultNodeSizeForKind(asMediaType(row.type)),
              );
              nodeTypes.push(asMediaType(row.type) ?? "file");
            }
          } catch (err) {
            console.error(
              "[canvas] External resource drop import failed:",
              err,
            );
          }
        }
        for (const file of externalProjectFiles) {
          try {
            await runAfterProjectAssetAnchor(
              anchorProjectAssets,
              {
                path: file.absolutePath,
                assetId: file.identity.assetId,
                projectFolderName: file.identity.projectFolderName,
              },
              async () => {
                try {
                  const [row] = await importExternalToVault([
                    file.absolutePath,
                  ]);
                  if (!row) return;
                  assetIds.push(row.id);
                  sizes.push(
                    computeNodeSize(row.width, row.height) ??
                      defaultNodeSizeForKind(asMediaType(row.type)),
                  );
                  nodeTypes.push(asMediaType(row.type) ?? "file");
                } catch (err) {
                  console.error(
                    "[canvas] Project asset drop import failed:",
                    file.absolutePath,
                    err,
                  );
                }
              },
            );
          } catch (err) {
            console.error(
              "[canvas] Project asset anchor failed:",
              file.absolutePath,
              err,
            );
            dedupedToast.error(
              translate("localAssets.importFailed", {
                name: file.name,
              }),
            );
          }
        }
        if (assetIds.length > 0) {
          await addCanvasAssetsAtPosition(assetIds, position, sizes);
        }
        if (htableFiles.length > 0) {
          const tablePositions =
            assetIds.length === 0 && position
              ? computeGridDropPositions(
                  position,
                  htableFiles.map(() => TABLE_CARD_DEFAULT_SIZE),
                )
              : void 0;
          for (const [index, file] of htableFiles.entries()) {
            const importTable = async () => {
              try {
                await importHtableToCanvas(
                  file,
                  gatewayFetch,
                  tablePositions?.[index],
                );
                nodeTypes.push("table");
              } catch (err) {
                console.error(
                  "[canvas] .htable import failed:",
                  file.absolutePath,
                  err,
                );
                dedupedToast.error(
                  err instanceof HtableParseError
                    ? translate("canvas.table.importFailed", {
                        name: file.name,
                      })
                    : translate("localAssets.importFailed", {
                        name: file.name,
                      }),
                );
              }
            };
            if (file.projectAsset) {
              try {
                await runAfterProjectAssetAnchor(
                  anchorProjectAssets,
                  {
                    path: file.absolutePath,
                    assetId: file.projectAsset.assetId,
                    projectFolderName: file.projectAsset.projectFolderName,
                  },
                  importTable,
                );
              } catch (err) {
                console.error(
                  "[canvas] Project asset anchor failed:",
                  file.absolutePath,
                  err,
                );
                dedupedToast.error(
                  translate("localAssets.importFailed", {
                    name: file.name,
                  }),
                );
              }
            } else {
              await importTable();
            }
          }
        }
        if (nodeTypes.length === 0) return;
        onAdded?.();
        const canvasId = currentWorkspace
          ? folderNameFromPath(currentWorkspace)
          : void 0;
        for (const nodeType of nodeTypes) {
          trackEvent(TRACK_EVENTS.CANVAS_NODE_ADD, {
            node_type: nodeType,
            source,
            ...(canvasId
              ? {
                  canvas_id: canvasId,
                }
              : {}),
          });
        }
      });
    },
    [
      addCanvasAssetsAtPosition,
      anchorProjectAssets,
      currentWorkspace,
      gatewayFetch,
      handleDuplicateTextAsset,
      importExternalToVault,
      runCanvasAddSession,
      translate,
    ],
  );
  reactExports.useEffect(() => {
    if (isActive === false) return;
    const subscription = workspaceEvents.onAddToCanvas(
      ({ items, onAdded, placement }) => {
        const anchor =
          placement === "incremental"
            ? void 0
            : (canvasViewRef.current?.getDropPosition() ?? {
                x: 0,
                y: 0,
              });
        void handleResourceDropToCanvas(
          items,
          anchor,
          "resource_context_menu",
          onAdded,
        );
      },
    );
    return () => subscription.dispose();
  }, [handleResourceDropToCanvas, isActive]);
  const handleNativeFileDropToCanvas = reactExports.useCallback(
    async (files, position) => {
      const paths = files
        .map((file) => window.hilo?.webUtils?.getPathForFile(file))
        .filter(
          (filePath) => typeof filePath === "string" && filePath.length > 0,
        );
      if (paths.length === 0) return;
      const htablePaths = paths.filter((path) => isHtableFileName(path));
      const mediaPaths = paths.filter((path) => !isHtableFileName(path));
      await runCanvasAddSession(async () => {
        try {
          if (htablePaths.length > 0) {
            const tablePositions =
              mediaPaths.length === 0
                ? computeGridDropPositions(
                    position,
                    htablePaths.map(() => TABLE_CARD_DEFAULT_SIZE),
                  )
                : void 0;
            for (const [index, absolutePath] of htablePaths.entries()) {
              const fileName = absolutePath.split(/[\\/]/).pop() ?? absolutePath;
              try {
                await importHtableToCanvas(
                  {
                    absolutePath,
                    name: fileName,
                  },
                  gatewayFetch,
                  tablePositions?.[index],
                );
              } catch (err) {
                console.error(
                  "[canvas] .htable drop import failed:",
                  absolutePath,
                  err,
                );
                dedupedToast.error(
                  err instanceof HtableParseError
                    ? translate("canvas.table.importFailed", {
                        name: fileName,
                      })
                    : translate("localAssets.importFailed", {
                        name: fileName,
                      }),
                );
              }
            }
          }
          const rows = await importExternalToVault(mediaPaths);
          if (rows.length === 0) return;
          const assetIds = rows.map((row) => row.id);
          const sizes = rows.map(
            (row) =>
              computeNodeSize(row.width, row.height) ??
              defaultNodeSizeForKind(asMediaType(row.type)),
          );
          await addCanvasAssetsAtPosition(assetIds, position, sizes);
        } catch (err) {
          console.error("[canvas] Native file drop import failed:", err);
        }
      });
    },
    [
      addCanvasAssetsAtPosition,
      gatewayFetch,
      importExternalToVault,
      runCanvasAddSession,
      translate,
    ],
  );
  const handleSkillDropToCanvas = reactExports.useCallback(
    async (data) => {
      try {
        await gatewayFetch("/api/canvas/text-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `/${data.name}`,
            name: `${data.name}.md`,
          }),
        });
        sessionStore.notifyFileChanged();
      } catch (err) {
        console.error("[canvas] Skill drop to canvas failed:", err);
      }
    },
    [gatewayFetch, sessionStore],
  );
  const handleInstantiatePlugin = reactExports.useCallback(
    async (args) => {
      const isInstalled = usePluginMetadataStore
        .getState()
        .plugins.has(args.pluginId);
      if (!isInstalled) {
        const toastId = `plugin-add-${args.pluginId}`;
        try {
          dedupedToast.loading(
            translate("skills.plugin.installingToCanvas", {
              name: args.pluginId,
            }),
            {
              id: toastId,
            },
          );
          const installResp = await gatewayFetch(API_PATHS.marketInstall, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: args.pluginId,
              skillType: "plugin",
            }),
          });
          if (!installResp.ok) {
            const body = await installResp.text();
            throw new Error(`install ${installResp.status}: ${body}`);
          }
          const installData = await installResp.json();
          if (!installData.ok)
            throw new Error(installData.error ?? "install failed");
          dedupedToast.dismiss(toastId);
          try {
            const listResp = await gatewayFetch("/api/plugins");
            if (listResp.ok) {
              const listData = await listResp.json();
              setPluginMetas(
                (listData.plugins ?? []).map((plugin) => ({
                  id: plugin.id,
                  name: plugin.name,
                  description: plugin.description,
                  iconUrl: plugin.iconUrl,
                  version: plugin.version,
                  source: plugin.source,
                  displayMode: plugin.displayMode,
                  agent: plugin.agent,
                })),
              );
            }
          } catch {}
          pluginEvents.firePluginsChanged(args.pluginId, "installed");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[canvas] Plugin install-before-add failed:", err);
          dedupedToast.error(
            translate("skills.plugin.addFailed", {
              error: message,
            }),
            {
              id: toastId,
            },
          );
          return null;
        }
      }
      return instantiatePluginOnCanvas(args, {
        currentWorkspace,
        gatewayFetch,
        t: translate,
      });
    },
    [currentWorkspace, gatewayFetch, translate],
  );
  const handlePluginDropToCanvas = reactExports.useCallback(
    async (data, position, sourceNodeIds) => {
      const needsInstall = data.installed === false;
      const toastId = needsInstall ? `plugin-drop-${data.id}` : void 0;
      try {
        if (needsInstall) {
          dedupedToast.loading(
            translate("skills.plugin.installingToCanvas", {
              name: data.name,
            }),
            {
              id: toastId,
            },
          );
          const installResp = await gatewayFetch(API_PATHS.marketInstall, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: data.id,
              skillType: "plugin",
            }),
          });
          if (!installResp.ok) {
            const body = await installResp.text();
            throw new Error(`install ${installResp.status}: ${body}`);
          }
          const installData = await installResp.json();
          if (!installData.ok)
            throw new Error(installData.error ?? "install failed");
        }
        const nodeId = await instantiatePluginOnCanvas(
          {
            pluginId: data.id,
            position,
            sourceNodeIds,
          },
          {
            currentWorkspace,
            gatewayFetch,
            t: translate,
          },
        );
        if (toastId) dedupedToast.dismiss(toastId);
        return nodeId;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[canvas] Plugin drop to canvas failed:", err);
        dedupedToast.error(
          translate("skills.plugin.addFailed", {
            error: message,
          }),
          {
            id: toastId,
          },
        );
        return null;
      }
    },
    [currentWorkspace, gatewayFetch, translate],
  );
  const handleUploadFile = reactExports.useCallback(
    (file) => uploadCanvasReferenceFile(file, gatewayFetch),
    [gatewayFetch],
  );
  const handleUploadFileToCdn = reactExports.useCallback(
    (file) => uploadCanvasFileToCdn(file, gatewayFetch),
    [gatewayFetch],
  );
  const handleResolvePluginAssetUrl = reactExports.useCallback(
    (pluginId, entryPath) => {
      const safePath = entryPath
        .replace(/^\/+/, "")
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      return (
        gatewayUrl(
          `/api/plugins/${encodeURIComponent(pluginId)}/static/${safePath}`,
        ) ?? ""
      );
    },
    [gatewayUrl],
  );
  const handleListLuts = reactExports.useCallback(async () => {
    const resp = await gatewayFetch("/api/luts");
    const data = await resp.json();
    return data.luts ?? [];
  }, [gatewayFetch]);
  const handleImportLut = reactExports.useCallback(
    async (file) => {
      const form = new FormData();
      form.append("file", file, file.name);
      const resp = await gatewayFetch("/api/luts/import", {
        method: "POST",
        body: form,
      });
      return await resp.json();
    },
    [gatewayFetch],
  );
  const handleLutImportTrack = reactExports.useCallback((info) => {
    const base = {
      node_type: info.nodeType,
      source: "color_adjust_dialog",
    };
    if (info.phase === "click") {
      trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_CLICK, {
        ...base,
      });
      return;
    }
    const fileSize = info.fileSize ?? 0;
    const durationMs = info.durationMs ?? 0;
    if (info.phase === "success") {
      trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_SUCCESS, {
        ...base,
        file_size: fileSize,
        duration_ms: durationMs,
      });
      return;
    }
    const isNetworkError = info.error instanceof TypeError;
    trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_FAILED, {
      ...base,
      file_size: fileSize,
      duration_ms: durationMs,
      error_type: isNetworkError ? "network" : "business",
      error_code: isNetworkError ? "lut_import_network" : "lut_import_failed",
      error_message: isNetworkError
        ? "LUT import network request failed"
        : "LUT import failed",
    });
  }, []);
  const handleLoadLutContent = reactExports.useCallback(
    async (lutName) => {
      const resp = await gatewayFetch(
        `/api/luts/content?name=${encodeURIComponent(lutName)}`,
      );
      const data = await resp.json();
      return data.content;
    },
    [gatewayFetch],
  );
  const handleDeleteLut = reactExports.useCallback(
    async (lutName) => {
      await gatewayFetch(`/api/luts/${encodeURIComponent(lutName)}`, {
        method: "DELETE",
      });
    },
    [gatewayFetch],
  );
  const handleSystemPasteToCanvas = reactExports.useCallback(
    async (files, position, source) => {
      if (files.length === 0) return [];
      const addedNodeIds = [];
      await runCanvasAddSession(async () => {
        let positions;
        if (position) {
          const measured = await Promise.all(
            files.map((file) => measureMediaSize(file)),
          );
          const sizes = files.map((file, index) =>
            resolveNodeSize(file, measured[index]),
          );
          const anchor = {
            x: position.x - sizes[0].width / 2,
            y: position.y - sizes[0].height / 2,
          };
          positions = computeGridDropPositions(anchor, sizes);
        }
        await Promise.all(
          files.map(async (file, index) => {
            try {
              const uploadRes = await assetMutator.upload(
                file,
                file.name,
                void 0,
                {
                  source: "clipboard",
                },
              );
              if (!uploadRes.id) return;
              if (source) {
                try {
                  await httpClient.updateAssetMetadata(
                    uploadRes.id,
                    browserAssetSourceMetadata(source),
                  );
                } catch (error) {
                  console.warn(
                    "[canvas] Failed to persist browser asset source:",
                    error,
                  );
                }
              }
              const added = await httpClient.addCanvasNode({
                assetId: uploadRes.id,
                ...(positions
                  ? {
                      position: positions[index],
                    }
                  : {}),
              });
              if (added.nodeId) addedNodeIds.push(added.nodeId);
            } catch (err) {
              console.error("[canvas] Paste upload failed:", file.name, err);
            }
          }),
        );
      });
      sessionStore.notifyFileChanged();
      return addedNodeIds;
    },
    [assetMutator, httpClient, sessionStore, runCanvasAddSession],
  );
  useBrowserCanvasImport(
    currentWorkspace,
    isActive,
    handleSystemPasteToCanvas,
  );
  const handleRequestSystemPaste = reactExports.useCallback(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const result = await clipboardService.triggerPasteOnFocusedWindow();
    if (result.ok) return;
    const detail =
      result.reason === "paste-threw" && result.message
        ? `: ${result.message}`
        : "";
    dedupedToast.error(translate("canvas.pasteFailed") + detail);
  }, [clipboardService, translate]);
  const handleSystemTextPaste = reactExports.useCallback(
    async (text, position) => {
      await runCanvasAddSession(async () => {
        const created = await handleCreateTextAsset(text);
        if (!created) return;
        try {
          await httpClient.addCanvasNode({
            assetId: created.assetId,
            position: {
              x: position.x - TEXT_CARD_DEFAULT_SIZE.width / 2,
              y: position.y - TEXT_CARD_DEFAULT_SIZE.height / 2,
            },
          });
          sessionStore.notifyFileChanged();
        } catch (err) {
          console.error("[canvas] addCanvasNode for pasted text failed:", err);
        }
      });
    },
    [handleCreateTextAsset, httpClient, sessionStore, runCanvasAddSession],
  );
  const handleSystemCopy = reactExports.useCallback(
    async (nodes) => {
      if (nodes.length !== 1) return null;
      const node = nodes[0];
      if (node.type === CanvasNodeType.Image) {
        return buildImageCopyPayload(node, assetMetadataStore);
      }
      if (
        node.type === CanvasNodeType.Video ||
        node.type === CanvasNodeType.Audio
      ) {
        if (platform.app.os !== "darwin") return null;
        const meta = getAssetMetaByNodeIdFromStore(
          assetMetadataStore,
          node.id,
        );
        if (!meta?.path || !currentWorkspace) return null;
        const absPath = joinFilePath(currentWorkspace, meta.path);
        try {
          await platform.clipboard.writeFile?.(absPath);
        } catch (err) {
          console.warn("[canvas] media copy file ref failed:", err);
          return null;
        }
        return {
          kind: "native",
        };
      }
      if (node.type === CanvasNodeType.Text) {
        const meta = getAssetMetaByNodeIdFromStore(
          assetMetadataStore,
          node.id,
        );
        if (!meta?.path) return null;
        try {
          const content = await httpClient.readContent(meta.path);
          if (content) {
            await navigator.clipboard.writeText(content);
            setCopiedSystemText(content);
          }
        } catch (err) {
          console.warn("[canvas] text copy content failed:", err);
          return null;
        }
        return {
          kind: "native",
        };
      }
      return null;
    },
    [assetMetadataStore, currentWorkspace, httpClient, platform],
  );
  const handleCanvasSkillDragOver = reactExports.useCallback((dragEvent) => {
    const types = dragEvent.dataTransfer.types;
    if (!types.includes(SKILL_DRAG_MIME) && !types.includes(PLUGIN_DRAG_MIME))
      return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "copy";
  }, []);
  const handleCanvasSkillDrop = reactExports.useCallback(
    (dragEvent) => {
      const pluginRaw = dragEvent.dataTransfer.getData(PLUGIN_DRAG_MIME);
      if (pluginRaw) {
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        try {
          const data = JSON.parse(pluginRaw);
          const position = canvasViewRef.current?.clientToFlowPosition(
            dragEvent.clientX,
            dragEvent.clientY,
          );
          handlePluginDropToCanvas(data, position);
        } catch {}
        return;
      }
      const skillRaw = dragEvent.dataTransfer.getData(SKILL_DRAG_MIME);
      if (!skillRaw) return;
      dragEvent.preventDefault();
      dragEvent.stopPropagation();
      try {
        const data = JSON.parse(skillRaw);
        handleSkillDropToCanvas(data);
      } catch {}
    },
    [handlePluginDropToCanvas, handleSkillDropToCanvas],
  );
  const dropEntityById = reactExports.useCallback(
    (entityId, position, attachmentIds) => {
      void (async () => {
        try {
          if (currentWorkspace) {
            await materializeEntityMutation.mutateAsync({
              entityId,
              input: {
                workspacePath: currentWorkspace,
              },
            });
          }
          const result = await dropEntityMutation.mutateAsync({
            entityId,
            input: {
              ...(position
                ? {
                    position,
                  }
                : {}),
              ...(attachmentIds && attachmentIds.length > 0
                ? {
                    attachmentIds,
                  }
                : {}),
            },
          });
          sessionStore.notifyFileChanged();
          if (result.nodeIds.length > 0) {
            canvasViewRef.current?.focusNodeIds(result.nodeIds);
          }
        } catch (err) {
          console.error("[canvas] Entity drop to canvas failed:", err);
          dedupedToast.error(translate("canvas.entityDrop.error"));
        }
      })();
    },
    [
      dropEntityMutation,
      materializeEntityMutation,
      currentWorkspace,
      sessionStore,
      translate,
    ],
  );
  const handleCanvasEntityDrop = reactExports.useCallback(
    (dragEvent) => {
      const payload = readEntityDragData(dragEvent);
      if (!payload) return;
      dragEvent.preventDefault();
      dragEvent.stopPropagation();
      const position = canvasViewRef.current?.clientToFlowPosition(
        dragEvent.clientX,
        dragEvent.clientY,
      );
      dropEntityById(payload.entityId, position);
      trackAssetUse({
        entity_id: payload.entityId,
        entity_type: payload.type,
        target: "canvas",
        via: "drag",
        source_panel: "canvas_sidebar",
        was_materialized: true,
      });
    },
    [dropEntityById],
  );
  reactExports.useEffect(() => {
    const subscription = subscribeAddEntityToCanvas(workspaceEvents, {
      isActiveRef,
      dropEntityById,
    });
    return () => subscription.dispose();
  }, [dropEntityById]);
  const attachmentLocator = useAttachmentLocator();
  reactExports.useEffect(() => {
    if (!attachmentLocator) return;
    const locate = (path) => {
      if (!canvasViewRef.current?.findNodeIdsByFilePaths([path]).length)
        return void 0;
      return () => {
        const nodeIds =
          canvasViewRef.current?.findNodeIdsByFilePaths([path]) ?? [];
        if (currentWorkspace && nodeIds.length)
          workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds, {
            select: true,
          });
      };
    };
    attachmentLocator.current = locate;
    return () => {
      if (attachmentLocator.current === locate)
        attachmentLocator.current = null;
    };
  }, [attachmentLocator, currentWorkspace]);
  reactExports.useEffect(() => {
    const subscription = workspaceEvents.onLocateCanvasFile((event) => {
      if (!currentWorkspace || event.workspaceId !== currentWorkspace) return;
      const requestedPaths = event.paths ?? (event.path ? [event.path] : []);
      const pathNodeIds =
        canvasViewRef.current?.findNodeIdsByFilePaths(requestedPaths) ?? [];
      const nodeIds = [...new Set([...(event.nodeIds ?? []), ...pathNodeIds])];
      if (nodeIds.length === 0) {
        dedupedToast.info(
          translate("canvas.locate.notOnCanvas", {
            defaultValue: "该文件尚未在画布上",
          }),
          {
            id: canvasLocateMissingToastId,
          },
        );
        return;
      }
      workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds, {
        select: true,
        preferParentGroup: event.preferParentGroup,
      });
    });
    return () => subscription.dispose();
  }, [canvasLocateMissingToastId, currentWorkspace, translate]);
  const handleCanvasDragOver = reactExports.useCallback(
    (dragEvent) => {
      if (dragEvent.dataTransfer.types.includes(ENTITY_DRAG_MIME)) {
        dragEvent.preventDefault();
        dragEvent.dataTransfer.dropEffect = "copy";
        return;
      }
      handleCanvasSkillDragOver(dragEvent);
    },
    [handleCanvasSkillDragOver],
  );
  const handleCanvasDrop = reactExports.useCallback(
    (dragEvent) => {
      if (dragEvent.dataTransfer.types.includes(ENTITY_DRAG_MIME)) {
        handleCanvasEntityDrop(dragEvent);
        return;
      }
      handleCanvasSkillDrop(dragEvent);
    },
    [handleCanvasEntityDrop, handleCanvasSkillDrop],
  );
  const workspaceRef = reactExports.useRef(currentWorkspace);
  workspaceRef.current = currentWorkspace;
  const handleCanvasEnterTrack = reactExports.useCallback((info) => {
    const canvasId = workspaceRef.current
      ? folderNameFromPath(workspaceRef.current)
      : "";
    if (!canvasId) return;
    trackEvent(TRACK_EVENTS.CANVAS_VIEW_ENTER, {
      canvas_id: canvasId,
      node_count: info.nodeCount,
    });
  }, []);
  const handleStickerAddTrack = reactExports.useCallback((info) => {
    trackEvent(TRACK_EVENTS.CANVAS_STICKER_ADD, {
      sticker_id: info.stickerId,
      cloud_task_id: info.cloudTaskId,
    });
  }, []);
  const handleCanvasViewControlTrack = reactExports.useCallback((info) => {
    if (info.action === "minimap_toggle") {
      if (info.minimapVisible === void 0) return;
      trackEvent(TRACK_EVENTS.CANVAS_MINIMAP_TOGGLE, {
        source: "toolbar",
        visible: info.minimapVisible,
      });
      return;
    }
    if (info.action === "edges_toggle") {
      if (info.edgesVisible === void 0) return;
      trackEvent(TRACK_EVENTS.CANVAS_EDGES_TOGGLE, {
        source: "toolbar",
        visible: info.edgesVisible,
      });
      return;
    }
    if (info.zoomBefore === void 0) return;
    trackEvent(TRACK_EVENTS.CANVAS_ZOOM_CHANGE, {
      direction: info.action,
      source: "toolbar",
      zoom_before: info.zoomBefore,
      zoom_after: info.zoomAfter,
    });
  }, []);
  const lastPopoverOpenRef = reactExports.useRef(null);
  const handlePopoverOpenTrack = reactExports.useCallback((info) => {
    const now = Date.now();
    const key = `${info.popoverType}:${info.nodeId}`;
    const previous = lastPopoverOpenRef.current;
    if (previous?.key === key && now - previous.timestamp < 1e3) return;
    lastPopoverOpenRef.current = {
      key,
      timestamp: now,
    };
    trackEvent(TRACK_EVENTS.CANVAS_POPOVER_OPEN, {
      popover_type: info.popoverType,
      node_id: info.nodeId,
      has_default: info.hasDefault,
    });
  }, []);
  const handlePromotionToast = reactExports.useCallback((info) => {
    const body = info.toast?.trim();
    if (body) dedupedToast.info(body);
  }, []);
  const {
    handleComfyUiDraftActionTrack,
    handleNodeAddTrack,
    handlePaneContextMenuActionTrack,
    handlePluginActionTrack,
  } = useComfyUiCanvasTracking(workspaceRef);
  const assetPanelToolbarButton = reactExports.useMemo(() => {
    if (!onToggleAssetPanel) return null;
    const label = translate("topbar.toggleAssetPanel");
    return (
      <CanvasHostToolbarButton
        icon={assetPanelOpen ? FolderOpen : FolderClosed}
        label={label}
        iconSize="lg"
        tooltipSide="top"
        kind="panel"
        active={assetPanelOpen}
        controlsId={assetPanelControlsId}
        onClick={onToggleAssetPanel}
        dataActionUiId="canvas.toolbar-project-assets"
      />
    );
  }, [assetPanelControlsId, assetPanelOpen, onToggleAssetPanel, translate]);
  const toolDockTrailing = reactExports.useMemo(
    () => (
      <div className="flex h-9 items-center gap-px">
        {assetPanelToolbarButton}
        <span
          className="mx-[5px] h-5 w-px shrink-0 bg-[var(--canvas-controls-border)]"
          aria-hidden="true"
        />
        <CanvasHelpButton
          variant="toolbar"
          menuOpen={canvasHelpOpen}
          onMenuOpenChange={setCanvasHelpOpen}
        />
      </div>
    ),
    [assetPanelToolbarButton, canvasHelpOpen],
  );
  const handleNodeActionTrack = reactExports.useCallback((info) => {
    const base = {
      node_id: info.nodeId,
      node_type: info.nodeType,
      tool: normalizeCanvasNodeTool(info.action),
      interaction: info.interaction,
    };
    if (info.phase === "click") {
      if (!info.source) return;
      trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_CLICK, {
        ...base,
        source: info.source,
      });
      if (info.interaction === "instant") {
        trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_APPLY, {
          ...base,
          apply_type: "implicit",
          duration_ms: 0,
        });
      }
      return;
    }
    if (info.phase === "apply") {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_APPLY, {
        ...base,
        apply_type: "explicit",
        duration_ms: info.durationMs,
        ...pickCanvasNodeToolApplyDetails(info.toolSpecific),
      });
      return;
    }
    trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_ABANDON, {
      ...base,
      duration_ms: info.durationMs,
      had_progress: info.hadProgress ?? false,
    });
  }, []);
  const handleNodeContentEditTrack = reactExports.useCallback((info) => {
    trackEvent(TRACK_EVENTS.CANVAS_NODE_CONTENT_EDIT, {
      node_id: info.nodeId,
      node_type: info.nodeType,
      action: info.action,
      char_count: info.charCount,
      had_change: info.hadChange,
      enter_mode: info.enterMode,
    });
  }, []);
  const handleParamAdjustTrack = reactExports.useCallback((info) => {
    trackEvent(TRACK_EVENTS.CANVAS_PARAM_ADJUST, {
      node_id: info.nodeId,
      popover_type: info.popoverType,
      param_name: info.paramName,
      from: info.from,
      to: info.to,
    });
  }, []);
  const handlePopoverChipOpenTrack = reactExports.useCallback((info) => {
    trackEvent(TRACK_EVENTS.CANVAS_POPOVER_CHIP_OPEN, {
      node_id: info.nodeId,
      popover_type: info.popoverType,
      chip_type: info.chipType,
      current_value: info.currentValue,
    });
  }, []);
  const handlePopoverCloseWithoutSubmitTrack = reactExports.useCallback(
    (info) => {
      trackEvent(TRACK_EVENTS.CANVAS_POPOVER_CLOSE_WITHOUT_SUBMIT, {
        popover_type: info.popoverType,
        node_id: info.nodeId,
        had_prompt: info.hadPrompt,
        close_reason: info.closeReason,
      });
    },
    [],
  );
  const handlePluginInsertMediaNode = reactExports.useCallback(
    async (args) => {
      const assetPath = resolvePluginSourcePath(args.source);
      const body = {
        assetPath,
      };
      if (args.sourceNodeId) body.sourceNodeIds = [args.sourceNodeId];
      const resp = await gatewayFetch("/api/canvas/media-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertMediaNode failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      if (args.selectOnEditorExit) {
        rememberPluginOutput(args.sourceNodeId, data.nodeId);
      }
      return {
        nodeId: data.nodeId,
        assetId: data.assetId,
      };
    },
    [gatewayFetch, rememberPluginOutput],
  );
  const handleEnsureMediaNodeForPath = reactExports.useCallback(
    async (path, sourceNodeId) => {
      if (!path) return null;
      try {
        const body = {
          assetPath: path,
        };
        if (sourceNodeId) body.sourceNodeId = sourceNodeId;
        const resp = await gatewayFetch("/api/canvas/media-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return {
          nodeId: data.nodeId,
          assetId: data.assetId,
        };
      } catch {
        return null;
      }
    },
    [gatewayFetch],
  );
  const handlePluginInsertTextNode = reactExports.useCallback(
    async (args) => {
      const body = {
        content: args.content,
      };
      if (args.name) body.name = args.name;
      if (args.sourceNodeId) body.sourceNodeId = args.sourceNodeId;
      const resp = await gatewayFetch("/api/canvas/text-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertTextNode failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      return {
        nodeId: data.nodeId,
        assetId: data.assetId,
      };
    },
    [gatewayFetch],
  );
  const handlePluginReadPluginData = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch("/api/canvas/plugin-data/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw pluginStorageHttpError("readPluginData", resp.status, text);
      }
      return mapPluginDataReadResult(await resp.json());
    },
    [gatewayFetch],
  );
  const handlePluginWritePluginData = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch("/api/canvas/plugin-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw pluginStorageHttpError("writePluginData", resp.status, text);
      }
    },
    [gatewayFetch],
  );
  const handleSubscribePluginStorageChanged = reactExports.useCallback(
    (callback) =>
      sessionStore.onPluginStorageChanged(({ nodeId }) =>
        callback({
          nodeId,
        }),
      ),
    [sessionStore],
  );
  const handlePostPluginAgentResult = reactExports.useCallback(
    async (result) => {
      const resp = await gatewayFetch("/api/plugins/agent/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin-agent result push failed: HTTP ${resp.status} ${text}`,
        );
      }
    },
    [gatewayFetch],
  );
  const handleSubscribePluginAgentInvoke = reactExports.useCallback(
    (callback) =>
      sessionStore.onPluginAgentInvoke(({ nodeId, invokeId, method, args }) =>
        callback({
          nodeId,
          invokeId,
          method,
          args,
        }),
      ),
    [sessionStore],
  );
  reactExports.useEffect(
    () =>
      sessionStore.onPluginAgentInvoke(({ nodeId, invokeId }) => {
        if (isPluginAgentRegistered(nodeId)) return;
        void handlePostPluginAgentResult({
          invokeId,
          ok: false,
          error: {
            code: "editor_not_open",
            message:
              "the plugin editor is not open for this node — call hub_plugin_agent_open_editor to open it, wait ~500ms, then retry",
          },
        }).catch(() => {});
      }),
    [sessionStore, handlePostPluginAgentResult],
  );
  const handlePluginInsertFileNode = reactExports.useCallback(
    async (args) => {
      const assetPath = resolvePluginSourcePath(args.source);
      const body = {
        assetPath,
      };
      if (args.sourceNodeId) body.sourceNodeId = args.sourceNodeId;
      if (args.viewMode) body.viewMode = args.viewMode;
      if (args.width !== void 0) body.width = args.width;
      if (args.height !== void 0) body.height = args.height;
      const resp = await gatewayFetch("/api/canvas/file-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertFileNode failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      return {
        nodeId: data.nodeId,
        assetId: data.assetId,
      };
    },
    [gatewayFetch],
  );
  const handlePluginInsertImagesAsGroup = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch("/api/canvas/nodes-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetIds: args.sources ?? [],
          ...(args.sourceNodeId !== void 0
            ? {
                sourceNodeId: args.sourceNodeId,
              }
            : {}),
          ...(args.label !== void 0
            ? {
                label: args.label,
              }
            : {}),
          ...(args.layout !== void 0
            ? {
                layout: args.layout,
              }
            : {}),
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertImagesAsGroup failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      return {
        groupId: data.groupId,
        nodeIds: data.nodeIds ?? [],
      };
    },
    [gatewayFetch],
  );
  const handlePluginSuperResolution = reactExports.useCallback(
    async (args) => {
      const imagePath = resolvePluginSourcePath(args.source);
      const multiple = (args.resolution ?? "2K") === "4K" ? 4 : 2;
      const res = await httpClient.enhanceImageMediaKit({
        image_path: imagePath,
        tool_version: "professional",
        multiple,
        ...(args.filename
          ? {
              filename: args.filename,
            }
          : {}),
        ...(args.aspectRatio
          ? {
              aspect_ratio: args.aspectRatio,
            }
          : {}),
        ...(args.placeholderId
          ? {
              placeholder_id: args.placeholderId,
              ...(args.sourceNodeId
                ? {
                    source_node_id: args.sourceNodeId,
                  }
                : {}),
            }
          : {
              skip_canvas_node: true,
            }),
      });
      if (!res?.ok || !res.path) {
        throw new Error("plugin: superResolution returned no result path");
      }
      const url = handleResolveFileUrl(res.path);
      if (!url)
        throw new Error(
          "plugin: superResolution result URL could not be resolved",
        );
      return {
        url,
        ...(res.asset_id
          ? {
              assetId: res.asset_id,
            }
          : {}),
        ...(typeof res.width === "number"
          ? {
              width: res.width,
            }
          : {}),
        ...(typeof res.height === "number"
          ? {
              height: res.height,
            }
          : {}),
      };
    },
    [httpClient, handleResolveFileUrl],
  );
  const handlePluginAddPlaceholderGroup = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch("/api/canvas/placeholder-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceNodeId: args.sourceNodeId,
          cells: args.cells,
          ...(args.label !== void 0
            ? {
                label: args.label,
              }
            : {}),
          ...(args.layout !== void 0
            ? {
                layout: args.layout,
              }
            : {}),
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: addPlaceholderGroup failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      return {
        groupId: data.groupId,
        placeholderIds: data.placeholderIds ?? [],
      };
    },
    [gatewayFetch],
  );
  const handlePluginNotify = reactExports.useCallback(
    (message, level, options) =>
      notifyFromPlugin(platform.shell, message, level, options),
    [platform.shell],
  );
  const handlePluginSaveFile = reactExports.useCallback(
    (args) =>
      savePluginFile(
        platform.fs,
        currentWorkspace,
        resolvePluginSourcePath,
        args,
      ),
    [currentWorkspace, platform.fs],
  );
  const handlePluginDownloadComfyUiModel = reactExports.useCallback(
    async ({ url, filename, directory }) => {
      await homeService.comfyUiModelDownload.prepareWorkflow({
        workflowId: `plugin:comfyui:missing-model:${directory}/${filename}`,
        workflowTitle: filename,
        models: [
          {
            name: filename,
            directory,
            url,
          },
        ],
      });
      return true;
    },
    [],
  );
  const handlePluginPickDirectory = reactExports.useCallback(
    async (options) => {
      const paths = await platform.fs.showOpenDialog?.({
        directory: true,
        multiple: false,
        ...(options?.title
          ? {
              title: options.title,
            }
          : {}),
      });
      return paths?.[0] ?? null;
    },
    [platform.fs],
  );
  const handlePluginLog = reactExports.useCallback(
    (entry) => {
      const now = Date.now();
      const key = `${entry.pluginId}:${entry.nodeId}`;
      let rate = pluginLogRateRef.current.get(key);
      if (!rate || now - rate.windowStartedAt >= 6e4) {
        rate = {
          windowStartedAt: now,
          count: 0,
          dropWarned: false,
        };
        pluginLogRateRef.current.set(key, rate);
        if (pluginLogRateRef.current.size > 512) {
          for (const [candidate, state] of pluginLogRateRef.current) {
            if (now - state.windowStartedAt >= 12e4)
              pluginLogRateRef.current.delete(candidate);
          }
        }
      }
      if (rate.count >= 120) {
        if (!rate.dropWarned) {
          rate.dropWarned = true;
          logService.warn(
            `[plugin:${entry.pluginId} node:${entry.nodeId}] log rate limit reached`,
          );
        }
        return;
      }
      rate.count += 1;
      const prefix = `[plugin:${entry.pluginId} node:${entry.nodeId}]`;
      const details =
        entry.details === void 0 ? "" : ` ${JSON.stringify(entry.details)}`;
      logService[entry.level](`${prefix} ${entry.message}${details}`);
    },
    [logService],
  );
  const handlePluginNavigate = usePluginNavigate();
  const handlePluginAddPlaceholder = reactExports.useCallback(
    async (args) => {
      const body = {
        sourceNodeId: args.sourceNodeId,
        prompt: args.prompt,
        model: args.model,
      };
      if (args.mediaType) body.mediaType = args.mediaType;
      const resp = await gatewayFetch("/api/canvas/placeholder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: addPlaceholder failed (${resp.status}) ${text}`,
        );
      }
      const data = await resp.json();
      return data.placeholderId;
    },
    [gatewayFetch],
  );
  const handlePluginFailPlaceholder = reactExports.useCallback(
    async (placeholderId, errorMessage) => {
      const resp = await gatewayFetch("/api/canvas/placeholder/fail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeholderId,
          errorMessage,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: failPlaceholder failed (${resp.status}) ${text}`,
        );
      }
    },
    [gatewayFetch],
  );
  const handlePluginCleanupPlaceholder = reactExports.useCallback(
    async (placeholderId) => {
      const resp = await gatewayFetch("/api/canvas/placeholder/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeholderId,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `plugin: cleanupPlaceholder failed (${resp.status}) ${text}`,
        );
      }
    },
    [gatewayFetch],
  );
  const {
    pickerRequest: pluginPickerRequest,
    handlePluginPickAsset,
    handleCanvasPickAsset,
  } = useAssetPickerHost({
    isActive: isActive ?? false,
    isPresented: isPresented ?? false,
  });
  const handleFillPlaceholder = reactExports.useCallback(
    (nodeId, resource) => {
      if (
        resource.type !== "image" &&
        resource.type !== "video" &&
        resource.type !== "audio"
      )
        return;
      const size =
        (resource.type === "image" || resource.type === "video") &&
        resource.width &&
        resource.height
          ? (computeNodeSize(resource.width, resource.height) ??
            defaultNodeSizeForKind(resource.type))
          : defaultNodeSizeForKind(resource.type);
      const filled = canvasViewRef.current?.fillEmptyPlaceholderWithAsset(
        nodeId,
        {
          assetId: resource.assetId,
          type: resource.type,
          name: resource.name,
          path: resource.path,
          intrinsicWidth: resource.width,
          intrinsicHeight: resource.height,
          size,
        },
      );
      if (filled) sessionStore.notifyFileChanged();
    },
    [sessionStore],
  );
  const handlePlaceholderError = reactExports.useCallback(
    (error) => {
      console.error("[canvas] placeholder source failed:", error);
      dedupedToast.error(translate("assetPicker.source.error", "资源暂不可用"));
    },
    [translate],
  );
  const { openImageAnnotation, annotationDialog } =
    useCanvasImageAnnotationHost(isActive ?? false);
  const capturePlaceholderTarget = reactExports.useCallback(
    (nodeId) =>
      canvasViewRef.current?.createPlaceholderFillGuard(nodeId) ??
      (() => false),
    [],
  );
  const handlePlaceholderUpload = usePlaceholderAssetSource({
    active: isActive ?? false,
    scope: currentWorkspace,
    pick: handleCanvasPickAsset,
    fill: handleFillPlaceholder,
    captureTarget: capturePlaceholderTarget,
    onError: handlePlaceholderError,
  });
  const handlePluginUploadAndInsert = reactExports.useCallback(
    async (file, type) => {
      const relPath = await handleUploadFile(file);
      const inserted = await handlePluginInsertMediaNode({
        source: relPath,
      });
      return {
        nodeId: inserted.nodeId,
        assetId: inserted.assetId,
        type,
        name: file.name,
        url: handleResolveFileUrl(relPath),
        path: relPath,
        fileSize: file.size,
      };
    },
    [handleUploadFile, handlePluginInsertMediaNode, handleResolveFileUrl],
  );
  const handleCanvasUploadAttachment = reactExports.useCallback(
    async (file) => {
      const att = await handleUploadAttachment(file);
      return {
        nodeId: att.assetId,
        assetId: att.assetId,
        type: att.kind,
        name: att.name,
        url: att.url,
        path: att.path,
        fileSize: file.size,
        ...uploadResponseMediaResourceFields({}, att),
      };
    },
    [handleUploadAttachment],
  );
  const pluginChatBridge = usePluginChatBridge(
    gatewayFetch,
    useWorkspaceWSConnection(),
    sessionStore,
  );
  const pluginDagBridge = usePluginDagBridge(gatewayFetch);
  const handlePluginUploadToCdn = reactExports.useCallback(
    async (args) => {
      if (typeof args.source !== "string") {
        throw new Error(
          "uploadToCdn: host accepts only string source (workspace path)",
        );
      }
      const resp = await gatewayFetch("/api/files/upload-cdn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          file_path: args.source,
        }),
      });
      let data = null;
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok) {
        const detail = data?.error ?? `HTTP ${resp.status}`;
        throw new Error(`uploadToCdn failed: ${detail}`);
      }
      if (!data?.ok || !data.url) {
        throw new Error(
          `uploadToCdn failed: ${data?.error ?? "no url returned"}`,
        );
      }
      return {
        url: data.url,
      };
    },
    [gatewayFetch],
  );
  const pythonPost = reactExports.useCallback(
    async (pluginId, suffix, body) => {
      const resp = await gatewayFetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/python/${suffix}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body,
        },
      );
      return await resp.json();
    },
    [gatewayFetch],
  );
  const handlePluginPythonEnsureEnv = reactExports.useCallback(
    (pluginId) => pythonPost(pluginId, "ensure-env", "{}"),
    [pythonPost],
  );
  const handlePluginPythonRun = reactExports.useCallback(
    (pluginId, args) => pythonPost(pluginId, "run", JSON.stringify(args)),
    [pythonPost],
  );
  const handlePluginReadFromPluginDir = reactExports.useCallback(
    async (pluginId, args) => {
      const encodedPath = args.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const endpoint = `/api/plugins/${encodeURIComponent(pluginId)}/data/${encodedPath}`;
      try {
        const resp = await gatewayFetch(endpoint, {
          cache: "no-store",
        });
        return {
          path: args.path,
          source: await resp.blob(),
        };
      } catch (error) {
        if (error instanceof GatewayHttpError && error.status === 404) {
          return {
            path: args.path,
            source: null,
          };
        }
        throw error;
      }
    },
    [gatewayFetch],
  );
  const handlePluginWriteToPluginDir = reactExports.useCallback(
    async (pluginId, args) => {
      const encodedPath = args.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const endpoint = `/api/plugins/${encodeURIComponent(pluginId)}/data/${encodedPath}`;
      const form = new FormData();
      form.append("file", args.source);
      const resp = await gatewayFetch(endpoint, {
        method: "PUT",
        body: form,
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const body = await resp.json();
          detail = body.message ?? body.error ?? detail;
        } catch {}
        throw new Error(`writeToPluginDir failed: ${detail}`);
      }
      return {
        path: args.path,
        url: endpoint,
      };
    },
    [gatewayFetch],
  );
  const handlePluginConfigGet = reactExports.useCallback(
    async (pluginId, key) => {
      const resp = await gatewayFetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key)}`,
      );
      if (resp.status === 404) return void 0;
      if (!resp.ok) throw new Error(`config.get failed: HTTP ${resp.status}`);
      const data = await resp.json();
      return data.value;
    },
    [gatewayFetch],
  );
  const handlePluginConfigSet = reactExports.useCallback(
    async (pluginId, key, value) => {
      const resp = await gatewayFetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key)}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            value,
          }),
        },
      );
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const body = await resp.json();
          if (body?.message) detail = body.message;
        } catch {}
        throw new Error(`config.set failed: ${detail}`);
      }
    },
    [gatewayFetch],
  );
  const handlePluginConfigDelete = reactExports.useCallback(
    async (pluginId, key) => {
      const resp = await gatewayFetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key)}`,
        {
          method: "DELETE",
        },
      );
      if (!resp.ok && resp.status !== 404) {
        throw new Error(`config.delete failed: HTTP ${resp.status}`);
      }
    },
    [gatewayFetch],
  );
  const handlePluginConfigKeys = reactExports.useCallback(
    async (pluginId) => {
      const resp = await gatewayFetch(
        `/api/plugins/${encodeURIComponent(pluginId)}/config`,
      );
      if (!resp.ok) throw new Error(`config.keys failed: HTTP ${resp.status}`);
      const data = await resp.json();
      return Array.isArray(data.keys) ? data.keys : [];
    },
    [gatewayFetch],
  );
  const handlePluginGetNodePriceDescription = reactExports.useCallback(
    (nodeType) =>
      buildComfyUiNodePriceDescription(
        pricingData,
        nodeType,
        {
          heading: translate("canvas.billing.panel.heading", {
            defaultValue: "价格说明",
          }),
          free: translate("canvas.billing.panel.free", {
            defaultValue: "免费",
          }),
          generatedVideo: translate("canvas.billing.panel.generatedVideo", {
            defaultValue: "生成视频",
          }),
          generatedImage: translate("canvas.billing.panel.generatedImage", {
            defaultValue: "生成图片",
          }),
          inputVideo: translate("canvas.billing.panel.inputVideo", {
            defaultValue: "输入视频",
          }),
          inputAudio: translate("canvas.billing.panel.inputAudio", {
            defaultValue: "输入音频",
          }),
          inputImages: translate("canvas.billing.panel.inputImages", {
            defaultValue: "输入图片",
          }),
          withReferenceVideo: translate("canvas.billing.panel.withReferenceVideo"),
          withoutReferenceVideo: translate(
            "canvas.billing.panel.withoutReferenceVideo",
          ),
          inputTokens: translate("canvas.billing.panel.inputTokens", {
            defaultValue: "输入 Token",
          }),
          outputTokens: translate("canvas.billing.panel.outputTokens", {
            defaultValue: "输出 Token",
          }),
          videoUpscale: translate("canvas.billing.panel.videoUpscale", {
            defaultValue: "视频超分",
          }),
          creditsPerSecond: (rate) =>
            translate("canvas.billing.panel.ratePerSecond", {
              rate,
              defaultValue: "{{rate}} 积分/秒",
            }),
          creditsPerImage: (rate) =>
            translate("canvas.billing.panel.ratePerImage", {
              rate,
              defaultValue: "{{rate}} 积分/张",
            }),
          creditsPerMillionTokens: (rate) =>
            translate("canvas.billing.panel.ratePerMillionTokens", {
              rate,
              defaultValue: "{{rate}} 积分/百万 Token",
            }),
          imagePricing: (freeCount, firstPaidIndex, rate) =>
            translate("canvas.billing.panel.imagePricing", {
              freeCount,
              firstPaidIndex,
              rate,
              defaultValue:
                "前 {{freeCount}} 张免费，第 {{firstPaidIndex}} 张起 {{rate}} 积分/张",
            }),
        },
        i18n.resolvedLanguage ?? i18n.language,
      ),
    [i18n.language, i18n.resolvedLanguage, pricingData, translate],
  );
  const pluginHost = reactExports.useMemo(
    () => ({
      pickAsset: handlePluginPickAsset,
      insertImageNode: handlePluginInsertMediaNode,
      insertVideoNode: handlePluginInsertMediaNode,
      insertAudioNode: handlePluginInsertMediaNode,
      insertTextNode: handlePluginInsertTextNode,
      insertFileNode: handlePluginInsertFileNode,
      readPluginData: handlePluginReadPluginData,
      writePluginData: handlePluginWritePluginData,
      subscribePluginStorageChanged: handleSubscribePluginStorageChanged,
      subscribePluginAgentInvoke: handleSubscribePluginAgentInvoke,
      postPluginAgentResult: handlePostPluginAgentResult,
      insertImagesAsGroup: handlePluginInsertImagesAsGroup,
      superResolution: handlePluginSuperResolution,
      addPlaceholderGroup: handlePluginAddPlaceholderGroup,
      addPlaceholder: handlePluginAddPlaceholder,
      failPlaceholder: handlePluginFailPlaceholder,
      cleanupPlaceholder: handlePluginCleanupPlaceholder,
      notify: handlePluginNotify,
      saveFile: handlePluginSaveFile,
      downloadComfyUiModel: handlePluginDownloadComfyUiModel,
      pickDirectory: handlePluginPickDirectory,
      writePluginLog: handlePluginLog,
      navigate: handlePluginNavigate,
      sendChatMessage: pluginChatBridge.sendChatMessage,
      cancelChat: pluginChatBridge.cancelChat,
      subscribeChatMessages: pluginChatBridge.subscribeChatMessages,
      subscribeChatDone: pluginChatBridge.subscribeChatDone,
      listSkills: pluginChatBridge.listSkills,
      getSkill: pluginChatBridge.getSkill,
      submitDag: pluginDagBridge.submitDag,
      queryDagRun: pluginDagBridge.queryDagRun,
      subscribeDagDone: pluginDagBridge.subscribeDagDone,
      releaseDagRuns: pluginDagBridge.releaseDagRuns,
      uploadToCdn: handlePluginUploadToCdn,
      readFromPluginDir: handlePluginReadFromPluginDir,
      writeToPluginDir: handlePluginWriteToPluginDir,
      pythonEnsureEnv: handlePluginPythonEnsureEnv,
      pythonRun: handlePluginPythonRun,
      configGet: handlePluginConfigGet,
      configSet: handlePluginConfigSet,
      configDelete: handlePluginConfigDelete,
      configKeys: handlePluginConfigKeys,
      getNodePriceDescription: handlePluginGetNodePriceDescription,
    }),
    [
      handlePluginPickAsset,
      handlePluginInsertMediaNode,
      handlePluginInsertTextNode,
      handlePluginInsertFileNode,
      handlePluginReadPluginData,
      handlePluginWritePluginData,
      handleSubscribePluginStorageChanged,
      handleSubscribePluginAgentInvoke,
      handlePostPluginAgentResult,
      handlePluginInsertImagesAsGroup,
      handlePluginSuperResolution,
      handlePluginAddPlaceholderGroup,
      handlePluginAddPlaceholder,
      handlePluginFailPlaceholder,
      handlePluginCleanupPlaceholder,
      handlePluginNotify,
      handlePluginSaveFile,
      handlePluginDownloadComfyUiModel,
      handlePluginPickDirectory,
      handlePluginLog,
      handlePluginNavigate,
      handlePluginUploadToCdn,
      handlePluginReadFromPluginDir,
      handlePluginWriteToPluginDir,
      handlePluginPythonEnsureEnv,
      handlePluginPythonRun,
      handlePluginConfigGet,
      handlePluginConfigSet,
      handlePluginConfigDelete,
      handlePluginConfigKeys,
      handlePluginGetNodePriceDescription,
      pluginChatBridge,
      pluginDagBridge,
    ],
  );
  const runtimeRegion = getRuntimeConfig().region;
  const runtimeVersion = getRuntimeConfig().appVersion;
  const runtimeGpuAccelerationDisabled =
    getRuntimeConfig().gpuAccelerationDisabled ?? false;
  const runtimeGpuAccelerationDisabledReason =
    getRuntimeConfig().gpuAccelerationDisabledReason;
  const [focusedChatSessionId, setFocusedChatSessionId] = reactExports.useState(
    () => sessionStore.getState().focusedSessionId,
  );
  reactExports.useEffect(() => {
    setFocusedChatSessionId(sessionStore.getState().focusedSessionId);
    return sessionStore.subscribe((state) => {
      setFocusedChatSessionId((prev) =>
        prev === state.focusedSessionId ? prev : state.focusedSessionId,
      );
    });
  }, [sessionStore]);
  const pluginAppInfo = reactExports.useMemo(
    () => ({
      locale: i18n.language.startsWith("zh") ? "zh" : "en",
      theme: resolvedTheme,
      region: runtimeRegion,
      version: runtimeVersion,
      gpuAccelerationDisabled: runtimeGpuAccelerationDisabled,
      gpuAccelerationDisabledReason: runtimeGpuAccelerationDisabledReason,
      currentChatSessionId: focusedChatSessionId,
    }),
    [
      i18n.language,
      resolvedTheme,
      runtimeRegion,
      runtimeVersion,
      runtimeGpuAccelerationDisabled,
      runtimeGpuAccelerationDisabledReason,
      focusedChatSessionId,
    ],
  );
  if (!dataSource) {
    return (
      <div
        className="island flex-1 flex items-center justify-center overflow-hidden relative text-sm text-muted-foreground"
        style={{
          "--island-fill": "var(--canvas-bg)",
        }}
      >
        {translate("common.loading")}
      </div>
    );
  }
  return (
    <HtmlFullscreenStoreProvider store={htmlFullscreenStore}>
      <div
        data-workspace-canvas-area-island="true"
        className="island flex-1 flex flex-col overflow-hidden relative @container/canvas-area"
        style={{
          "--island-fill": "var(--canvas-bg)",
        }}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <CanvasWorkflowBridge
          {...canvasSubmissionControls}
          isWorkspaceActive={isActive !== false}
          pricingConfig={pricingData}
          hailuo03VideoTrial={hailuo03VideoTrialStatus}
          claimHailuo03VideoTrial={claimHailuo03VideoTrial}
          refreshHailuo03VideoTrial={refreshHailuo03VideoTrial}
          submitImg2Video={handleImg2Video}
          fetchVideoModels={listVideoModels}
          submitImg2Image={handleImg2Image}
          fetchImageModels={listImageModels}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeTagRequest={quickTags.handleNodeTagRequest}
          onNodeTagRemoveRequest={quickTags.handleNodeTagRemoveRequest}
          onAddToChat={handleAddToChatFromNode}
          onAddPluginNodeToChat={handleAddPluginNodeToChat}
          onShowInFolder={handleNodeShowInFolder}
          onSaveAs={handleNodeSaveAs}
          onSaveUrlAs={handleNodeSaveUrlAs}
          onSaveManyAs={handleNodeSaveManyAs}
          onCopyImage={handleNodeCopyImage}
          onInstantiatePlugin={handleInstantiatePlugin}
          createTextFile={handleCreateTextFile}
          createTextAsset={handleCreateTextAsset}
          loadTextContent={handleLoadTextContent}
          loadPreviewTextContent={loadPreviewTextContent}
          previewActive={isActive !== false && isPresented !== false}
          saveTextContent={handleSaveTextContent}
          textVersions={textVersionsBridge}
          onTextEditActiveChange={handleTextEditActiveChange}
          onPluginEditActiveChange={handlePluginEditActiveChange}
          getTextEditCloseBlockReason={getTextEditCloseBlockReason}
          onTextEditSelectionChange={handleTextEditSelectionChange}
          onAnnotationsChange={handleAnnotationsChange}
          onAnnotationActivate={handleAnnotationActivate}
          subscribeAnnotationCommand={subscribeAnnotationCommand}
          loadTableContent={handleLoadTableContent}
          saveTableContent={handleSaveTableContent}
          duplicateTableAsset={handleDuplicateTableAsset}
          uploadAttachment={handleUploadAttachment}
          duplicateTextAsset={handleDuplicateTextAsset}
          duplicateFileAsset={handleDuplicateFileAsset}
          duplicateAssetByPath={handleDuplicateAssetByPath}
          getCurrentWorkspace={handleGetCurrentWorkspace}
          cropImage={handleCropImage}
          batchCropAndUpscale={handleBatchCropAndUpscale}
          cropSplit={handleCropSplit}
          extractVideoAudio={handleExtractVideoAudio}
          submitRedraw={handleRedraw}
          submitOutpaint={handleOutpaint}
          submitErase={handleErase}
          submitSuperResolution={handleSuperResolution}
          submitEnhanceVideo={handleEnhanceVideo}
          submitHailuo03VideoSuperResolution={
            handleHailuo03VideoSuperResolution
          }
          submitEraseSubtitle={handleEraseSubtitle}
          submitAsr={handleAsr}
          submitMoveObject={handleMoveObject}
          submitRemoveBg={handleRemoveBg}
          submitLayerDecompose={handleLayerDecompose}
          onUpload={handleUpload}
          uploadFile={handleUploadFile}
          onMediaLineage={logMediaLineage}
          uploadFileToCdn={handleUploadFileToCdn}
          resolveFileUrl={handleResolveFileUrl}
          resolveThumbUrl={handleResolveThumbUrl}
          resolvePluginAssetUrl={handleResolvePluginAssetUrl}
          onPlaceholderUpload={handlePlaceholderUpload}
          videoStarterPresets={videoStarterPresets}
          applyVideoStarterPreset={handleApplyVideoStarterPreset}
          submitTxt2Audio={handleTxt2Audio}
          onRetryGeneration={handleRetryGeneration}
          isRetryGenerationPending={isRetryGenerationPending}
          onCancelGenerationQueue={handleCancelGenerationQueue}
          isCancelGenerationQueuePending={isCancelGenerationQueuePending}
          onCancelGeneration={handleCancelGeneration}
          onDismissUnknownGeneration={handleDismissUnknownGeneration}
          submitDesignVoice={handleDesignVoice}
          submitVoiceIsolation={handleVoiceIsolation}
          fetchAudioModels={fetchAudioModels}
          fetchTtsVoices={fetchTtsVoices}
          submitTxt2Text={handleTxt2Text}
          fetchTextModels={listTextModels}
          onSelectionChange={handleSelectionChange}
          onCanvasEnter={handleCanvasEnterTrack}
          onStickerAdd={handleStickerAddTrack}
          onCanvasViewControl={handleCanvasViewControlTrack}
          onNodeAdd={handleNodeAddTrack}
          onPaneContextMenuAction={handlePaneContextMenuActionTrack}
          onComfyUiDraftAction={handleComfyUiDraftActionTrack}
          onPluginAction={handlePluginActionTrack}
          onNodeAction={handleNodeActionTrack}
          onNodeContentEdit={handleNodeContentEditTrack}
          onParamAdjust={handleParamAdjustTrack}
          onPopoverChipOpen={handlePopoverChipOpenTrack}
          onPopoverCloseWithoutSubmit={handlePopoverCloseWithoutSubmitTrack}
          onPopoverOpen={handlePopoverOpenTrack}
          onPromotionToast={handlePromotionToast}
          renameAsset={handleRenameAsset}
          forkAsset={handleForkAsset}
          splitSubImageToNode={handleSplitSubImageToNode}
          ensureMediaNodeForPath={handleEnsureMediaNodeForPath}
          directReferences={directReferences}
          listLuts={handleListLuts}
          importLut={handleImportLut}
          onLutImport={handleLutImportTrack}
          loadLutContent={handleLoadLutContent}
          deleteLut={handleDeleteLut}
          onReportNodeError={nodeErrorFeedback.onReportNodeError}
          getNodeErrorReportStatus={nodeErrorFeedback.getNodeErrorReportStatus}
          openImageAnnotation={openImageAnnotation}
          pickAsset={handleCanvasPickAsset}
          pluginHost={pluginHost}
          pluginAppInfo={pluginAppInfo}
          onPromoteToAsset={handleToolbarPromoteToAsset}
          getLastUsedModelParams={getLastUsedModelParams}
          saveLastUsedModelParams={saveLastUsedModelParams}
        >
          {annotationDialog}
          <HiloCanvasView
            ref={canvasViewRef}
            dataSource={dataSource}
            plugins={plugins}
            region={runtimeRegion}
            tagColorResolver={quickTags.resolveTagColors}
            tagFilterActive={quickTags.tagFilterActive}
            onHostKeyboardShortcut={quickTags.handleTagFilterKeyboardShortcut}
            onCanvasTasksChange={handleCanvasTasksChange}
            onRenderableContentChange={onRenderableContentChange}
            onResourceDrop={handleResourceDropToCanvas}
            onNativeFileDrop={handleNativeFileDropToCanvas}
            onSystemPaste={handleSystemPasteToCanvas}
            onSystemTextPaste={handleSystemTextPaste}
            onRequestSystemPaste={handleRequestSystemPaste}
            onSystemCopy={handleSystemCopy}
            onDeleteTextFileIfEmpty={handleDeleteTextFileIfEmpty}
            onTextNodeRemoved={handleTextNodeRemoved}
            toolDockBeforeSticker={quickTags.toolDockLabelControl}
            toolDockTrailing={toolDockTrailing}
            utilityControls={
              <div
                className="flex items-center gap-2"
                data-action-ui-id="canvas.utility-controls"
                data-canvas-corner="bottom-right"
              >
                <CanvasWatermarkChip variant="floating" />
              </div>
            }
            toolbarPlacement={toolbarPlacement}
            layoutRelocationKey={layoutRelocationKey}
            onOpenAssets={() => openTab("assets")}
            onOpenHelp={() => setCanvasHelpOpen(true)}
            isActive={isActive}
            isPresented={isPresented}
            workspaceName={workspaceName}
            onNewNodesNavigate={handleNewNodesNavigate}
            onPersistenceControllerChange={handlePersistenceControllerChange}
            onPersistenceStatusChange={handlePersistenceStatusChange}
            onLoadStateChange={setAssetSourceStatus}
            loadingOverlay={
              <CanvasLoadingState
                label={translate("a11y.loading")}
                className="absolute inset-0"
              />
            }
          />
        </CanvasWorkflowBridge>
        {trialGranted.visible && (
          <TrialGrantedPopup onClose={trialGranted.close} />
        )}
        <span
          ref={groupCoachAnchorRef}
          className="pointer-events-none absolute z-20 size-0"
          style={{
            bottom: 16,
            left: 16,
          }}
          aria-hidden={true}
        />
        <GroupCoachMark
          anchorRef={groupCoachAnchorRef}
          selectedCount={selectedNodeCount}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple={true}
          accept={ALL_MEDIA_FILE_ACCEPT}
          className="hidden"
          onChange={handleFileInputChange}
        />
        <AssetPickerDialog
          key={pluginPickerRequest?.openedAt ?? "closed"}
          sourceStatus={assetSourceStatus}
          request={pluginPickerRequest}
          onUploadAndInsert={handlePluginUploadAndInsert}
          onUploadAttachment={handleCanvasUploadAttachment}
          resolveCanvasNodeId={(path) =>
            canvasViewRef.current?.findNodeIdByFilePath(path) ?? null
          }
          tagColorResolver={quickTags.resolveTagColors}
          tagRegistry={quickTags.tagRegistry}
        />
        <QuickZoomPresence value={contextMenu}>
          {(contextMenu, motionProps) => (
            <NodeContextMenu
              motionProps={motionProps}
              position={{
                x: contextMenu.x,
                y: contextMenu.y,
              }}
              targets={contextMenu.targets}
              actions={contextMenu.actions}
              onCopy={handleMenuCopy}
              onSaveAs={handleMenuSaveAs}
              onShowInFolder={handleMenuShowInFolder}
              onAddToChat={handleMenuAddToChat}
              onRename={handleMenuRename}
              onCancelGeneration={handleCancelGeneration}
              tagAssets={contextMenu.targets
                .map((tgt) => tgt.filePath)
                .filter((path) => !!path)
                .map((path) => workspaceAssets.find((asset) => asset.path === path))
                .filter((asset) => !!asset)}
              onClose={closeNodeContextMenu}
            />
          )}
        </QuickZoomPresence>
        {quickTags.quickTagPopover}
        <SaveToProjectAssetsDialog
          state={saveToProjectAssets}
          onOpenChange={(open) => {
            if (!open) setSaveToProjectAssets(null);
          }}
        />
        {promotePopoverElement}
      </div>
    </HtmlFullscreenStoreProvider>
  );
}
