// canvas-area.jsx
import {
  API_PATHS,
  browserAssetSourceMetadata,
  canvasLog,
  CanvasNodeType,
  dedupedToast,
  FolderClosed,
  getRuntimeConfig,
  inferMediaKind,
  logMediaLineage,
  reactExports,
  useAssetMetadataApi,
  useCurrentWorkspace,
  useGatewayScope,
  usePlatform,
  useScopedHttpClient,
  useTranslation,
} from "../vendor.js";
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
import { getFileName as getFileName$1 } from "./uploading-assets.jsx";
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
  isActive: isActive2,
  isPresented,
  workspaceId: workspaceId2,
  workspaceName,
  getTextEditCloseBlockReason,
  toolbarPlacement = "top-right",
  layoutRelocationKey,
}) {
  const { openTab } = useCanvasSidebar();
  const { t: t2, i18n } = useTranslation();
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
    if (isActive2 !== false) return;
    const fullscreenNodeId = htmlFullscreenApi.getState().nodeId;
    if (fullscreenNodeId) htmlFullscreenApi.getState().exit(fullscreenNodeId);
  }, [htmlFullscreenApi, isActive2]);
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    return sessionStore.onPluginEditorOpen(({ nodeId, initialMessage }) => {
      if (initialMessage) {
        workspaceEvents.queuePluginDispatchMessage(nodeId, initialMessage);
      }
      htmlFullscreenApi.getState().enter(nodeId);
    });
  }, [htmlFullscreenApi, isActive2, sessionStore]);
  const modelRegistryStore = useModelRegistryApi();
  const platform2 = usePlatform();
  const clipboardService = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IClipboardService),
      ),
    [],
  );
  const logService2 = reactExports.useMemo(
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
        workspaceId2,
        gatewayBinding?.instanceId ?? "gateway-unbound",
        gatewayBinding?.generation ?? 0,
      ]),
    [
      accountCatalogScopeKey,
      gatewayBinding?.generation,
      gatewayBinding?.instanceId,
      workspaceId2,
    ],
  );
  const gatewayFetch2 = useGatewayFetch();
  const { handleCancelGeneration, handleDismissUnknownGeneration } =
    useGenerationLifecycleActions({
      gatewayFetch: gatewayFetch2,
      t: t2,
    });
  const importExternalToVault = useImportExternalFiles();
  const anchorProjectAssets = useAnchorProjectAssets();
  const gatewayUrl2 = useGatewayUrl();
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
    useNodeContextMenuState(isActive2);
  const canvasViewRef = reactExports.useRef(null);
  const quickTags = useCanvasQuickTags({
    canvasViewRef,
    closeNodeContextMenu,
    isActive: isActive2,
    isPresented,
    toolbarPlacement,
    workspaceAssets,
    workspaceId: workspaceId2,
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
    isImageExtension: isImageExtension2,
    getFileName: getFileName2,
  } = useMediaActions();
  const { data: pricingData } = usePricingConfig();
  const { videoStarterPresets } = useHubClientConfig();
  const {
    status: hailuo03VideoTrialStatus,
    claim: claimHailuo03VideoTrial2,
    refresh: refreshHailuo03VideoTrial,
  } = useHailuo03VideoTrial();
  const nodeErrorFeedback = useCanvasNodeErrorFeedback();
  const { user } = useAuth();
  const trialGranted = useTrialGrantedPopup(user?.userID);
  const { currentWorkspaceId } = useTopbarState();
  const { activateWorkspace } = useTopbarActions();
  const isActiveRef = reactExports.useRef(isActive2 ?? false);
  isActiveRef.current = isActive2 ?? false;
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
      if (!workspaceId2 || nodeIds.length === 0) return;
      const firstId = nodeIds[0];
      navigateAndFocusCanvas(workspaceId2, firstId);
    },
    [workspaceId2, navigateAndFocusCanvas],
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
      const targets = nodes.map((n2) => ({
        nodeId: n2.nodeId,
        nodeType: n2.nodeType,
        filePath: n2.filePath,
        absolutePath:
          n2.filePath && currentWorkspace
            ? joinFilePath(currentWorkspace, n2.filePath)
            : n2.filePath,
        fileType: n2.fileType,
        title: n2.title,
        width: n2.width,
        height: n2.height,
        isMultiImage: n2.isMultiImage,
        isGenerating: n2.isGenerating,
        generationErrorStatus: n2.generationErrorStatus,
      }));
      const point2 = {
        x: event.clientX,
        y: event.clientY,
      };
      setContextMenu({
        ...point2,
        targets,
        // Merge in the desktop-side save actions — canvas doesn't know about
        // the material library / project assets, so the right-click items
        // route through useCanvasAssetPromotion's menu actions.
        actions: {
          ...actions,
          ...promoteMenuActions(point2),
        },
      });
    },
    [currentWorkspace, promoteMenuActions, setContextMenu],
  );
  const handleMenuCopy = reactExports.useCallback(
    (target) => {
      if (!target.absolutePath) return;
      const ext = target.absolutePath.split(".").pop()?.toLowerCase() ?? "";
      if (isImageExtension2(ext)) {
        copyImage(target.absolutePath);
      } else {
        copyFile(target.absolutePath);
      }
    },
    [copyImage, copyFile, isImageExtension2],
  );
  const handleMenuSaveAs = reactExports.useCallback(
    (target) => {
      if (!target.absolutePath) return;
      const fileName = getFileName2(target.absolutePath);
      saveAs(target.absolutePath, fileName);
    },
    [saveAs, getFileName2],
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
      saveAs(absolutePath, fileName ?? getFileName2(absolutePath));
    },
    [currentWorkspace, saveAs, getFileName2],
  );
  const handleNodeSaveUrlAs = reactExports.useCallback(
    (url2, fileName) => {
      if (!url2) return;
      const resolvedUrl =
        url2.startsWith("/files/") || url2.startsWith("/api/")
          ? (gatewayUrl2(url2) ?? url2)
          : url2;
      saveAs(resolvedUrl, fileName ?? getFileName2(resolvedUrl));
    },
    [gatewayUrl2, saveAs, getFileName2],
  );
  const resolveDownloadSource = reactExports.useCallback(
    (filePath) => {
      if (filePath.startsWith("/files/") || filePath.startsWith("/api/")) {
        return gatewayUrl2(filePath) ?? filePath;
      }
      if (/^[a-z][a-z\d+.-]*:/i.test(filePath) || filePath.startsWith("/")) {
        return filePath;
      }
      return currentWorkspace
        ? joinFilePath(currentWorkspace, filePath)
        : filePath;
    },
    [currentWorkspace, gatewayUrl2],
  );
  const handleNodeSaveManyAs = reactExports.useCallback(
    (files) => {
      const resolvedFiles = files
        .filter((file) => file.filePath)
        .map((file) => {
          const absolutePath = resolveDownloadSource(file.filePath);
          return {
            filePath: absolutePath,
            fileName: file.fileName ?? getFileName2(absolutePath),
          };
        });
      saveManyAs(resolvedFiles);
    },
    [resolveDownloadSource, saveManyAs, getFileName2],
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
            ? `${target.title || t2("canvas.table.untitled", "Untitled table")}.htable`
            : (target.filePath.split("/").pop() ?? target.filePath);
        workspaceEvents.fireAddToChat(target.filePath, filename, target.nodeId);
      }
    },
    [t2],
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
    (session, active2) => {
      if (!workspaceId2) return;
      if (active2) closeNodeContextMenu();
      workspaceEvents.fireTextEditActive(workspaceId2, session, active2);
      gatewayFetch2("/api/canvas/text-edit-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeId: session.nodeId,
          editSessionId: session.editSessionId,
          active: active2,
        }),
      }).catch((err) => {
        console.warn("[CanvasArea] text-edit-state sync failed:", err);
      });
    },
    [workspaceId2, gatewayFetch2, closeNodeContextMenu],
  );
  const trackPluginEditActiveChange = usePluginEditorActiveChangeTracking(
    workspaceId2,
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
      if (!workspaceId2) return;
      workspaceEvents.fireTextNodeRemoved(workspaceId2, nodeId);
    },
    [workspaceId2],
  );
  const handleTextEditSelectionChange = reactExports.useCallback(
    (session, selection2) => {
      if (!workspaceId2) return;
      workspaceEvents.fireTextEditSelection(workspaceId2, session, selection2);
    },
    [workspaceId2],
  );
  const handleAnnotationsChange = reactExports.useCallback(
    (session, annotations) => {
      if (!workspaceId2) return;
      workspaceEvents.fireAnnotationsChanged(
        workspaceId2,
        session,
        annotations,
      );
    },
    [workspaceId2],
  );
  const handleAnnotationActivate = reactExports.useCallback(
    (session, id2) => {
      if (!workspaceId2) return;
      workspaceEvents.fireAnnotationActivated(workspaceId2, session, id2);
    },
    [workspaceId2],
  );
  const subscribeAnnotationCommand = reactExports.useCallback(
    (session, cb) => {
      const d2 = workspaceEvents.onAnnotationCommand((e2) => {
        if (
          e2.workspaceId !== workspaceId2 ||
          e2.nodeId !== session.nodeId ||
          e2.editSessionId !== session.editSessionId
        ) {
          return;
        }
        cb(e2.command);
      });
      return () => d2.dispose();
    },
    [workspaceId2],
  );
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await gatewayFetch2("/api/plugins");
        if (!resp.ok) return;
        const data2 = await resp.json();
        if (cancelled) return;
        const list2 = data2.plugins ?? [];
        setPluginMetas(
          list2.map((p3) => ({
            id: p3.id,
            name: p3.name,
            description: p3.description,
            iconUrl: p3.iconUrl,
            version: p3.version,
            source: p3.source,
            displayMode: p3.displayMode,
            agent: p3.agent,
          })),
        );
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [gatewayFetch2]);
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
    workspaceId: workspaceId2,
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
      t: t2,
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
    (nodeId, pending2) => {
      const current2 = retryGenerationNodeIdsRef.current;
      if (current2.has(nodeId) === pending2) return;
      const next2 = new Set(current2);
      if (pending2) {
        next2.add(nodeId);
      } else {
        next2.delete(nodeId);
      }
      retryGenerationNodeIdsRef.current = next2;
      setRetryGenerationNodeIds(next2);
    },
    [],
  );
  const isRetryGenerationPending = reactExports.useCallback(
    (nodeId) => retryGenerationNodeIds.has(nodeId),
    [retryGenerationNodeIds],
  );
  const setCancelQueuePending = reactExports.useCallback((nodeId, pending2) => {
    const current2 = cancelQueueNodeIdsRef.current;
    if (current2.has(nodeId) === pending2) return;
    const next2 = new Set(current2);
    if (pending2) {
      next2.add(nodeId);
    } else {
      next2.delete(nodeId);
    }
    cancelQueueNodeIdsRef.current = next2;
    setCancelQueueNodeIds(next2);
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
        const resp = await gatewayFetch2(API_PATHS.generationQueueCancel, {
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
        dedupedToast.success(t2("canvas.queueCancelSubmitted"));
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
        dedupedToast.error(t2("canvas.queueCancelFailed"));
      } finally {
        setCancelQueuePending(nodeId, false);
      }
    },
    [gatewayFetch2, setCancelQueuePending, t2],
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
          dedupedToast.success(t2("canvas.retryGeneration.submitted"));
        }
      } catch (err) {
        console.error("[canvas] retry generation failed:", err);
        dedupedToast.error(t2("canvas.retryGeneration.failed"));
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
      t2,
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
            t2("canvas.voiceIsolate.error", {
              defaultValue: "Voice isolation failed",
            }),
          );
        }
      } catch (err) {
        console.error("[canvas] voice isolation failed:", err);
        dedupedToast.error(
          t2("canvas.voiceIsolate.error", {
            defaultValue: "Voice isolation failed",
          }),
        );
      }
    },
    [httpClient, t2],
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
    async (filePath, content2) => {
      await httpClient.writeContent(filePath, content2);
    },
    [httpClient],
  );
  const handleDeleteTextFileIfEmpty = reactExports.useCallback(
    async (filePath) => {
      try {
        const content2 = await readAssetContent({
          path: filePath,
        });
        if (content2.trim().length > 0) return;
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
        assetMetadataStore.setState((state2) => {
          const next2 = new Map(state2.assets);
          for (const [key2, meta2] of next2) {
            if (meta2.path === currentPath) {
              next2.set(key2, {
                ...meta2,
                path: newPath,
                name: newDisplayName,
              });
            }
          }
          return {
            assets: next2,
          };
        });
        workspaceEvents.fireAssetRenamed(currentPath, newPath, newDisplayName);
        return res.new_path;
      } catch {
        dedupedToast.error(t2("canvas.renameFailed"));
        return null;
      }
    },
    [assetMetadataStore, httpClient, t2],
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
          (m3) => m3.path === sourcePath,
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
        dedupedToast.error(t2("canvas.renameFailed"));
        return null;
      }
    },
    [assetMetadataStore, assetMutator, httpClient, t2],
  );
  const handleSplitSubImageToNode = reactExports.useCallback(
    async (nodeId, imageIds) => {
      try {
        const res = await gatewayFetch2("/api/canvas/split-sub-images", {
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
        const data2 = await res.json();
        return {
          splitNodeIds: data2.splitNodeIds ?? [],
        };
      } catch {
        return null;
      }
    },
    [gatewayFetch2],
  );
  const directReferences = useCanvasReferenceBridge();
  const { handleLoadTextContent, handleResolveFileUrl, handleResolveThumbUrl } =
    useCanvasResourceResolvers(httpClient);
  const textVersionsBridge = reactExports.useMemo(
    () => ({
      list: (path2) =>
        httpClient.listTextVersions({
          path: path2,
        }),
      save: (req) => httpClient.saveTextVersion(req),
      readContent: (id2, range2) =>
        httpClient.readTextVersionContent(id2, range2),
      diff: (params) => httpClient.diffTextVersion(params),
      restore: (id2, body2) => httpClient.restoreTextVersion(id2, body2 ?? {}),
      materializeToCanvas: async (id2, opts) => {
        const created = await httpClient.materializeTextVersion(id2);
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
      update: (id2, patch2) => httpClient.updateTextVersion(id2, patch2),
      remove: async (id2) => {
        await httpClient.deleteTextVersion(id2);
      },
    }),
    [httpClient, sessionStore],
  );
  const handleSaveTableContent = reactExports.useCallback(
    async (filePath, content2) => {
      await httpClient.writeContent(filePath, content2);
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
      const content2 = await httpClient.readContent(filePath);
      const res = await httpClient.writeContent(newTablePath(), content2);
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
      const content2 = await httpClient.readContent(filePath);
      const fileName = getFileName$1(filePath);
      const parentDir = getParentDir(filePath);
      const desiredName = generateCopyName(fileName, false);
      const desiredPath = parentDir
        ? joinFilePath(parentDir, desiredName)
        : desiredName;
      const res = await assetMutator.writeText(desiredPath, content2, {
        unique: true,
      });
      if (!res.assetId) {
        throw new Error(
          `Failed to create duplicated text asset for ${filePath}`,
        );
      }
      const finalName = getFileName$1(res.path);
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
      const fileName = getFileName$1(filePath);
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
      const resp = await gatewayFetch2(API_PATHS.importExternal, {
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
      const data2 = await resp.json();
      const imported = data2.imported?.[0];
      if (!imported) {
        const reason = data2.errors?.[0]?.error ?? "no imported entry";
        throw new Error(`importExternal returned no asset (${reason})`);
      }
      return {
        assetId: imported.id,
        url: httpClient.fileUrlById(imported.id),
        name: getFileName$1(imported.path),
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
    [currentWorkspace, gatewayFetch2, httpClient],
  );
  const handleGetCurrentWorkspace = reactExports.useCallback(
    () => currentWorkspace ?? void 0,
    [currentWorkspace],
  );
  const handleCropImage = reactExports.useCallback(
    async (sourceNodeId, blob, filename, position2) => {
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
          position: position2,
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
    async (sourceNodeId, cells2, multiplier, groupLabel) => {
      try {
        const groupResp = await gatewayFetch2("/api/canvas/placeholder-group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceNodeId,
            cells: cells2.map((c3) => ({
              // AddPlaceholderGroupDto marks prompt/model @IsNotEmpty — use the
              // tool name as the visible footer label (loading card shows it).
              prompt: "Super Resolution",
              model: "Super Resolution",
              ...(c3.aspectRatio
                ? {
                    aspectRatio: c3.aspectRatio,
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
            t2(
              "canvas.splitGrid.placeholderFailed",
              "占位节点创建失败，请重试",
            ),
          );
          return;
        }
        const { placeholderIds } = await groupResp.json();
        if (!placeholderIds || placeholderIds.length === 0) {
          dedupedToast.error(
            t2("canvas.splitGrid.noPlaceholders", "未能创建占位节点，请重试"),
          );
          return;
        }
        setTimeout(() => {
          canvasViewRef.current?.focusNodeIds(placeholderIds);
        }, 150);
        const results = await Promise.allSettled(
          cells2.map(async (cell, i2) => {
            const pid = placeholderIds[i2];
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
            let uploadBlob2 = cell.blob;
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
              uploadBlob2 = prepped;
            }
            const file = new File([uploadBlob2], cell.filename, {
              type: uploadBlob2.type || "image/png",
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
        results.forEach((r2, i2) => {
          if (r2.status === "rejected") {
            failedCount++;
            console.error("[canvas] grid-split cell generation failed:", {
              cellIndex: i2,
              reason: r2.reason,
            });
          }
        });
        if (failedCount === 0) {
          return;
        }
        if (failedCount < cells2.length) {
          dedupedToast.warning(
            t2("canvas.splitGrid.partialFail", "{{count}} 个宫格生成失败", {
              count: failedCount,
            }),
          );
        } else {
          dedupedToast.error(
            t2("canvas.splitGrid.batchFailed", "宫格高清组生成失败，请重试"),
          );
        }
      } catch (err) {
        console.error("[canvas] grid-split batch failed:", err);
        dedupedToast.error(
          t2("canvas.splitGrid.batchFailed", "宫格切分高清生成失败，请重试"),
        );
      }
    },
    [assetMutator, gatewayFetch2, httpClient, t2],
  );
  const handleCropSplit = reactExports.useCallback(
    async (sourceNodeId, cells2, groupLabel, options) => {
      try {
        const uploads = await Promise.allSettled(
          cells2.map(async (cell) => {
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
          .filter((r2) => r2.status === "fulfilled")
          .map((r2) => r2.value);
        const failedUploads = uploads.length - assetIds.length;
        if (failedUploads > 0) {
          console.error(
            `[canvas] crop-split: ${failedUploads} cell upload(s) failed`,
          );
        }
        if (assetIds.length === 0) {
          dedupedToast.error(
            t2("canvas.splitGrid.noPlaceholders", "未能创建占位节点，请重试"),
          );
          return;
        }
        const resp = await gatewayFetch2("/api/canvas/nodes-group", {
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
            t2("canvas.splitGrid.batchFailed", "宫格高清组生成失败，请重试"),
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
          t2("canvas.splitGrid.batchFailed", "宫格切分高清生成失败，请重试"),
        );
      }
    },
    [assetMutator, gatewayFetch2, t2],
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
          dedupedToast.error(res.error || t2("canvas.extractAudio.error"));
          return;
        }
        if (res.warnings?.includes("silent_video_failed")) {
          dedupedToast.warning(t2("canvas.extractAudio.silentVideoFailed"));
        }
      } catch (err) {
        console.error("[canvas] extract audio failed:", err);
        dedupedToast.error(t2("canvas.extractAudio.error"));
      }
    },
    [httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.redraw.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.outpaint.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.erase.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.superResolution.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
                t2("canvas.enhanceVideo.error", "高清 & 补帧失败，请重试"),
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
            t2("canvas.enhanceVideo.error", "高清 & 补帧失败，请重试"),
          ),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          t2("canvas.eraseSubtitle.error", "字幕消除失败，请重试"),
        );
      }
    },
    [httpClient, t2],
  );
  const handleAsr = reactExports.useCallback(
    async (nodeId, sourceVideoPath, language2) => {
      const built = buildAsrGatewayRequest({
        mediaPath: sourceVideoPath,
        language: language2,
        sourceNodeId: nodeId,
        filename: `asr-${nodeId}`,
      });
      if (!built.ok) {
        dedupedToast.error(t2("canvas.asr.error", "字幕生成失败，请重试"));
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
          language2 === "other"
            ? "canvas.asr.error.whisper"
            : "canvas.asr.error";
        const fallback =
          language2 === "other"
            ? "其他语言识别失败，请重试"
            : "字幕生成失败，请重试";
        console.error("[canvas] asr failed:", err);
        dedupedToast.error(t2(errorKey, fallback));
      }
    },
    [httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.removeBg.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.layerDecompose.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
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
          pickEditErrorMessage(err, t2("canvas.moveObject.error")),
          {
            id: canvasGenerationErrorToastId,
          },
        );
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
  );
  const runCanvasAddSession = reactExports.useCallback(
    async (fn2) => {
      const endSession = dataSource?.beginCanvasAddSession?.();
      try {
        return await fn2();
      } finally {
        endSession?.();
      }
    },
    [dataSource],
  );
  const handleApplyVideoStarterPreset = reactExports.useCallback(
    async ({
      videoNodeId,
      preset: preset2,
      videoNodePosition,
      videoNodeSize,
    }) => {
      await canvasViewRef.current?.flushPersistence().catch(() => void 0);
      const { files, failed } = await fetchVideoStarterRefs(preset2.refs);
      if (failed.length > 0) {
        dedupedToast.error(
          t2("canvas.videoStarter.refDownloadFailed", {
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
      const sizes = files.map(({ file }, i2) =>
        resolveNodeSize(file, measured[i2]),
      );
      const GAP_X = 80;
      const GAP_Y = 40;
      const maxRefWidth = Math.max(...sizes.map((size2) => size2.width));
      const totalRefHeight =
        sizes.reduce((sum2, size2) => sum2 + size2.height, 0) +
        GAP_Y * (sizes.length - 1);
      const x2 = videoNodePosition.x - maxRefWidth - GAP_X;
      let y4 =
        videoNodePosition.y +
        ((videoNodeSize?.height ?? 0) - totalRefHeight) / 2;
      const createdNodeIds = [];
      await runCanvasAddSession(async () => {
        for (let i2 = 0; i2 < files.length; i2++) {
          const { ref, file } = files[i2];
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
                t2("canvas.videoStarter.refApplyFailed", {
                  name: ref.name,
                }),
              );
              continue;
            }
            const added = await httpClient.addCanvasNode({
              assetId: uploadRes.id,
              position: {
                x: x2,
                y: y4,
              },
              targetNodeId: videoNodeId,
            });
            if (added.nodeId) createdNodeIds.push(added.nodeId);
            y4 += sizes[i2].height + GAP_Y;
          } catch (err) {
            console.error("[canvas] starter ref add failed:", ref.name, err);
            dedupedToast.error(
              t2("canvas.videoStarter.refApplyFailed", {
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
    [assetMutator, httpClient, runCanvasAddSession, sessionStore, t2],
  );
  const handleUpload = reactExports.useCallback((position2, options) => {
    uploadPositionRef.current = position2;
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
      const key2 = nodeIds.join(",");
      if (key2 === lastSelectionSentRef.current) return;
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        selectionTimerRef.current = null;
        lastSelectionSentRef.current = key2;
        gatewayFetch2("/api/canvas/selection", {
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
    [gatewayFetch2, quickTags.handleQuickTagSelectionChange],
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
    async (content2) => {
      try {
        const res = await assetMutator.writeText(
          "Untitled.md",
          content2 ?? "",
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
        const name2 = res.path.split("/").pop() ?? "Untitled.md";
        return {
          assetId: res.assetId,
          name: name2,
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
    async (content2) => {
      try {
        return await assetMutator.createTextAsset(content2);
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
    async (e2) => {
      const files = e2.target.files;
      if (!files || files.length === 0) return;
      const position2 = uploadPositionRef.current;
      const fileList = Array.from(files);
      await runCanvasAddSession(async () => {
        const measured = await Promise.all(
          fileList.map((file) => measureMediaSize(file)),
        );
        const sizes = fileList.map((file, i2) =>
          resolveNodeSize(file, measured[i2]),
        );
        const positions = computeGridDropPositions(position2, sizes);
        for (let i2 = 0; i2 < fileList.length; i2++) {
          const file = fileList[i2];
          try {
            const res = await assetMutator.upload(file, file.name, void 0, {
              source: "file-picker",
            });
            if (!res.id) continue;
            await httpClient.addCanvasNode({
              assetId: res.id,
              position: positions[i2],
            });
          } catch (err) {
            console.error("[canvas] File upload failed:", file.name, err);
          }
        }
      });
      e2.target.value = "";
      sessionStore.notifyFileChanged();
    },
    [assetMutator, httpClient, sessionStore, runCanvasAddSession],
  );
  const addCanvasAssetsAtPosition = reactExports.useCallback(
    async (assetIds, position2, sizes) => {
      const resolvedSizes = assetIds.map(
        (_2, i2) => sizes?.[i2] ?? defaultNodeSizeForKind(void 0),
      );
      const positions = position2
        ? computeGridDropPositions(position2, resolvedSizes)
        : void 0;
      for (const [index2, assetId] of assetIds.entries()) {
        await httpClient.addCanvasNode({
          assetId,
          ...(positions
            ? {
                position: positions[index2],
              }
            : {}),
        });
      }
    },
    [httpClient],
  );
  const handleResourceDropToCanvas = reactExports.useCallback(
    async (items, position2, source = "resource_drag", onAdded) => {
      await runCanvasAddSession(async () => {
        const assetIds = [];
        const sizes = [];
        const nodeTypes2 = [];
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
              nodeTypes2.push("text");
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
            nodeTypes2.push(item.type);
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
              nodeTypes2.push(asMediaType(row.type) ?? "file");
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
                  nodeTypes2.push(asMediaType(row.type) ?? "file");
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
              t2("localAssets.importFailed", {
                name: file.name,
              }),
            );
          }
        }
        if (assetIds.length > 0) {
          await addCanvasAssetsAtPosition(assetIds, position2, sizes);
        }
        if (htableFiles.length > 0) {
          const tablePositions =
            assetIds.length === 0 && position2
              ? computeGridDropPositions(
                  position2,
                  htableFiles.map(() => TABLE_CARD_DEFAULT_SIZE),
                )
              : void 0;
          for (const [index2, file] of htableFiles.entries()) {
            const importTable = async () => {
              try {
                await importHtableToCanvas(
                  file,
                  gatewayFetch2,
                  tablePositions?.[index2],
                );
                nodeTypes2.push("table");
              } catch (err) {
                console.error(
                  "[canvas] .htable import failed:",
                  file.absolutePath,
                  err,
                );
                dedupedToast.error(
                  err instanceof HtableParseError
                    ? t2("canvas.table.importFailed", {
                        name: file.name,
                      })
                    : t2("localAssets.importFailed", {
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
                  t2("localAssets.importFailed", {
                    name: file.name,
                  }),
                );
              }
            } else {
              await importTable();
            }
          }
        }
        if (nodeTypes2.length === 0) return;
        onAdded?.();
        const canvasId = currentWorkspace
          ? folderNameFromPath(currentWorkspace)
          : void 0;
        for (const nodeType of nodeTypes2) {
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
      gatewayFetch2,
      handleDuplicateTextAsset,
      importExternalToVault,
      runCanvasAddSession,
      t2,
    ],
  );
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
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
  }, [handleResourceDropToCanvas, isActive2]);
  const handleNativeFileDropToCanvas = reactExports.useCallback(
    async (files, position2) => {
      const paths = files
        .map((file) => window.hilo?.webUtils?.getPathForFile(file))
        .filter(
          (filePath) => typeof filePath === "string" && filePath.length > 0,
        );
      if (paths.length === 0) return;
      const htablePaths = paths.filter((p3) => isHtableFileName(p3));
      const mediaPaths = paths.filter((p3) => !isHtableFileName(p3));
      await runCanvasAddSession(async () => {
        try {
          if (htablePaths.length > 0) {
            const tablePositions =
              mediaPaths.length === 0
                ? computeGridDropPositions(
                    position2,
                    htablePaths.map(() => TABLE_CARD_DEFAULT_SIZE),
                  )
                : void 0;
            for (const [index2, absolutePath] of htablePaths.entries()) {
              const name2 = absolutePath.split(/[\\/]/).pop() ?? absolutePath;
              try {
                await importHtableToCanvas(
                  {
                    absolutePath,
                    name: name2,
                  },
                  gatewayFetch2,
                  tablePositions?.[index2],
                );
              } catch (err) {
                console.error(
                  "[canvas] .htable drop import failed:",
                  absolutePath,
                  err,
                );
                dedupedToast.error(
                  err instanceof HtableParseError
                    ? t2("canvas.table.importFailed", {
                        name: name2,
                      })
                    : t2("localAssets.importFailed", {
                        name: name2,
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
          await addCanvasAssetsAtPosition(assetIds, position2, sizes);
        } catch (err) {
          console.error("[canvas] Native file drop import failed:", err);
        }
      });
    },
    [
      addCanvasAssetsAtPosition,
      gatewayFetch2,
      importExternalToVault,
      runCanvasAddSession,
      t2,
    ],
  );
  const handleSkillDropToCanvas = reactExports.useCallback(
    async (data2) => {
      try {
        await gatewayFetch2("/api/canvas/text-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: `/${data2.name}`,
            name: `${data2.name}.md`,
          }),
        });
        sessionStore.notifyFileChanged();
      } catch (err) {
        console.error("[canvas] Skill drop to canvas failed:", err);
      }
    },
    [gatewayFetch2, sessionStore],
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
            t2("skills.plugin.installingToCanvas", {
              name: args.pluginId,
            }),
            {
              id: toastId,
            },
          );
          const installResp = await gatewayFetch2(API_PATHS.marketInstall, {
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
            const body2 = await installResp.text();
            throw new Error(`install ${installResp.status}: ${body2}`);
          }
          const installData = await installResp.json();
          if (!installData.ok)
            throw new Error(installData.error ?? "install failed");
          dedupedToast.dismiss(toastId);
          try {
            const listResp = await gatewayFetch2("/api/plugins");
            if (listResp.ok) {
              const listData = await listResp.json();
              setPluginMetas(
                (listData.plugins ?? []).map((p3) => ({
                  id: p3.id,
                  name: p3.name,
                  description: p3.description,
                  iconUrl: p3.iconUrl,
                  version: p3.version,
                  source: p3.source,
                  displayMode: p3.displayMode,
                  agent: p3.agent,
                })),
              );
            }
          } catch {}
          pluginEvents.firePluginsChanged(args.pluginId, "installed");
        } catch (err) {
          const message2 = err instanceof Error ? err.message : String(err);
          console.error("[canvas] Plugin install-before-add failed:", err);
          dedupedToast.error(
            t2("skills.plugin.addFailed", {
              error: message2,
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
        gatewayFetch: gatewayFetch2,
        t: t2,
      });
    },
    [currentWorkspace, gatewayFetch2, t2],
  );
  const handlePluginDropToCanvas = reactExports.useCallback(
    async (data2, position2, sourceNodeIds) => {
      const needsInstall = data2.installed === false;
      const toastId = needsInstall ? `plugin-drop-${data2.id}` : void 0;
      try {
        if (needsInstall) {
          dedupedToast.loading(
            t2("skills.plugin.installingToCanvas", {
              name: data2.name,
            }),
            {
              id: toastId,
            },
          );
          const installResp = await gatewayFetch2(API_PATHS.marketInstall, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: data2.id,
              skillType: "plugin",
            }),
          });
          if (!installResp.ok) {
            const body2 = await installResp.text();
            throw new Error(`install ${installResp.status}: ${body2}`);
          }
          const installData = await installResp.json();
          if (!installData.ok)
            throw new Error(installData.error ?? "install failed");
        }
        const nodeId = await instantiatePluginOnCanvas(
          {
            pluginId: data2.id,
            position: position2,
            sourceNodeIds,
          },
          {
            currentWorkspace,
            gatewayFetch: gatewayFetch2,
            t: t2,
          },
        );
        if (toastId) dedupedToast.dismiss(toastId);
        return nodeId;
      } catch (err) {
        const message2 = err instanceof Error ? err.message : String(err);
        console.error("[canvas] Plugin drop to canvas failed:", err);
        dedupedToast.error(
          t2("skills.plugin.addFailed", {
            error: message2,
          }),
          {
            id: toastId,
          },
        );
        return null;
      }
    },
    [currentWorkspace, gatewayFetch2, t2],
  );
  const handleUploadFile = reactExports.useCallback(
    (file) => uploadCanvasReferenceFile(file, gatewayFetch2),
    [gatewayFetch2],
  );
  const handleUploadFileToCdn = reactExports.useCallback(
    (file) => uploadCanvasFileToCdn(file, gatewayFetch2),
    [gatewayFetch2],
  );
  const handleResolvePluginAssetUrl = reactExports.useCallback(
    (pluginId, entryPath) => {
      const safePath = entryPath
        .replace(/^\/+/, "")
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      return (
        gatewayUrl2(
          `/api/plugins/${encodeURIComponent(pluginId)}/static/${safePath}`,
        ) ?? ""
      );
    },
    [gatewayUrl2],
  );
  const handleListLuts = reactExports.useCallback(async () => {
    const resp = await gatewayFetch2("/api/luts");
    const data2 = await resp.json();
    return data2.luts ?? [];
  }, [gatewayFetch2]);
  const handleImportLut = reactExports.useCallback(
    async (file) => {
      const form = new FormData();
      form.append("file", file, file.name);
      const resp = await gatewayFetch2("/api/luts/import", {
        method: "POST",
        body: form,
      });
      return await resp.json();
    },
    [gatewayFetch2],
  );
  const handleLutImportTrack = reactExports.useCallback((info2) => {
    const base2 = {
      node_type: info2.nodeType,
      source: "color_adjust_dialog",
    };
    if (info2.phase === "click") {
      trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_CLICK, {
        ...base2,
      });
      return;
    }
    const fileSize = info2.fileSize ?? 0;
    const durationMs = info2.durationMs ?? 0;
    if (info2.phase === "success") {
      trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_SUCCESS, {
        ...base2,
        file_size: fileSize,
        duration_ms: durationMs,
      });
      return;
    }
    const isNetworkError = info2.error instanceof TypeError;
    trackEvent(TRACK_EVENTS.CANVAS_LUT_IMPORT_FAILED, {
      ...base2,
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
    async (name2) => {
      const resp = await gatewayFetch2(
        `/api/luts/content?name=${encodeURIComponent(name2)}`,
      );
      const data2 = await resp.json();
      return data2.content;
    },
    [gatewayFetch2],
  );
  const handleDeleteLut = reactExports.useCallback(
    async (name2) => {
      await gatewayFetch2(`/api/luts/${encodeURIComponent(name2)}`, {
        method: "DELETE",
      });
    },
    [gatewayFetch2],
  );
  const handleSystemPasteToCanvas = reactExports.useCallback(
    async (files, position2, source) => {
      if (files.length === 0) return [];
      const addedNodeIds = [];
      await runCanvasAddSession(async () => {
        let positions;
        if (position2) {
          const measured = await Promise.all(
            files.map((file) => measureMediaSize(file)),
          );
          const sizes = files.map((file, i2) =>
            resolveNodeSize(file, measured[i2]),
          );
          const anchor = {
            x: position2.x - sizes[0].width / 2,
            y: position2.y - sizes[0].height / 2,
          };
          positions = computeGridDropPositions(anchor, sizes);
        }
        await Promise.all(
          files.map(async (file, i2) => {
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
                      position: positions[i2],
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
    isActive2,
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
    dedupedToast.error(t2("canvas.pasteFailed") + detail);
  }, [clipboardService, t2]);
  const handleSystemTextPaste = reactExports.useCallback(
    async (text2, position2) => {
      await runCanvasAddSession(async () => {
        const created = await handleCreateTextAsset(text2);
        if (!created) return;
        try {
          await httpClient.addCanvasNode({
            assetId: created.assetId,
            position: {
              x: position2.x - TEXT_CARD_DEFAULT_SIZE.width / 2,
              y: position2.y - TEXT_CARD_DEFAULT_SIZE.height / 2,
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
      const node2 = nodes[0];
      if (node2.type === CanvasNodeType.Image) {
        return buildImageCopyPayload(node2, assetMetadataStore);
      }
      if (
        node2.type === CanvasNodeType.Video ||
        node2.type === CanvasNodeType.Audio
      ) {
        if (platform2.app.os !== "darwin") return null;
        const meta2 = getAssetMetaByNodeIdFromStore(
          assetMetadataStore,
          node2.id,
        );
        if (!meta2?.path || !currentWorkspace) return null;
        const absPath = joinFilePath(currentWorkspace, meta2.path);
        try {
          await platform2.clipboard.writeFile?.(absPath);
        } catch (err) {
          console.warn("[canvas] media copy file ref failed:", err);
          return null;
        }
        return {
          kind: "native",
        };
      }
      if (node2.type === CanvasNodeType.Text) {
        const meta2 = getAssetMetaByNodeIdFromStore(
          assetMetadataStore,
          node2.id,
        );
        if (!meta2?.path) return null;
        try {
          const content2 = await httpClient.readContent(meta2.path);
          if (content2) {
            await navigator.clipboard.writeText(content2);
            setCopiedSystemText(content2);
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
    [assetMetadataStore, currentWorkspace, httpClient, platform2],
  );
  const handleCanvasSkillDragOver = reactExports.useCallback((e2) => {
    const types2 = e2.dataTransfer.types;
    if (!types2.includes(SKILL_DRAG_MIME) && !types2.includes(PLUGIN_DRAG_MIME))
      return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "copy";
  }, []);
  const handleCanvasSkillDrop = reactExports.useCallback(
    (e2) => {
      const pluginRaw = e2.dataTransfer.getData(PLUGIN_DRAG_MIME);
      if (pluginRaw) {
        e2.preventDefault();
        e2.stopPropagation();
        try {
          const data2 = JSON.parse(pluginRaw);
          const position2 = canvasViewRef.current?.clientToFlowPosition(
            e2.clientX,
            e2.clientY,
          );
          handlePluginDropToCanvas(data2, position2);
        } catch {}
        return;
      }
      const skillRaw = e2.dataTransfer.getData(SKILL_DRAG_MIME);
      if (!skillRaw) return;
      e2.preventDefault();
      e2.stopPropagation();
      try {
        const data2 = JSON.parse(skillRaw);
        handleSkillDropToCanvas(data2);
      } catch {}
    },
    [handlePluginDropToCanvas, handleSkillDropToCanvas],
  );
  const dropEntityById = reactExports.useCallback(
    (entityId, position2, attachmentIds) => {
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
              ...(position2
                ? {
                    position: position2,
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
          dedupedToast.error(t2("canvas.entityDrop.error"));
        }
      })();
    },
    [
      dropEntityMutation,
      materializeEntityMutation,
      currentWorkspace,
      sessionStore,
      t2,
    ],
  );
  const handleCanvasEntityDrop = reactExports.useCallback(
    (e2) => {
      const payload = readEntityDragData(e2);
      if (!payload) return;
      e2.preventDefault();
      e2.stopPropagation();
      const position2 = canvasViewRef.current?.clientToFlowPosition(
        e2.clientX,
        e2.clientY,
      );
      dropEntityById(payload.entityId, position2);
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
    const locate = (path2) => {
      if (!canvasViewRef.current?.findNodeIdsByFilePaths([path2]).length)
        return void 0;
      return () => {
        const nodeIds =
          canvasViewRef.current?.findNodeIdsByFilePaths([path2]) ?? [];
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
          t2("canvas.locate.notOnCanvas", {
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
  }, [canvasLocateMissingToastId, currentWorkspace, t2]);
  const handleCanvasDragOver = reactExports.useCallback(
    (e2) => {
      if (e2.dataTransfer.types.includes(ENTITY_DRAG_MIME)) {
        e2.preventDefault();
        e2.dataTransfer.dropEffect = "copy";
        return;
      }
      handleCanvasSkillDragOver(e2);
    },
    [handleCanvasSkillDragOver],
  );
  const handleCanvasDrop = reactExports.useCallback(
    (e2) => {
      if (e2.dataTransfer.types.includes(ENTITY_DRAG_MIME)) {
        handleCanvasEntityDrop(e2);
        return;
      }
      handleCanvasSkillDrop(e2);
    },
    [handleCanvasEntityDrop, handleCanvasSkillDrop],
  );
  const workspaceRef = reactExports.useRef(currentWorkspace);
  workspaceRef.current = currentWorkspace;
  const handleCanvasEnterTrack = reactExports.useCallback((info2) => {
    const canvasId = workspaceRef.current
      ? folderNameFromPath(workspaceRef.current)
      : "";
    if (!canvasId) return;
    trackEvent(TRACK_EVENTS.CANVAS_VIEW_ENTER, {
      canvas_id: canvasId,
      node_count: info2.nodeCount,
    });
  }, []);
  const handleStickerAddTrack = reactExports.useCallback((info2) => {
    trackEvent(TRACK_EVENTS.CANVAS_STICKER_ADD, {
      sticker_id: info2.stickerId,
      cloud_task_id: info2.cloudTaskId,
    });
  }, []);
  const handleCanvasViewControlTrack = reactExports.useCallback((info2) => {
    if (info2.action === "minimap_toggle") {
      if (info2.minimapVisible === void 0) return;
      trackEvent(TRACK_EVENTS.CANVAS_MINIMAP_TOGGLE, {
        source: "toolbar",
        visible: info2.minimapVisible,
      });
      return;
    }
    if (info2.action === "edges_toggle") {
      if (info2.edgesVisible === void 0) return;
      trackEvent(TRACK_EVENTS.CANVAS_EDGES_TOGGLE, {
        source: "toolbar",
        visible: info2.edgesVisible,
      });
      return;
    }
    if (info2.zoomBefore === void 0) return;
    trackEvent(TRACK_EVENTS.CANVAS_ZOOM_CHANGE, {
      direction: info2.action,
      source: "toolbar",
      zoom_before: info2.zoomBefore,
      zoom_after: info2.zoomAfter,
    });
  }, []);
  const lastPopoverOpenRef = reactExports.useRef(null);
  const handlePopoverOpenTrack = reactExports.useCallback((info2) => {
    const now2 = Date.now();
    const key2 = `${info2.popoverType}:${info2.nodeId}`;
    const previous2 = lastPopoverOpenRef.current;
    if (previous2?.key === key2 && now2 - previous2.timestamp < 1e3) return;
    lastPopoverOpenRef.current = {
      key: key2,
      timestamp: now2,
    };
    trackEvent(TRACK_EVENTS.CANVAS_POPOVER_OPEN, {
      popover_type: info2.popoverType,
      node_id: info2.nodeId,
      has_default: info2.hasDefault,
    });
  }, []);
  const handlePromotionToast = reactExports.useCallback((info2) => {
    const body2 = info2.toast?.trim();
    if (body2) dedupedToast.info(body2);
  }, []);
  const {
    handleComfyUiDraftActionTrack,
    handleNodeAddTrack,
    handlePaneContextMenuActionTrack,
    handlePluginActionTrack,
  } = useComfyUiCanvasTracking(workspaceRef);
  const assetPanelToolbarButton = reactExports.useMemo(() => {
    if (!onToggleAssetPanel) return null;
    const label = t2("topbar.toggleAssetPanel");
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
  }, [assetPanelControlsId, assetPanelOpen, onToggleAssetPanel, t2]);
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
  const handleNodeActionTrack = reactExports.useCallback((info2) => {
    const base2 = {
      node_id: info2.nodeId,
      node_type: info2.nodeType,
      tool: normalizeCanvasNodeTool(info2.action),
      interaction: info2.interaction,
    };
    if (info2.phase === "click") {
      if (!info2.source) return;
      trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_CLICK, {
        ...base2,
        source: info2.source,
      });
      if (info2.interaction === "instant") {
        trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_APPLY, {
          ...base2,
          apply_type: "implicit",
          duration_ms: 0,
        });
      }
      return;
    }
    if (info2.phase === "apply") {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_APPLY, {
        ...base2,
        apply_type: "explicit",
        duration_ms: info2.durationMs,
        ...pickCanvasNodeToolApplyDetails(info2.toolSpecific),
      });
      return;
    }
    trackEvent(TRACK_EVENTS.CANVAS_NODE_TOOL_ABANDON, {
      ...base2,
      duration_ms: info2.durationMs,
      had_progress: info2.hadProgress ?? false,
    });
  }, []);
  const handleNodeContentEditTrack = reactExports.useCallback((info2) => {
    trackEvent(TRACK_EVENTS.CANVAS_NODE_CONTENT_EDIT, {
      node_id: info2.nodeId,
      node_type: info2.nodeType,
      action: info2.action,
      char_count: info2.charCount,
      had_change: info2.hadChange,
      enter_mode: info2.enterMode,
    });
  }, []);
  const handleParamAdjustTrack = reactExports.useCallback((info2) => {
    trackEvent(TRACK_EVENTS.CANVAS_PARAM_ADJUST, {
      node_id: info2.nodeId,
      popover_type: info2.popoverType,
      param_name: info2.paramName,
      from: info2.from,
      to: info2.to,
    });
  }, []);
  const handlePopoverChipOpenTrack = reactExports.useCallback((info2) => {
    trackEvent(TRACK_EVENTS.CANVAS_POPOVER_CHIP_OPEN, {
      node_id: info2.nodeId,
      popover_type: info2.popoverType,
      chip_type: info2.chipType,
      current_value: info2.currentValue,
    });
  }, []);
  const handlePopoverCloseWithoutSubmitTrack = reactExports.useCallback(
    (info2) => {
      trackEvent(TRACK_EVENTS.CANVAS_POPOVER_CLOSE_WITHOUT_SUBMIT, {
        popover_type: info2.popoverType,
        node_id: info2.nodeId,
        had_prompt: info2.hadPrompt,
        close_reason: info2.closeReason,
      });
    },
    [],
  );
  const handlePluginInsertMediaNode = reactExports.useCallback(
    async (args) => {
      const assetPath = resolvePluginSourcePath(args.source);
      const body2 = {
        assetPath,
      };
      if (args.sourceNodeId) body2.sourceNodeIds = [args.sourceNodeId];
      const resp = await gatewayFetch2("/api/canvas/media-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body2),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertMediaNode failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      if (args.selectOnEditorExit) {
        rememberPluginOutput(args.sourceNodeId, data2.nodeId);
      }
      return {
        nodeId: data2.nodeId,
        assetId: data2.assetId,
      };
    },
    [gatewayFetch2, rememberPluginOutput],
  );
  const handleEnsureMediaNodeForPath = reactExports.useCallback(
    async (path2, sourceNodeId) => {
      if (!path2) return null;
      try {
        const body2 = {
          assetPath: path2,
        };
        if (sourceNodeId) body2.sourceNodeId = sourceNodeId;
        const resp = await gatewayFetch2("/api/canvas/media-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body2),
        });
        if (!resp.ok) return null;
        const data2 = await resp.json();
        return {
          nodeId: data2.nodeId,
          assetId: data2.assetId,
        };
      } catch {
        return null;
      }
    },
    [gatewayFetch2],
  );
  const handlePluginInsertTextNode = reactExports.useCallback(
    async (args) => {
      const body2 = {
        content: args.content,
      };
      if (args.name) body2.name = args.name;
      if (args.sourceNodeId) body2.sourceNodeId = args.sourceNodeId;
      const resp = await gatewayFetch2("/api/canvas/text-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body2),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertTextNode failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      return {
        nodeId: data2.nodeId,
        assetId: data2.assetId,
      };
    },
    [gatewayFetch2],
  );
  const handlePluginReadPluginData = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch2("/api/canvas/plugin-data/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw pluginStorageHttpError("readPluginData", resp.status, text2);
      }
      return mapPluginDataReadResult(await resp.json());
    },
    [gatewayFetch2],
  );
  const handlePluginWritePluginData = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch2("/api/canvas/plugin-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw pluginStorageHttpError("writePluginData", resp.status, text2);
      }
    },
    [gatewayFetch2],
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
      const resp = await gatewayFetch2("/api/plugins/agent/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin-agent result push failed: HTTP ${resp.status} ${text2}`,
        );
      }
    },
    [gatewayFetch2],
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
      const body2 = {
        assetPath,
      };
      if (args.sourceNodeId) body2.sourceNodeId = args.sourceNodeId;
      if (args.viewMode) body2.viewMode = args.viewMode;
      if (args.width !== void 0) body2.width = args.width;
      if (args.height !== void 0) body2.height = args.height;
      const resp = await gatewayFetch2("/api/canvas/file-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body2),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertFileNode failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      return {
        nodeId: data2.nodeId,
        assetId: data2.assetId,
      };
    },
    [gatewayFetch2],
  );
  const handlePluginInsertImagesAsGroup = reactExports.useCallback(
    async (args) => {
      const resp = await gatewayFetch2("/api/canvas/nodes-group", {
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
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: insertImagesAsGroup failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      return {
        groupId: data2.groupId,
        nodeIds: data2.nodeIds ?? [],
      };
    },
    [gatewayFetch2],
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
      const url2 = handleResolveFileUrl(res.path);
      if (!url2)
        throw new Error(
          "plugin: superResolution result URL could not be resolved",
        );
      return {
        url: url2,
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
      const resp = await gatewayFetch2("/api/canvas/placeholder-group", {
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
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: addPlaceholderGroup failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      return {
        groupId: data2.groupId,
        placeholderIds: data2.placeholderIds ?? [],
      };
    },
    [gatewayFetch2],
  );
  const handlePluginNotify = reactExports.useCallback(
    (message2, level, options) =>
      notifyFromPlugin(platform2.shell, message2, level, options),
    [platform2.shell],
  );
  const handlePluginSaveFile = reactExports.useCallback(
    (args) =>
      savePluginFile(
        platform2.fs,
        currentWorkspace,
        resolvePluginSourcePath,
        args,
      ),
    [currentWorkspace, platform2.fs],
  );
  const handlePluginDownloadComfyUiModel = reactExports.useCallback(
    async ({ url: url2, filename, directory }) => {
      await homeService.comfyUiModelDownload.prepareWorkflow({
        workflowId: `plugin:comfyui:missing-model:${directory}/${filename}`,
        workflowTitle: filename,
        models: [
          {
            name: filename,
            directory,
            url: url2,
          },
        ],
      });
      return true;
    },
    [],
  );
  const handlePluginPickDirectory = reactExports.useCallback(
    async (options) => {
      const paths = await platform2.fs.showOpenDialog?.({
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
    [platform2.fs],
  );
  const handlePluginLog = reactExports.useCallback(
    (entry) => {
      const now2 = Date.now();
      const key2 = `${entry.pluginId}:${entry.nodeId}`;
      let rate = pluginLogRateRef.current.get(key2);
      if (!rate || now2 - rate.windowStartedAt >= 6e4) {
        rate = {
          windowStartedAt: now2,
          count: 0,
          dropWarned: false,
        };
        pluginLogRateRef.current.set(key2, rate);
        if (pluginLogRateRef.current.size > 512) {
          for (const [candidate, state2] of pluginLogRateRef.current) {
            if (now2 - state2.windowStartedAt >= 12e4)
              pluginLogRateRef.current.delete(candidate);
          }
        }
      }
      if (rate.count >= 120) {
        if (!rate.dropWarned) {
          rate.dropWarned = true;
          logService2.warn(
            `[plugin:${entry.pluginId} node:${entry.nodeId}] log rate limit reached`,
          );
        }
        return;
      }
      rate.count += 1;
      const prefix = `[plugin:${entry.pluginId} node:${entry.nodeId}]`;
      const details =
        entry.details === void 0 ? "" : ` ${JSON.stringify(entry.details)}`;
      logService2[entry.level](`${prefix} ${entry.message}${details}`);
    },
    [logService2],
  );
  const handlePluginNavigate = usePluginNavigate();
  const handlePluginAddPlaceholder = reactExports.useCallback(
    async (args) => {
      const body2 = {
        sourceNodeId: args.sourceNodeId,
        prompt: args.prompt,
        model: args.model,
      };
      if (args.mediaType) body2.mediaType = args.mediaType;
      const resp = await gatewayFetch2("/api/canvas/placeholder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body2),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: addPlaceholder failed (${resp.status}) ${text2}`,
        );
      }
      const data2 = await resp.json();
      return data2.placeholderId;
    },
    [gatewayFetch2],
  );
  const handlePluginFailPlaceholder = reactExports.useCallback(
    async (placeholderId, errorMessage2) => {
      const resp = await gatewayFetch2("/api/canvas/placeholder/fail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeholderId,
          errorMessage: errorMessage2,
        }),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: failPlaceholder failed (${resp.status}) ${text2}`,
        );
      }
    },
    [gatewayFetch2],
  );
  const handlePluginCleanupPlaceholder = reactExports.useCallback(
    async (placeholderId) => {
      const resp = await gatewayFetch2("/api/canvas/placeholder/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeholderId,
        }),
      });
      if (!resp.ok) {
        const text2 = await resp.text().catch(() => "");
        throw new Error(
          `plugin: cleanupPlaceholder failed (${resp.status}) ${text2}`,
        );
      }
    },
    [gatewayFetch2],
  );
  const {
    pickerRequest: pluginPickerRequest,
    handlePluginPickAsset,
    handleCanvasPickAsset,
  } = useAssetPickerHost({
    isActive: isActive2 ?? false,
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
      const size2 =
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
          size: size2,
        },
      );
      if (filled) sessionStore.notifyFileChanged();
    },
    [sessionStore],
  );
  const handlePlaceholderError = reactExports.useCallback(
    (error) => {
      console.error("[canvas] placeholder source failed:", error);
      dedupedToast.error(t2("assetPicker.source.error", "资源暂不可用"));
    },
    [t2],
  );
  const { openImageAnnotation, annotationDialog } =
    useCanvasImageAnnotationHost(isActive2 ?? false);
  const capturePlaceholderTarget = reactExports.useCallback(
    (nodeId) =>
      canvasViewRef.current?.createPlaceholderFillGuard(nodeId) ??
      (() => false),
    [],
  );
  const handlePlaceholderUpload = usePlaceholderAssetSource({
    active: isActive2 ?? false,
    scope: currentWorkspace,
    pick: handleCanvasPickAsset,
    fill: handleFillPlaceholder,
    captureTarget: capturePlaceholderTarget,
    onError: handlePlaceholderError,
  });
  const handlePluginUploadAndInsert = reactExports.useCallback(
    async (file, type2) => {
      const relPath = await handleUploadFile(file);
      const inserted = await handlePluginInsertMediaNode({
        source: relPath,
      });
      return {
        nodeId: inserted.nodeId,
        assetId: inserted.assetId,
        type: type2,
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
    gatewayFetch2,
    useWorkspaceWSConnection(),
    sessionStore,
  );
  const pluginDagBridge = usePluginDagBridge(gatewayFetch2);
  const handlePluginUploadToCdn = reactExports.useCallback(
    async (args) => {
      if (typeof args.source !== "string") {
        throw new Error(
          "uploadToCdn: host accepts only string source (workspace path)",
        );
      }
      const resp = await gatewayFetch2("/api/files/upload-cdn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          file_path: args.source,
        }),
      });
      let data2 = null;
      try {
        data2 = await resp.json();
      } catch {}
      if (!resp.ok) {
        const detail = data2?.error ?? `HTTP ${resp.status}`;
        throw new Error(`uploadToCdn failed: ${detail}`);
      }
      if (!data2?.ok || !data2.url) {
        throw new Error(
          `uploadToCdn failed: ${data2?.error ?? "no url returned"}`,
        );
      }
      return {
        url: data2.url,
      };
    },
    [gatewayFetch2],
  );
  const pythonPost = reactExports.useCallback(
    async (pluginId, suffix, body2) => {
      const resp = await gatewayFetch2(
        `/api/plugins/${encodeURIComponent(pluginId)}/python/${suffix}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: body2,
        },
      );
      return await resp.json();
    },
    [gatewayFetch2],
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
        const resp = await gatewayFetch2(endpoint, {
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
    [gatewayFetch2],
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
      const resp = await gatewayFetch2(endpoint, {
        method: "PUT",
        body: form,
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const body2 = await resp.json();
          detail = body2.message ?? body2.error ?? detail;
        } catch {}
        throw new Error(`writeToPluginDir failed: ${detail}`);
      }
      return {
        path: args.path,
        url: endpoint,
      };
    },
    [gatewayFetch2],
  );
  const handlePluginConfigGet = reactExports.useCallback(
    async (pluginId, key2) => {
      const resp = await gatewayFetch2(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key2)}`,
      );
      if (resp.status === 404) return void 0;
      if (!resp.ok) throw new Error(`config.get failed: HTTP ${resp.status}`);
      const data2 = await resp.json();
      return data2.value;
    },
    [gatewayFetch2],
  );
  const handlePluginConfigSet = reactExports.useCallback(
    async (pluginId, key2, value) => {
      const resp = await gatewayFetch2(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key2)}`,
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
          const body2 = await resp.json();
          if (body2?.message) detail = body2.message;
        } catch {}
        throw new Error(`config.set failed: ${detail}`);
      }
    },
    [gatewayFetch2],
  );
  const handlePluginConfigDelete = reactExports.useCallback(
    async (pluginId, key2) => {
      const resp = await gatewayFetch2(
        `/api/plugins/${encodeURIComponent(pluginId)}/config/${encodeURIComponent(key2)}`,
        {
          method: "DELETE",
        },
      );
      if (!resp.ok && resp.status !== 404) {
        throw new Error(`config.delete failed: HTTP ${resp.status}`);
      }
    },
    [gatewayFetch2],
  );
  const handlePluginConfigKeys = reactExports.useCallback(
    async (pluginId) => {
      const resp = await gatewayFetch2(
        `/api/plugins/${encodeURIComponent(pluginId)}/config`,
      );
      if (!resp.ok) throw new Error(`config.keys failed: HTTP ${resp.status}`);
      const data2 = await resp.json();
      return Array.isArray(data2.keys) ? data2.keys : [];
    },
    [gatewayFetch2],
  );
  const handlePluginGetNodePriceDescription = reactExports.useCallback(
    (nodeType) =>
      buildComfyUiNodePriceDescription(
        pricingData,
        nodeType,
        {
          heading: t2("canvas.billing.panel.heading", {
            defaultValue: "价格说明",
          }),
          free: t2("canvas.billing.panel.free", {
            defaultValue: "免费",
          }),
          generatedVideo: t2("canvas.billing.panel.generatedVideo", {
            defaultValue: "生成视频",
          }),
          generatedImage: t2("canvas.billing.panel.generatedImage", {
            defaultValue: "生成图片",
          }),
          inputVideo: t2("canvas.billing.panel.inputVideo", {
            defaultValue: "输入视频",
          }),
          inputAudio: t2("canvas.billing.panel.inputAudio", {
            defaultValue: "输入音频",
          }),
          inputImages: t2("canvas.billing.panel.inputImages", {
            defaultValue: "输入图片",
          }),
          withReferenceVideo: t2("canvas.billing.panel.withReferenceVideo"),
          withoutReferenceVideo: t2(
            "canvas.billing.panel.withoutReferenceVideo",
          ),
          inputTokens: t2("canvas.billing.panel.inputTokens", {
            defaultValue: "输入 Token",
          }),
          outputTokens: t2("canvas.billing.panel.outputTokens", {
            defaultValue: "输出 Token",
          }),
          videoUpscale: t2("canvas.billing.panel.videoUpscale", {
            defaultValue: "视频超分",
          }),
          creditsPerSecond: (rate) =>
            t2("canvas.billing.panel.ratePerSecond", {
              rate,
              defaultValue: "{{rate}} 积分/秒",
            }),
          creditsPerImage: (rate) =>
            t2("canvas.billing.panel.ratePerImage", {
              rate,
              defaultValue: "{{rate}} 积分/张",
            }),
          creditsPerMillionTokens: (rate) =>
            t2("canvas.billing.panel.ratePerMillionTokens", {
              rate,
              defaultValue: "{{rate}} 积分/百万 Token",
            }),
          imagePricing: (freeCount, firstPaidIndex, rate) =>
            t2("canvas.billing.panel.imagePricing", {
              freeCount,
              firstPaidIndex,
              rate,
              defaultValue:
                "前 {{freeCount}} 张免费，第 {{firstPaidIndex}} 张起 {{rate}} 积分/张",
            }),
        },
        i18n.resolvedLanguage ?? i18n.language,
      ),
    [i18n.language, i18n.resolvedLanguage, pricingData, t2],
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
  const runtimeRegion2 = getRuntimeConfig().region;
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
    return sessionStore.subscribe((state2) => {
      setFocusedChatSessionId((prev) =>
        prev === state2.focusedSessionId ? prev : state2.focusedSessionId,
      );
    });
  }, [sessionStore]);
  const pluginAppInfo = reactExports.useMemo(
    () => ({
      locale: i18n.language.startsWith("zh") ? "zh" : "en",
      theme: resolvedTheme,
      region: runtimeRegion2,
      version: runtimeVersion,
      gpuAccelerationDisabled: runtimeGpuAccelerationDisabled,
      gpuAccelerationDisabledReason: runtimeGpuAccelerationDisabledReason,
      currentChatSessionId: focusedChatSessionId,
    }),
    [
      i18n.language,
      resolvedTheme,
      runtimeRegion2,
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
        {t2("common.loading")}
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
          isWorkspaceActive={isActive2 !== false}
          pricingConfig={pricingData}
          hailuo03VideoTrial={hailuo03VideoTrialStatus}
          claimHailuo03VideoTrial={claimHailuo03VideoTrial2}
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
          previewActive={isActive2 !== false && isPresented !== false}
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
            region={runtimeRegion2}
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
            isActive={isActive2}
            isPresented={isPresented}
            workspaceName={workspaceName}
            onNewNodesNavigate={handleNewNodesNavigate}
            onPersistenceControllerChange={handlePersistenceControllerChange}
            onPersistenceStatusChange={handlePersistenceStatusChange}
            onLoadStateChange={setAssetSourceStatus}
            loadingOverlay={
              <CanvasLoadingState
                label={t2("a11y.loading")}
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
          resolveCanvasNodeId={(path2) =>
            canvasViewRef.current?.findNodeIdByFilePath(path2) ?? null
          }
          tagColorResolver={quickTags.resolveTagColors}
          tagRegistry={quickTags.tagRegistry}
        />
        <QuickZoomPresence value={contextMenu}>
          {(contextMenu2, motionProps) => (
            <NodeContextMenu
              motionProps={motionProps}
              position={{
                x: contextMenu2.x,
                y: contextMenu2.y,
              }}
              targets={contextMenu2.targets}
              actions={contextMenu2.actions}
              onCopy={handleMenuCopy}
              onSaveAs={handleMenuSaveAs}
              onShowInFolder={handleMenuShowInFolder}
              onAddToChat={handleMenuAddToChat}
              onRename={handleMenuRename}
              onCancelGeneration={handleCancelGeneration}
              tagAssets={contextMenu2.targets
                .map((tgt) => tgt.filePath)
                .filter((p3) => !!p3)
                .map((p3) => workspaceAssets.find((a2) => a2.path === p3))
                .filter((a2) => !!a2)}
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
