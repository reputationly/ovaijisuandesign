// 首页路由入口：组装输入框、工具栏、展示区。
import { useTranslation, useStorage, reactExports, jsxRuntimeExports, workspaceLog, usePlatform, useNavigate, resolveNewProjectPreferences, useNewProjectFolder, isWorkspaceFolderMissingError } from "../vendor.js";
import { useProjectActions } from "../settings/use-project-actions.js";
import { useProjectArchiveActions } from "../workspace/use-project-archive-actions.js";
import { useNavigateToWorkspace } from "../workspace/use-deep-link-router.js";
import { homeService } from "../workspace/home-service.jsx";
import { workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";
import { toastWorkspaceOpenResult } from "../workspace/toast-workspace-open-result.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useGatewayReady, HubWordmark } from "../infra/inline-rename-input.jsx";
import { usePopup } from "../settings/use-popup.js";
import { useBlockingModalPresence } from "../workspace/topbar-state-context.jsx";
import { BLOCKING_MODAL_IDS, useLoginGuard } from "../infra/schedule.js";
import { openExternalUrl, getTutorialUrlByLocale } from "../vendor-inline/vscode-base/graph.jsx";
import { useHomeQuickStartConfig } from "../workspace/use-home-quick-start-config.js";
import { useEnsureSkillReady } from "../workspace/use-ensure-skill-ready.js";
import { useModelDefaults } from "../chat/use-model-defaults.js";
import { useActiveCustomModel } from "../team/copy-icon-button.jsx";
import { resolveActiveModelId } from "../generation/use-model-catalog-scope-key.js";
import { useAstraSendGate } from "../generation/use-astra-send-gate.js";
import { canApplyHomeComposerMutation, HOME_DRAFT_WORKSPACE, HOME_DRAFT_SESSION_KEY, invalidatePendingHomeHandoff, markHomeDraftPendingHandoff } from "../assets/read-envelope.js";
import { useFolderPermissionGate } from "../workspace/use-folder-permission-gate.jsx";
import { DraftController } from "../assets/draft-controller.js";
import { useMarketSkills } from "../workspace/use-market-skills.js";
import { normalizePopup } from "../settings/use-auto-announcement.js";
import { PopupType } from "../generation/normalize-skill-detail-metadata.js";
import { useFeaturePopupAction } from "../settings/use-feature-popup-action.js";
import { hasMessagePayload } from "../media-editing/package.jsx";
import { connectorReferenceFromServerName } from "../generation/use-mention-models.jsx";
import { fetchSceneAttachments } from "../generation/read-bounded-blob.js";
import { resolveHomeFeaturedSkillPrompt } from "../workspace/build-inspiration-media-showcase-collections.js";
import { MessageInput } from "../chat/chat-compliance-notice.jsx";
import { CreationGuidePlaceholder } from "../text-editor/creation-guide-placeholder.jsx";
import { OPEN_BROWSER_EVENT } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { WorkspaceBrowser } from "../workspace/workspace-browser.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useHomeComposerMotion } from "./composer-motion.js";
import { useHomeProjectShowcaseConfig, useHomeSkillShowcaseConfig, useHomeTabsShowcaseConfig } from "./data.js";
import { MediaShowcasePreview } from "./media-showcase.jsx";
import { PromotionBadge, PromotionDialog, usePromotion, usePromotionDialog } from "./promotion.jsx";
import { HomeProjectPicker, HomePromptPrefillBridge } from "./prompt-picker.jsx";
import { playHomeUsePromptTransfer } from "./prompt-transfer.js";
import { HOME_SHOWCASE_FEATURED_SKILL_SOURCE, SCENE_ATTACHMENT_SOURCE, buildSceneSegments, marketSkillToReadySkill, snapshotSelectedMediaModels } from "./scene-attachments.js";
import { HomeSceneSelectionGuard, homeSceneDisplayText, homeSceneTarget, prepareHomeSceneSelection, useScenePanel } from "./scene.js";
import { HomeToolbar } from "./toolbar.jsx";
import { HomeWhatsNew, HomeWinkLogo } from "./whats-new.jsx";
function HomeContent() {
  const {
    t,
    i18n
  } = useTranslation();
  const {
    scrollContainerRef,
    composerAnchorRef,
    composerLayerRef
  } = useHomeComposerMotion();
  const platform = usePlatform();
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const {
    config: quickStartConfig,
    source: quickStartConfigSource
  } = useHomeQuickStartConfig();
  const {
    config: tabsShowcaseConfig,
    source: tabsShowcaseConfigSource
  } = useHomeTabsShowcaseConfig();
  const hasProjectShowcaseProvider = tabsShowcaseConfig.primaryCategories.some(category => category.provider.type === "project-showcase");
  const hasSkillShowcaseProvider = tabsShowcaseConfig.primaryCategories.some(category => category.provider.type === "skill-market");
  const {
    config: skillShowcaseConfig,
    source: skillShowcaseConfigSource,
    isLoading: skillShowcaseConfigLoading
  } = useHomeSkillShowcaseConfig(hasSkillShowcaseProvider);
  const {
    config: projectShowcaseConfig,
    source: projectShowcaseConfigSource,
    isLoading: projectShowcaseConfigLoading
  } = useHomeProjectShowcaseConfig(hasProjectShowcaseProvider);
  const quickStartCategories = quickStartConfig.categories;
  const featuredCategory = reactExports.useMemo(() => quickStartCategories.find(category => category.kind === "featured-skills") ?? null, [quickStartCategories]);
  const showcaseSkillSource = tabsShowcaseConfig.primaryCategories.find(category => category.provider.type === "skill-market")?.provider;
  const defaultFeaturedSkillsSource = skillShowcaseConfig.categories[0]?.query.source ?? (showcaseSkillSource?.type === "skill-market" ? showcaseSkillSource.source : void 0) ?? featuredCategory?.marketSource ?? HOME_SHOWCASE_FEATURED_SKILL_SOURCE;
  const availableShowcaseSkillSources = reactExports.useMemo(() => new Set([...skillShowcaseConfig.categories.map(category => category.query.source), ...tabsShowcaseConfig.primaryCategories.flatMap(category => category.provider.type === "skill-market" ? [category.provider.source] : [])]), [skillShowcaseConfig.categories, tabsShowcaseConfig.primaryCategories]);
  const [requestedShowcaseSkillSource, setRequestedShowcaseSkillSource] = reactExports.useState(null);
  const featuredSkillsSource = requestedShowcaseSkillSource && availableShowcaseSkillSources.has(requestedShowcaseSkillSource) ? requestedShowcaseSkillSource : defaultFeaturedSkillsSource;
  quickStartCategories.length > 0;
  const {
    isShow: isPromotionActive
  } = usePromotion();
  const promotionDialog = usePromotionDialog(isPromotionActive);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.promotion, promotionDialog.open);
  const promotionShownRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (isPromotionActive && !promotionShownRef.current) {
      promotionShownRef.current = true;
      trackEvent(TRACK_EVENTS.HOME_PROMOTION_SHOW, {});
    } else if (!isPromotionActive) {
      promotionShownRef.current = false;
    }
  }, [isPromotionActive]);
  const {
    guard: loginGuard,
    LoginDialog
  } = useLoginGuard();
  const {
    ensureSkillReady
  } = useEnsureSkillReady({
    preload: true
  });
  const gatewayReady = useGatewayReady();
  const mountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const inputRef = reactExports.useRef(null);
  const sceneSelectionGuardRef = reactExports.useRef(null);
  if (!sceneSelectionGuardRef.current) {
    sceneSelectionGuardRef.current = new HomeSceneSelectionGuard();
  }
  const sceneSelectionGuard = sceneSelectionGuardRef.current;
  const [sceneAttachmentsLoading, setSceneAttachmentsLoading] = reactExports.useState(false);
  const homeSubmitInFlightRef = reactExports.useRef(false);
  const composerSendPreparingRef = reactExports.useRef(false);
  const homeHandoffCommitRef = reactExports.useRef(null);
  const pendingWorkspaceHandoffRef = reactExports.useRef(null);
  const [homeSubmitting, setHomeSubmitting] = reactExports.useState(false);
  const [composerSendPreparing, setComposerSendPreparing] = reactExports.useState(false);
  const lastFillSourceRef = reactExports.useRef(null);
  const invalidateSceneSelection = reactExports.useCallback(clearCommittedAttachments => {
    sceneSelectionGuard.invalidate();
    if (clearCommittedAttachments) {
      inputRef.current?.clearAttachments({
        source: SCENE_ATTACHMENT_SOURCE
      });
    }
    setSceneAttachmentsLoading(false);
  }, [sceneSelectionGuard]);
  const [config,, setConfigAsync] = useStorage("global.config");
  const [composerModelOverrides, setComposerModelOverrides] = reactExports.useState({});
  const handleRememberDefaults = reactExports.useCallback(selection => setConfigAsync({
    ...(selection.modelId !== void 0 ? {
      homeAgentModelId: selection.modelId
    } : {}),
    ...(selection.media !== void 0 ? {
      homeSelectedMediaModels: selection.media
    } : {})
  }), [setConfigAsync]);
  const modelDefaults = useModelDefaults({
    defaultModelId: config.homeAgentModelId,
    defaultSelectedMediaModels: config.homeSelectedMediaModels,
    onRememberDefaults: handleRememberDefaults
  });
  const {
    rememberDefaults
  } = modelDefaults;
  const homeSelectedMediaModels = composerModelOverrides.media ?? modelDefaults.defaultSelectedMediaModels;
  const activeCustomModel = useActiveCustomModel();
  const homeModelId = resolveActiveModelId(composerModelOverrides.modelId ?? modelDefaults.defaultModelId, activeCustomModel.data) ?? void 0;
  const astraSendGate = useAstraSendGate(homeModelId);
  const handleSelectedMediaModelsChange = reactExports.useCallback((next, rememberForNewChats = false) => {
    setComposerModelOverrides(previous => ({
      ...previous,
      media: next
    }));
    if (rememberForNewChats) void rememberDefaults({
      media: next
    });
  }, [rememberDefaults]);
  const handleModelSelectionChange = reactExports.useCallback((selection, rememberForNewChats = true) => {
    if (composerSendPreparingRef.current) return;
    if (sceneAttachmentsLoading) invalidateSceneSelection(false);
    setComposerModelOverrides(previous => ({
      ...previous,
      ...selection
    }));
    if (rememberForNewChats) void rememberDefaults(selection);
  }, [rememberDefaults, invalidateSceneSelection, sceneAttachmentsLoading]);
  const {
    loadUserMemory: rememberedMemory
  } = resolveNewProjectPreferences(config);
  const [workspaceFolder, setWorkspaceFolder] = useNewProjectFolder();
  const [selectedProjectId, setSelectedProjectId] = reactExports.useState(void 0);
  const composerSendSnapshotRef = reactExports.useRef(null);
  const handleComposerSendPreparingChange = reactExports.useCallback(preparing => {
    if (!canApplyHomeComposerMutation(mountedRef.current, homeHandoffCommitRef.current)) return;
    composerSendPreparingRef.current = preparing;
    setComposerSendPreparing(preparing);
    if (preparing) {
      composerSendSnapshotRef.current = {
        workspaceFolder,
        selectedProjectId,
        modelId: homeModelId,
        selectedMediaModels: homeSelectedMediaModels ? {
          ...(homeSelectedMediaModels.image ? {
            image: [...homeSelectedMediaModels.image]
          } : {}),
          ...(homeSelectedMediaModels.video ? {
            video: [...homeSelectedMediaModels.video]
          } : {}),
          ...(homeSelectedMediaModels.audio ? {
            audio: [...homeSelectedMediaModels.audio]
          } : {})
        } : void 0,
        fillSource: lastFillSourceRef.current
      };
    } else if (!homeSubmitInFlightRef.current) {
      composerSendSnapshotRef.current = null;
    }
  }, [homeModelId, homeSelectedMediaModels, selectedProjectId, workspaceFolder]);
  const {
    ensureGranted: ensureFolderGranted,
    dialog: folderPermissionDialog
  } = useFolderPermissionGate();
  const {
    addWorkspaceToProject
  } = useProjectActions();
  const handlePickWorkspaceFolder = reactExports.useCallback(async () => {
    if (composerSendPreparingRef.current) return;
    const showOpenDialog = platform.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
      title: t("workspace.newProject.selectFolderTitle", "选择工作区文件夹"),
      ...(workspaceFolder ? {
        defaultPath: workspaceFolder
      } : {})
    }).catch(() => void 0);
    const pickedPath = picked?.[0];
    if (!pickedPath || composerSendPreparingRef.current) return;
    workspaceLog.info("home: folder-picked", {
      source: "home-input"
    });
    const granted = await ensureFolderGranted(pickedPath);
    if (!granted || composerSendPreparingRef.current) {
      workspaceLog.info("home: folder-consent-denied", {
        source: "home-input"
      });
      return;
    }
    setWorkspaceFolder(pickedPath);
  }, [platform.fs, t, workspaceFolder, ensureFolderGranted, setWorkspaceFolder]);
  const handleClearWorkspaceFolder = reactExports.useCallback(() => {
    if (!composerSendPreparingRef.current) setWorkspaceFolder(void 0);
  }, [setWorkspaceFolder]);
  const draftTextRef = reactExports.useRef("");
  const draftEditorDocRef = reactExports.useRef(void 0);
  const draftAttachmentsRef = reactExports.useRef([]);
  const draftSelectedMediaModelsRef = reactExports.useRef(snapshotSelectedMediaModels(homeSelectedMediaModels));
  const draftFillSourceRef = reactExports.useRef(void 0);
  const draftRestoredRef = reactExports.useRef(false);
  const draftControllerRef = reactExports.useRef(null);
  if (!draftControllerRef.current) {
    draftControllerRef.current = new DraftController(HOME_DRAFT_WORKSPACE);
  }
  const draftController = draftControllerRef.current;
  const [restoredEditorDoc, setRestoredEditorDoc] = reactExports.useState(null);
  const [restoredDraftText, setRestoredDraftText] = reactExports.useState(void 0);
  const [restoredDraftAttachments, setRestoredDraftAttachments] = reactExports.useState(null);
  const inputTextRef = reactExports.useRef("");
  const [hasInputContent, setHasInputContent] = reactExports.useState(false);
  const persistHomeDraft = reactExports.useCallback(() => {
    draftController.set(HOME_DRAFT_SESSION_KEY, {
      text: draftTextRef.current,
      editorDoc: draftEditorDocRef.current,
      attachments: draftAttachmentsRef.current,
      ...(draftSelectedMediaModelsRef.current ? {
        selectedMediaModels: draftSelectedMediaModelsRef.current
      } : {}),
      ...(draftFillSourceRef.current ? {
        homeFillSource: draftFillSourceRef.current
      } : {})
    });
  }, [draftController]);
  reactExports.useEffect(() => {
    draftSelectedMediaModelsRef.current = snapshotSelectedMediaModels(homeSelectedMediaModels);
    if (draftTextRef.current || draftAttachmentsRef.current.length > 0) persistHomeDraft();
  }, [homeSelectedMediaModels, persistHomeDraft]);
  const handleInputChange = reactExports.useCallback((text, editorDoc) => {
    if (!canApplyHomeComposerMutation(mountedRef.current, homeHandoffCommitRef.current)) return;
    if (text === inputTextRef.current && text === draftTextRef.current) {
      if (text && JSON.stringify(draftEditorDocRef.current) !== JSON.stringify(editorDoc)) {
        draftEditorDocRef.current = editorDoc;
        persistHomeDraft();
      }
      setHasInputContent(text.length > 0 || draftAttachmentsRef.current.length > 0);
      return;
    }
    if (sceneAttachmentsLoading) invalidateSceneSelection(false);
    if (!homeHandoffCommitRef.current) invalidatePendingHomeHandoff();
    inputTextRef.current = text;
    setHasInputContent(text.length > 0 || draftAttachmentsRef.current.length > 0);
    draftTextRef.current = text;
    draftEditorDocRef.current = editorDoc;
    persistHomeDraft();
  }, [invalidateSceneSelection, persistHomeDraft, sceneAttachmentsLoading]);
  const handleAttachmentsChange = reactExports.useCallback(attachments => {
    if (!canApplyHomeComposerMutation(mountedRef.current, homeHandoffCommitRef.current)) return;
    if (attachments.length === 0 && draftAttachmentsRef.current.length === 0 && inputTextRef.current.length === 0) {
      setHasInputContent(false);
      return;
    }
    if (!homeHandoffCommitRef.current) invalidatePendingHomeHandoff();
    draftAttachmentsRef.current = [...attachments];
    setHasInputContent(inputTextRef.current.length > 0 || attachments.length > 0);
    persistHomeDraft();
  }, [persistHomeDraft]);
  const clearHomeDraft = reactExports.useCallback(() => {
    invalidatePendingHomeHandoff();
    draftTextRef.current = "";
    draftEditorDocRef.current = void 0;
    setRestoredEditorDoc(null);
    draftAttachmentsRef.current = [];
    draftFillSourceRef.current = void 0;
    draftController.clear(HOME_DRAFT_SESSION_KEY);
  }, [draftController]);
  reactExports.useEffect(() => {
    draftController.revive();
    if (!draftRestoredRef.current) {
      draftRestoredRef.current = true;
      const restored = draftController.restore(HOME_DRAFT_SESSION_KEY);
      if (restored) {
        if (restored.draft.text) {
          draftTextRef.current = restored.draft.text;
          draftEditorDocRef.current = restored.draft.editorDoc;
          setRestoredEditorDoc(restored.draft.editorDoc ?? null);
          setRestoredDraftText(restored.draft.text);
        }
        if (restored.draft.attachments.length > 0) {
          draftAttachmentsRef.current = [...restored.draft.attachments];
          setRestoredDraftAttachments(restored.draft.attachments);
        }
        if (restored.draft.selectedMediaModels) {
          draftSelectedMediaModelsRef.current = snapshotSelectedMediaModels(restored.draft.selectedMediaModels);
          handleSelectedMediaModelsChange(restored.draft.selectedMediaModels, false);
        }
        if (restored.draft.homeFillSource) {
          draftFillSourceRef.current = restored.draft.homeFillSource;
          lastFillSourceRef.current = restored.draft.homeFillSource;
        }
        if (restored.droppedCount > 0) {
          dedupedToast.warning(t("chat.draft.attachmentsDropped", "Some attachments could not be restored — please re-add them."));
        }
      }
    }
    return () => draftController.dispose();
  }, [draftController, handleSelectedMediaModelsChange, t]);
  const scenePanel = useScenePanel(quickStartCategories);
  const [featuredSkillsOpen, setFeaturedSkillsOpen] = reactExports.useState(false);
  const [featuredSkillInstallingName, setFeaturedSkillInstallingName] = reactExports.useState(null);
  const [featuredSkillInstallingProgress, setFeaturedSkillInstallingProgress] = reactExports.useState(null);
  const featuredSkillInstallingRef = reactExports.useRef(null);
  const featuredSkillsFetchedRef = reactExports.useRef(false);
  const featuredSkillsSourceRef = reactExports.useRef(featuredSkillsSource);
  const [showcaseSkillsRequested, setShowcaseSkillsRequested] = reactExports.useState(false);
  const featuredSkillsMarket = useMarketSkills(void 0, featuredSkillsSource);
  const requestFeaturedSkills = reactExports.useCallback(() => {
    if (featuredSkillsFetchedRef.current && !featuredSkillsMarket.error) return;
    featuredSkillsFetchedRef.current = true;
    void featuredSkillsMarket.fetchList();
  }, [featuredSkillsMarket.error, featuredSkillsMarket.fetchList]);
  reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    if (!featuredCategory) return;
    const shouldOpen = !featuredSkillsOpen;
    setFeaturedSkillsOpen(shouldOpen);
    scenePanel.closePanel();
    if (shouldOpen) requestFeaturedSkills();
  }, [featuredCategory, featuredSkillsOpen, requestFeaturedSkills, scenePanel.closePanel]);
  const handleShowcaseSkillsRequest = reactExports.useCallback(source => {
    if (composerSendPreparingRef.current) return;
    setShowcaseSkillsRequested(true);
    if (source && source !== featuredSkillsSource) {
      setRequestedShowcaseSkillSource(source);
      return;
    }
    requestFeaturedSkills();
  }, [featuredSkillsSource, requestFeaturedSkills]);
  reactExports.useEffect(() => {
    const source = featuredSkillsSource;
    if (featuredSkillsSourceRef.current === source) return;
    featuredSkillsSourceRef.current = source;
    featuredSkillsFetchedRef.current = false;
    if (source && (featuredSkillsOpen || showcaseSkillsRequested)) {
      featuredSkillsFetchedRef.current = true;
      void featuredSkillsMarket.fetchList();
    }
  }, [featuredSkillsMarket.fetchList, featuredSkillsOpen, featuredSkillsSource, showcaseSkillsRequested]);
  reactExports.useEffect(() => {
    if (!featuredCategory && featuredSkillsOpen) setFeaturedSkillsOpen(false);
  }, [featuredCategory, featuredSkillsOpen]);
  reactExports.useCallback(sceneId => {
    if (composerSendPreparingRef.current) return;
    setFeaturedSkillsOpen(false);
    scenePanel.selectScene(sceneId);
  }, [scenePanel.selectScene]);
  const {
    data: rawPopup
  } = usePopup();
  const featurePopup = reactExports.useMemo(() => {
    const normalized = normalizePopup(rawPopup);
    return normalized?.popup_type === PopupType.POPUP_TYPE_FEATURE ? normalized : null;
  }, [rawPopup]);
  const {
    execute: executeFeatureAction
  } = useFeaturePopupAction(featurePopup, {
    source: "home.h3-playground"
  });
  const {
    runImportFromUrl
  } = useProjectArchiveActions();
  const handleFeatureActionSelect = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    void executeFeatureAction();
  }, [executeFeatureAction]);
  const handleProjectArchiveSelect = reactExports.useCallback(({
    archiveUrl,
    projectName
  }) => {
    if (composerSendPreparingRef.current) return void 0;
    return runImportFromUrl(archiveUrl, projectName);
  }, [runImportFromUrl]);
  const activeSceneLabel = scenePanel.activeScene ? t(`home.scene.${scenePanel.activeScene.id}`, i18n.language.startsWith("zh") ? scenePanel.activeScene.name : scenePanel.activeScene.nameEn) : void 0;
  const activeRecommendationLabel = activeSceneLabel ?? (featuredSkillsOpen ? i18n.language.startsWith("zh") ? featuredCategory?.name : featuredCategory?.nameEn : void 0);
  const [tutorialPopoverOpen, setTutorialPopoverOpen] = reactExports.useState(false);
  const tutorialCloseTimerRef = reactExports.useRef(null);
  const clearTutorialCloseTimer = reactExports.useCallback(() => {
    if (tutorialCloseTimerRef.current === null) return;
    clearTimeout(tutorialCloseTimerRef.current);
    tutorialCloseTimerRef.current = null;
  }, []);
  reactExports.useCallback(() => {
    clearTutorialCloseTimer();
    setTutorialPopoverOpen(true);
  }, [clearTutorialCloseTimer]);
  reactExports.useCallback(() => {
    clearTutorialCloseTimer();
    tutorialCloseTimerRef.current = setTimeout(() => {
      setTutorialPopoverOpen(false);
      tutorialCloseTimerRef.current = null;
    }, 120);
  }, [clearTutorialCloseTimer]);
  reactExports.useEffect(() => {
    return () => {
      clearTutorialCloseTimer();
    };
  }, [clearTutorialCloseTimer]);
  reactExports.useCallback(() => {
    trackEvent(TRACK_EVENTS.HOME_TUTORIAL_CLICK, {
      locale: i18n.language
    });
    void openExternalUrl(platform, getTutorialUrlByLocale(i18n.language), {
      source: "home.tutorial"
    });
  }, [platform, i18n.language]);
  const handleFolderChipClick = reactExports.useCallback(async ({
    folderId,
    currentPath
  }) => {
    if (composerSendPreparingRef.current) return;
    const showOpenDialog = platform.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
      title: t("home.selectFolderTitle", "选择文件夹"),
      ...(currentPath ? {
        defaultPath: currentPath
      } : {})
    }).catch(() => void 0);
    const folderPath = picked?.[0];
    if (!folderPath || composerSendPreparingRef.current) return;
    inputRef.current?.resolveFolderChip(folderId, folderPath);
  }, [platform.fs, t]);
  const handleSend = reactExports.useCallback(async function submitHome(text, filePaths, _canvasNodeAttachments, entityRefs, _pluginNodeAttachments, allowDataDirectoryFallback = false) {
    if (!gatewayReady) return false;
    if (!loginGuard()) return false;
    if (!hasMessagePayload(text, filePaths)) return false;
    if (homeSubmitInFlightRef.current || sceneAttachmentsLoading) return false;
    if (!text.trim()) {
      dedupedToast.warning(t("home.textRequired"));
      return false;
    }
    homeSubmitInFlightRef.current = true;
    setHomeSubmitting(true);
    const composerSnapshot = composerSendSnapshotRef.current;
    const submissionWorkspaceFolder = composerSnapshot ? composerSnapshot.workspaceFolder : workspaceFolder;
    const submissionProjectId = composerSnapshot ? composerSnapshot.selectedProjectId : selectedProjectId;
    const initialModelId = composerSnapshot ? composerSnapshot.modelId : homeModelId;
    const initialSelectedMediaModels = composerSnapshot ? composerSnapshot.selectedMediaModels : homeSelectedMediaModels ? {
      ...(homeSelectedMediaModels.image ? {
        image: [...homeSelectedMediaModels.image]
      } : {}),
      ...(homeSelectedMediaModels.video ? {
        video: [...homeSelectedMediaModels.video]
      } : {}),
      ...(homeSelectedMediaModels.audio ? {
        audio: [...homeSelectedMediaModels.audio]
      } : {})
    } : void 0;
    const handoffKey = JSON.stringify({
      text,
      filePaths,
      entityRefs: entityRefs ?? [],
      workspaceFolder: submissionWorkspaceFolder ?? null,
      projectId: submissionProjectId ?? null,
      modelId: initialModelId ?? null,
      selectedMediaModels: initialSelectedMediaModels ?? null
    });
    const retryHandoff = pendingWorkspaceHandoffRef.current?.key === handoffKey ? pendingWorkspaceHandoffRef.current : null;
    const initialPayloadId = retryHandoff?.initialPayloadId ?? crypto.randomUUID();
    let handoffAccepted = false;
    try {
      const trackSubmitSource = composerSnapshot?.fillSource ?? "send";
      trackEvent(TRACK_EVENTS.HOME_INPUT_SUBMIT, {
        text_length: text.length,
        attachment_count: filePaths.length,
        source: trackSubmitSource === "home_scene_query" ? "scene_query" : "send"
      });
      let runtime;
      let resultKind;
      if (retryHandoff) {
        runtime = retryHandoff.runtime;
        resultKind = retryHandoff.resultKind;
      } else {
        let createError;
        const result = await homeService.hiloApp.createWorkspaceWithResult({
          name: homeSceneDisplayText(text),
          projectId: submissionProjectId,
          parentFolderPath: submissionProjectId ? void 0 : submissionWorkspaceFolder,
          loadUserMemory: rememberedMemory,
          allowDataDirectoryFallback
        }).catch(err => {
          createError = err;
          workspaceLog.error("home: create-workspace-error", {
            error: err
          });
          return null;
        });
        if (!result) {
          dedupedToast.error(isWorkspaceFolderMissingError(createError) ? t("home.workspaceFolderMissing", {
            defaultValue: "本地项目文件夹不存在，可能已被移动或删除。请重新选择文件夹，输入内容已保留。"
          }) : t("home.workspaceOpenFailed", {
            defaultValue: "创建工作区失败，输入内容已保留，请重试。"
          }));
          return false;
        }
        const openedRuntime = workspaceRuntimeFromOpenResult(result);
        if (!openedRuntime) {
          toastWorkspaceOpenResult(result, t, {
            onTemporaryDefault: result.kind === "storage_unavailable" && result.allowTemporaryDefault ? () => void submitHome(text, filePaths, _canvasNodeAttachments, entityRefs, _pluginNodeAttachments, true) : void 0
          });
          return false;
        }
        runtime = openedRuntime;
        resultKind = result.kind === "reused" ? "reused" : "opened";
        pendingWorkspaceHandoffRef.current = {
          key: handoffKey,
          initialPayloadId,
          runtime,
          resultKind
        };
      }
      if (submissionProjectId) {
        await addWorkspaceToProject(runtime.folderPath, submissionProjectId, "home-send");
      }
      homeHandoffCommitRef.current = initialPayloadId;
      markHomeDraftPendingHandoff(initialPayloadId);
      await navigateToWorkspace(runtime, {
        initialPayloadId,
        initialMessage: text,
        initialAttachments: filePaths.length > 0 ? filePaths : void 0,
        initialEntityRefs: entityRefs?.length ? [...entityRefs] : void 0,
        initialModelId,
        initialSelectedMediaModels
      });
      handoffAccepted = true;
      setComposerModelOverrides({});
      pendingWorkspaceHandoffRef.current = null;
      const trackSource = composerSnapshot?.fillSource ?? "home_send";
      inputTextRef.current = "";
      draftTextRef.current = "";
      draftEditorDocRef.current = void 0;
      setRestoredEditorDoc(null);
      draftAttachmentsRef.current = [];
      setSelectedProjectId(void 0);
      invalidateSceneSelection(false);
      lastFillSourceRef.current = null;
      setHasInputContent(false);
      trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
        source: trackSource,
        attachment_count: filePaths.length,
        text
      });
      return true;
    } catch (error) {
      if (!handoffAccepted && homeHandoffCommitRef.current === initialPayloadId) {
        invalidatePendingHomeHandoff();
      }
      workspaceLog.error("home: submit-workspace-error", {
        error
      });
      if (!handoffAccepted) {
        dedupedToast.error(t("home.workspaceOpenFailed", {
          defaultValue: "创建工作区失败，输入内容已保留，请重试。"
        }));
      }
      return handoffAccepted;
    } finally {
      if (!handoffAccepted && homeHandoffCommitRef.current === initialPayloadId) {
        homeHandoffCommitRef.current = null;
      }
      homeSubmitInFlightRef.current = false;
      setHomeSubmitting(false);
      if (!composerSendPreparingRef.current) composerSendSnapshotRef.current = null;
    }
  }, [addWorkspaceToProject, gatewayReady, homeModelId, homeSelectedMediaModels, loginGuard, navigateToWorkspace, rememberedMemory, invalidateSceneSelection, sceneAttachmentsLoading, selectedProjectId, t, workspaceFolder]);
  const handleResetInput = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    trackEvent(TRACK_EVENTS.HOME_INPUT_CLEAR, {});
    inputRef.current?.reset();
    inputTextRef.current = "";
    clearHomeDraft();
    lastFillSourceRef.current = null;
    invalidateSceneSelection(false);
    setHasInputContent(false);
  }, [clearHomeDraft, invalidateSceneSelection]);
  const handleExploreSkills = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    navigate({
      to: "/skills"
    });
  }, [navigate]);
  const handleCreateSkill = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    invalidateSceneSelection(true);
    inputRef.current?.selectSkillByName("skill-creator");
  }, [invalidateSceneSelection]);
  const handleQuerySelect = reactExports.useCallback(async (query, sourceSceneId, feedbackOrigin, prefill) => {
    if (prefill?.signal.aborted) return false;
    if (composerSendPreparingRef.current) return false;
    if (!loginGuard()) return false;
    trackEvent(TRACK_EVENTS.HOME_SCENE_QUERY_SELECT, {
      scene_id: sourceSceneId ?? scenePanel.activeSceneId ?? "",
      query_label: query.label,
      skill_name: query.skill,
      attachment_count: query.attachments.length
    });
    const transaction = sceneSelectionGuard.begin();
    const isCurrent = () => sceneSelectionGuard.isCurrent(transaction) && !prefill?.signal.aborted;
    setSceneAttachmentsLoading(true);
    const isZh = i18n.language.startsWith("zh");
    const promptText = isZh ? query.queryCn : query.queryEn;
    let target;
    try {
      target = homeSceneTarget(query, promptText);
    } catch {
      sceneSelectionGuard.complete(transaction);
      setSceneAttachmentsLoading(false);
      dedupedToast.error(t("chat.capabilitySearch.errors.unavailable"));
      return false;
    }
    const rawText = target.connector ? promptText : target.text;
    const inlineAttachments = query.attachments.filter(attachment => !attachment.assetUrl);
    const segments = prefill ? [{
      type: "mentionRef",
      attrs: prefill.mention
    }, {
      type: "text",
      text: ` ${rawText}`
    }] : [...(target.connector ? [{
      type: "mentionRef",
      attrs: {
        kind: "connector",
        path: target.connector.connectorId,
        name: target.connector.displayName,
        modelName: null,
        mentionName: null,
        mediaType: null,
        thumbUrl: connectorReferenceFromServerName(target.connector.connectorId).iconUrl,
        previewUrl: null,
        mediaUrl: null
      }
    }, {
      type: "text",
      text: " "
    }] : []), ...buildSceneSegments(rawText, inlineAttachments)];
    const draftText = prefill ? `@model:${prefill.mention.mentionName ?? prefill.mention.modelName} ${rawText}` : target.text;
    try {
      const prepared = await prepareHomeSceneSelection(query, {
        ensureSkillReady,
        fetchAttachments: fetchSceneAttachments,
        signal: transaction.signal
      });
      if (!isCurrent()) return false;
      if (prepared.status !== "ready") {
        if (prepared.status === "skill-unavailable") return false;
        const names = prepared.failedAttachments.map(attachment => attachment.name).join("、");
        dedupedToast.warning(t("home.scene.assetFetchFailed", {
          defaultValue: i18n.language.startsWith("zh") ? "无法加载附件 {{names}}，已保留当前输入" : "Failed to load attachment {{names}}; your current input was preserved",
          names
        }));
        return false;
      }
      const messageInput = inputRef.current;
      if (!messageInput) return false;
      const staged = await messageInput.prepareSourceAttachmentReplacement(prepared.files, SCENE_ATTACHMENT_SOURCE);
      if (!isCurrent()) {
        if (staged.status === "ready") {
          await messageInput.rollbackPreparedSourceAttachments(staged.batch);
        }
        return false;
      }
      if (staged.status !== "ready") {
        dedupedToast.warning(t("home.scene.assetFetchFailed", {
          defaultValue: i18n.language.startsWith("zh") ? staged.status === "capacity-exceeded" ? "附件数量已达上限，已保留当前输入" : "无法准备场景附件，已保留当前输入" : staged.status === "capacity-exceeded" ? "Attachment limit reached; your current input was preserved" : "Failed to prepare scene attachments; your current input was preserved",
          names: query.attachments.map(attachment => attachment.name).join("、")
        }));
        return false;
      }
      const nextSelectedMediaModels = query.models ? {
        ...(snapshotSelectedMediaModels(homeSelectedMediaModels) ?? {}),
        ...query.models
      } : snapshotSelectedMediaModels(homeSelectedMediaModels);
      const category = prefill?.mention.mediaType;
      if (nextSelectedMediaModels && (category === "image" || category === "video" || category === "audio")) {
        const selected = nextSelectedMediaModels[category];
        const modelId = prefill?.mention.modelName || prefill?.mention.path;
        if (selected && modelId && !selected.includes(modelId)) {
          nextSelectedMediaModels[category] = [...selected, modelId];
        }
      }
      if (!messageInput.commitPreparedSourceAttachments(staged.batch, {
        beforePublish: nextAttachments => {
          if (!isCurrent()) return false;
          const persisted = draftController.setNow(HOME_DRAFT_SESSION_KEY, {
            text: draftText,
            attachments: [...nextAttachments],
            ...(nextSelectedMediaModels ? {
              selectedMediaModels: nextSelectedMediaModels
            } : {}),
            homeFillSource: "home_scene_query"
          }, {
            requireDurable: true
          });
          if (!persisted) {
            dedupedToast.error(t("home.scene.draftPersistFailed", {
              defaultValue: i18n.language.startsWith("zh") ? "无法安全保存场景输入，已保留当前内容" : "Could not safely save this scene; your current input was preserved"
            }));
            return false;
          }
          inputTextRef.current = draftText;
          draftTextRef.current = draftText;
          draftEditorDocRef.current = void 0;
          draftAttachmentsRef.current = [...nextAttachments];
          draftSelectedMediaModelsRef.current = nextSelectedMediaModels;
          draftFillSourceRef.current = "home_scene_query";
          lastFillSourceRef.current = "home_scene_query";
          return true;
        }
      })) {
        await messageInput.rollbackPreparedSourceAttachments(staged.batch);
        return false;
      }
      messageInput.setEditorSegments(segments, {
        focus: !feedbackOrigin,
        notifyInputChange: false
      });
      setHasInputContent(rawText.length > 0 || draftAttachmentsRef.current.length > 0);
      if (query.agentModelId) {
        const persisted = await setConfigAsync(current => isCurrent() ? {
          ...current,
          homeAgentModelId: query.agentModelId,
          ...(nextSelectedMediaModels ? {
            homeSelectedMediaModels: nextSelectedMediaModels
          } : {})
        } : current);
        if (!isCurrent()) return false;
        if (!persisted) {
          dedupedToast.error(t("home.scene.modelPresetFailed"));
          return false;
        }
        setComposerModelOverrides({});
      } else if (nextSelectedMediaModels) {
        handleSelectedMediaModelsChange(nextSelectedMediaModels, true);
      }
      const inputSurface = composerLayerRef.current?.querySelector(".home-input-surface");
      if (feedbackOrigin && messageInput && inputSurface) {
        playHomeUsePromptTransfer(feedbackOrigin, inputSurface);
      }
      lastFillSourceRef.current = "home_scene_query";
      return true;
    } catch (error) {
      if (isCurrent()) {
        workspaceLog.warn("home: scene-selection-prepare-error", {
          error
        });
        dedupedToast.warning(t("home.scene.assetFetchFailed", {
          defaultValue: i18n.language.startsWith("zh") ? "无法准备场景内容，已保留当前输入" : "Failed to prepare scene content; your current input was preserved",
          names: query.attachments.map(attachment => attachment.name).join("、")
        }));
      }
    } finally {
      if (sceneSelectionGuard.complete(transaction)) {
        setSceneAttachmentsLoading(false);
      }
    }
    return false;
  }, [composerLayerRef, draftController, ensureSkillReady, handleSelectedMediaModelsChange, homeSelectedMediaModels, loginGuard, sceneSelectionGuard, setConfigAsync, t, i18n.language, scenePanel.activeSceneId]);
  const handlePromptPrefill = reactExports.useCallback((prompt, options) => handleQuerySelect({
    id: "popup-prefill",
    label: "",
    labelEn: "",
    queryCn: prompt,
    queryEn: prompt,
    attachments: []
  }, void 0, void 0, options), [handleQuerySelect]);
  reactExports.useEffect(() => () => {
    sceneSelectionGuard.invalidate();
  }, [sceneSelectionGuard]);
  const handleFeaturedSkillSelect = reactExports.useCallback(async skill => {
    if (composerSendPreparingRef.current) return;
    if (!loginGuard()) return;
    const selectionSource = featuredSkillsSource;
    const preset = featuredCategory?.skills.find(candidate => candidate.name === skill.name);
    if (featuredSkillInstallingRef.current) return;
    const transaction = sceneSelectionGuard.begin();
    setSceneAttachmentsLoading(true);
    featuredSkillInstallingRef.current = skill.name;
    setFeaturedSkillInstallingName(skill.name);
    setFeaturedSkillInstallingProgress(0.08);
    try {
      if (!(await ensureSkillReady(skill.name, progress => {
        setFeaturedSkillInstallingProgress(progress);
      }))) return;
      if (featuredSkillsSourceRef.current !== selectionSource || !sceneSelectionGuard.isCurrent(transaction)) return;
      draftFillSourceRef.current = void 0;
      inputRef.current?.clearAttachments({
        source: SCENE_ATTACHMENT_SOURCE
      });
      inputRef.current?.selectSkillDirect(marketSkillToReadySkill(skill), resolveHomeFeaturedSkillPrompt(skill, preset, i18n.language.startsWith("zh")));
      lastFillSourceRef.current = null;
    } finally {
      if (sceneSelectionGuard.complete(transaction)) {
        setSceneAttachmentsLoading(false);
      }
      if (featuredSkillInstallingRef.current === skill.name) {
        featuredSkillInstallingRef.current = null;
        setFeaturedSkillInstallingName(null);
        setFeaturedSkillInstallingProgress(null);
      }
    }
  }, [ensureSkillReady, featuredCategory, featuredSkillsSource, i18n.language, loginGuard, sceneSelectionGuard]);
  const handleClearActiveRecommendation = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    if (scenePanel.activeSceneId) {
      scenePanel.closePanel();
      return;
    }
    setFeaturedSkillsOpen(false);
  }, [scenePanel.activeSceneId, scenePanel.closePanel]);
  const homeGridFrameRef = reactExports.useRef(null);
  const homeGridPointerRef = reactExports.useRef(null);
  const handleHomeGridPointerMove = reactExports.useCallback(event => {
    if (document.documentElement.dataset.hiloGpu === "disabled") return;
    homeGridPointerRef.current = {
      grid: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY
    };
    if (homeGridFrameRef.current !== null) return;
    homeGridFrameRef.current = window.requestAnimationFrame(() => {
      homeGridFrameRef.current = null;
      const pending = homeGridPointerRef.current;
      if (!pending) return;
      const {
        grid,
        clientX,
        clientY
      } = pending;
      const rect = grid.getBoundingClientRect();
      grid.style.setProperty("--home-grid-pointer-x", `${clientX - rect.left + grid.scrollLeft}px`);
      grid.style.setProperty("--home-grid-pointer-y", `${clientY - rect.top + grid.scrollTop}px`);
    });
  }, []);
  reactExports.useEffect(() => () => {
    if (homeGridFrameRef.current !== null) {
      window.cancelAnimationFrame(homeGridFrameRef.current);
      homeGridFrameRef.current = null;
    }
    homeGridPointerRef.current = null;
  }, []);
  const homeComposer = <>{isPromotionActive ? <PromotionBadge onClick={() => {
      trackEvent(TRACK_EVENTS.HOME_PROMOTION_CLICK, {});
      promotionDialog.triggerManually();
    }} className="home-composer-promotion absolute bottom-full right-0 mb-0.5 z-20" /> : null}<MessageInput ref={inputRef} pageContext="home" onSend={handleSend} onSendPreparingChange={handleComposerSendPreparingChange} sendDisabled={!gatewayReady} busy={homeSubmitting || composerSendPreparing || sceneAttachmentsLoading} placeholderBusy={sceneAttachmentsLoading ? t("home.scene.preparingInput") : void 0} onFolderChipClick={handleFolderChipClick} onInputChange={handleInputChange} showCompactPromptPreview={true} onAttachmentsChange={handleAttachmentsChange} pendingInput={restoredDraftText} pendingEditorDoc={restoredEditorDoc} onPendingInputConsumed={() => {
      setRestoredDraftText(void 0);
      setRestoredEditorDoc(null);
    }} pendingAttachments={restoredDraftAttachments} onPendingAttachmentsConsumed={() => setRestoredDraftAttachments(null)} hideAssetMention={true} showCurrentCanvasWorkflowTab={false} placeholderNode={({
      triggerMention,
      triggerSlash
    }) => <CreationGuidePlaceholder guides={["design"]} source="home" triggerMention={triggerMention} triggerSlash={triggerSlash} />} autoFocus={true} guard={loginGuard} sendGuard={astraSendGate.sendGuard} sendLabel={astraSendGate.sendLabel} sendTooltip={astraSendGate.sendTooltip} slashPopoverPosition="down" useDefaultDir={true} onExploreSkills={handleExploreSkills} onCreateSkill={handleCreateSkill} toolbar={({
      addFromLocal,
      uploading,
      triggerSlash,
      skillTriggerRef
    }) => <HomeToolbar addFromLocal={addFromLocal} uploading={uploading} triggerSlash={triggerSlash} skillTriggerRef={skillTriggerRef} selectedModelId={homeModelId} selectedMediaModels={homeSelectedMediaModels} onModelSelectionChange={handleModelSelectionChange} workspaceFolder={workspaceFolder} onPickWorkspaceFolder={() => void handlePickWorkspaceFolder()} onClearWorkspaceFolder={handleClearWorkspaceFolder} activeSceneLabel={activeRecommendationLabel} onClearActiveScene={handleClearActiveRecommendation} showResetInput={hasInputContent} onResetInput={handleResetInput} />} className="message-input-surface home-input-surface relative z-10 flex w-full min-h-[var(--input-card-height)] flex-col justify-between rounded-[var(--home-input-radius)] p-[var(--message-input-card-padding)]" /><div className="home-composer-project-tray relative z-0 mt-0 mx-8 flex min-h-[44px] items-end rounded-b-[var(--home-input-radius)] bg-[var(--home-composer-tray-bg)] px-3 py-1.5"><HomeProjectPicker selectedProjectId={selectedProjectId} onChange={projectId => {
        if (!composerSendPreparingRef.current) setSelectedProjectId(projectId);
      }} /></div></>;
  return <main ref={scrollContainerRef} className="relative isolate flex-1 flex flex-col items-stretch overflow-y-auto overscroll-contain scrollbar-none bg-[var(--home-content-surface)] home-content-grid" onPointerMove={handleHomeGridPointerMove}><HomePromptPrefillBridge onPrefill={handlePromptPrefill} />{LoginDialog}{folderPermissionDialog}<div ref={composerLayerRef} className="home-composer-motion-layer text-left" data-action-ui-id="home.composer-motion-layer"><div className="home-hero-brand-motion-layer mac-window-drag-region" data-action-ui-id="home.window-drag-region-brand"><div className="home-hero-title-row flex items-center justify-center"><HomeWinkLogo /><h1 className="home-hero-title flex items-center font-heading font-normal text-[var(--home-brand-foreground)]"><HubWordmark width={263} height={40} className="translate-y-0.5" /></h1></div></div>{homeComposer}</div><div aria-hidden="true" className="home-composer-sticky-backdrop" /><div className="home-hero-zone relative flex shrink-0 flex-col items-center" data-has-whats-new="true"><div aria-hidden="true" className="mac-window-drag-overlay mac-window-drag-region absolute inset-x-0 top-0 z-0 h-10 select-none" data-action-ui-id="home.window-drag-region-top" /><div className="w-full max-w-[var(--home-primary-stack-width)]"><div data-reduced-compositing="true" className="home-hero-content home-fade-up relative flex flex-col items-center z-1"><div className="home-hero-announcement absolute inset-x-0 flex justify-center"><HomeWhatsNew getAriaLabel={item => t("home.whatsNew.aria", {
              defaultValue: "查看最新内容：{{title}}",
              title: item.tickerText
            })} /></div><div className="home-hero-title-block mac-window-drag-region relative z-20 flex flex-col items-center text-center" data-action-ui-id="home.window-drag-region-title" data-locale={i18n.language.startsWith("zh") ? "zh" : "en"}><div aria-hidden="true" className="home-hero-title-row-placeholder" /><p className="home-hero-subtitle font-heading font-normal text-muted-foreground">{t("home.heroSubtitle")}</p></div><div ref={composerAnchorRef} className="home-composer-placeholder relative mt-1 w-full" />{null}<div className="home-below-anchor"><MediaShowcasePreview categories={quickStartCategories} tabsConfig={tabsShowcaseConfig} skillConfig={skillShowcaseConfig} skillConfigLoading={skillShowcaseConfigLoading} skillConfigAuthoritative={skillShowcaseConfigSource === "remote"} projectCategories={projectShowcaseConfig.categories} projectDefaultSectionId={projectShowcaseConfig.defaultSectionId} projectConfigLoading={projectShowcaseConfigLoading} projectConfigAuthoritative={projectShowcaseConfigSource === "remote"} showcase={quickStartConfig.showcase} configLoading={quickStartConfigSource === "loading" || tabsShowcaseConfigSource === "loading"} configAuthoritative={quickStartConfigSource === "remote" && tabsShowcaseConfigSource === "remote"} randomInspirationEnabled={!homeSubmitting && !composerSendPreparing && !sceneAttachmentsLoading} featuredSkills={featuredSkillsMarket.skills} featuredSkillsLoading={featuredSkillsMarket.loading} featuredSkillsError={featuredSkillsMarket.error} featuredSkillInstallingName={featuredSkillInstallingName} featuredSkillInstallingProgress={featuredSkillInstallingProgress} onQuerySelect={handleQuerySelect} onFeatureSelect={featurePopup ? handleFeatureActionSelect : void 0} onProjectArchiveSelect={handleProjectArchiveSelect} onFeaturedSkillsRequest={handleShowcaseSkillsRequest} onFeaturedSkillSelect={handleFeaturedSkillSelect} /></div></div></div></div><div aria-hidden="true" className="home-composer-scroll-runway shrink-0" /><PromotionDialog open={promotionDialog.open} onOpenChange={promotionDialog.setOpen} /></main>;
}
function HomePage() {
  const {
    t
  } = useTranslation();
  const [browserOpen, setBrowserOpen] = reactExports.useState(false);
  const closeBrowser = reactExports.useCallback(() => setBrowserOpen(false), []);
  const browser = window.hilo?.browser;
  reactExports.useEffect(() => {
    if (!browser?.onPluginEvent || !browser.completeVideoDownload) return;
    return browser.onPluginEvent(request => {
      if (request.type !== "video-download-requested") return;
      void browser.completeVideoDownload({
        requestId: request.requestId,
        ok: false,
        error: t("workspace.browser.videoOpenProject", "请先打开项目，再添加视频到对话或画布。")
      }).catch(error => workspaceLog.warn("Browser video request rejection failed", {
        error
      }));
    });
  }, [browser, t]);
  reactExports.useEffect(() => {
    const openBrowser = () => setBrowserOpen(true);
    window.addEventListener(OPEN_BROWSER_EVENT, openBrowser);
    return () => window.removeEventListener(OPEN_BROWSER_EVENT, openBrowser);
  }, []);
  return <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"><div hidden={browserOpen} className={browserOpen ? "hidden" : "flex min-h-0 flex-1 flex-col"}><HomeContent /></div>{browserOpen && <WorkspaceBrowser onBackToCanvas={closeBrowser} backLabel={t("homeSidebar.home")} surfaceSource="fallback_card" />}</div>;
}
export { HomePage as component };
