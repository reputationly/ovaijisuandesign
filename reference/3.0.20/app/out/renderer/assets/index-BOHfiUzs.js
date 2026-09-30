import { h as useTranslation, a1 as useProjectStore, E as useProjectActions, lc as useProjectArchiveActions, x as useNavigateToWorkspace, v as useStorage, r as reactExports, p as projectLog, H as homeService, K as workspaceRuntimeFromOpenResult, l9 as toastWorkspaceOpenResult, a3 as dedupedToast, ld as useMediaModels, t as trackEvent, T as TRACK_EVENTS, le as useAttachmentFaceNoticeGate, lf as isAllVisibleMediaModelsSelected, lg as countVisibleSelectedMediaModels, j as jsxRuntimeExports, Q as Plus, e as Icon, bn as Box, lh as MediaModelSelector, aA as SkillIcon, X, em as RotateCcw, li as useAssetCenterRelocation, lj as useHasBlockingModal, lk as CDN_COACHMARK_HOME_AT, ll as CDN_COACHMARK_HOME_SLASH, kk as resolveSeenRevision, kI as HOME_INPUT_COACH_MARK_ID, g6 as getRuntimeConfig, lm as useModalSlot, ln as STARTUP_MODAL_IDS, lo as useCoachMarkSequence, lp as CoachMarkPopup, au as cn, as as Dialog, at as DialogContent, lq as CDN_PROMOTION_SEEDANCE, gj as DialogHeader, g8 as DialogTitle, g9 as DialogDescription, kS as DialogFooter, fM as Button, b3 as ArrowRight, u as useGatewayReady, k as useQuery, l as gatewayFetch, lr as HOME_QUICK_START_MAX_SECTIONS, ls as parseProjectArchiveSection, F as workspaceLog, m as API_PATHS, g as useRuntimeConfig, lt as findConnectorMentions, lu as OFFICIAL_CONNECTORS, lv as formatConnectorMention, gx as useProjects, lw as useCreateProjectAndSelect, ae as DropdownMenu, gt as TooltipProvider, gu as Tooltip, gv as TooltipTrigger, af as DropdownMenuTrigger, f5 as Users, cI as FolderMinus, bE as ChevronDown, gw as TooltipContent, ah as DropdownMenuContent, ai as DropdownMenuItem, aF as Folder, lx as DropdownMenuSeparator, gN as CreateProjectDialog, ly as subscribePromptPrefill, lz as getPromptPrefillRequest, lA as useMentionModels, lB as completePromptPrefill, lC as claimPromptPrefill, lD as resolveModelPricingName, bI as ChevronRight, hv as useAuth, lE as usePopup, lF as useOptionalUpdaterContext, lG as normalizeAnnouncements, lH as useBlockingModalPresence, lI as BLOCKING_MODAL_IDS, lJ as FeaturePopup, lK as HubLogo, lL as subscribeRandomInspiration, lM as getRandomInspirationRequest, lN as getRandomInspirationQueryIds, lO as completeRandomInspiration, dn as LoaderCircle, lP as ProjectImportIcon, lQ as UsePromptIcon, fa as VolumeX, f8 as Volume2, dw as Maximize2, bd as BadgeCheck, lR as formatTime, lS as resolveSkillCoverUrl, lT as toDisplayName, lU as SkillCoverMedia, lV as FilledSkillIcon, o as usePlatform, lW as getCreationGuideUrlsByLocale, lX as buildInspirationMediaShowcaseCollections, lY as buildMediaShowcaseCollections, lZ as skillVerticals, gB as openExternalUrl, gE as Tabs, gF as TabsList, gG as TabsTrigger, l_ as TabsIndicator, l$ as StableTabLabel, kf as TabsContent, gk as RetryIcon, m0 as VideoLightbox, w as useNavigate, m1 as useHomeQuickStartConfig, y as useLoginGuard, m2 as useEnsureSkillReady, m3 as useModelDefaults, m4 as useActiveCustomModel, m5 as resolveActiveModelId, m6 as useAstraSendGate, m7 as resolveNewProjectPreferences, m8 as useNewProjectFolder, m9 as canApplyHomeComposerMutation, ma as useFolderPermissionGate, mb as DraftController, mc as HOME_DRAFT_WORKSPACE, md as HOME_DRAFT_SESSION_KEY, me as invalidatePendingHomeHandoff, mf as useMarketSkills, mg as normalizePopup, mh as PopupType, mi as useFeaturePopupAction, mj as getTutorialUrlByLocale, mk as hasMessagePayload, ml as isWorkspaceFolderMissingError, mm as markHomeDraftPendingHandoff, mn as connectorReferenceFromServerName, mo as fetchSceneAttachments, mp as resolveHomeFeaturedSkillPrompt, mq as MessageInput, mr as CreationGuidePlaceholder, ms as HubWordmark, mt as OPEN_BROWSER_EVENT, mu as WorkspaceBrowser } from "./index-CANVzzmD.js";
const SAMPLE_PROJECT_ID = "builtin-sample-project";
function useSampleProject() {
  const { t } = useTranslation();
  const { allProjects: projects } = useProjectStore();
  const { provisionSampleProject, restoreProjectVisibility } = useProjectActions();
  const { runImportBundledProject } = useProjectArchiveActions();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [, , setGlobalConfigAsync] = useStorage("global.config");
  const enableProjectGrouping = reactExports.useCallback(async () => {
    try {
      await setGlobalConfigAsync((previous) => ({
        ...previous,
        recentProjectsGroupMode: "project"
      }));
    } catch (err) {
      projectLog.warn("sample-project group-mode write failed", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }, [setGlobalConfigAsync]);
  const openExistingWorkspace = reactExports.useCallback(
    async (folderPath) => {
      try {
        const openResult = await homeService.hiloApp.openWorkspaceWithResult(folderPath);
        const runtime = workspaceRuntimeFromOpenResult(openResult);
        if (!runtime) {
          toastWorkspaceOpenResult(openResult, t);
          return false;
        }
        navigateToWorkspace(runtime);
        return true;
      } catch (err) {
        projectLog.error("sample-project reopen failed", {
          path: folderPath,
          error: err instanceof Error ? err.message : String(err)
        });
        return false;
      }
    },
    [navigateToWorkspace, t]
  );
  const openSampleProject = reactExports.useCallback(async () => {
    const existingPath = projects.find((project) => project.id === SAMPLE_PROJECT_ID)?.workspacePaths[0];
    if (existingPath) {
      projectLog.info("sample-project reuse", { path: existingPath });
      const restored = await restoreProjectVisibility(SAMPLE_PROJECT_ID);
      if (!restored) {
        dedupedToast.error(t("project.restore.failed"));
        return { success: false, mode: "reused" };
      }
      await enableProjectGrouping();
      const opened = await openExistingWorkspace(existingPath);
      return { success: opened, mode: "reused" };
    }
    const outcome = await runImportBundledProject("sample-project");
    if (!outcome.targetDir) {
      projectLog.error("sample-project import failed", { stage: outcome.failureStage });
      return { success: false, mode: "failed" };
    }
    const targetDir = outcome.targetDir;
    const sampleName = t("coachMark.home.sampleProjectName", "项目新手指引");
    await provisionSampleProject({
      id: SAMPLE_PROJECT_ID,
      name: sampleName,
      workspacePath: targetDir
    });
    await enableProjectGrouping();
    projectLog.info("sample-project provisioned", {
      projectId: SAMPLE_PROJECT_ID,
      path: targetDir,
      opened: outcome.success
    });
    return outcome.success ? { success: true, mode: "imported" } : { success: false, mode: "failed" };
  }, [
    projects,
    restoreProjectVisibility,
    enableProjectGrouping,
    openExistingWorkspace,
    runImportBundledProject,
    provisionSampleProject,
    t
  ]);
  return { openSampleProject };
}
function ToolbarDivider() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-1 h-3 w-[var(--home-input-toolbar-divider-width)] shrink-0 bg-foreground/15" });
}
function HomeToolbar({
  addFromLocal,
  uploading,
  triggerSlash,
  skillTriggerRef,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  workspaceFolder,
  onPickWorkspaceFolder,
  onClearWorkspaceFolder,
  activeSceneLabel,
  onClearActiveScene,
  showResetInput,
  onResetInput
}) {
  const { t } = useTranslation();
  const { data: mediaModels } = useMediaModels();
  const fileInputRef = reactExports.useRef(null);
  const modelButtonRef = reactExports.useRef(null);
  const workspaceButtonRef = reactExports.useRef(null);
  const [modelPickerOpen, setModelPickerOpen] = reactExports.useState(false);
  const handleFileChange = reactExports.useCallback(
    (e) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) {
        trackEvent(TRACK_EVENTS.HOME_ATTACHMENT_ADD, {
          count: selected.length,
          source: "file_picker"
        });
        addFromLocal(selected);
      }
      e.target.value = "";
    },
    [addFromLocal]
  );
  const handleSkillsPopover = reactExports.useCallback(() => {
    trackEvent(TRACK_EVENTS.HOME_SKILLS_POPOVER_OPEN, {});
    triggerSlash();
  }, [triggerSlash]);
  const handleModelToggle = reactExports.useCallback(() => {
    setModelPickerOpen((v) => !v);
  }, []);
  const handleModelClose = reactExports.useCallback(() => {
    setModelPickerOpen(false);
  }, []);
  const handleOpenFilePicker = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const { requestAttachmentPicker, attachmentFaceNoticeDialog } = useAttachmentFaceNoticeGate(handleOpenFilePicker);
  const buttonLabel = (() => {
    if (!selectedMediaModels || !mediaModels) return t("chat.mediaModels.label");
    if (isAllVisibleMediaModelsSelected(selectedMediaModels, mediaModels)) {
      return t("chat.mediaModels.label");
    }
    const count = countVisibleSelectedMediaModels(selectedMediaModels, mediaModels);
    if (count === 0) return t("chat.mediaModels.label");
    return `${t("chat.mediaModels.label")} · ${count}`;
  })();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 items-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-action-ui-id": "home-attachment-add",
        "aria-label": t("chat.addFile"),
        title: t("chat.addFile"),
        disabled: uploading,
        onClick: requestAttachmentPicker,
        className: "mr-1 flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-[var(--message-input-attachment-bg)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-attachment-bg-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        multiple: true,
        className: "hidden",
        onChange: handleFileChange,
        "data-action-ui-id": "home-attachment-local"
      }
    ),
    attachmentFaceNoticeDialog,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        ref: modelButtonRef,
        type: "button",
        "data-action-ui-id": "home-model-btn",
        onClick: handleModelToggle,
        className: "flex items-center gap-[var(--home-input-control-content-gap)] px-[var(--home-input-toolbar-padding-x)] h-[var(--btn-height-sm)] rounded-full text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] transition-colors duration-75 cursor-pointer",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Box, size: "md", strokeWidth: 1.5 }),
          buttonLabel
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MediaModelSelector,
      {
        open: modelPickerOpen,
        placement: "below",
        anchorRef: modelButtonRef,
        currentModelId: selectedModelId,
        current: selectedMediaModels,
        onCommit: onModelSelectionChange,
        onClose: handleModelClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ToolbarDivider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        ref: skillTriggerRef,
        "data-action-ui-id": "home-skill-btn",
        onClick: handleSkillsPopover,
        className: "flex items-center gap-[var(--home-input-control-content-gap)] px-[var(--home-input-toolbar-padding-x)] h-[var(--btn-height-sm)] rounded-full text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] transition-colors duration-75 cursor-pointer",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SkillIcon, { size: 16, strokeWidth: 1.5 }),
          t("skills.popover.buttonLabel")
        ]
      }
    ),
    null,
    activeSceneLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "data-action-ui-id": "home-active-scene-tag",
        "aria-label": t("home.scene.clearActive", {
          defaultValue: "清除场景 {{scene}}",
          scene: activeSceneLabel
        }),
        onClick: onClearActiveScene,
        className: "home-active-scene-tag ml-2 inline-flex h-7 max-w-36 shrink-0 cursor-pointer items-center gap-1 rounded-full px-[var(--home-input-toolbar-padding-x)] text-xs font-normal transition-colors focus-visible:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: activeSceneLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14, strokeWidth: 1.5, className: "shrink-0" })
        ]
      }
    ),
    showResetInput ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto mr-2 flex shrink-0 items-center gap-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-action-ui-id": "home-reset-btn",
        "aria-label": t("home.input.reset", "重置输入"),
        title: t("home.input.reset", "重置输入"),
        onClick: onResetInput,
        className: "flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: RotateCcw, size: "md", strokeWidth: 1.5 })
      }
    ) }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      HomeInputCoachMarks,
      {
        modelButtonRef,
        skillButtonRef: skillTriggerRef,
        workspaceButtonRef
      }
    )
  ] });
}
const MARK_ID = HOME_INPUT_COACH_MARK_ID;
const PROJECT_LIBRARY_REVISION = 2;
const PROJECTS_NAV_SELECTOR = '[data-action-ui-id="home-sidebar-nav-projects-coachmark-anchor"]';
function HomeInputCoachMarks({
  modelButtonRef,
  skillButtonRef,
  workspaceButtonRef
}) {
  const { t } = useTranslation();
  const [config, , , configHydrated] = useStorage("global.config");
  const [dismissedMarks, , , dismissedHydrated] = useStorage("global.dismissedCoachMarks");
  const relocation = useAssetCenterRelocation();
  const { openSampleProject } = useSampleProject();
  const hasBlockingModal = useHasBlockingModal();
  const projectsNavRef = reactExports.useRef(null);
  const [ctaLoading, setCtaLoading] = reactExports.useState(false);
  const steps = [
    {
      kind: "onboarding",
      revision: 1,
      anchorRef: modelButtonRef,
      titleKey: "coachMark.home.atKey.title",
      titleFallback: "使用「@」键",
      descKey: "coachMark.home.atKey.desc",
      descFallback: "想引用具体某张图或指定某个模型？输入 @ 直接挑——文件、模型都能选",
      ctaKey: "coachMark.next",
      ctaFallback: "下一步",
      mediaUrl: CDN_COACHMARK_HOME_AT
    },
    {
      kind: "onboarding",
      revision: 1,
      anchorRef: skillButtonRef,
      titleKey: "coachMark.home.slashKey.title",
      titleFallback: "使用「/」键",
      descKey: "coachMark.home.slashKey.desc",
      descFallback: "需要专属 Skill 帮忙",
      ctaKey: "coachMark.next",
      ctaFallback: "下一步",
      mediaUrl: CDN_COACHMARK_HOME_SLASH
    },
    ...[],
    {
      kind: "project-library",
      revision: PROJECT_LIBRARY_REVISION,
      anchorRef: projectsNavRef,
      titleKey: "coachMark.home.projectLibrary.title",
      titleFallback: "项目库",
      descKey: "coachMark.home.projectLibrary.desc",
      descFallback: "所有项目都在这里集中管理。点击下一步，为你创建一个示例项目，快速上手工作区。",
      ctaKey: "coachMark.next",
      ctaFallback: "下一步",
      side: "right",
      align: "center"
    }
  ];
  const maxRevision = Math.max(...steps.map((step2) => step2.revision ?? 1));
  const tourPending = relocation.ready && !relocation.hasAssetData && dismissedHydrated && resolveSeenRevision(dismissedMarks, MARK_ID) < maxRevision;
  const configReady = configHydrated && (getRuntimeConfig().region !== "domestic" || config.watermarkOnboardingShown === true);
  const granted = useModalSlot(STARTUP_MODAL_IDS.homeCoachMarks, {
    candidate: configReady && tourPending
  });
  const sequence = useCoachMarkSequence(MARK_ID, steps, granted && !hasBlockingModal);
  const step = sequence.isOpen ? sequence.visibleSteps[sequence.index] : void 0;
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    projectsNavRef.current = document.querySelector(PROJECTS_NAV_SELECTOR);
    setAnchorEl(step?.anchorRef.current ?? null);
  });
  if (!step) return null;
  const handleDismiss = (method) => {
    if (method !== "button") {
      if (!ctaLoading) sequence.dismiss(method);
      return;
    }
    if (step.kind !== "project-library") {
      sequence.next();
      return;
    }
    if (ctaLoading) return;
    setCtaLoading(true);
    void sequence.persistSeen(step.revision ?? PROJECT_LIBRARY_REVISION).then(() => openSampleProject()).finally(() => {
      setCtaLoading(false);
      sequence.next();
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CoachMarkPopup,
    {
      open: sequence.isOpen,
      onDismiss: handleDismiss,
      anchorRef: step.anchorRef,
      anchorEl,
      side: step.side ?? "bottom",
      align: step.align ?? "start",
      title: t(step.titleKey, step.titleFallback),
      description: t(step.descKey, step.descFallback),
      ctaLabel: t(step.ctaKey, step.ctaFallback),
      ctaLoading,
      media: step.mediaUrl ? { url: step.mediaUrl, type: "image" } : void 0,
      preloadUrls: sequence.visibleSteps.map((visibleStep) => visibleStep.mediaUrl).filter((url) => Boolean(url)),
      stepCurrent: sequence.stepCurrent,
      stepTotal: sequence.stepTotal,
      showClose: true,
      actionUiId: `coach-mark-${MARK_ID}`
    }
  );
}
const BASE_CLASS = "inline-flex items-center px-3 py-1.5 rounded-sm bg-brand-accent text-white text-xs font-medium";
function PromotionBadge({ onClick, className }) {
  const { t } = useTranslation();
  const text = t("promotion.badge");
  if (!onClick) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-action-ui-id": "home.promotion-badge",
        className: cn(BASE_CLASS, "pointer-events-none select-none", className),
        children: text
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      "data-action-ui-id": "home.promotion-badge",
      onClick,
      className: cn(BASE_CLASS, "hover:opacity-90 transition-opacity", className),
      children: text
    }
  );
}
function PromotionDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const title = t("promotion.dialog.title");
  const bullets = [
    t("promotion.dialog.bullet1"),
    t("promotion.dialog.bullet2"),
    t("promotion.dialog.bullet3")
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      "data-action-ui-id": "promotion.dialog",
      className: "w-[760px] h-[480px] max-w-none sm:max-w-none p-0 gap-0 grid grid-cols-[320px_1fr] overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-[320px] h-[480px] bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: CDN_PROMOTION_SEEDANCE, alt: title, className: "w-full h-full object-cover" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[480px] flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col justify-center gap-4 px-8", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "text-left space-y-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-heading text-2xl font-medium leading-tight text-foreground", children: title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "sr-only", children: title })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground", children: bullets.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "mt-2 h-1 w-1 shrink-0 bg-foreground/60" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: b })
            ] }, b)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "px-8 pb-6 sm:justify-end gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                "data-action-ui-id": "promotion.dialog.cancel",
                onClick: () => onOpenChange(false),
                children: t("promotion.dialog.cancel")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { "data-action-ui-id": "promotion.dialog.cta", onClick: () => onOpenChange(false), children: [
              t("promotion.dialog.cta"),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4" })
            ] })
          ] })
        ] })
      ]
    }
  ) });
}
function extractPromotion(config) {
  if (!config || typeof config !== "object") return null;
  const cfg = config;
  const promo = cfg.seedance_discount;
  if (!promo) return null;
  if (typeof promo.start_time_ms !== "number" || typeof promo.end_time_ms !== "number") {
    return null;
  }
  return { startTimeMs: promo.start_time_ms, endTimeMs: promo.end_time_ms };
}
function usePromotion() {
  const gatewayReady = useGatewayReady();
  const { data } = useQuery({
    queryKey: ["client-config"],
    queryFn: async () => {
      try {
        const res = await gatewayFetch("/api/v1/client_config");
        if (!res.ok) return null;
        return extractPromotion(await res.json());
      } catch {
        return null;
      }
    },
    enabled: gatewayReady,
    staleTime: 6e4,
    retry: false
  });
  const now = Date.now();
  const isShow = !!data && now >= data.startTimeMs && now < data.endTimeMs;
  return { isShow, data: isShow ? data : null };
}
const STORAGE_KEY = "hilo:promotion:lastShownDate";
function todayStr() {
  const d = /* @__PURE__ */ new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function readLastShown() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeLastShown(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
  }
}
function usePromotionDialog(canAutoShow) {
  const [autoCandidate, setAutoCandidate] = reactExports.useState(false);
  const [manualOpen, setManualOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!canAutoShow) return;
    if (readLastShown() === todayStr()) return;
    setAutoCandidate(true);
  }, [canAutoShow]);
  const granted = useModalSlot(STARTUP_MODAL_IDS.promotion, { candidate: autoCandidate });
  const setOpen = reactExports.useCallback((next) => {
    if (next) {
      setManualOpen(true);
      return;
    }
    writeLastShown(todayStr());
    setAutoCandidate(false);
    setManualOpen(false);
  }, []);
  const triggerManually = reactExports.useCallback(() => setManualOpen(true), []);
  return { open: granted && autoCandidate || manualOpen, setOpen, triggerManually };
}
const LOGO_STAGE_END = 0.2;
const COMPOSER_STAGE_END = 0.8;
const TOOLBAR_FADE_END = 0.72;
const PROMPT_PREVIEW_START = 0.62;
const COMPACT_ACTION_INLINE_INSET_PX = 8;
const STAGE_LINEAR_BLEND = 0.2;
function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
function clamp01(value) {
  return Math.min(1, Math.max(0, finiteOr(value, 0)));
}
function smoothStep(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}
function stageEase(value) {
  const progress = clamp01(value);
  return smoothStep(progress) * (1 - STAGE_LINEAR_BLEND) + progress * STAGE_LINEAR_BLEND;
}
function segmentProgress(value, start, end) {
  const safeStart = finiteOr(start, 0);
  const safeEnd = finiteOr(end, safeStart);
  if (safeEnd <= safeStart) return 0;
  return clamp01((finiteOr(value, 0) - safeStart) / (safeEnd - safeStart));
}
function resolveHomeComposerStageProgress(progress) {
  const normalizedProgress = clamp01(progress);
  const logoProgress = segmentProgress(normalizedProgress, 0, LOGO_STAGE_END);
  const composerProgress = segmentProgress(normalizedProgress, LOGO_STAGE_END, COMPOSER_STAGE_END);
  const gapProgress = segmentProgress(normalizedProgress, COMPOSER_STAGE_END, 1);
  let stage = "idle";
  if (normalizedProgress >= 1) stage = "compact";
  else if (normalizedProgress > COMPOSER_STAGE_END) stage = "gap";
  else if (normalizedProgress > LOGO_STAGE_END) stage = "composer";
  else if (normalizedProgress > 0) stage = "logo";
  return {
    progress: normalizedProgress,
    stage,
    logoProgress,
    composerProgress,
    gapProgress
  };
}
function interpolate(from, to, progress) {
  const safeFrom = finiteOr(from, 0);
  const safeTo = finiteOr(to, safeFrom);
  return safeFrom + (safeTo - safeFrom) * clamp01(progress);
}
function resolveHomeCompactStackGeometry({
  mainTop,
  topInset,
  logoRowHeight,
  logoScale,
  logoToComposerGap
}) {
  const logoTop = finiteOr(mainTop, 0) + Math.max(0, finiteOr(topInset, 0));
  const scaledLogoHeight = Math.max(0, finiteOr(logoRowHeight, 0)) * clamp01(finiteOr(logoScale, 1));
  const logoBottom = logoTop + scaledLogoHeight;
  return {
    logoTop,
    logoBottom,
    composerTop: logoBottom + Math.max(0, finiteOr(logoToComposerGap, 0))
  };
}
function resolveHomeShowcaseViewportGeometry({
  mainBottom,
  compactComposerTop,
  compactComposerHeight,
  composerToShowcaseGap,
  showcaseOriginTop,
  minimumHandoffScroll,
  showcaseTracksComposer = false
}) {
  const safeMainBottom = finiteOr(mainBottom, 0);
  const compactComposerBottom = finiteOr(compactComposerTop, 0) + Math.max(0, finiteOr(compactComposerHeight, 0));
  const viewportTop = Math.min(
    safeMainBottom,
    compactComposerBottom + Math.max(0, finiteOr(composerToShowcaseGap, 0))
  );
  const minimumHandoff = Math.max(0, finiteOr(minimumHandoffScroll, 0));
  const handoffScroll = showcaseTracksComposer ? minimumHandoff : Math.max(minimumHandoff, finiteOr(showcaseOriginTop, viewportTop) - viewportTop);
  return {
    viewportTop,
    viewportHeight: Math.max(0, safeMainBottom - viewportTop),
    handoffScroll
  };
}
function resolveHomeShowcaseMotionOffset({
  scrollTop,
  showcaseOriginTop,
  composerTop,
  composerHeight,
  showcaseGap
}) {
  const desiredShowcaseTop = finiteOr(composerTop, 0) + Math.max(0, finiteOr(composerHeight, 0)) + Math.max(0, finiteOr(showcaseGap, 0));
  const naturalShowcaseTop = finiteOr(showcaseOriginTop, desiredShowcaseTop) - Math.max(0, finiteOr(scrollTop, 0));
  return finiteOr(desiredShowcaseTop - naturalShowcaseTop, 0);
}
function resolveHomeComposerProgress(scrollTop, collapseStartScroll, collapseEndScroll) {
  const safeStart = finiteOr(collapseStartScroll, 0);
  const safeEnd = finiteOr(collapseEndScroll, safeStart + 1);
  const distance = Math.max(1, safeEnd - safeStart);
  return clamp01((finiteOr(scrollTop, 0) - safeStart) / distance);
}
function resolveHomeComposerPresentationProgress(progress, prefersReducedMotion2) {
  const normalizedProgress = clamp01(progress);
  if (!prefersReducedMotion2) return normalizedProgress;
  return normalizedProgress >= 0.5 ? 1 : 0;
}
function resolveHomeComposerGeometry({
  progress,
  expandedWidth,
  compactWidth,
  expandedHeight,
  compactHeight,
  expandedRadius,
  compactRadius
}) {
  const safeExpandedWidth = Math.max(0, finiteOr(expandedWidth, 0));
  const safeExpandedHeight = Math.max(0, finiteOr(expandedHeight, 0));
  const safeCompactWidth = Math.min(
    safeExpandedWidth,
    Math.max(0, finiteOr(compactWidth, safeExpandedWidth))
  );
  const safeCompactHeight = Math.min(
    safeExpandedHeight,
    Math.max(0, finiteOr(compactHeight, safeExpandedHeight))
  );
  const safeExpandedRadius = Math.max(0, finiteOr(expandedRadius, 0));
  const safeCompactRadius = Math.max(
    safeExpandedRadius,
    finiteOr(compactRadius, safeExpandedRadius)
  );
  const stageProgress = resolveHomeComposerStageProgress(progress);
  const logoProgress = stageEase(stageProgress.logoProgress);
  const composerProgress = stageEase(stageProgress.composerProgress);
  const showcaseGapProgress = stageEase(stageProgress.gapProgress);
  const verticalCompact = stageProgress.composerProgress >= 1;
  const toolbarOpacity = 1 - smoothStep(stageProgress.composerProgress / TOOLBAR_FADE_END);
  const promptPreviewOpacity = smoothStep(
    segmentProgress(stageProgress.composerProgress, PROMPT_PREVIEW_START, 1)
  );
  return {
    progress: stageProgress.progress,
    stage: stageProgress.stage,
    visualProgress: composerProgress,
    logoProgress,
    composerProgress,
    showcaseGapProgress,
    width: interpolate(safeExpandedWidth, safeCompactWidth, composerProgress),
    height: verticalCompact ? safeCompactHeight : safeExpandedHeight,
    radius: interpolate(safeExpandedRadius, safeCompactRadius, composerProgress),
    toolbarOpacity,
    liveEditorOpacity: 1 - promptPreviewOpacity,
    promptPreviewOpacity,
    actionInlineInset: interpolate(0, COMPACT_ACTION_INLINE_INSET_PX, composerProgress),
    editorInset: interpolate(0, 44, composerProgress),
    editorTop: verticalCompact ? 8 : 0,
    editorMinHeight: verticalCompact ? 20 : 90,
    editorMaxHeight: verticalCompact ? 20 : 200,
    logoScale: interpolate(1, 0.7, logoProgress),
    auxiliaryOpacity: 1 - logoProgress
  };
}
const COMPACT_HEIGHT_PX = 64;
const COMPACT_MAX_WIDTH_PX = 648;
const COMPACT_VIEWPORT_INSET_PX = 24;
const LOGO_SAFE_TOP_INSET_PX = 88;
const COMPACT_LOGO_SCALE = 0.7;
const LOGO_TO_COMPOSER_GAP_PX = 16;
const COLLAPSE_SCROLL_DISTANCE_PX = 220;
const COMPACT_SHOWCASE_GAP_RATIO = 0.5;
const EXPANDED_RADIUS_PX = 20;
const COMPACT_RADIUS_PX = 32;
const MOTION_EPSILON = 1e-3;
const SCROLL_HANDOFF_TOLERANCE_PX = 1;
const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_HANDOFF_DETENT_MS = 110;
const WHEEL_GESTURE_IDLE_MS = 140;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const INITIAL_METRICS = {
  originTop: 0,
  collapseStartScroll: 0,
  collapseEndScroll: 1,
  expandedWidth: 0,
  compactWidth: 0,
  expandedHeight: 150,
  expandedBrandGap: 0,
  logoPinTop: 0,
  logoRowHeight: 0,
  showcaseOriginTop: 0,
  expandedShowcaseGap: 0,
  compactShowcaseGap: 0,
  showcaseHandoffScroll: 0
};
function toPixels(value) {
  return `${Math.round(value * 100) / 100}px`;
}
function setDatasetValue(element, key, value) {
  if (element.dataset[key] === value) return;
  element.dataset[key] = value;
}
function useHomeComposerMotion() {
  const scrollContainerRef = reactExports.useRef(null);
  const composerAnchorRef = reactExports.useRef(null);
  const composerLayerRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const composerAnchor = composerAnchorRef.current;
    const composerLayer = composerLayerRef.current;
    const inputRoot = composerLayer?.querySelector('[data-message-input-root="true"]');
    if (!scrollContainer || !composerAnchor || !composerLayer || !inputRoot) return;
    const editorSurface = inputRoot.querySelector(".message-input-editor");
    const livePromptEditor = editorSurface?.querySelector(".ProseMirror");
    const actionRow = inputRoot.querySelector('[data-composer-action-row="true"]');
    const rightActions = actionRow?.querySelector(
      '[data-composer-actions-right="true"]'
    );
    const showcaseViewport = scrollContainer.querySelector(".home-below-anchor");
    if (!showcaseViewport) return;
    const heroEntrance = composerAnchor.closest(".home-fade-up");
    const brandPlaceholder = heroEntrance?.querySelector(
      ".home-hero-title-row-placeholder"
    );
    const brandLayer = composerLayer.querySelector(".home-hero-brand-motion-layer");
    const titleRow = brandLayer?.querySelector(".home-hero-title-row");
    if (!brandPlaceholder || !brandLayer || !titleRow) return;
    const heroAnnouncement = heroEntrance?.querySelector(".home-hero-announcement");
    const heroSubtitle = heroEntrance?.querySelector(".home-hero-subtitle");
    const stickyBackdrop = scrollContainer.querySelector(
      ".home-composer-sticky-backdrop"
    );
    const promotion = composerLayer.querySelector(".home-composer-promotion");
    let metrics = INITIAL_METRICS;
    let attachmentPreviewHeight = 0;
    let animationFrame = null;
    let measurementPending = false;
    let intrinsicMeasurementPending = false;
    let showcaseMotionOffset = 0;
    let promptFirstLineAnchored = false;
    let composerReactivating = false;
    let wheelHandoffHeldDirection = null;
    let wheelHandoffIdleTimer = null;
    let wheelGestureOwner = null;
    let wheelGestureIdleTimer = null;
    const reducedMotionQuery = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    let prefersReducedMotion2 = reducedMotionQuery?.matches ?? false;
    const readAttachmentPreviewHeight = () => {
      const preview = inputRoot.querySelector(
        '[data-message-input-attachment-preview="true"]'
      );
      return preview?.getBoundingClientRect().height ?? 0;
    };
    const measureExpandedHeightAtRest = () => {
      const measurementRoot = inputRoot.cloneNode(true);
      measurementRoot.removeAttribute("data-message-input-root");
      measurementRoot.setAttribute("aria-hidden", "true");
      measurementRoot.setAttribute("inert", "");
      measurementRoot.dataset.actionsCompact = "false";
      measurementRoot.style.position = "fixed";
      measurementRoot.style.inset = "auto auto 0 -100000px";
      measurementRoot.style.width = toPixels(metrics.expandedWidth);
      measurementRoot.style.height = "auto";
      measurementRoot.style.visibility = "hidden";
      measurementRoot.style.pointerEvents = "none";
      measurementRoot.style.removeProperty("--home-composer-min-height");
      measurementRoot.style.removeProperty("--home-composer-radius");
      measurementRoot.style.removeProperty("--home-composer-toolbar-opacity");
      measurementRoot.style.removeProperty("--home-composer-editor-inset");
      measurementRoot.style.removeProperty("--home-composer-actions-right-width");
      measurementRoot.style.removeProperty("--home-composer-editor-top");
      measurementRoot.style.removeProperty("--home-composer-editor-bottom");
      measurementRoot.style.removeProperty("--home-composer-action-bottom");
      measurementRoot.style.removeProperty("--home-composer-attachment-offset");
      measurementRoot.style.removeProperty("--home-composer-editor-min-height");
      measurementRoot.style.removeProperty("--home-composer-editor-max-height");
      measurementRoot.style.removeProperty("--home-composer-live-editor-opacity");
      measurementRoot.style.removeProperty("--home-composer-prompt-preview-opacity");
      measurementRoot.style.removeProperty("--home-composer-progress");
      for (const element of measurementRoot.querySelectorAll("[id]")) {
        element.removeAttribute("id");
      }
      scrollContainer.appendChild(measurementRoot);
      const expandedHeight = measurementRoot.getBoundingClientRect().height;
      measurementRoot.remove();
      return Math.max(COMPACT_HEIGHT_PX, expandedHeight);
    };
    const readMetrics = (measureNaturalHeight) => {
      const preserveShowcaseHandoff = scrollContainer.dataset.homeShowcaseScrollActive === "true";
      const mainRect = scrollContainer.getBoundingClientRect();
      let anchorRect = composerAnchor.getBoundingClientRect();
      const expandedWidth = Math.max(0, anchorRect.width);
      composerLayer.style.width = toPixels(expandedWidth);
      composerLayer.style.left = toPixels(anchorRect.left + expandedWidth / 2);
      let expandedHeight = metrics.expandedHeight;
      if (measureNaturalHeight) {
        inputRoot.style.removeProperty("height");
        inputRoot.style.removeProperty("--home-composer-min-height");
        expandedHeight = Math.max(COMPACT_HEIGHT_PX, inputRoot.getBoundingClientRect().height);
        attachmentPreviewHeight = readAttachmentPreviewHeight();
        composerAnchor.style.height = toPixels(expandedHeight);
        anchorRect = composerAnchor.getBoundingClientRect();
      }
      const brandRowHeight = Math.max(0, titleRow.offsetHeight);
      const compactStack = resolveHomeCompactStackGeometry({
        mainTop: mainRect.top,
        topInset: LOGO_SAFE_TOP_INSET_PX,
        logoRowHeight: brandRowHeight,
        logoScale: COMPACT_LOGO_SCALE,
        logoToComposerGap: LOGO_TO_COMPOSER_GAP_PX
      });
      const expandedBrandGap = Math.max(
        LOGO_TO_COMPOSER_GAP_PX,
        anchorRect.top - brandPlaceholder.getBoundingClientRect().bottom
      );
      const stickyTop = compactStack.composerTop;
      const originTop = anchorRect.top + scrollContainer.scrollTop;
      const logoPinTop = compactStack.logoTop;
      const logoOriginTop = brandPlaceholder.getBoundingClientRect().top + scrollContainer.scrollTop;
      const collapseStartScroll = Math.max(0, logoOriginTop - logoPinTop);
      const collapseEndScroll = collapseStartScroll + COLLAPSE_SCROLL_DISTANCE_PX;
      const availableCompactWidth = Math.max(0, mainRect.width - COMPACT_VIEWPORT_INSET_PX * 2);
      const showcaseOriginTop = showcaseViewport.getBoundingClientRect().top + scrollContainer.scrollTop - showcaseMotionOffset;
      const expandedShowcaseGap = Math.max(0, showcaseOriginTop - (originTop + expandedHeight));
      const compactShowcaseGap = expandedShowcaseGap * COMPACT_SHOWCASE_GAP_RATIO;
      const showcaseLayout = resolveHomeShowcaseViewportGeometry({
        mainBottom: mainRect.bottom,
        compactComposerTop: stickyTop,
        compactComposerHeight: COMPACT_HEIGHT_PX,
        composerToShowcaseGap: compactShowcaseGap,
        showcaseOriginTop,
        minimumHandoffScroll: collapseEndScroll,
        showcaseTracksComposer: true
      });
      showcaseViewport.style.height = toPixels(showcaseLayout.viewportHeight);
      scrollContainer.style.setProperty(
        "--home-composer-sticky-backdrop-height",
        toPixels(showcaseLayout.viewportTop - mainRect.top)
      );
      scrollContainer.style.setProperty(
        "--home-showcase-grid-background-offset-y",
        toPixels(mainRect.top - showcaseLayout.viewportTop)
      );
      scrollContainer.style.setProperty(
        "--home-composer-scroll-runway",
        toPixels(showcaseLayout.handoffScroll)
      );
      metrics = {
        originTop,
        collapseStartScroll,
        collapseEndScroll,
        expandedWidth: anchorRect.width,
        compactWidth: Math.min(anchorRect.width, COMPACT_MAX_WIDTH_PX, availableCompactWidth),
        expandedHeight,
        expandedBrandGap,
        logoPinTop,
        logoRowHeight: brandRowHeight,
        showcaseOriginTop,
        expandedShowcaseGap,
        compactShowcaseGap,
        showcaseHandoffScroll: showcaseLayout.handoffScroll
      };
      if (preserveShowcaseHandoff) {
        scrollContainer.scrollTop = showcaseLayout.handoffScroll;
      }
    };
    const resolveProgress = (scrollTop) => resolveHomeComposerProgress(
      scrollTop,
      metrics.collapseStartScroll,
      metrics.collapseEndScroll
    );
    const measureIntrinsicExpandedHeight = () => {
      attachmentPreviewHeight = readAttachmentPreviewHeight();
      const nextExpandedHeight = measureExpandedHeightAtRest();
      if (Math.abs(nextExpandedHeight - metrics.expandedHeight) <= 0.5) return;
      metrics = { ...metrics, expandedHeight: nextExpandedHeight };
      composerAnchor.style.height = toPixels(nextExpandedHeight);
      readMetrics(false);
    };
    const applyMotion = () => {
      const scrollTop = scrollContainer.scrollTop;
      const presentationProgress = resolveHomeComposerPresentationProgress(
        resolveProgress(scrollTop),
        prefersReducedMotion2
      );
      const geometry = resolveHomeComposerGeometry({
        progress: presentationProgress,
        expandedWidth: metrics.expandedWidth,
        compactWidth: metrics.compactWidth,
        expandedHeight: metrics.expandedHeight,
        compactHeight: COMPACT_HEIGHT_PX,
        expandedRadius: EXPANDED_RADIUS_PX,
        compactRadius: COMPACT_RADIUS_PX
      });
      const naturalTop = metrics.originTop - scrollTop;
      const brandGap = interpolate(
        metrics.expandedBrandGap,
        LOGO_TO_COMPOSER_GAP_PX,
        geometry.composerProgress
      );
      const pinnedTop = metrics.logoPinTop + metrics.logoRowHeight * geometry.logoScale + brandGap;
      const top = scrollTop <= metrics.collapseStartScroll ? naturalTop : pinnedTop;
      const showcaseGap = interpolate(
        metrics.expandedShowcaseGap,
        metrics.compactShowcaseGap,
        geometry.showcaseGapProgress
      );
      const motionActive = geometry.progress > MOTION_EPSILON;
      const compact = geometry.progress >= 1 - MOTION_EPSILON;
      const controlsHidden = geometry.toolbarOpacity <= 0.01;
      const liveEditorHidden = geometry.liveEditorOpacity <= 0.01;
      const attachmentOffset = attachmentPreviewHeight * geometry.toolbarOpacity;
      showcaseMotionOffset = resolveHomeShowcaseMotionOffset({
        scrollTop,
        showcaseOriginTop: metrics.showcaseOriginTop,
        composerTop: top,
        composerHeight: geometry.height,
        showcaseGap
      });
      const showcaseScrollActive = scrollTop >= metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
      if (!showcaseScrollActive && scrollTop <= SCROLL_HANDOFF_TOLERANCE_PX && showcaseViewport.scrollTop !== 0) {
        showcaseViewport.scrollTop = 0;
      }
      if (!composerReactivating && liveEditorHidden && livePromptEditor) {
        promptFirstLineAnchored = true;
        livePromptEditor.scrollTop = 0;
      } else if (composerReactivating && !liveEditorHidden) {
        composerReactivating = false;
      }
      if (promptFirstLineAnchored && motionActive && livePromptEditor) {
        livePromptEditor.scrollTop = 0;
      }
      composerLayer.style.translate = `-50% ${toPixels(top)}`;
      composerLayer.style.width = toPixels(geometry.width);
      showcaseViewport.style.translate = `-50% ${toPixels(showcaseMotionOffset)}`;
      brandLayer.style.translate = `-50% ${toPixels(-brandGap)}`;
      brandLayer.style.scale = String(geometry.logoScale);
      if (heroAnnouncement) heroAnnouncement.style.opacity = String(geometry.auxiliaryOpacity);
      if (heroSubtitle) heroSubtitle.style.opacity = String(geometry.auxiliaryOpacity);
      if (stickyBackdrop) stickyBackdrop.style.opacity = String(1 - geometry.auxiliaryOpacity);
      if (promotion) promotion.style.opacity = String(geometry.auxiliaryOpacity);
      if (actionRow) actionRow.style.insetInline = toPixels(geometry.actionInlineInset);
      setDatasetValue(composerLayer, "homeComposerReady", "true");
      setDatasetValue(composerLayer, "motion", motionActive ? "true" : "false");
      setDatasetValue(composerLayer, "homeComposerStage", geometry.stage);
      setDatasetValue(composerLayer, "homeComposerCompact", compact ? "true" : "false");
      setDatasetValue(
        composerLayer,
        "homeComposerControlsHidden",
        controlsHidden ? "true" : "false"
      );
      setDatasetValue(scrollContainer, "homeComposerMotion", motionActive ? "true" : "false");
      setDatasetValue(scrollContainer, "homeComposerCompact", compact ? "true" : "false");
      setDatasetValue(
        scrollContainer,
        "homeShowcaseScrollActive",
        showcaseScrollActive ? "true" : "false"
      );
      inputRoot.style.setProperty("--home-composer-radius", toPixels(geometry.radius));
      inputRoot.style.setProperty(
        "--home-composer-toolbar-opacity",
        String(geometry.toolbarOpacity)
      );
      inputRoot.style.setProperty("--home-composer-editor-inset", toPixels(geometry.editorInset));
      inputRoot.style.setProperty("--home-composer-editor-top", toPixels(geometry.editorTop));
      inputRoot.style.setProperty(
        "--home-composer-editor-bottom",
        toPixels(32 - 24 * geometry.visualProgress)
      );
      inputRoot.style.setProperty(
        "--home-composer-action-bottom",
        toPixels(8 * geometry.visualProgress)
      );
      inputRoot.style.setProperty("--home-composer-attachment-offset", toPixels(attachmentOffset));
      inputRoot.style.setProperty(
        "--home-composer-editor-min-height",
        toPixels(geometry.editorMinHeight)
      );
      inputRoot.style.setProperty(
        "--home-composer-editor-max-height",
        toPixels(geometry.editorMaxHeight)
      );
      inputRoot.style.setProperty(
        "--home-composer-live-editor-opacity",
        String(geometry.liveEditorOpacity)
      );
      inputRoot.style.setProperty(
        "--home-composer-prompt-preview-opacity",
        String(geometry.promptPreviewOpacity)
      );
      inputRoot.style.setProperty("--home-composer-progress", String(geometry.visualProgress));
      if (motionActive) {
        inputRoot.style.height = toPixels(geometry.height);
        inputRoot.style.setProperty("--home-composer-min-height", "0px");
      } else {
        inputRoot.style.removeProperty("height");
        inputRoot.style.removeProperty("--home-composer-min-height");
        promptFirstLineAnchored = false;
        composerReactivating = false;
      }
    };
    const scheduleFrame = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const scrollTop = scrollContainer.scrollTop;
        if (measurementPending) {
          readMetrics(resolveProgress(scrollTop) <= MOTION_EPSILON);
          measurementPending = false;
        }
        if (intrinsicMeasurementPending) {
          if (resolveProgress(scrollContainer.scrollTop) > MOTION_EPSILON) {
            measureIntrinsicExpandedHeight();
          }
          intrinsicMeasurementPending = false;
        }
        applyMotion();
      });
    };
    const commitOuterWheelScroll = (scrollTop) => {
      scrollContainer.scrollTop = scrollTop;
      applyMotion();
      scheduleFrame();
    };
    const handleScroll = () => {
      if (scrollContainer.scrollTop > metrics.showcaseHandoffScroll) {
        scrollContainer.scrollTop = metrics.showcaseHandoffScroll;
      }
      scheduleFrame();
    };
    const canElementScroll = (element, deltaY) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      return deltaY > 0 && element.scrollTop < maxScroll || deltaY < 0 && element.scrollTop > 0;
    };
    const resolveNestedWheelDisposition = (target, deltaY) => {
      if (target instanceof Node && livePromptEditor?.contains(target)) {
        if (composerLayer.dataset.motion === "true") return "home";
        return canElementScroll(livePromptEditor, deltaY) ? "native" : "contain";
      }
      const targetElement = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      const localScroller = targetElement?.closest(
        '[data-home-wheel-scrollable="true"]'
      );
      if (!localScroller || localScroller === showcaseViewport) return "home";
      const overflowY = window.getComputedStyle(localScroller).overflowY;
      const hasScrollableOverflow = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      return hasScrollableOverflow && canElementScroll(localScroller, deltaY) ? "native" : "home";
    };
    const clearWheelHandoffHold = () => {
      wheelHandoffHeldDirection = null;
      if (wheelHandoffIdleTimer === null) return;
      window.clearTimeout(wheelHandoffIdleTimer);
      wheelHandoffIdleTimer = null;
    };
    const beginWheelHandoffDetent = (direction) => {
      if (wheelHandoffHeldDirection === direction && wheelHandoffIdleTimer !== null) return;
      clearWheelHandoffHold();
      wheelHandoffHeldDirection = direction;
      wheelHandoffIdleTimer = window.setTimeout(() => {
        wheelHandoffHeldDirection = null;
        wheelHandoffIdleTimer = null;
      }, WHEEL_HANDOFF_DETENT_MS);
    };
    const clearWheelGestureOwner = () => {
      wheelGestureOwner = null;
      delete scrollContainer.dataset.homeWheelActive;
      if (wheelGestureIdleTimer === null) return;
      window.clearTimeout(wheelGestureIdleTimer);
      wheelGestureIdleTimer = null;
    };
    const holdWheelGestureOwnerUntilIdle = (owner) => {
      wheelGestureOwner = owner;
      setDatasetValue(scrollContainer, "homeWheelActive", "true");
      if (wheelGestureIdleTimer !== null) window.clearTimeout(wheelGestureIdleTimer);
      wheelGestureIdleTimer = window.setTimeout(() => {
        wheelGestureOwner = null;
        wheelGestureIdleTimer = null;
        delete scrollContainer.dataset.homeWheelActive;
      }, WHEEL_GESTURE_IDLE_MS);
    };
    const handleWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_HEIGHT_PX : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scrollContainer.clientHeight : 1;
      const deltaY = event.deltaY * deltaScale;
      if (deltaY === 0) return;
      const targetElement = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
      const explicitLocalScroller = targetElement?.closest(
        '[data-home-wheel-scrollable="true"]'
      );
      const detectedWheelDisposition = resolveNestedWheelDisposition(event.target, deltaY);
      if (explicitLocalScroller && detectedWheelDisposition === "native") return;
      const detectedOwner = detectedWheelDisposition === "home" ? "home" : "nested";
      const activeOwner = wheelGestureOwner ?? detectedOwner;
      holdWheelGestureOwnerUntilIdle(activeOwner);
      const nestedWheelDisposition = activeOwner === "home" ? "home" : detectedWheelDisposition === "home" ? "contain" : detectedWheelDisposition;
      if (nestedWheelDisposition === "native") return;
      if (nestedWheelDisposition === "contain") {
        event.preventDefault();
        clearWheelHandoffHold();
        return;
      }
      const wheelDirection = deltaY > 0 ? 1 : -1;
      if (wheelHandoffHeldDirection !== null) {
        if (wheelHandoffHeldDirection === wheelDirection) {
          event.preventDefault();
          return;
        }
        clearWheelHandoffHold();
      }
      if (deltaY > 0) {
        const canMoveOuter = scrollContainer.scrollTop < metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
        if (canMoveOuter) {
          event.preventDefault();
          const nextOuterScroll = Math.min(
            metrics.showcaseHandoffScroll,
            scrollContainer.scrollTop + deltaY
          );
          const reachedHandoff = nextOuterScroll >= metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
          commitOuterWheelScroll(reachedHandoff ? metrics.showcaseHandoffScroll : nextOuterScroll);
          if (reachedHandoff) beginWheelHandoffDetent(1);
          return;
        }
        const innerMaxScroll = Math.max(
          0,
          showcaseViewport.scrollHeight - showcaseViewport.clientHeight
        );
        if (showcaseViewport.scrollTop >= innerMaxScroll) return;
        event.preventDefault();
        if (scrollContainer.scrollTop !== metrics.showcaseHandoffScroll) {
          commitOuterWheelScroll(metrics.showcaseHandoffScroll);
        }
        showcaseViewport.scrollTop = Math.min(innerMaxScroll, showcaseViewport.scrollTop + deltaY);
        return;
      }
      if (showcaseViewport.scrollTop <= 0 && scrollContainer.scrollTop <= 0) return;
      event.preventDefault();
      if (showcaseViewport.scrollTop > 0) {
        const nextInnerScroll = Math.max(0, showcaseViewport.scrollTop + deltaY);
        const reachedHandoff = nextInnerScroll <= SCROLL_HANDOFF_TOLERANCE_PX;
        showcaseViewport.scrollTop = reachedHandoff ? 0 : nextInnerScroll;
        if (reachedHandoff) beginWheelHandoffDetent(-1);
        scheduleFrame();
        return;
      }
      commitOuterWheelScroll(Math.max(0, scrollContainer.scrollTop + deltaY));
    };
    const handleReducedMotionChange = (event) => {
      prefersReducedMotion2 = event.matches;
      scheduleFrame();
    };
    const handleIntrinsicContentChange = () => {
      if (resolveProgress(scrollContainer.scrollTop) <= MOTION_EPSILON) return;
      intrinsicMeasurementPending = true;
      scheduleFrame();
    };
    const handleHeroEntranceEnd = (event) => {
      if (event.animationName !== "home-fade-up") return;
      measurementPending = true;
      scheduleFrame();
    };
    const handleWindowResize = () => {
      measurementPending = true;
      scheduleFrame();
    };
    const handleComposerReactivate = () => {
      clearWheelHandoffHold();
      clearWheelGestureOwner();
      promptFirstLineAnchored = false;
      composerReactivating = true;
      if (resolveProgress(scrollContainer.scrollTop) <= MOTION_EPSILON) {
        composerReactivating = false;
        return;
      }
      showcaseViewport.scrollTop = 0;
      scrollContainer.scrollTo({
        top: 0,
        behavior: prefersReducedMotion2 ? "auto" : "smooth"
      });
      scheduleFrame();
    };
    const updateRightActionsWidth = () => {
      inputRoot.style.setProperty(
        "--home-composer-actions-right-width",
        toPixels(rightActions?.getBoundingClientRect().width ?? 0)
      );
    };
    updateRightActionsWidth();
    readMetrics(true);
    applyMotion();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    inputRoot.addEventListener("input", handleIntrinsicContentChange);
    editorSurface?.addEventListener("focusin", handleComposerReactivate);
    editorSurface?.addEventListener("pointerdown", handleComposerReactivate);
    editorSurface?.addEventListener("beforeinput", handleComposerReactivate);
    editorSurface?.addEventListener("compositionstart", handleComposerReactivate);
    heroEntrance?.addEventListener("animationend", handleHeroEntranceEnd);
    window.addEventListener("resize", handleWindowResize);
    reducedMotionQuery?.addEventListener("change", handleReducedMotionChange);
    const layoutObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      measurementPending = true;
      scheduleFrame();
    });
    layoutObserver?.observe(scrollContainer);
    layoutObserver?.observe(composerAnchor);
    if (heroEntrance) layoutObserver?.observe(heroEntrance);
    const inputObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (resolveProgress(scrollContainer.scrollTop) > MOTION_EPSILON) return;
      measurementPending = true;
      scheduleFrame();
    });
    inputObserver?.observe(inputRoot);
    const rightActionsObserver = rightActions && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateRightActionsWidth) : null;
    if (rightActions) rightActionsObserver?.observe(rightActions);
    const contentObserver = new MutationObserver(handleIntrinsicContentChange);
    contentObserver.observe(inputRoot, { childList: true, subtree: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      scrollContainer.removeEventListener("wheel", handleWheel);
      inputRoot.removeEventListener("input", handleIntrinsicContentChange);
      editorSurface?.removeEventListener("focusin", handleComposerReactivate);
      editorSurface?.removeEventListener("pointerdown", handleComposerReactivate);
      editorSurface?.removeEventListener("beforeinput", handleComposerReactivate);
      editorSurface?.removeEventListener("compositionstart", handleComposerReactivate);
      heroEntrance?.removeEventListener("animationend", handleHeroEntranceEnd);
      window.removeEventListener("resize", handleWindowResize);
      reducedMotionQuery?.removeEventListener("change", handleReducedMotionChange);
      layoutObserver?.disconnect();
      inputObserver?.disconnect();
      rightActionsObserver?.disconnect();
      contentObserver.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      clearWheelHandoffHold();
      clearWheelGestureOwner();
      composerAnchor.style.removeProperty("height");
      composerLayer.style.removeProperty("top");
      composerLayer.style.removeProperty("left");
      composerLayer.style.removeProperty("width");
      composerLayer.style.removeProperty("translate");
      composerLayer.style.removeProperty("--home-hero-brand-scale");
      composerLayer.style.removeProperty("--home-hero-brand-gap");
      brandLayer.style.removeProperty("translate");
      brandLayer.style.removeProperty("scale");
      heroAnnouncement?.style.removeProperty("opacity");
      heroSubtitle?.style.removeProperty("opacity");
      stickyBackdrop?.style.removeProperty("opacity");
      promotion?.style.removeProperty("opacity");
      actionRow?.style.removeProperty("inset-inline");
      delete composerLayer.dataset.homeComposerReady;
      delete composerLayer.dataset.motion;
      delete composerLayer.dataset.homeComposerStage;
      delete composerLayer.dataset.homeComposerCompact;
      delete composerLayer.dataset.homeComposerControlsHidden;
      delete scrollContainer.dataset.homeComposerMotion;
      delete scrollContainer.dataset.homeComposerCompact;
      delete scrollContainer.dataset.homeShowcaseScrollActive;
      inputRoot.style.removeProperty("height");
      inputRoot.style.removeProperty("--home-composer-min-height");
      inputRoot.style.removeProperty("--home-composer-radius");
      inputRoot.style.removeProperty("--home-composer-toolbar-opacity");
      inputRoot.style.removeProperty("--home-composer-editor-inset");
      inputRoot.style.removeProperty("--home-composer-actions-right-width");
      inputRoot.style.removeProperty("--home-composer-editor-top");
      inputRoot.style.removeProperty("--home-composer-editor-bottom");
      inputRoot.style.removeProperty("--home-composer-action-bottom");
      inputRoot.style.removeProperty("--home-composer-attachment-offset");
      inputRoot.style.removeProperty("--home-composer-editor-min-height");
      inputRoot.style.removeProperty("--home-composer-editor-max-height");
      inputRoot.style.removeProperty("--home-composer-live-editor-opacity");
      inputRoot.style.removeProperty("--home-composer-prompt-preview-opacity");
      inputRoot.style.removeProperty("--home-composer-progress");
      scrollContainer.style.removeProperty("--home-composer-scroll-progress");
      scrollContainer.style.removeProperty("--home-composer-scroll-runway");
      scrollContainer.style.removeProperty("--home-composer-sticky-backdrop-height");
      scrollContainer.style.removeProperty("--home-hero-auxiliary-opacity");
      showcaseViewport.style.removeProperty("height");
      showcaseViewport.style.removeProperty("--home-showcase-motion-offset");
      showcaseViewport.style.removeProperty("translate");
    };
  }, []);
  return { scrollContainerRef, composerAnchorRef, composerLayerRef };
}
const HOME_PROJECT_SHOWCASE_SCHEMA_VERSION = 1;
const EMPTY_HOME_PROJECT_SHOWCASE_CONFIG = {
  schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  categories: []
};
function isRecord$2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString$2(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim();
  return normalized || void 0;
}
function unwrapApolloValue$2(raw) {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return value;
      }
    }
    if (!isRecord$2(value)) return value;
    if (isRecord$2(value.data) && "value" in value.data) {
      value = value.data.value;
      continue;
    }
    if ("value" in value && Object.keys(value).length === 1) {
      value = value.value;
      continue;
    }
    return value;
  }
  return value;
}
function parseSections(rawSections) {
  const seen = /* @__PURE__ */ new Set();
  const categories = [];
  for (const section of rawSections.slice(0, HOME_QUICK_START_MAX_SECTIONS)) {
    if (!isRecord$2(section)) continue;
    const parsed = parseProjectArchiveSection(section);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    categories.push(parsed);
  }
  return categories;
}
function parseHomeProjectShowcaseConfig(raw) {
  const value = unwrapApolloValue$2(raw);
  if (!isRecord$2(value)) return null;
  if (value.type === "project-archive") {
    const categories2 = parseSections([value]);
    if (categories2.length === 0) return null;
    return {
      schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
      enabled: true,
      defaultSectionId: categories2[0]?.id,
      categories: categories2
    };
  }
  if (value.schema_version !== HOME_PROJECT_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.sections)) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      categories: []
    };
  }
  const categories = parseSections(value.sections);
  const configuredDefault = nonEmptyString$2(value.default_section_id);
  const defaultSectionId = categories.some((category) => category.id === configuredDefault) ? configuredDefault : categories[0]?.id;
  return {
    schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...defaultSectionId ? { defaultSectionId } : {},
    categories
  };
}
const HOME_SKILL_SHOWCASE_CONFIG_KEY = "home_skill_showcase_config";
const HOME_SKILL_SHOWCASE_SCHEMA_VERSION = 1;
const HOME_SKILL_SHOWCASE_MAX_CATEGORIES = 24;
const CONFIG_ID_PATTERN$1 = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DEFAULT_HOME_SKILL_SHOWCASE_CONFIG = {
  schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  defaultSecondaryId: "all",
  categories: [
    {
      id: "all",
      label: "全部",
      labelEn: "All",
      query: { source: "official-featured" }
    }
  ]
};
function isRecord$1(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString$1(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim();
  return normalized || void 0;
}
function configId$1(value) {
  const normalized = nonEmptyString$1(value)?.toLowerCase();
  return normalized && CONFIG_ID_PATTERN$1.test(normalized) ? normalized : void 0;
}
function unwrapApolloValue$1(raw) {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return value;
      }
    }
    if (!isRecord$1(value)) return value;
    if (isRecord$1(value.data) && "value" in value.data) {
      value = value.data.value;
      continue;
    }
    if ("value" in value && Object.keys(value).length === 1) {
      value = value.value;
      continue;
    }
    return value;
  }
  return value;
}
function parseCategory(value) {
  if (!isRecord$1(value) || !isRecord$1(value.title) || !isRecord$1(value.query)) return void 0;
  const id = configId$1(value.id);
  const label = nonEmptyString$1(value.title.zh) ?? nonEmptyString$1(value.title.en);
  const labelEn = nonEmptyString$1(value.title.en) ?? nonEmptyString$1(value.title.zh);
  const source = configId$1(value.query.source);
  const tag = nonEmptyString$1(value.query.tag);
  if (!id || !label || !labelEn || !source) return void 0;
  return {
    id,
    label,
    labelEn,
    query: { source, ...tag ? { tag } : {} }
  };
}
function parseHomeSkillShowcaseConfig(raw) {
  const value = unwrapApolloValue$1(raw);
  if (!isRecord$1(value)) return null;
  if (value.schema_version !== HOME_SKILL_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.secondary_categories)) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      categories: []
    };
  }
  const seen = /* @__PURE__ */ new Set();
  const categories = [];
  for (const candidate of value.secondary_categories.slice(0, HOME_SKILL_SHOWCASE_MAX_CATEGORIES)) {
    const parsed = parseCategory(candidate);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    categories.push(parsed);
  }
  if (categories.length === 0) return null;
  const configuredDefault = configId$1(value.default_secondary_id);
  const defaultSecondaryId = categories.some((category) => category.id === configuredDefault) ? configuredDefault : categories[0]?.id;
  return {
    schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...defaultSecondaryId ? { defaultSecondaryId } : {},
    categories
  };
}
const HOME_TABS_SHOWCASE_CONFIG_KEY = "home_tabs_showcase_config";
const HOME_PROJECT_SHOWCASE_CONFIG_KEY = "home_project_showcase_config";
const HOME_TABS_SHOWCASE_SCHEMA_VERSION = 1;
const HOME_TABS_SHOWCASE_MAX_PRIMARY_CATEGORIES = 12;
const HOME_TABS_SHOWCASE_MAX_SECONDARY_CATEGORIES = 24;
const CONFIG_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HOME_QUICK_START_V2_CONFIG_KEY = "home_quick_start_config_v2";
const DEFAULT_HOME_TABS_SHOWCASE_CONFIG = {
  schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  defaultPrimaryId: "inspiration",
  primaryCategories: [
    {
      id: "inspiration",
      label: "创作灵感",
      labelEn: "Inspiration",
      provider: { type: "quick-start-v2", configKey: HOME_QUICK_START_V2_CONFIG_KEY }
    },
    {
      id: "skill",
      label: "Skill",
      labelEn: "Skill",
      defaultSecondaryId: "all",
      provider: {
        type: "skill-market",
        configKey: HOME_SKILL_SHOWCASE_CONFIG_KEY,
        source: "official-featured",
        secondaryCategories: [{ id: "all", label: "全部", labelEn: "All" }]
      }
    },
    {
      id: "projects",
      label: "精选项目",
      labelEn: "Featured Projects",
      provider: { type: "project-showcase", configKey: HOME_PROJECT_SHOWCASE_CONFIG_KEY }
    }
  ]
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim();
  return normalized || void 0;
}
function configId(value) {
  const normalized = nonEmptyString(value)?.toLowerCase();
  return normalized && CONFIG_ID_PATTERN.test(normalized) ? normalized : void 0;
}
function localizedText(value) {
  if (typeof value === "string") {
    const normalized = nonEmptyString(value);
    return normalized ? { zh: normalized, en: normalized } : void 0;
  }
  if (!isRecord(value)) return void 0;
  const zh = nonEmptyString(value.zh) ?? nonEmptyString(value.en);
  const en = nonEmptyString(value.en) ?? nonEmptyString(value.zh);
  return zh && en ? { zh, en } : void 0;
}
function unwrapApolloValue(raw) {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return value;
      }
    }
    if (!isRecord(value)) return value;
    if (isRecord(value.data) && "value" in value.data) {
      value = value.data.value;
      continue;
    }
    if ("value" in value && Object.keys(value).length === 1) {
      value = value.value;
      continue;
    }
    return value;
  }
  return value;
}
function parseSecondaryCategories(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const candidate of value.slice(0, HOME_TABS_SHOWCASE_MAX_SECONDARY_CATEGORIES)) {
    if (!isRecord(candidate)) continue;
    const id = configId(candidate.id);
    const title = localizedText(candidate.title ?? candidate.label);
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, label: title.zh, labelEn: title.en });
  }
  return result;
}
function parseProvider(category) {
  const provider = isRecord(category.provider) ? category.provider : category;
  const type = nonEmptyString(provider.type);
  if (type === "quick-start-v2") {
    const key = nonEmptyString(provider.config_key) ?? HOME_QUICK_START_V2_CONFIG_KEY;
    if (key !== HOME_QUICK_START_V2_CONFIG_KEY) return void 0;
    return { type, configKey: HOME_QUICK_START_V2_CONFIG_KEY };
  }
  if (type === "skill-market") {
    const key = nonEmptyString(provider.config_key);
    if (key && key !== HOME_SKILL_SHOWCASE_CONFIG_KEY) return void 0;
    const source = configId(provider.source) ?? "official-featured";
    const configuredSecondary = parseSecondaryCategories(category.secondary_categories);
    return {
      type,
      ...key ? { configKey: HOME_SKILL_SHOWCASE_CONFIG_KEY } : {},
      source,
      secondaryCategories: configuredSecondary.length > 0 ? configuredSecondary : [{ id: "all", label: "全部", labelEn: "All" }]
    };
  }
  if (type === "project-showcase") {
    const key = nonEmptyString(provider.config_key) ?? HOME_PROJECT_SHOWCASE_CONFIG_KEY;
    if (key !== HOME_PROJECT_SHOWCASE_CONFIG_KEY) return void 0;
    return { type, configKey: HOME_PROJECT_SHOWCASE_CONFIG_KEY };
  }
  return void 0;
}
function parsePrimaryCategory(value) {
  if (!isRecord(value)) return void 0;
  const id = configId(value.id);
  const title = localizedText(value.title ?? value.label);
  const provider = parseProvider(value);
  if (!id || !title || !provider) return void 0;
  const defaultSecondaryId = configId(value.default_secondary_id);
  return {
    id,
    label: title.zh,
    labelEn: title.en,
    ...defaultSecondaryId ? { defaultSecondaryId } : {},
    provider
  };
}
function parseHomeTabsShowcaseConfig(raw) {
  const value = unwrapApolloValue(raw);
  if (!isRecord(value)) return null;
  if (value.schema_version !== HOME_TABS_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean") return null;
  const rawCategories = Array.isArray(value.primary_categories) ? value.primary_categories : Array.isArray(value.tabs) ? value.tabs : null;
  if (!rawCategories) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      primaryCategories: []
    };
  }
  const seen = /* @__PURE__ */ new Set();
  const primaryCategories = [];
  for (const candidate of rawCategories.slice(0, HOME_TABS_SHOWCASE_MAX_PRIMARY_CATEGORIES)) {
    const parsed = parsePrimaryCategory(candidate);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    primaryCategories.push(parsed);
  }
  if (primaryCategories.length === 0) return null;
  const configuredDefault = configId(value.default_primary_id ?? value.default_tab_id);
  const defaultPrimaryId = primaryCategories.some((category) => category.id === configuredDefault) ? configuredDefault : primaryCategories[0]?.id;
  return {
    schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...defaultPrimaryId ? { defaultPrimaryId } : {},
    primaryCategories
  };
}
const HOME_SHOWCASE_APOLLO_MAX_BYTES = 1e6;
class HomeShowcaseApolloConfigError extends Error {
  constructor(failureKind, failureStage, message, httpStatus, options) {
    super(message, options);
    this.failureKind = failureKind;
    this.failureStage = failureStage;
    this.httpStatus = httpStatus;
    this.name = "HomeShowcaseApolloConfigError";
  }
}
function gatewayHttpStatus(error) {
  if (!error || typeof error !== "object") return void 0;
  const direct = error.status;
  if (isHttpStatus(direct)) return direct;
  const response = error.response;
  if (!response || typeof response !== "object") return void 0;
  const nested = response.status;
  return isHttpStatus(nested) ? nested : void 0;
}
function isHttpStatus(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value < 600;
}
function httpStatusGroup(status) {
  if (status === void 0) return void 0;
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}
function requestError(error) {
  const status = gatewayHttpStatus(error);
  return new HomeShowcaseApolloConfigError(
    status === void 0 ? "network" : "http",
    "request",
    status === void 0 ? "home showcase config request failed" : `home showcase HTTP ${status}`,
    status,
    { cause: error }
  );
}
function invalidHomeShowcaseConfigError(key) {
  return new HomeShowcaseApolloConfigError("invalid_config", "schema_validation", `invalid ${key}`);
}
const reportedErrors = /* @__PURE__ */ new WeakSet();
function boundedRegion(region) {
  if (region === "domestic" || region === "overseas") return region;
  return "other";
}
function boundedChannel(channel) {
  if (channel === "dev" || channel === "test" || channel === "staging" || channel === "prod") {
    return channel;
  }
  return "other";
}
function classifyHomeShowcaseConfigError(error) {
  return error instanceof HomeShowcaseApolloConfigError ? error : requestError(error);
}
function reportHomeShowcaseConfigResolution({
  configName,
  outcome,
  region,
  channel,
  schemaVersion,
  error
}) {
  if (error && typeof error === "object") {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }
  const classified = classifyHomeShowcaseConfigError(error);
  const statusGroup = httpStatusGroup(classified.httpStatus);
  const properties = {
    config_name: configName,
    outcome,
    failure_kind: classified.failureKind,
    failure_stage: classified.failureStage,
    region: boundedRegion(region),
    channel: boundedChannel(channel),
    schema_version: schemaVersion,
    ...statusGroup ? { http_status_group: statusGroup } : {}
  };
  try {
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONFIG_RESOLUTION, properties);
  } catch {
  }
  try {
    workspaceLog.warn("home: media-showcase-config-resolution", {
      ...properties,
      ...classified.httpStatus === void 0 ? {} : { http_status: classified.httpStatus }
    });
  } catch {
  }
  try {
    const breadcrumb = window.hilo?.diagnostics?.addBreadcrumb(
      "network",
      "home: media-showcase-config-resolution",
      properties
    );
    void breadcrumb?.catch(() => {
    });
  } catch {
  }
}
function useHomeShowcaseConfigResolution({
  configName,
  fallbackSource,
  hasRemoteData,
  region,
  channel,
  schemaVersion,
  error
}) {
  reactExports.useEffect(() => {
    if (!error) return;
    reportHomeShowcaseConfigResolution({
      configName,
      outcome: hasRemoteData ? "retained_remote" : fallbackSource === "bundle" ? "fallback_bundle" : "fallback_empty",
      region,
      channel,
      schemaVersion,
      error
    });
  }, [channel, configName, error, fallbackSource, hasRemoteData, region, schemaVersion]);
}
async function fetchHomeApolloConfig(key) {
  let response;
  try {
    response = await gatewayFetch(API_PATHS.apolloConfig(key));
  } catch (error) {
    throw requestError(error);
  }
  if (!response.ok) {
    throw new HomeShowcaseApolloConfigError(
      "http",
      "request",
      `${key} HTTP ${response.status}`,
      response.status
    );
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > HOME_SHOWCASE_APOLLO_MAX_BYTES) {
      throw new HomeShowcaseApolloConfigError(
        "oversized",
        "response_body",
        `${key} payload is too large`
      );
    }
  }
  if (!response.body) {
    throw new HomeShowcaseApolloConfigError(
      "invalid_config",
      "response_body",
      `${key} payload is empty`
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > HOME_SHOWCASE_APOLLO_MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
        }
        throw new HomeShowcaseApolloConfigError(
          "oversized",
          "response_body",
          `${key} payload is too large`
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    if (error instanceof HomeShowcaseApolloConfigError) throw error;
    throw new HomeShowcaseApolloConfigError(
      "network",
      "response_body",
      `${key} response body failed`,
      void 0,
      { cause: error }
    );
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HomeShowcaseApolloConfigError(
      "invalid_config",
      "json_parse",
      `${key} payload is not valid JSON`
    );
  }
}
const HOME_PROJECT_SHOWCASE_STALE_TIME_MS = 6e4;
function useHomeProjectShowcaseConfig(enabled) {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { data, error, isLoading } = useQuery({
    queryKey: ["home-project-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_PROJECT_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeProjectShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_PROJECT_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady && enabled,
    staleTime: HOME_PROJECT_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "project",
    fallbackSource: "empty",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? EMPTY_HOME_PROJECT_SHOWCASE_CONFIG,
    source: data ? "remote" : enabled && gatewayReady && isLoading ? "loading" : "empty",
    isLoading: enabled && gatewayReady && isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null
  };
}
const HOME_SKILL_SHOWCASE_STALE_TIME_MS = 6e4;
function useHomeSkillShowcaseConfig(enabled) {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["home-skill-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_SKILL_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeSkillShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_SKILL_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady && enabled,
    staleTime: HOME_SKILL_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "skill",
    fallbackSource: "bundle",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? DEFAULT_HOME_SKILL_SHOWCASE_CONFIG,
    source: data ? "remote" : isError ? "bundle" : "loading",
    isLoading: enabled && gatewayReady && isLoading
  };
}
const HOME_TABS_SHOWCASE_STALE_TIME_MS = 6e4;
const LOADING_HOME_TABS_SHOWCASE_CONFIG = {
  schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  primaryCategories: []
};
function useHomeTabsShowcaseConfig() {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["home-tabs-showcase-config", region, channel],
    queryFn: async () => {
      const raw = await fetchHomeApolloConfig(HOME_TABS_SHOWCASE_CONFIG_KEY);
      const parsed = parseHomeTabsShowcaseConfig(raw);
      if (!parsed) throw invalidHomeShowcaseConfigError(HOME_TABS_SHOWCASE_CONFIG_KEY);
      return parsed;
    },
    enabled: gatewayReady,
    staleTime: HOME_TABS_SHOWCASE_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: 1,
    throwOnError: false
  });
  useHomeShowcaseConfigResolution({
    configName: "tabs",
    fallbackSource: "bundle",
    hasRemoteData: Boolean(data),
    region,
    channel,
    schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
    error
  });
  return {
    config: data ?? (isError ? DEFAULT_HOME_TABS_SHOWCASE_CONFIG : LOADING_HOME_TABS_SHOWCASE_CONFIG),
    source: data ? "remote" : isError ? "bundle" : "loading",
    isLoading: gatewayReady && isLoading
  };
}
function useScenePanel(categories) {
  const [activeSceneId, setActiveSceneId] = reactExports.useState(null);
  const selectScene = reactExports.useCallback((id) => {
    setActiveSceneId((prev) => prev === id ? null : id);
  }, []);
  const closePanel = reactExports.useCallback(() => {
    setActiveSceneId(null);
  }, []);
  const activeScene = reactExports.useMemo(() => {
    const activeCategory = categories.find(
      (category) => category.kind === "scene" && category.id === activeSceneId
    );
    return activeCategory?.scene ?? null;
  }, [activeSceneId, categories]);
  reactExports.useEffect(() => {
    if (activeSceneId && !activeScene) setActiveSceneId(null);
  }, [activeScene, activeSceneId]);
  return { activeSceneId, activeScene, selectScene, closePanel };
}
function homeSceneDisplayText(text) {
  for (const mention of findConnectorMentions(text).reverse()) {
    const label = mention.displayName ?? OFFICIAL_CONNECTORS[mention.serverName]?.displayName ?? mention.serverName;
    text = text.slice(0, mention.start) + label + text.slice(mention.end);
  }
  return text;
}
function homeSceneTarget(query, prompt) {
  if (query.skill) {
    const prefix = `/${query.skill}`;
    return {
      text: prompt.trimStart().startsWith(`${prefix} `) || prompt.trim() === prefix ? prompt : `${prefix} ${prompt}`,
      connector: void 0
    };
  }
  const connector = query.connectorId ? OFFICIAL_CONNECTORS[query.connectorId] : void 0;
  if (query.connectorId && !connector) {
    throw new Error("connector_unavailable");
  }
  return {
    text: connector ? `${formatConnectorMention(connector.id, connector.displayName)} ${prompt}` : prompt,
    connector: connector ? { connectorId: connector.id, displayName: connector.displayName } : void 0
  };
}
async function prepareHomeSceneSelection(query, { ensureSkillReady, fetchAttachments, signal }) {
  const downloadableAttachments = query.attachments.filter((attachment) => attachment.assetUrl);
  const [skillReady, attachmentResult] = await Promise.all([
    query.skill ? ensureSkillReady(query.skill) : Promise.resolve(true),
    downloadableAttachments.length > 0 ? fetchAttachments(downloadableAttachments, { signal }) : Promise.resolve({ failed: [], files: [] })
  ]);
  if (!skillReady) {
    return { status: "skill-unavailable", failedAttachments: [] };
  }
  if (attachmentResult.failed.length > 0) {
    return {
      status: "attachment-failed",
      failedAttachments: attachmentResult.failed
    };
  }
  return { status: "ready", files: attachmentResult.files };
}
class HomeSceneSelectionGuard {
  abortController = null;
  generation = 0;
  begin() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.generation += 1;
    return {
      generation: this.generation,
      signal: this.abortController.signal
    };
  }
  complete(token) {
    if (!this.isCurrent(token)) return false;
    this.abortController = null;
    return true;
  }
  invalidate() {
    this.abortController?.abort();
    this.abortController = null;
    this.generation += 1;
  }
  isCurrent(token) {
    return token.generation === this.generation && !token.signal.aborted;
  }
}
const USE_PROMPT_FLIGHT_DURATION_MS = 440;
const USE_PROMPT_ARRIVAL_DURATION_MS = 220;
const USE_PROMPT_FLIGHT_BALL_SIZE_PX = 32;
const USE_PROMPT_FLIGHT_SAMPLES = [
  { offset: 0, opacity: 1, scale: 1 },
  { offset: 0.16, opacity: 0.98, scale: 0.92 },
  { offset: 0.32, opacity: 0.92, scale: 0.78 },
  { offset: 0.5, opacity: 0.76, scale: 0.6 },
  { offset: 0.68, opacity: 0.48, scale: 0.42 },
  { offset: 0.84, opacity: 0.18, scale: 0.26 },
  { offset: 0.94, opacity: 0.04, scale: 0.14 },
  { offset: 1, opacity: 0, scale: 0.08 }
];
let activeTransfer = null;
let activeArrival = null;
let reusableFlightBall = null;
function prefersReducedMotion$1() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
function copyRect(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
}
function cssNumber(value) {
  if (Math.abs(value) < 5e-3) return "0";
  return Number(value.toFixed(2)).toString();
}
function buildParabolicFlightKeyframes(translateX, translateY) {
  const distance = Math.hypot(translateX, translateY);
  const arcHeight = Math.min(192, Math.max(84, distance * 0.3));
  return USE_PROMPT_FLIGHT_SAMPLES.map(({ offset, opacity, scale }) => {
    const curveLift = arcHeight * 4 * offset * (1 - offset);
    const x = translateX * offset;
    const y = translateY * offset - curveLift;
    return {
      offset,
      opacity,
      transform: `translate3d(${cssNumber(x)}px, ${cssNumber(y)}px, 0) scale(${scale})`
    };
  });
}
function deactivateFlightBall(element) {
  element.classList.remove("home-use-prompt-flight");
  element.style.visibility = "hidden";
  element.style.opacity = "0";
  element.style.transform = "none";
}
function prepareReusableFlightBall(template) {
  const connectedBalls = Array.from(
    document.querySelectorAll(".home-use-prompt-flight-ball")
  );
  const ball = (reusableFlightBall?.isConnected ? reusableFlightBall : connectedBalls[0]) ?? document.createElement("span");
  reusableFlightBall = ball;
  for (const extraBall of connectedBalls) {
    if (extraBall === ball) continue;
    for (const animation of extraBall.getAnimations?.() ?? []) animation.cancel();
    extraBall.remove();
  }
  for (const animation of ball.getAnimations?.() ?? []) animation.cancel();
  ball.className = "home-use-prompt-flight-ball";
  ball.setAttribute("aria-hidden", "true");
  ball.setAttribute("tabindex", "-1");
  ball.replaceChildren(...Array.from(template.childNodes, (node) => node.cloneNode(true)));
  if (!ball.isConnected) document.body.append(ball);
  return ball;
}
function removeActiveTransfer() {
  const transfer = activeTransfer;
  if (!transfer) return;
  activeTransfer = null;
  transfer.animation.cancel();
  deactivateFlightBall(transfer.element);
}
function removeActiveArrival() {
  const arrival = activeArrival;
  if (!arrival) return;
  activeArrival = null;
  arrival.animation.cancel();
  arrival.element.remove();
}
function playArrivalFeedback(target) {
  removeActiveArrival();
  const targetRect = target.getBoundingClientRect();
  if (targetRect.width <= 0 || targetRect.height <= 0) return;
  const arrival = document.createElement("span");
  arrival.className = "home-use-prompt-arrival";
  arrival.setAttribute("aria-hidden", "true");
  arrival.style.left = `${targetRect.left}px`;
  arrival.style.top = `${targetRect.top}px`;
  arrival.style.width = `${targetRect.width}px`;
  arrival.style.height = `${targetRect.height}px`;
  arrival.style.borderRadius = getComputedStyle(target).borderRadius;
  document.body.append(arrival);
  const animation = arrival.animate(
    [
      { opacity: 0.1, transform: "scale(0.994)" },
      { offset: 0.4, opacity: 0.5, transform: "scale(1.016)" },
      { offset: 0.72, opacity: 0.2, transform: "scale(0.998)" },
      { opacity: 0, transform: "scale(1.003)" }
    ],
    {
      duration: USE_PROMPT_ARRIVAL_DURATION_MS,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)"
    }
  );
  activeArrival = { animation, element: arrival };
  const handleRemoval = () => {
    if (activeArrival?.animation === animation) activeArrival = null;
    arrival.remove();
  };
  animation.onfinish = handleRemoval;
  animation.oncancel = handleRemoval;
}
function captureHomeUsePromptTransferOrigin(source) {
  const visual = document.createElement("span");
  visual.className = "home-use-prompt-flight-ball";
  const sourceIcon = source.querySelector("svg");
  if (sourceIcon) {
    const icon = sourceIcon.cloneNode(true);
    icon.removeAttribute("id");
    icon.setAttribute("aria-hidden", "true");
    visual.append(icon);
  }
  return {
    rect: copyRect(source.getBoundingClientRect()),
    visual
  };
}
function playHomeUsePromptTransfer(origin, target) {
  if (prefersReducedMotion$1() || typeof origin.visual.animate !== "function") return;
  const targetRect = target.getBoundingClientRect();
  if (origin.rect.width <= 0 || origin.rect.height <= 0 || targetRect.width <= 0 || targetRect.height <= 0) {
    return;
  }
  removeActiveTransfer();
  removeActiveArrival();
  const visual = prepareReusableFlightBall(origin.visual);
  visual.classList.add("home-use-prompt-flight");
  const sourceCenterX = origin.rect.left + origin.rect.width / 2;
  const sourceCenterY = origin.rect.top + origin.rect.height / 2;
  visual.style.left = `${sourceCenterX - USE_PROMPT_FLIGHT_BALL_SIZE_PX / 2}px`;
  visual.style.top = `${sourceCenterY - USE_PROMPT_FLIGHT_BALL_SIZE_PX / 2}px`;
  visual.style.width = `${USE_PROMPT_FLIGHT_BALL_SIZE_PX}px`;
  visual.style.height = `${USE_PROMPT_FLIGHT_BALL_SIZE_PX}px`;
  visual.style.visibility = "visible";
  visual.style.opacity = "1";
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const translateX = targetCenterX - sourceCenterX;
  const translateY = targetCenterY - sourceCenterY;
  const animation = visual.animate(buildParabolicFlightKeyframes(translateX, translateY), {
    duration: USE_PROMPT_FLIGHT_DURATION_MS,
    easing: "cubic-bezier(0.32, 0, 0.18, 1)",
    fill: "forwards"
  });
  activeTransfer = { animation, element: visual };
  const handleFinish = () => {
    if (activeTransfer?.animation !== animation) return;
    activeTransfer = null;
    animation.cancel();
    deactivateFlightBall(visual);
    playArrivalFeedback(target);
  };
  animation.onfinish = handleFinish;
  animation.oncancel = () => {
    if (activeTransfer?.animation !== animation) return;
    activeTransfer = null;
    deactivateFlightBall(visual);
  };
}
function HomeProjectPicker({
  selectedProjectId,
  onChange
}) {
  const { t } = useTranslation();
  const projects = useProjects({ sortMode: "updated" });
  const selected = projects.find((project) => project.id === selectedProjectId);
  const [createDialogOpen, setCreateDialogOpen] = reactExports.useState(false);
  const triggerClass = "flex h-[var(--btn-height-sm)] cursor-pointer items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] py-0 text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/60 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground";
  const handleCreateProject = useCreateProjectAndSelect((projectId) => {
    onChange(projectId);
    setCreateDialogOpen(false);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TooltipTrigger,
          {
            render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuTrigger,
              {
                "data-action-ui-id": "home-project-btn",
                className: `${triggerClass} max-w-[180px]`,
                children: [
                  selected?.kind === "team" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 16, strokeWidth: 1.5, className: "shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FolderMinus, { size: 16, strokeWidth: 1.5, className: "shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: selected?.name ?? t("project.selectRow.pickLabel") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 13, strokeWidth: 1.5, className: "shrink-0 opacity-60" })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", sideOffset: 12, className: "max-w-64", children: t("project.selectRow.hint") })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuContent,
        {
          align: "start",
          alignOffset: -2,
          side: "top",
          sideOffset: 6,
          className: "min-w-44 max-w-72 text-[13px] font-normal text-foreground/70",
          children: [
            projects.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2.5 py-1.5 whitespace-nowrap text-foreground/70", children: t("project.noProjects") }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-56 overflow-y-auto", children: projects.map((project) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                onClick: () => onChange(project.id),
                className: "text-[13px] font-normal text-foreground/70",
                children: [
                  project.kind === "team" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 14, strokeWidth: 1.5 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Folder, { size: 14, strokeWidth: 1.5 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: project.name })
                ]
              },
              project.id
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                "data-action-ui-id": "home-project-create",
                onClick: () => setCreateDialogOpen(true),
                className: "text-[13px] font-normal text-foreground/70",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.create.trigger") })
                ]
              }
            )
          ]
        }
      )
    ] }),
    selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-action-ui-id": "home-project-clear-btn",
        onClick: () => onChange(void 0),
        "aria-label": t("common.clear"),
        className: "flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14, strokeWidth: 1.5 })
      }
    ) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateProjectDialog,
      {
        open: createDialogOpen,
        kind: "local",
        onConfirm: handleCreateProject,
        onOpenChange: setCreateDialogOpen
      }
    )
  ] });
}
function resolvePromptPrefillModel(models, id) {
  const exact = models.filter((model) => model.id === id);
  const aliases = exact.length ? exact : models.filter((model) => model.mention_name === id || model.model_name === id);
  const pricingName = resolveModelPricingName(id);
  const matches = aliases.length ? aliases : models.filter((model) => resolveModelPricingName(model.id) === pricingName);
  return matches.length === 1 && matches[0].visibility !== "hidden" ? matches[0] : void 0;
}
function promptPrefillMention(model) {
  return {
    path: model.id,
    name: model.display_name,
    modelName: model.model_name,
    mentionName: model.mention_name ?? model.model_name,
    kind: "model",
    mediaType: model.type,
    thumbUrl: model.icon_url || null,
    previewUrl: null,
    mediaUrl: null
  };
}
function HomePromptPrefillBridge({
  onPrefill
}) {
  const request = reactExports.useSyncExternalStore(subscribePromptPrefill, getPromptPrefillRequest);
  const { data: models, isPending, isError } = useMentionModels();
  const handler = reactExports.useRef(onPrefill);
  handler.current = onPrefill;
  const mounted = reactExports.useRef(false);
  const currentRequest = reactExports.useRef(request);
  currentRequest.current = request;
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pending = currentRequest.current;
      queueMicrotask(() => {
        if (!mounted.current && pending) completePromptPrefill(pending.id, false);
      });
    };
  }, []);
  reactExports.useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    let disposed = false;
    let claimed = false;
    const abort = () => {
      controller.abort();
      completePromptPrefill(request.id, false);
    };
    request.signal?.addEventListener("abort", abort, { once: true });
    queueMicrotask(async () => {
      if (disposed) return;
      if (request.signal?.aborted) {
        abort();
        return;
      }
      if (isPending && !isError) return;
      if (!claimPromptPrefill(request.id)) return;
      claimed = true;
      const model = !isError && models && resolvePromptPrefillModel(models, request.modelId);
      if (!model) {
        completePromptPrefill(request.id, false);
        return;
      }
      try {
        const success = await handler.current(request.prompt, {
          mention: promptPrefillMention(model),
          signal: controller.signal
        });
        completePromptPrefill(request.id, success === true && !controller.signal.aborted);
      } catch {
        completePromptPrefill(request.id, false);
      }
    });
    return () => {
      disposed = true;
      request.signal?.removeEventListener("abort", abort);
      controller.abort();
      if (claimed) completePromptPrefill(request.id, false);
    };
  }, [request, models, isPending, isError]);
  return null;
}
const HOME_WHATS_NEW_ITEM_DURATION_MS = 3e3;
function HomeWhatsNewGiftIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      "aria-hidden": "true",
      width: "16",
      height: "16",
      viewBox: "0 0 12 12",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M3.125 2.20833C3.125 1.54099 3.66599 1 4.33333 1C5.0215 1 5.63015 1.34046 6 1.86214C6.36985 1.34046 6.9785 1 7.66665 1C8.334 1 8.875 1.54099 8.875 2.20833C8.875 2.69838 8.70235 3.14811 8.41455 3.5H9.625C10.1082 3.5 10.5 3.89175 10.5 4.375V4.75C10.5 5.23325 10.1082 5.625 9.625 5.625H6.375V3.5H6.83335C7.5467 3.5 8.125 2.9217 8.125 2.20833C8.125 1.9552 7.9198 1.75 7.66665 1.75C6.9533 1.75 6.375 2.3283 6.375 3.04167V3.5H5.625V3.04167C5.625 2.3283 5.0467 1.75 4.33333 1.75C4.0802 1.75 3.875 1.9552 3.875 2.20833C3.875 2.9217 4.4533 3.5 5.16665 3.5H5.625V5.625H2.375C1.89175 5.625 1.5 5.23325 1.5 4.75V4.375C1.5 3.89175 1.89175 3.5 2.375 3.5H3.58545C3.29765 3.14811 3.125 2.69838 3.125 2.20833Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M6.375 6.375H10V9.625C10 10.1082 9.60825 10.5 9.125 10.5H6.375V6.375Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M5.625 6.375H2V9.625C2 10.1082 2.39175 10.5 2.875 10.5H5.625V6.375Z",
            fill: "currentColor"
          }
        )
      ]
    }
  );
}
function HomeWhatsNewHandoff({
  items,
  onOpen,
  getAriaLabel = (item) => item.tickerText,
  paused: externallyPaused = false
}) {
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [hovered, setHovered] = reactExports.useState(false);
  const [focused, setFocused] = reactExports.useState(false);
  const paused = externallyPaused || hovered || focused;
  const currentItem = items[currentIndex] ?? items[0];
  const itemIds = items.map((item) => item.id).join("\0");
  const previousItemIdsRef = reactExports.useRef(itemIds);
  reactExports.useEffect(() => {
    if (previousItemIdsRef.current === itemIds) return;
    previousItemIdsRef.current = itemIds;
    setCurrentIndex(0);
  }, [itemIds]);
  reactExports.useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % items.length);
    }, HOME_WHATS_NEW_ITEM_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);
  if (!currentItem) return null;
  const handleOpen = () => {
    onOpen(currentItem);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: "home-whats-new flex min-h-[35px] max-w-[calc(100%-40px)] cursor-pointer items-center gap-1 rounded-lg border border-border bg-card/85 px-1.5 py-1 text-foreground backdrop-blur-md transition-colors duration-150 hover:border-brand-accent/30 focus-visible:border-brand-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "aria-haspopup": currentItem.kind === "feature-popup" ? "dialog" : void 0,
      "aria-label": getAriaLabel(currentItem),
      onClick: handleOpen,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      "data-action-ui-id": "home-whats-new",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "grid size-6 shrink-0 place-items-center text-brand-accent",
            "aria-hidden": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(HomeWhatsNewGiftIcon, {})
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "home-whats-new__ticker h-6 min-w-0 max-w-[min(310px,calc(100vw-105px))] overflow-hidden text-left",
            "aria-hidden": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-whats-new__track flex w-max flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-whats-new__item flex h-6 shrink-0 items-center overflow-hidden whitespace-nowrap text-sm font-normal", children: currentItem.tickerText }) }, currentItem.id)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "grid h-6 w-5 shrink-0 place-items-center text-muted-foreground",
            "aria-hidden": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16, strokeWidth: 1.5 })
          }
        )
      ]
    }
  );
}
function HomeWhatsNew({ getAriaLabel }) {
  const { user } = useAuth();
  const { data: rawPopup } = usePopup();
  const updater = useOptionalUpdaterContext();
  const forcedUpdate = updater?.state.forced ?? false;
  const popups = forcedUpdate ? [] : normalizeAnnouncements(rawPopup).filter((popup) => popup.banner_text?.trim());
  const items = reactExports.useMemo(
    () => popups.map((popup) => ({
      kind: "feature-popup",
      id: `feature-popup:${popup.id}`,
      tickerText: popup.banner_text.trim(),
      popupId: popup.id
    })),
    [popups]
  );
  const [openFor, setOpenFor] = reactExports.useState(null);
  const userID = user?.userID;
  const featurePopup = openFor?.userID === userID ? popups.find((popup) => popup.id === openFor?.popupId) : void 0;
  const featurePopupOpen = !!userID && !!featurePopup;
  reactExports.useEffect(() => {
    setOpenFor((current) => {
      if (!current) return current;
      if (!userID || current.userID !== userID || !popups.some((popup) => popup.id === current.popupId)) {
        return null;
      }
      return current;
    });
  }, [popups, userID]);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.serverDrivenPopup, featurePopupOpen);
  const handleOpen = reactExports.useCallback(
    (item) => {
      if (item.kind !== "feature-popup" || !userID) return;
      const popup = popups.find((candidate) => candidate.id === item.popupId);
      if (!popup) return;
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_VIEW, {
        popup_type: "feature",
        url: popup.action?.url ?? "",
        has_cover: Boolean(popup.cover_url),
        can_close: popup.can_close ?? false
      });
      setOpenFor({ userID, popupId: popup.id });
    },
    [popups, userID]
  );
  if (!userID) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      HomeWhatsNewHandoff,
      {
        items,
        onOpen: handleOpen,
        getAriaLabel,
        paused: featurePopupOpen
      }
    ),
    featurePopupOpen && featurePopup ? /* @__PURE__ */ jsxRuntimeExports.jsx(FeaturePopup, { popup: featurePopup, onClose: () => setOpenFor(null) }) : null
  ] });
}
const HOME_WINK_LOGO_CLASS_NAME = "no-drag text-[var(--home-brand-foreground)]";
function HomeWinkLogo() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    HubLogo,
    {
      size: 46,
      winkOnHover: true,
      className: HOME_WINK_LOGO_CLASS_NAME,
      "data-action-ui-id": "home.wink-logo"
    }
  );
}
const DEFAULT_INSPIRATION_QUERY_IDS = ["hand-drawn-laundromat-encounter", "gan-charger-ad"];
function pickRandomInspiration(collections, random = Math.random, queryIds) {
  const allowedIds = new Set(queryIds?.length ? queryIds : DEFAULT_INSPIRATION_QUERY_IDS);
  const seen = /* @__PURE__ */ new Set();
  const candidates = collections.flatMap(
    (collection) => collection.items.flatMap((item) => {
      if (!item.canUseAction || item.action.kind !== "query") return [];
      if (!allowedIds.has(item.action.query.id)) return [];
      const key = `${item.action.sceneId}:${item.action.query.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ collectionId: collection.id, item }];
    })
  );
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : void 0;
}
function HomeRandomInspirationBridge({
  collections,
  loading,
  enabled,
  onSelect
}) {
  const request = reactExports.useSyncExternalStore(subscribeRandomInspiration, getRandomInspirationRequest);
  reactExports.useEffect(() => {
    if (request === null || loading) return;
    const selected = enabled ? pickRandomInspiration(collections, Math.random, getRandomInspirationQueryIds(request)) : void 0;
    if (!completeRandomInspiration(request, Boolean(selected)) || !selected) return;
    onSelect(selected.item, selected.collectionId);
  }, [collections, enabled, loading, onSelect, request]);
  return null;
}
const HOME_SHOWCASE_IMAGE_CDN_HOSTS = /* @__PURE__ */ new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const OSS_IMAGE_PROCESS_PARAM = "x-oss-process";
const OSS_SIGNED_QUERY_PARAMS = /* @__PURE__ */ new Set([
  "ossaccesskeyid",
  "signature",
  "expires",
  "security-token",
  "x-oss-signature",
  "x-oss-credential",
  "x-oss-date",
  "x-oss-expires",
  "x-oss-security-token"
]);
const HOME_SHOWCASE_POSTER_PIXEL_WIDTH = {
  // The CSS cards top out at 336px / 240px. These 2x buckets keep posters
  // sharp on common Retina displays without downloading the Apollo originals.
  landscape: 672,
  portrait: 480
};
function resizeOperation(operation, pixelWidth) {
  const parts = operation.split(",");
  const widthIndex = parts.findIndex((part) => /^w_\d+$/.test(part));
  if (widthIndex === -1) parts.push(`w_${pixelWidth}`);
  else parts[widthIndex] = `w_${pixelWidth}`;
  return parts.join(",");
}
function mergeOssImageResize(existingProcess, pixelWidth) {
  if (!existingProcess) return `image/resize,w_${pixelWidth}/format,webp`;
  const operations = existingProcess.split("/");
  if (operations[0] !== "image") return null;
  const resizeIndex = operations.findIndex((operation) => operation.startsWith("resize,"));
  if (resizeIndex === -1) operations.splice(1, 0, `resize,w_${pixelWidth}`);
  else operations[resizeIndex] = resizeOperation(operations[resizeIndex] ?? "resize", pixelWidth);
  return operations.join("/");
}
function homeShowcasePosterThumbnailUrl(sourceUrl, orientation) {
  try {
    const url = new URL(sourceUrl);
    const hasSignedQuery = [...url.searchParams.keys()].some(
      (key) => OSS_SIGNED_QUERY_PARAMS.has(key.toLowerCase())
    );
    if (url.protocol !== "https:" && url.protocol !== "http:" || !HOME_SHOWCASE_IMAGE_CDN_HOSTS.has(url.hostname.toLowerCase()) || url.port !== "" || url.username !== "" || url.password !== "" || hasSignedQuery || url.searchParams.getAll(OSS_IMAGE_PROCESS_PARAM).length > 1) {
      return sourceUrl;
    }
    const imageProcess = mergeOssImageResize(
      url.searchParams.get(OSS_IMAGE_PROCESS_PARAM),
      HOME_SHOWCASE_POSTER_PIXEL_WIDTH[orientation]
    );
    if (!imageProcess) return sourceUrl;
    url.searchParams.set(OSS_IMAGE_PROCESS_PARAM, imageProcess);
    return url.toString();
  } catch {
    return sourceUrl;
  }
}
let activePreviewVideo = null;
let mountedPreviewCardCount = 0;
const MEDIA_LOAD_ROOT_MARGIN = "240px 0px";
const previewAttemptByVideo = /* @__PURE__ */ new WeakMap();
const previewMutedStateByVideo = /* @__PURE__ */ new WeakMap();
const previewPlayingStateByVideo = /* @__PURE__ */ new WeakMap();
function beginPreviewAttempt(video) {
  const nextAttempt = (previewAttemptByVideo.get(video) ?? 0) + 1;
  previewAttemptByVideo.set(video, nextAttempt);
  return nextAttempt;
}
function isCurrentPreviewAttempt(video, attempt) {
  return previewAttemptByVideo.get(video) === attempt;
}
function resetVideo(video) {
  beginPreviewAttempt(video);
  video.muted = true;
  previewMutedStateByVideo.get(video)?.(true);
  previewPlayingStateByVideo.get(video)?.(false);
  video.pause();
  try {
    video.currentTime = 0;
  } catch {
  }
  video.load();
  if (activePreviewVideo === video) activePreviewVideo = null;
}
function deactivatePreviewVideo(video) {
  beginPreviewAttempt(video);
  video.muted = true;
  previewMutedStateByVideo.get(video)?.(true);
  previewPlayingStateByVideo.get(video)?.(false);
  video.pause();
  if (activePreviewVideo === video) activePreviewVideo = null;
}
function normalizePlaybackTime(video, currentTime) {
  if (!Number.isFinite(currentTime) || currentTime < 0) return 0;
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return Math.min(currentTime, video.duration);
  }
  return currentTime;
}
function stopActivePreview() {
  if (activePreviewVideo) resetVideo(activePreviewVideo);
}
function handlePreviewWindowBlur() {
  stopActivePreview();
}
function handlePreviewVisibilityChange() {
  if (document.visibilityState !== "visible") stopActivePreview();
}
function subscribeToPreviewLifecycle() {
  mountedPreviewCardCount += 1;
  if (mountedPreviewCardCount === 1) {
    window.addEventListener("blur", handlePreviewWindowBlur);
    document.addEventListener("visibilitychange", handlePreviewVisibilityChange);
  }
  return () => {
    mountedPreviewCardCount = Math.max(0, mountedPreviewCardCount - 1);
    if (mountedPreviewCardCount === 0) {
      window.removeEventListener("blur", handlePreviewWindowBlur);
      document.removeEventListener("visibilitychange", handlePreviewVisibilityChange);
    }
  };
}
function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
function resolveMediaShowcasePoster(item, videoOrientation) {
  if (videoOrientation === "portrait") {
    if (item.portraitCoverUrl) {
      return {
        fit: item.portraitCoverFit ?? "contain",
        source: "portrait",
        url: item.portraitCoverUrl
      };
    }
    return {
      fit: "cover",
      source: "fallback",
      url: item.landscapeCoverUrl ?? item.coverUrl
    };
  }
  if (item.landscapeCoverUrl) {
    return {
      fit: "contain",
      source: "landscape",
      url: item.landscapeCoverUrl
    };
  }
  if (item.portraitCoverUrl) {
    return {
      fit: "contain",
      source: "portrait",
      url: item.portraitCoverUrl
    };
  }
  return {
    fit: "contain",
    source: "fallback",
    url: item.coverUrl
  };
}
function MediaShowcaseCard({
  item,
  isZh,
  videoOrientation,
  posterLoading = "lazy",
  dataContentId,
  dataVideoId,
  useLabel,
  fullscreenLabel,
  durationLabel,
  muteLabel,
  unmuteLabel,
  actionPending = false,
  onUse,
  onFullscreen
}) {
  const cardRef = reactExports.useRef(null);
  const videoRef = reactExports.useRef(null);
  const resumePlaybackTimeRef = reactExports.useRef(null);
  const pendingPreviewIntentRef = reactExports.useRef(false);
  const playPreviewRef = reactExports.useRef(() => void 0);
  const [videoDuration, setVideoDuration] = reactExports.useState("--:--");
  const [isMuted, setIsMuted] = reactExports.useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = reactExports.useState(false);
  const [shouldLoadMedia, setShouldLoadMedia] = reactExports.useState(false);
  const [loadedMediaKey, setLoadedMediaKey] = reactExports.useState(null);
  const [failedMediaKey, setFailedMediaKey] = reactExports.useState(null);
  const [originalPosterFallbackKey, setOriginalPosterFallbackKey] = reactExports.useState(null);
  const [failedPosterKey, setFailedPosterKey] = reactExports.useState(null);
  const poster = resolveMediaShowcasePoster(item, videoOrientation);
  const { fit: posterFit, source: posterSource, url: posterUrl } = poster;
  const posterThumbnailUrl = homeShowcasePosterThumbnailUrl(posterUrl, videoOrientation);
  const posterObjectFitClass = posterFit === "cover" ? "object-cover" : "object-contain";
  const hasPreviewVideo = Boolean(item.videoUrl);
  const mediaKey = item.videoUrl ?? "";
  const previousMediaKeyRef = reactExports.useRef(mediaKey);
  const posterKey = `${posterThumbnailUrl}
${posterUrl}`;
  const activePosterUrl = originalPosterFallbackKey === posterKey ? posterUrl : posterThumbnailUrl;
  const activePosterKey = `${posterKey}
${activePosterUrl}`;
  const isMediaReady = !hasPreviewVideo || loadedMediaKey === mediaKey;
  const isMediaFailed = failedMediaKey === mediaKey;
  const title = isZh ? item.title : item.titleEn;
  const description = isZh ? item.description : item.descriptionEn;
  const attribution = isZh ? item.attribution : item.attributionEn;
  const actionLabel = isZh ? item.actionLabel ?? useLabel : item.actionLabelEn ?? useLabel;
  const attributionLabel = attribution.startsWith("@") ? attribution : `@${attribution}`;
  const stopPreview = () => {
    pendingPreviewIntentRef.current = false;
    const video = videoRef.current;
    if (video && activePreviewVideo === video) resetVideo(video);
  };
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setLoadedMediaKey(mediaKey);
    setFailedMediaKey(null);
    setVideoDuration(
      Number.isFinite(video.duration) && video.duration > 0 ? formatTime(video.duration, true) : "--:--"
    );
  };
  const handleMediaError = () => {
    const video = videoRef.current;
    if (video) deactivatePreviewVideo(video);
    setFailedMediaKey(mediaKey);
    workspaceLog.warn("home: showcase-media-error", {
      videoUrl: item.videoUrl,
      coverUrl: posterUrl
    });
  };
  const retryFailedMedia = () => {
    if (!isMediaFailed) return;
    setFailedMediaKey(null);
    videoRef.current?.load();
  };
  const startPlayback = (video, attempt, muted) => {
    video.muted = muted;
    setIsMuted(muted);
    const handleRejection = () => {
      if (activePreviewVideo !== video || !isCurrentPreviewAttempt(video, attempt)) return;
      if (!muted) {
        startPlayback(video, attempt, true);
        return;
      }
      resetVideo(video);
    };
    try {
      const started = video.play();
      if (started && typeof started.catch === "function") started.catch(handleRejection);
    } catch {
      handleRejection();
    }
  };
  const playPreview = () => {
    if (prefersReducedMotion()) return;
    const video = videoRef.current;
    if (!video) return;
    if (activePreviewVideo && activePreviewVideo !== video) {
      resetVideo(activePreviewVideo);
    }
    const startTime = resumePlaybackTimeRef.current ?? 0;
    try {
      video.currentTime = normalizePlaybackTime(video, startTime);
      resumePlaybackTimeRef.current = null;
    } catch {
    }
    activePreviewVideo = video;
    previewPlayingStateByVideo.get(video)?.(true);
    startPlayback(video, beginPreviewAttempt(video), false);
  };
  playPreviewRef.current = playPreview;
  const handlePreviewIntent = () => {
    if (isMediaFailed) return;
    const video = videoRef.current;
    if (!video || activePreviewVideo === video) return;
    const scrollRoot = video.closest(".home-content-grid");
    if (scrollRoot?.dataset.homeWheelActive === "true") return;
    if (!shouldLoadMedia) {
      pendingPreviewIntentRef.current = true;
      setShouldLoadMedia(true);
      return;
    }
    playPreview();
  };
  const handleFullscreen = () => {
    const video = videoRef.current;
    const initialPlaybackTime = video ? normalizePlaybackTime(video, video.currentTime) : 0;
    if (video && activePreviewVideo === video) {
      deactivatePreviewVideo(video);
    } else {
      stopActivePreview();
    }
    onFullscreen(item, initialPlaybackTime, (currentTime) => {
      const inlineVideo = videoRef.current;
      if (!inlineVideo) return;
      const resumedTime = normalizePlaybackTime(inlineVideo, currentTime);
      resumePlaybackTimeRef.current = resumedTime;
      try {
        inlineVideo.currentTime = resumedTime;
      } catch {
      }
    });
  };
  const handleAudioToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };
  const handlePosterError = () => {
    if (activePosterUrl === posterThumbnailUrl && posterThumbnailUrl !== posterUrl) {
      setOriginalPosterFallbackKey(posterKey);
      return;
    }
    setFailedPosterKey(activePosterKey);
  };
  reactExports.useEffect(() => {
    if (!hasPreviewVideo || shouldLoadMedia) return;
    const card = cardRef.current;
    if (!card) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoadMedia(true);
        observer.disconnect();
      },
      { rootMargin: MEDIA_LOAD_ROOT_MARGIN }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [hasPreviewVideo, shouldLoadMedia]);
  reactExports.useEffect(() => {
    if (!shouldLoadMedia || !pendingPreviewIntentRef.current) return;
    pendingPreviewIntentRef.current = false;
    playPreviewRef.current();
  }, [shouldLoadMedia]);
  reactExports.useEffect(() => {
    if (previousMediaKeyRef.current === mediaKey) return;
    previousMediaKeyRef.current = mediaKey;
    pendingPreviewIntentRef.current = false;
    resumePlaybackTimeRef.current = null;
    setLoadedMediaKey(null);
    setFailedMediaKey(null);
    setVideoDuration("--:--");
    const video = videoRef.current;
    if (video) deactivatePreviewVideo(video);
  }, [mediaKey]);
  reactExports.useEffect(() => {
    const video = videoRef.current;
    const unsubscribe = subscribeToPreviewLifecycle();
    if (video) previewMutedStateByVideo.set(video, setIsMuted);
    if (video) previewPlayingStateByVideo.set(video, setIsPreviewPlaying);
    return () => {
      if (video) previewMutedStateByVideo.delete(video);
      if (video) previewPlayingStateByVideo.delete(video);
      if (video && activePreviewVideo === video) resetVideo(video);
      unsubscribe();
    };
  }, []);
  const useActionButton = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      className: `home-media-showcase-use-button h-9 min-w-0 gap-1.5 rounded-full border-0 px-3 ${hasPreviewVideo ? "max-w-[calc(100%_-_5rem)] flex-none" : "w-full"}`,
      "aria-label": `${actionLabel}: ${title}`,
      "aria-busy": actionPending || void 0,
      disabled: !item.canUseAction || actionPending,
      "data-action-pending": actionPending || void 0,
      onClick: (event) => {
        event.stopPropagation();
        if (!item.canUseAction || actionPending) return;
        const feedbackOrigin = captureHomeUsePromptTransferOrigin(event.currentTarget);
        stopActivePreview();
        onUse(item, feedbackOrigin);
      },
      "data-action-ui-id": "home-media-showcase-use",
      children: [
        actionPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon,
          {
            icon: LoaderCircle,
            size: "sm",
            strokeWidth: 1.5,
            className: "animate-spin",
            "aria-hidden": true
          }
        ) : item.action.kind === "project-archive" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectImportIcon, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UsePromptIcon, { size: 14 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate whitespace-nowrap", children: actionLabel })
      ]
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      ref: cardRef,
      className: `home-media-showcase-card group flex min-w-0 flex-col overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)] ${hasPreviewVideo ? "cursor-pointer" : ""}`,
      "data-action-ui-id": "home-media-showcase-card",
      "data-media-kind": hasPreviewVideo ? "video" : "image",
      "data-media-content-id": dataContentId,
      "data-video-id": dataVideoId,
      "data-click-opens-fullscreen": hasPreviewVideo || void 0,
      onClickCapture: (event) => {
        if (!hasPreviewVideo) return;
        if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"]')) {
          return;
        }
        handleFullscreen();
      },
      onMouseEnter: hasPreviewVideo ? () => {
        retryFailedMedia();
        handlePreviewIntent();
      } : void 0,
      onMouseLeave: hasPreviewVideo ? stopPreview : void 0,
      onMouseMove: hasPreviewVideo ? handlePreviewIntent : void 0,
      onFocusCapture: hasPreviewVideo ? () => setShouldLoadMedia(true) : void 0,
      onBlur: (event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
          return;
        }
        stopPreview();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `home-media-showcase-media-frame relative ${videoOrientation === "landscape" ? "aspect-video" : ""} overflow-hidden rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted`,
            "data-home-media-frame": "true",
            "data-video-orientation": videoOrientation,
            "aria-busy": hasPreviewVideo && shouldLoadMedia && !isMediaReady && !isMediaFailed || void 0,
            children: [
              hasPreviewVideo ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "video",
                {
                  ref: videoRef,
                  src: shouldLoadMedia ? item.videoUrl : void 0,
                  poster: shouldLoadMedia ? activePosterUrl : void 0,
                  loop: true,
                  muted: false,
                  playsInline: true,
                  preload: shouldLoadMedia ? "metadata" : "none",
                  onLoadedMetadata: handleLoadedMetadata,
                  onError: handleMediaError,
                  "aria-label": title,
                  "data-home-media-loaded": isMediaReady || void 0,
                  "data-home-media-activated": shouldLoadMedia || void 0,
                  "data-home-media-poster-fit": posterFit,
                  "data-home-media-poster-source": posterSource,
                  className: "home-media-showcase-media absolute inset-0 h-full w-full object-contain"
                }
              ) : null,
              !isPreviewPlaying && !isMediaFailed && activePosterUrl && failedPosterKey !== activePosterKey ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: activePosterUrl,
                  alt: "",
                  draggable: false,
                  loading: posterLoading,
                  decoding: "async",
                  "aria-hidden": "true",
                  "data-home-media-poster": "true",
                  onError: handlePosterError,
                  className: `pointer-events-none absolute inset-0 z-[1] h-full w-full ${posterObjectFitClass}`
                }
              ) : null,
              isMediaFailed && activePosterUrl && failedPosterKey !== activePosterKey ? (
                // The transparent failed <video> also hides its poster attribute, so
                // the degraded state renders the poster through a plain <img>.
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: activePosterUrl,
                    alt: "",
                    draggable: false,
                    loading: "eager",
                    decoding: "async",
                    "aria-hidden": "true",
                    "data-home-media-error-poster": "true",
                    onError: handlePosterError,
                    className: `pointer-events-none absolute inset-0 z-[1] h-full w-full ${posterObjectFitClass}`
                  }
                )
              ) : null,
              hasPreviewVideo && shouldLoadMedia && !isMediaReady && !isMediaFailed ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "home-media-showcase-loading-surface absolute inset-0 z-[2]",
                  "data-home-media-placeholder": "true",
                  "aria-hidden": "true"
                }
              ) : null,
              hasPreviewVideo ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "home-media-showcase-duration absolute bottom-2 left-2 z-[3] rounded-md px-2 py-1 text-[11px] leading-none",
                    "data-action-ui-id": "home-media-showcase-duration",
                    "data-home-media-duration": "true",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
                        durationLabel,
                        ": ",
                        videoDuration
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", "data-home-media-duration-value": "true", children: videoDuration })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "home-media-showcase-action-row absolute right-2 bottom-3 left-2 z-[3] flex min-w-0 items-center justify-between gap-3",
                    "data-home-media-showcase-action-row": "true",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "icon-sm",
                          className: "home-media-showcase-control-button home-media-showcase-audio-button shrink-0 rounded-full border-0",
                          "aria-label": `${isMuted ? unmuteLabel : muteLabel}: ${title}`,
                          "aria-pressed": isMuted,
                          onClick: (event) => {
                            event.stopPropagation();
                            handleAudioToggle();
                          },
                          "data-action-ui-id": "home-media-showcase-audio-toggle",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: isMuted ? VolumeX : Volume2, size: "md", "aria-hidden": true })
                        }
                      ),
                      useActionButton,
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "icon-sm",
                          className: "home-media-showcase-control-button home-media-showcase-fullscreen-button shrink-0 rounded-full border-0",
                          "aria-label": `${fullscreenLabel}: ${title}`,
                          onClick: (event) => {
                            event.stopPropagation();
                            handleFullscreen();
                          },
                          "data-action-ui-id": "home-media-showcase-fullscreen",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Maximize2, size: "md", "aria-hidden": true })
                        }
                      )
                    ]
                  }
                )
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-media-showcase-use-layer absolute bottom-0 z-[3] pb-3", children: useActionButton })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "footer",
          {
            className: "home-media-showcase-footer flex min-w-0 flex-1 flex-col px-3 pt-3 pb-3",
            "data-home-media-footer": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "line-clamp-2 font-heading text-sm font-medium leading-5 text-foreground", children: title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: "mt-1.5 line-clamp-2 text-[13px] leading-[18px] text-muted-foreground",
                  "data-home-media-description": "true",
                  children: description
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "mt-auto flex min-w-0 items-center gap-1 pt-2 text-xs leading-4 text-foreground/40",
                  "data-home-media-attribution": "true",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: attributionLabel }),
                    item.isOfficial ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "inline-flex shrink-0",
                        "data-home-media-official-badge": "true",
                        "aria-hidden": "true",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Icon,
                          {
                            icon: BadgeCheck,
                            size: "sm",
                            strokeWidth: 2,
                            className: "text-brand-accent",
                            "aria-hidden": true
                          }
                        )
                      }
                    ) : null
                  ]
                }
              )
            ] })
          }
        )
      ]
    }
  );
}
const OFFICIAL_ATTRIBUTIONS = /* @__PURE__ */ new Set([
  "minimaxdesign",
  "minimaxdesign官方",
  "minimaxdesignofficial",
  // Existing showcase data can still carry the previous brand attribution.
  "minimaxhub",
  "minimaxhub官方",
  "minimaxhubofficial"
]);
function clampProgress(progress) {
  if (!Number.isFinite(progress)) return 0.08;
  return Math.min(1, Math.max(0, progress ?? 0.08));
}
function resolveLocalizedDescription(skill, isZh) {
  if (isZh) {
    return skill.summaryZh || skill.descCn || skill.description || skill.summary;
  }
  return skill.summary || skill.descEn || skill.description || skill.summaryZh;
}
function resolveLocalizedAuthor(skill, isZh) {
  const author = isZh ? skill.authorCn || skill.authorEn || skill.creator : skill.authorEn || skill.authorCn || skill.creator;
  if (isOfficialSkill(skill) && isOfficialAttribution(author)) {
    return isZh ? "MiniMax Design官方" : "MiniMax Design Official";
  }
  return author || (isOfficialSkill(skill) ? "MiniMax Design" : "");
}
function isOfficialSkill(skill) {
  return skill.source === "official" || skill.source === "official-featured";
}
function isOfficialAttribution(author) {
  return OFFICIAL_ATTRIBUTIONS.has(
    author.trim().replace(/^@+/, "").replaceAll(" ", "").toLowerCase()
  );
}
function MediaShowcaseSkillCard({
  skill,
  isZh,
  videoOrientation,
  dataContentId,
  useLabel,
  disabled = false,
  installing = false,
  installProgress = null,
  installingLabel,
  onUse
}) {
  const [failedCoverUrl, setFailedCoverUrl] = reactExports.useState(null);
  const [loadedCoverUrl, setLoadedCoverUrl] = reactExports.useState(null);
  const cover = resolveSkillCoverUrl(skill);
  const coverFailed = failedCoverUrl === cover;
  const coverLoaded = loadedCoverUrl === cover;
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const description = resolveLocalizedDescription(skill, isZh);
  const author = resolveLocalizedAuthor(skill, isZh);
  const attributionLabel = author.startsWith("@") ? author : `@${author}`;
  const official = isOfficialSkill(skill) && isOfficialAttribution(author);
  const normalizedProgress = clampProgress(installProgress);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      className: "home-media-showcase-card group flex min-w-0 flex-col overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]",
      "data-action-ui-id": "home-media-showcase-skill-card",
      "data-media-kind": "skill",
      "data-media-content-id": dataContentId,
      "data-skill-name": skill.name,
      "data-installing": installing ? "true" : void 0,
      "aria-disabled": disabled || void 0,
      "aria-busy": installing || void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `home-media-showcase-media-frame relative ${videoOrientation === "landscape" ? "aspect-video" : ""} overflow-hidden rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted`,
            "data-home-media-frame": "true",
            "data-video-orientation": videoOrientation,
            children: [
              !coverFailed ? (
                // The `home-media-showcase-media` visibility contract lives on this
                // wrapper: it stays transparent until `data-home-media-loaded` flips
                // to true, exactly like the video showcase cards. SkillCoverMedia
                // reports load/error; keying loaded state by URL survives skill
                // list refreshes swapping the cover.
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "home-media-showcase-media absolute inset-0",
                    "data-home-media-loaded": coverLoaded || void 0,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SkillCoverMedia,
                      {
                        url: cover,
                        alt: displayName,
                        className: "h-full w-full object-contain",
                        onLoad: () => setLoadedCoverUrl(cover),
                        onError: () => setFailedCoverUrl(cover)
                      }
                    )
                  }
                )
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "absolute inset-0 flex items-center justify-center bg-muted text-foreground opacity-30",
                  "data-home-skill-cover-fallback": "true",
                  "aria-hidden": "true",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(SkillIcon, { size: 32, strokeWidth: 1.5 })
                }
              ),
              installing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "home-skill-install-indicator pointer-events-none absolute top-1/2 left-1/2 z-[4] size-11 -translate-x-1/2 -translate-y-1/2",
                  "data-home-media-skill-install-indicator": "true",
                  style: {
                    "--home-skill-install-angle": `${Math.round(normalizedProgress * 360)}deg`
                  },
                  role: "progressbar",
                  "aria-label": `${installingLabel}: ${displayName}`,
                  "aria-valuemin": 0,
                  "aria-valuemax": 1,
                  "aria-valuenow": normalizedProgress
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-media-showcase-use-layer absolute bottom-0 z-[3] pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: "home-media-showcase-use-button h-9 w-full min-w-0 gap-1.5 rounded-full border-0 px-2",
                  "aria-label": `${installing ? installingLabel : useLabel}: ${displayName}`,
                  disabled: disabled || installing,
                  onClick: () => onUse(skill),
                  "data-action-ui-id": "home-media-showcase-skill-use",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FilledSkillIcon, { size: 14 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate whitespace-nowrap", children: installing ? installingLabel : useLabel })
                  ]
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "footer",
          {
            className: "home-media-showcase-footer flex min-w-0 flex-1 flex-col px-3 pt-3 pb-3",
            "data-home-media-footer": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "line-clamp-2 font-heading text-sm font-medium leading-5 text-foreground", children: displayName }),
              description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 line-clamp-2 text-[13px] leading-[18px] text-muted-foreground", children: description }) : null,
              author ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex min-w-0 items-center gap-1 pt-2 text-xs leading-4 text-foreground/30", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: attributionLabel }),
                official ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "inline-flex shrink-0",
                    "data-home-media-official-badge": "true",
                    "aria-hidden": "true",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Icon,
                      {
                        icon: BadgeCheck,
                        size: "sm",
                        strokeWidth: 2,
                        className: "text-brand-accent",
                        "aria-hidden": true
                      }
                    )
                  }
                ) : null
              ] }) : null
            ] })
          }
        )
      ]
    }
  );
}
const SKILL_COLLECTION_ID = "skill";
const SHOWCASE_PAGE = "home";
const SHOWCASE_EXPOSURE_THRESHOLD = 0.5;
const SHOWCASE_EXPOSURE_DELAY_MS = 500;
const SHOWCASE_SKILL_REQUEST_ROOT_MARGIN = "240px 0px";
const LANDSCAPE_EAGER_POSTER_COUNT = 4;
const PORTRAIT_EAGER_POSTER_COUNT = 5;
const SKILL_LOADING_PLACEHOLDER_IDS = [
  "skill-loading-1",
  "skill-loading-2",
  "skill-loading-3",
  "skill-loading-4",
  "skill-loading-5",
  "skill-loading-6"
];
const SHOWCASE_LOADING_PLACEHOLDER_IDS = [
  "showcase-loading-1",
  "showcase-loading-2",
  "showcase-loading-3",
  "showcase-loading-4",
  "showcase-loading-5",
  "showcase-loading-6"
];
function resolveSkillDefinitions(provider, skillConfig) {
  if (skillConfig) return skillConfig.enabled ? skillConfig.categories : [];
  return provider.secondaryCategories.map((category) => ({
    ...category,
    query: { source: provider.source }
  }));
}
function MediaShowcasePreview({
  categories = [],
  tabsConfig,
  skillConfig,
  skillConfigLoading = false,
  skillConfigAuthoritative = true,
  projectCategories = [],
  projectDefaultSectionId,
  projectConfigLoading = false,
  projectConfigAuthoritative = true,
  showcase,
  configLoading = false,
  configAuthoritative = true,
  randomInspirationEnabled = true,
  featuredSkills = [],
  featuredSkillsLoading = false,
  featuredSkillsError = null,
  featuredSkillInstallingName = null,
  featuredSkillInstallingProgress = null,
  onQuerySelect,
  onFeatureSelect,
  onProjectArchiveSelect,
  onFeaturedSkillsRequest,
  onFeaturedSkillSelect
}) {
  const { t, i18n } = useTranslation();
  const platform = usePlatform();
  const isZh = i18n.language.startsWith("zh");
  const showcaseRef = reactExports.useRef(null);
  const showcaseToolbarRef = reactExports.useRef(null);
  const trackedExposureKeysRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const exposureTimersRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const defaultSwitchTrackedRef = reactExports.useRef(false);
  const nonAuthoritativeUserSelectionRef = reactExports.useRef(false);
  const initialSkillRequestRef = reactExports.useRef(false);
  const [activeCollectionId, setActiveCollectionId] = reactExports.useState(null);
  const [activePrimaryId, setActivePrimaryId] = reactExports.useState(null);
  const [activeSecondaryByPrimary, setActiveSecondaryByPrimary] = reactExports.useState(
    {}
  );
  const [previewSession, setPreviewSession] = reactExports.useState(null);
  const [randomInspirationItem, setRandomInspirationItem] = reactExports.useState(
    null
  );
  const [pendingProjectArchiveItemId, setPendingProjectArchiveItemId] = reactExports.useState(
    null
  );
  const projectArchiveActionInFlightRef = reactExports.useRef(false);
  const [portraitMockInjector, setPortraitMockInjector] = reactExports.useState(
    null
  );
  const guideUrls = getCreationGuideUrlsByLocale(i18n.language);
  const configuredPrimaryCategories = tabsConfig?.enabled ? tabsConfig.primaryCategories : [];
  const twoLevelConfigured = tabsConfig?.enabled === true;
  const inspirationCollections = reactExports.useMemo(
    () => buildInspirationMediaShowcaseCollections({
      categories,
      featuredLabel: t("home.mediaShowcase.featured"),
      showcase
    }),
    [categories, showcase, t]
  );
  const projectCollections = reactExports.useMemo(
    () => buildMediaShowcaseCollections({
      categories: projectCategories,
      featuredLabel: t("home.mediaShowcase.featured"),
      showcase
    }),
    [projectCategories, showcase, t]
  );
  const primaryCategories = configuredPrimaryCategories.filter((category) => {
    if (category.provider.type === "project-showcase") {
      return projectConfigLoading || projectCollections.length > 0;
    }
    if (configLoading) return true;
    if (category.provider.type === "quick-start-v2") return inspirationCollections.length > 0;
    return skillConfigLoading || resolveSkillDefinitions(category.provider, skillConfig).length > 0;
  });
  const twoLevelEnabled = primaryCategories.length > 0;
  const selectedPrimaryId = activePrimaryId && primaryCategories.some((category) => category.id === activePrimaryId) ? activePrimaryId : tabsConfig?.defaultPrimaryId && primaryCategories.some((category) => category.id === tabsConfig.defaultPrimaryId) ? tabsConfig.defaultPrimaryId : primaryCategories[0]?.id;
  const selectedPrimary = primaryCategories.find((category) => category.id === selectedPrimaryId);
  const selectedProviderType = selectedPrimary?.provider.type;
  const effectiveConfigAuthoritative = configAuthoritative && (selectedProviderType !== "project-showcase" || projectConfigAuthoritative) && (selectedProviderType !== "skill-market" || skillConfigAuthoritative);
  const rootSkillProvider = selectedPrimary?.provider.type === "skill-market" ? selectedPrimary.provider : void 0;
  const skillDefinitions = rootSkillProvider ? resolveSkillDefinitions(rootSkillProvider, skillConfig) : [];
  const configuredSkillDefault = (skillConfig?.enabled ? skillConfig.defaultSecondaryId : void 0) ?? selectedPrimary?.defaultSecondaryId;
  const rememberedSkillId = selectedPrimaryId ? activeSecondaryByPrimary[selectedPrimaryId] : void 0;
  const skillCollectionId = twoLevelEnabled ? rememberedSkillId && skillDefinitions.some((category) => category.id === rememberedSkillId) ? rememberedSkillId : configuredSkillDefault && skillDefinitions.some((category) => category.id === configuredSkillDefault) ? configuredSkillDefault : skillDefinitions[0]?.id ?? "all" : SKILL_COLLECTION_ID;
  const selectedSkillDefinition = skillDefinitions.find(
    (category) => category.id === skillCollectionId
  );
  const selectedSkillSource = selectedSkillDefinition?.query.source ?? rootSkillProvider?.source;
  const baseCollections = reactExports.useMemo(() => {
    if (selectedProviderType === "quick-start-v2") return inspirationCollections;
    if (selectedProviderType === "project-showcase") return projectCollections;
    if (selectedProviderType === "skill-market") return [];
    if (twoLevelConfigured) return [];
    return buildMediaShowcaseCollections({
      categories,
      featuredLabel: t("home.mediaShowcase.featured"),
      showcase
    });
  }, [
    categories,
    inspirationCollections,
    projectCollections,
    selectedProviderType,
    showcase,
    t,
    twoLevelConfigured
  ]);
  reactExports.useEffect(() => {
    return;
  }, []);
  const portraitMockEnabled = portraitMockInjector !== null;
  const collections = reactExports.useMemo(
    () => portraitMockInjector ? portraitMockInjector(baseCollections, categories) : baseCollections,
    [baseCollections, categories, portraitMockInjector]
  );
  const hasSkillCollection = twoLevelEnabled ? selectedProviderType === "skill-market" : categories.some((category) => category.kind === "featured-skills");
  const showcasePending = configLoading || selectedProviderType === "project-showcase" && projectConfigLoading || selectedProviderType === "skill-market" && skillConfigLoading;
  const isShowcaseLoading = showcasePending && collections.length === 0;
  const visibleCollections = reactExports.useMemo(
    () => isShowcaseLoading ? [
      {
        id: selectedPrimary?.defaultSecondaryId ?? projectDefaultSectionId ?? "empty",
        label: selectedPrimary?.label ?? t("home.mediaShowcase.featured"),
        labelEn: selectedPrimary?.labelEn ?? t("home.mediaShowcase.featured"),
        videoOrientation: "landscape",
        items: []
      }
    ] : collections,
    [collections, isShowcaseLoading, projectDefaultSectionId, selectedPrimary, t]
  );
  const showSkillTab = hasSkillCollection || isShowcaseLoading && selectedProviderType === "skill-market";
  const skillCollections = reactExports.useMemo(
    () => twoLevelEnabled ? skillDefinitions.map((category) => ({
      id: category.id,
      label: category.label,
      labelEn: category.labelEn,
      videoOrientation: showcase?.tabs[category.id]?.videoOrientation ?? "landscape",
      ...showcase?.tabs[category.id]?.badge ? { badge: showcase.tabs[category.id].badge } : {},
      items: []
    })) : [
      {
        id: SKILL_COLLECTION_ID,
        label: showcase?.tabs[SKILL_COLLECTION_ID]?.label ?? t("home.mediaShowcase.h3OfficialSkill"),
        labelEn: showcase?.tabs[SKILL_COLLECTION_ID]?.labelEn ?? t("home.mediaShowcase.h3OfficialSkill"),
        ...showcase?.tabs[SKILL_COLLECTION_ID]?.badge ? { badge: showcase.tabs[SKILL_COLLECTION_ID].badge } : {},
        videoOrientation: showcase?.tabs[SKILL_COLLECTION_ID]?.videoOrientation ?? "landscape",
        items: []
      }
    ],
    [showcase, skillDefinitions, t, twoLevelEnabled]
  );
  const skillCollection = skillCollections.find(
    (collection) => collection.id === skillCollectionId
  ) ?? skillCollections[0] ?? {
    id: skillCollectionId,
    label: t("home.mediaShowcase.h3OfficialSkill"),
    labelEn: t("home.mediaShowcase.h3OfficialSkill"),
    videoOrientation: "landscape",
    items: []
  };
  const visibleFeaturedSkills = reactExports.useMemo(
    () => selectedSkillDefinition?.query.tag ? featuredSkills.filter(
      (skill) => skillVerticals(skill).some(
        (vertical) => vertical === selectedSkillDefinition.query.tag
      )
    ) : featuredSkills,
    [featuredSkills, selectedSkillDefinition]
  );
  const orderedCollections = reactExports.useMemo(
    () => twoLevelEnabled ? showSkillTab ? skillCollections : visibleCollections : [
      ...visibleCollections.filter((collection) => collection.id === "featured"),
      ...showSkillTab && skillCollection ? [skillCollection] : [],
      ...visibleCollections.filter((collection) => collection.id !== "featured")
    ],
    [showSkillTab, skillCollection, skillCollections, twoLevelEnabled, visibleCollections]
  );
  const showSecondaryTabs = orderedCollections.length > 1;
  const availableCollectionIds = orderedCollections.map((collection) => collection.id);
  const configuredSecondaryDefault = twoLevelEnabled ? (selectedProviderType === "quick-start-v2" ? showcase?.defaultTabId : void 0) ?? selectedPrimary?.defaultSecondaryId ?? (selectedProviderType === "project-showcase" ? projectDefaultSectionId : void 0) ?? (selectedProviderType === "skill-market" ? skillCollectionId : void 0) : showcase?.defaultTabId;
  const hasValidConfiguredDefault = Boolean(
    configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault)
  );
  const rememberedCollectionId = twoLevelEnabled && selectedPrimaryId ? activeSecondaryByPrimary[selectedPrimaryId] : activeCollectionId;
  const selectedCollectionId = rememberedCollectionId && availableCollectionIds.includes(rememberedCollectionId) ? rememberedCollectionId : configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault) ? configuredSecondaryDefault : showSkillTab ? skillCollectionId : availableCollectionIds[0];
  const defaultCollectionId = configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault) ? configuredSecondaryDefault : showSkillTab ? skillCollectionId : availableCollectionIds[0];
  const collectionForId = reactExports.useCallback(
    (collectionId) => orderedCollections.find((collection) => collection.id === collectionId),
    [orderedCollections]
  );
  const collectionTabProps = reactExports.useCallback(
    (collectionId) => {
      const collection = collectionForId(collectionId);
      if (!collection) return null;
      return {
        page: SHOWCASE_PAGE,
        tab_id: collection.id,
        tab_name: isZh ? collection.label : collection.labelEn,
        tab_order: orderedCollections.findIndex((item) => item.id === collection.id) + 1,
        is_default_tab: collection.id === defaultCollectionId,
        ...selectedPrimary ? {
          tab_level: "secondary",
          primary_tab_id: selectedPrimary.id,
          primary_tab_name: isZh ? selectedPrimary.label : selectedPrimary.labelEn,
          primary_tab_order: primaryCategories.findIndex((item) => item.id === selectedPrimary.id) + 1,
          secondary_tab_id: collection.id,
          secondary_tab_name: isZh ? collection.label : collection.labelEn,
          secondary_tab_order: orderedCollections.findIndex((item) => item.id === collection.id) + 1,
          provider_type: selectedPrimary.provider.type
        } : {},
        video_orientation: collection.videoOrientation
      };
    },
    [
      collectionForId,
      defaultCollectionId,
      isZh,
      orderedCollections,
      primaryCategories,
      selectedPrimary
    ]
  );
  const trackTabSwitch = reactExports.useCallback(
    (collectionId, switchSource, fromTabId) => {
      const props = collectionTabProps(collectionId);
      if (!props) return;
      trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_SWITCH, {
        ...props,
        ...fromTabId ? { from_tab_id: fromTabId } : {},
        switch_source: switchSource
      });
    },
    [collectionTabProps]
  );
  const trackContentClick = reactExports.useCallback(
    (collectionId, contentId, contentType, contentPosition, clickTarget, videoId) => {
      const props = collectionTabProps(collectionId);
      if (!props) return;
      trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONTENT_CLICK, {
        ...props,
        content_id: contentId,
        ...videoId ? { video_id: videoId } : {},
        content_type: contentType,
        content_position: contentPosition,
        click_target: clickTarget
      });
    },
    [collectionTabProps]
  );
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative || !selectedCollectionId || !defaultCollectionId || defaultSwitchTrackedRef.current)
      return;
    defaultSwitchTrackedRef.current = true;
    if (nonAuthoritativeUserSelectionRef.current) return;
    trackTabSwitch(
      defaultCollectionId,
      showcase?.defaultTabId && !hasValidConfiguredDefault ? "fallback" : "default"
    );
  }, [
    effectiveConfigAuthoritative,
    showcasePending,
    defaultCollectionId,
    hasValidConfiguredDefault,
    selectedCollectionId,
    showcase,
    trackTabSwitch
  ]);
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative || !hasSkillCollection || selectedCollectionId !== skillCollectionId || initialSkillRequestRef.current || !onFeaturedSkillsRequest) {
      return;
    }
    const showcaseElement = showcaseRef.current;
    if (!showcaseElement) return;
    const request = () => {
      if (initialSkillRequestRef.current) return;
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest(selectedSkillSource);
    };
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        request();
      },
      { rootMargin: SHOWCASE_SKILL_REQUEST_ROOT_MARGIN }
    );
    observer.observe(showcaseElement);
    return () => observer.disconnect();
  }, [
    effectiveConfigAuthoritative,
    showcasePending,
    hasSkillCollection,
    onFeaturedSkillsRequest,
    selectedCollectionId,
    selectedSkillSource,
    skillCollectionId
  ]);
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative) return;
    if (typeof IntersectionObserver === "undefined") return;
    const toolbar = showcaseToolbarRef.current;
    const showcase2 = showcaseRef.current;
    if (!toolbar || !showcase2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          const key = target.getAttribute("data-home-exposure-key");
          if (!key) continue;
          const pendingTimer = exposureTimersRef.current.get(target);
          if (entry.isIntersecting && entry.intersectionRatio >= SHOWCASE_EXPOSURE_THRESHOLD) {
            if (trackedExposureKeysRef.current.has(key) || pendingTimer !== void 0) continue;
            const timer = window.setTimeout(() => {
              exposureTimersRef.current.delete(target);
              if (trackedExposureKeysRef.current.has(key)) return;
              trackedExposureKeysRef.current.add(key);
              const kind = target.getAttribute("data-home-exposure-kind");
              if (kind === "area") {
                trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_EXPOSURE, {
                  page: SHOWCASE_PAGE,
                  tab_count: orderedCollections.length,
                  visible_tab_ids: orderedCollections.map((collection) => collection.id),
                  default_tab_id: defaultCollectionId
                });
                return;
              }
              if (kind === "primary-tab") {
                const primaryId = target.getAttribute("data-home-primary-tab-id");
                const primary = primaryCategories.find((category) => category.id === primaryId);
                if (!primary) return;
                const primaryOrder = primaryCategories.findIndex((category) => category.id === primary.id) + 1;
                trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_EXPOSURE, {
                  page: SHOWCASE_PAGE,
                  tab_id: primary.id,
                  tab_name: isZh ? primary.label : primary.labelEn,
                  tab_order: primaryOrder,
                  is_default_tab: primary.id === tabsConfig?.defaultPrimaryId,
                  tab_level: "primary",
                  primary_tab_id: primary.id,
                  primary_tab_name: isZh ? primary.label : primary.labelEn,
                  primary_tab_order: primaryOrder,
                  provider_type: primary.provider.type
                });
                return;
              }
              const tabId = target.getAttribute("data-home-tab-id");
              if (!tabId) return;
              const tabProps = collectionTabProps(tabId);
              if (!tabProps) return;
              if (kind === "tab") {
                trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_EXPOSURE, tabProps);
                return;
              }
              if (kind === "content") {
                const contentId = target.getAttribute("data-media-content-id");
                const renderedContentType = target.getAttribute("data-media-kind");
                const contentType = selectedProviderType === "project-showcase" ? "project" : renderedContentType === "skill" ? "skill" : "video";
                const contentPosition = Number(target.getAttribute("data-content-position"));
                if (!contentId) return;
                trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONTENT_EXPOSURE, {
                  ...tabProps,
                  content_id: contentId,
                  ...target.getAttribute("data-video-id") ? { video_id: target.getAttribute("data-video-id") ?? void 0 } : {},
                  content_type: contentType,
                  video_orientation: tabProps.video_orientation,
                  content_position: contentPosition
                });
              }
            }, SHOWCASE_EXPOSURE_DELAY_MS);
            exposureTimersRef.current.set(target, timer);
          } else if (pendingTimer !== void 0) {
            window.clearTimeout(pendingTimer);
            exposureTimersRef.current.delete(target);
          }
        }
      },
      { threshold: [0, SHOWCASE_EXPOSURE_THRESHOLD] }
    );
    const exposureTargets = [];
    const area = toolbar;
    area.setAttribute("data-home-exposure-key", "showcase-area");
    area.setAttribute("data-home-exposure-kind", "area");
    exposureTargets.push(area);
    for (const tab of toolbar.querySelectorAll("[data-home-media-showcase-primary-tab]")) {
      const primaryId = tab.getAttribute("data-home-media-showcase-primary-tab");
      if (!primaryId) continue;
      tab.setAttribute("data-home-exposure-key", `primary-tab:${primaryId}`);
      tab.setAttribute("data-home-exposure-kind", "primary-tab");
      tab.setAttribute("data-home-primary-tab-id", primaryId);
      exposureTargets.push(tab);
    }
    for (const tab of toolbar.querySelectorAll("[data-home-media-showcase-tab]")) {
      const tabId = tab.getAttribute("data-home-media-showcase-tab");
      if (!tabId) continue;
      tab.setAttribute("data-home-exposure-key", `tab:${tabId}`);
      tab.setAttribute("data-home-exposure-kind", "tab");
      tab.setAttribute("data-home-tab-id", tabId);
      exposureTargets.push(tab);
    }
    const contentRoot = showcase2.querySelector(
      `[data-home-media-showcase-content="${selectedCollectionId}"]`
    );
    if (contentRoot) {
      for (const [index, card] of Array.from(
        contentRoot.querySelectorAll("[data-media-content-id]")
      ).entries()) {
        const contentId = card.getAttribute("data-media-content-id");
        if (!contentId) continue;
        card.setAttribute("data-home-exposure-key", `content:${selectedCollectionId}:${contentId}`);
        card.setAttribute("data-home-exposure-kind", "content");
        card.setAttribute("data-home-tab-id", selectedCollectionId);
        card.setAttribute("data-content-position", String(index + 1));
        exposureTargets.push(card);
      }
    }
    for (const target of exposureTargets) observer.observe(target);
    return () => {
      observer.disconnect();
      for (const target of exposureTargets) {
        const timer = exposureTimersRef.current.get(target);
        if (timer !== void 0) {
          window.clearTimeout(timer);
          exposureTimersRef.current.delete(target);
        }
      }
    };
  }, [
    collectionTabProps,
    effectiveConfigAuthoritative,
    showcasePending,
    defaultCollectionId,
    isZh,
    orderedCollections,
    primaryCategories,
    selectedCollectionId,
    selectedProviderType,
    tabsConfig?.defaultPrimaryId
  ]);
  const handleOpenH3Guide = reactExports.useCallback(() => {
    void openExternalUrl(platform, guideUrls.h3, {
      source: "home.media-showcase.h3-guide"
    });
  }, [platform, guideUrls.h3]);
  const handleUse = reactExports.useCallback(
    async (item, feedbackOrigin) => {
      if (!item.canUseAction) return;
      const contentPosition = collectionForId(selectedCollectionId)?.items.findIndex(
        (collectionItem) => collectionItem.contentId === item.contentId
      ) ?? -1;
      if (item.action.kind !== "project-archive") {
        trackContentClick(
          selectedCollectionId,
          item.contentId,
          "video",
          contentPosition + 1,
          "use_prompt",
          item.videoId
        );
      }
      if (item.action.kind === "query") {
        onQuerySelect?.(item.action.query, item.action.sceneId, feedbackOrigin);
        return;
      }
      if (item.action.kind === "project-archive") {
        if (!onProjectArchiveSelect || projectArchiveActionInFlightRef.current) return;
        trackContentClick(
          selectedCollectionId,
          item.contentId,
          "project",
          contentPosition + 1,
          "import_project",
          item.videoId
        );
        projectArchiveActionInFlightRef.current = true;
        setPendingProjectArchiveItemId(item.id);
        try {
          await onProjectArchiveSelect({
            archiveUrl: item.action.archiveUrl,
            projectName: isZh ? item.action.projectName : item.action.projectNameEn
          });
        } finally {
          projectArchiveActionInFlightRef.current = false;
          setPendingProjectArchiveItemId(null);
        }
        return;
      }
      if (onFeatureSelect) {
        onFeatureSelect();
        return;
      }
      handleOpenH3Guide();
    },
    [
      collectionForId,
      selectedCollectionId,
      trackContentClick,
      onQuerySelect,
      onProjectArchiveSelect,
      isZh,
      onFeatureSelect,
      handleOpenH3Guide
    ]
  );
  const handleCollectionChange = (collectionId) => {
    if (collectionId === selectedCollectionId) return;
    if (!configAuthoritative) nonAuthoritativeUserSelectionRef.current = true;
    trackTabSwitch(collectionId, "user_click", selectedCollectionId);
    const scrollViewport = showcaseRef.current?.closest(".home-below-anchor");
    if (scrollViewport) scrollViewport.scrollTop = 0;
    if (twoLevelEnabled && selectedPrimaryId) {
      setActiveSecondaryByPrimary((current) => ({
        ...current,
        [selectedPrimaryId]: collectionId
      }));
    } else {
      setActiveCollectionId(collectionId);
    }
    const selectingSkillCollection = twoLevelEnabled ? selectedProviderType === "skill-market" : collectionId === SKILL_COLLECTION_ID;
    if (selectingSkillCollection && hasSkillCollection) {
      const nextSource = skillDefinitions.find((definition) => definition.id === collectionId)?.query.source;
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest?.(nextSource ?? selectedSkillSource);
    }
  };
  const handlePrimaryChange = (primaryId) => {
    if (primaryId === selectedPrimaryId) return;
    const nextPrimary = primaryCategories.find((category) => category.id === primaryId);
    if (!nextPrimary) return;
    const scrollViewport = showcaseRef.current?.closest(".home-below-anchor");
    if (scrollViewport) scrollViewport.scrollTop = 0;
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_SWITCH, {
      page: SHOWCASE_PAGE,
      tab_id: nextPrimary.id,
      tab_name: isZh ? nextPrimary.label : nextPrimary.labelEn,
      tab_order: primaryCategories.findIndex((category) => category.id === nextPrimary.id) + 1,
      is_default_tab: nextPrimary.id === tabsConfig?.defaultPrimaryId,
      tab_level: "primary",
      primary_tab_id: nextPrimary.id,
      primary_tab_name: isZh ? nextPrimary.label : nextPrimary.labelEn,
      primary_tab_order: primaryCategories.findIndex((category) => category.id === nextPrimary.id) + 1,
      provider_type: nextPrimary.provider.type,
      ...selectedPrimaryId ? { from_tab_id: selectedPrimaryId } : {},
      switch_source: "user_click"
    });
    initialSkillRequestRef.current = false;
    defaultSwitchTrackedRef.current = false;
    setActivePrimaryId(primaryId);
    if (nextPrimary.provider.type === "skill-market") {
      const nextDefinitions = resolveSkillDefinitions(nextPrimary.provider, skillConfig);
      const rememberedSecondaryId = activeSecondaryByPrimary[nextPrimary.id];
      const configuredSecondaryId = (skillConfig?.enabled ? skillConfig.defaultSecondaryId : void 0) ?? nextPrimary.defaultSecondaryId;
      const nextDefinition = nextDefinitions.find((definition) => definition.id === rememberedSecondaryId) ?? nextDefinitions.find((definition) => definition.id === configuredSecondaryId) ?? nextDefinitions[0];
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest?.(nextDefinition?.query.source ?? nextPrimary.provider.source);
    }
  };
  const handleFullscreen = reactExports.useCallback(
    (item, initialPlaybackTime, onPlaybackTimeCommit) => {
      const contentPosition = collectionForId(selectedCollectionId)?.items.findIndex(
        (collectionItem) => collectionItem.contentId === item.contentId
      ) ?? -1;
      trackContentClick(
        selectedCollectionId,
        item.contentId,
        selectedProviderType === "project-showcase" ? "project" : "video",
        contentPosition + 1,
        "fullscreen",
        item.videoId
      );
      setPreviewSession({ item, initialPlaybackTime, onPlaybackTimeCommit });
    },
    [collectionForId, selectedCollectionId, selectedProviderType, trackContentClick]
  );
  const fullscreenVideoUrl = previewSession?.item.videoUrl;
  const fullscreenActions = fullscreenVideoUrl ? [
    {
      id: "home-media-showcase-lightbox-use",
      label: isZh ? previewSession.item.actionLabel ?? t("home.mediaShowcase.use") : previewSession.item.actionLabelEn ?? t("home.mediaShowcase.use"),
      icon: pendingProjectArchiveItemId === previewSession.item.id ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin", "aria-hidden": true }) : previewSession.item.action.kind === "project-archive" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectImportIcon, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UsePromptIcon, { size: 14 }),
      className: "h-9 min-w-[10rem] px-5 text-[13px] font-medium",
      disabled: !previewSession.item.canUseAction || pendingProjectArchiveItemId === previewSession.item.id,
      busy: pendingProjectArchiveItemId === previewSession.item.id,
      closeOnClick: previewSession.item.action.kind !== "project-archive",
      onClick: (event) => {
        event.stopPropagation();
        const item = previewSession.item;
        if (!item.canUseAction || pendingProjectArchiveItemId === item.id) return;
        const feedbackOrigin = captureHomeUsePromptTransferOrigin(event.currentTarget);
        void handleUse(item, feedbackOrigin);
      }
    }
  ] : [];
  reactExports.useEffect(() => {
    if (!randomInspirationItem) return;
    setRandomInspirationItem(null);
    void handleUse(randomInspirationItem);
  }, [randomInspirationItem, handleUse]);
  const inspirationPrimary = configuredPrimaryCategories.find(
    (category) => category.provider.type === "quick-start-v2"
  );
  const randomInspirationBridge = /* @__PURE__ */ jsxRuntimeExports.jsx(
    HomeRandomInspirationBridge,
    {
      collections: inspirationCollections,
      loading: configLoading,
      enabled: randomInspirationEnabled && Boolean(onQuerySelect) && (!tabsConfig || tabsConfig.enabled && Boolean(inspirationPrimary)),
      onSelect: (item, collectionId) => {
        if (inspirationPrimary) {
          setActivePrimaryId(inspirationPrimary.id);
          setActiveSecondaryByPrimary((current) => ({
            ...current,
            [inspirationPrimary.id]: collectionId
          }));
        } else {
          setActiveCollectionId(collectionId);
        }
        setRandomInspirationItem(item);
      }
    }
  );
  if (tabsConfig && !tabsConfig.enabled) return randomInspirationBridge;
  if (!configLoading && (twoLevelConfigured && !twoLevelEnabled || !twoLevelConfigured && orderedCollections.length === 0))
    return randomInspirationBridge;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      ref: showcaseRef,
      className: "home-media-showcase-block w-full",
      "aria-label": t("home.mediaShowcase.title"),
      "aria-busy": configLoading || projectConfigLoading || skillConfigLoading || void 0,
      "data-action-ui-id": "home-media-showcase",
      "data-home-showcase-two-level": twoLevelEnabled || void 0,
      "data-home-showcase-primary-id": selectedPrimaryId,
      "data-home-showcase-portrait-mock": portraitMockEnabled || void 0,
      "data-video-orientation": collectionForId(selectedCollectionId)?.videoOrientation ?? "landscape",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: selectedCollectionId, onValueChange: handleCollectionChange, className: "gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              ref: showcaseToolbarRef,
              className: "home-media-showcase-toolbar",
              "data-two-level": twoLevelEnabled || void 0,
              children: [
                twoLevelEnabled ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-media-showcase-primary-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Tabs,
                  {
                    value: selectedPrimaryId,
                    onValueChange: handlePrimaryChange,
                    className: "min-w-0",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsList,
                      {
                        "aria-label": t("home.mediaShowcase.contentTypes", "Content types"),
                        className: "scrollbar-none relative w-max max-w-full self-start justify-start gap-6 overflow-x-auto rounded-none bg-transparent p-0",
                        children: [
                          primaryCategories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TabsTrigger,
                            {
                              value: category.id,
                              "data-action-ui-id": `home-media-showcase-primary-tab-${category.id}`,
                              "data-home-media-showcase-primary-tab": category.id,
                              className: "home-media-showcase-primary-tab h-10 rounded-none px-2 py-0 text-sm font-medium text-foreground/60 transition-colors duration-150 hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none",
                              children: isZh ? category.label : category.labelEn
                            },
                            category.id
                          )),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TabsIndicator,
                            {
                              "aria-hidden": "true",
                              className: "home-media-showcase-primary-tab-indicator"
                            }
                          )
                        ]
                      }
                    )
                  }
                ) }) : null,
                showSecondaryTabs ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-media-showcase-secondary-row", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabsList,
                  {
                    "aria-label": t("home.mediaShowcase.categories"),
                    className: "scrollbar-none w-full min-w-0 justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0",
                    children: orderedCollections.map((collection) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsTrigger,
                      {
                        value: collection.id,
                        "data-action-ui-id": `home-media-showcase-tab-${collection.id}`,
                        "data-home-media-showcase-tab": collection.id,
                        className: "group home-media-showcase-secondary-tab h-8 gap-1.5 rounded-full border border-border bg-transparent px-4 py-0 text-[13px] font-normal tracking-[0.005em] text-foreground/70 shadow-none transition-colors duration-150 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 data-[active]:border-transparent data-[active]:bg-[var(--home-media-showcase-secondary-tab-active-bg)] data-[active]:font-medium data-[active]:tracking-normal data-[active]:text-foreground data-[active]:shadow-none",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(StableTabLabel, { label: isZh ? collection.label : collection.labelEn }),
                          collection.badge ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              className: "inline-flex h-4 items-center rounded-full border border-brand-accent bg-transparent px-1.5 text-[10px] font-medium leading-none text-brand-accent uppercase transition-colors duration-150 group-data-[active]:bg-brand-accent group-data-[active]:text-brand-accent-foreground",
                              "data-home-media-showcase-tab-badge": "true",
                              children: isZh ? collection.badge.label : collection.badge.labelEn
                            }
                          ) : null
                        ]
                      },
                      collection.id
                    ))
                  }
                ) }) : null
              ]
            }
          ),
          orderedCollections.filter((collection) => !showSkillTab || collection.id !== skillCollectionId).map((collection) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            TabsContent,
            {
              value: collection.id,
              className: "min-w-0",
              "data-home-media-showcase-content": collection.id,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "home-media-showcase-content-layer",
                  "data-home-media-showcase-content-layer": "true",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "home-media-showcase-grid",
                      "data-video-orientation": collection.videoOrientation,
                      children: [
                        isShowcaseLoading && collection.id === selectedCollectionId ? SHOWCASE_LOADING_PLACEHOLDER_IDS.map((placeholderId) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "article",
                          {
                            className: "home-media-showcase-card home-media-showcase-loading-surface relative min-w-0 overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]",
                            "data-home-media-showcase-placeholder": "true",
                            "aria-hidden": "true",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "div",
                                {
                                  className: "home-media-showcase-media-frame relative rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted",
                                  "data-video-orientation": collection.videoOrientation
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 px-3 py-3", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-2/3 rounded bg-muted" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-full rounded bg-muted" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-1/3 rounded bg-muted" })
                              ] })
                            ]
                          },
                          placeholderId
                        )) : null,
                        !isShowcaseLoading ? collection.items.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          MediaShowcaseCard,
                          {
                            item,
                            isZh,
                            useLabel: t("home.mediaShowcase.use"),
                            fullscreenLabel: t("canvas.fullscreenPreview"),
                            durationLabel: t("assetPreview.meta.duration"),
                            muteLabel: t("assetPreview.mute"),
                            unmuteLabel: t("assetPreview.unmute"),
                            videoOrientation: collection.videoOrientation,
                            posterLoading: index < (collection.videoOrientation === "portrait" ? PORTRAIT_EAGER_POSTER_COUNT : LANDSCAPE_EAGER_POSTER_COUNT) ? "eager" : "lazy",
                            dataContentId: item.contentId,
                            dataVideoId: item.videoId,
                            actionPending: item.action.kind === "project-archive" && pendingProjectArchiveItemId === item.id,
                            onUse: (selectedItem, feedbackOrigin) => {
                              void handleUse(selectedItem, feedbackOrigin);
                            },
                            onFullscreen: handleFullscreen
                          },
                          `${collection.id}:${item.id}`
                        )) : null
                      ]
                    }
                  )
                },
                selectedPrimaryId
              )
            },
            collection.id
          )),
          showSkillTab ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            TabsContent,
            {
              value: skillCollectionId,
              className: "min-w-0",
              "data-action-ui-id": "home-media-showcase-skill-content",
              "data-home-media-showcase-content": skillCollectionId,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "home-media-showcase-content-layer",
                  "data-home-media-showcase-content-layer": "true",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "home-media-showcase-grid",
                      "data-video-orientation": skillCollection.videoOrientation,
                      "aria-busy": featuredSkillsLoading || void 0,
                      "aria-live": "polite",
                      children: [
                        visibleFeaturedSkills.length > 0 ? visibleFeaturedSkills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          MediaShowcaseSkillCard,
                          {
                            skill,
                            isZh,
                            useLabel: t("home.mediaShowcase.useSkill"),
                            disabled: featuredSkillInstallingName !== null,
                            installing: featuredSkillInstallingName === skill.name,
                            installProgress: featuredSkillInstallingName === skill.name ? featuredSkillInstallingProgress : null,
                            installingLabel: t("skills.market.installing"),
                            videoOrientation: skillCollection.videoOrientation,
                            dataContentId: `skill:${skill.name}`,
                            onUse: () => {
                              trackContentClick(
                                skillCollectionId,
                                `skill:${skill.name}`,
                                "skill",
                                visibleFeaturedSkills.findIndex((item) => item.name === skill.name) + 1,
                                "use_skill"
                              );
                              onFeaturedSkillSelect?.(skill);
                            }
                          },
                          skill.name
                        )) : null,
                        featuredSkillsLoading && visibleFeaturedSkills.length === 0 ? SKILL_LOADING_PLACEHOLDER_IDS.map((placeholderId) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "article",
                          {
                            className: "home-media-showcase-card min-w-0 overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]",
                            "data-home-media-skill-placeholder": "true",
                            "aria-hidden": "true",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "div",
                                {
                                  className: "home-media-showcase-media-frame relative animate-pulse rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted motion-reduce:animate-none",
                                  "data-video-orientation": skillCollection.videoOrientation
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 px-3 py-3", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" })
                              ] })
                            ]
                          },
                          placeholderId
                        )) : null,
                        featuredSkillsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: t("skills.market.loading") }) : null,
                        !featuredSkillsLoading && visibleFeaturedSkills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            className: "col-span-full flex min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card px-6 py-10 text-center [border-width:var(--divider-width)]",
                            "data-action-ui-id": "home-media-showcase-skill-state",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: featuredSkillsError ? t("home.mediaShowcase.skillLoadError") : t("home.mediaShowcase.skillEmpty") }),
                              onFeaturedSkillsRequest ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                Button,
                                {
                                  type: "button",
                                  variant: "outline",
                                  size: "sm",
                                  className: "gap-1.5",
                                  onClick: () => onFeaturedSkillsRequest(selectedSkillSource),
                                  "data-action-ui-id": featuredSkillsError ? "home-media-showcase-skill-retry" : "home-media-showcase-skill-request",
                                  children: [
                                    featuredSkillsError ? /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14, "aria-hidden": true }),
                                    featuredSkillsError ? t("common.retry") : t("common.refresh")
                                  ]
                                }
                              ) : null
                            ]
                          }
                        ) : null
                      ]
                    }
                  )
                },
                selectedPrimaryId
              )
            }
          ) : null
        ] }),
        randomInspirationBridge,
        previewSession?.item.videoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          VideoLightbox,
          {
            src: previewSession.item.videoUrl,
            ariaLabel: isZh ? previewSession.item.title : previewSession.item.titleEn,
            showShadow: false,
            initialPlaybackTime: previewSession.initialPlaybackTime,
            onPlaybackTimeCommit: previewSession.onPlaybackTimeCommit,
            actions: fullscreenActions,
            onClose: () => setPreviewSession(null)
          }
        ) : null
      ]
    }
  );
}
function snapshotSelectedMediaModels(models) {
  if (!models) return void 0;
  return {
    ...models.image ? { image: [...models.image] } : {},
    ...models.video ? { video: [...models.video] } : {},
    ...models.audio ? { audio: [...models.audio] } : {}
  };
}
const SCENE_ATTACHMENT_SOURCE = "scene-query";
const HOME_SHOWCASE_FEATURED_SKILL_SOURCE = "official-featured";
function attachmentToMentionAttrs(att, label) {
  const kind = att.type === "image" || att.type === "video" || att.type === "audio" ? att.type : "other";
  const previewUrl = att.type === "image" && att.assetUrl ? att.assetUrl : null;
  const mediaUrl = (att.type === "video" || att.type === "audio") && att.assetUrl ? att.assetUrl : null;
  const isFolder = att.type === "folder";
  return {
    path: att.name,
    name: label,
    modelName: null,
    mentionName: null,
    kind,
    markerStyle: "bracket",
    mediaType: null,
    thumbUrl: previewUrl,
    previewUrl,
    mediaUrl,
    isFolder,
    folderId: isFolder ? `folder:${att.name}` : null,
    folderResolvedPath: null
  };
}
function buildSceneSegments(rawText, attachments) {
  const lookup = /* @__PURE__ */ new Map();
  for (const a of attachments) {
    lookup.set(a.name, a);
    if (a.displayNames) {
      for (const alias of a.displayNames) lookup.set(alias, a);
    }
  }
  const parts = rawText.split(/(\[[^\]]+\])/g);
  const segments = [];
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^\[(.+)\]$/);
    if (m) {
      const inner = m[1];
      const att = lookup.get(inner);
      if (att) {
        segments.push({ type: "mentionRef", attrs: attachmentToMentionAttrs(att, inner) });
        continue;
      }
    }
    segments.push({ type: "text", text: part });
  }
  return segments;
}
function marketSkillToReadySkill(skill) {
  return {
    ...skill,
    enabled: true,
    source: "installed"
  };
}
function HomeContent() {
  const { t, i18n } = useTranslation();
  const { scrollContainerRef, composerAnchorRef, composerLayerRef } = useHomeComposerMotion();
  const platform = usePlatform();
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const { config: quickStartConfig, source: quickStartConfigSource } = useHomeQuickStartConfig();
  const { config: tabsShowcaseConfig, source: tabsShowcaseConfigSource } = useHomeTabsShowcaseConfig();
  const hasProjectShowcaseProvider = tabsShowcaseConfig.primaryCategories.some(
    (category) => category.provider.type === "project-showcase"
  );
  const hasSkillShowcaseProvider = tabsShowcaseConfig.primaryCategories.some(
    (category) => category.provider.type === "skill-market"
  );
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
  const featuredCategory = reactExports.useMemo(
    () => quickStartCategories.find(
      (category) => category.kind === "featured-skills"
    ) ?? null,
    [quickStartCategories]
  );
  const showcaseSkillSource = tabsShowcaseConfig.primaryCategories.find(
    (category) => category.provider.type === "skill-market"
  )?.provider;
  const defaultFeaturedSkillsSource = skillShowcaseConfig.categories[0]?.query.source ?? (showcaseSkillSource?.type === "skill-market" ? showcaseSkillSource.source : void 0) ?? featuredCategory?.marketSource ?? HOME_SHOWCASE_FEATURED_SKILL_SOURCE;
  const availableShowcaseSkillSources = reactExports.useMemo(
    () => /* @__PURE__ */ new Set([
      ...skillShowcaseConfig.categories.map((category) => category.query.source),
      ...tabsShowcaseConfig.primaryCategories.flatMap(
        (category) => category.provider.type === "skill-market" ? [category.provider.source] : []
      )
    ]),
    [skillShowcaseConfig.categories, tabsShowcaseConfig.primaryCategories]
  );
  const [requestedShowcaseSkillSource, setRequestedShowcaseSkillSource] = reactExports.useState(
    null
  );
  const featuredSkillsSource = requestedShowcaseSkillSource && availableShowcaseSkillSources.has(requestedShowcaseSkillSource) ? requestedShowcaseSkillSource : defaultFeaturedSkillsSource;
  quickStartCategories.length > 0;
  const { isShow: isPromotionActive } = usePromotion();
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
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const { ensureSkillReady } = useEnsureSkillReady({ preload: true });
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
  const invalidateSceneSelection = reactExports.useCallback(
    (clearCommittedAttachments) => {
      sceneSelectionGuard.invalidate();
      if (clearCommittedAttachments) {
        inputRef.current?.clearAttachments({ source: SCENE_ATTACHMENT_SOURCE });
      }
      setSceneAttachmentsLoading(false);
    },
    [sceneSelectionGuard]
  );
  const [config, , setConfigAsync] = useStorage("global.config");
  const [composerModelOverrides, setComposerModelOverrides] = reactExports.useState({});
  const handleRememberDefaults = reactExports.useCallback(
    (selection) => setConfigAsync({
      ...selection.modelId !== void 0 ? { homeAgentModelId: selection.modelId } : {},
      ...selection.media !== void 0 ? { homeSelectedMediaModels: selection.media } : {}
    }),
    [setConfigAsync]
  );
  const modelDefaults = useModelDefaults({
    defaultModelId: config.homeAgentModelId,
    defaultSelectedMediaModels: config.homeSelectedMediaModels,
    onRememberDefaults: handleRememberDefaults
  });
  const { rememberDefaults } = modelDefaults;
  const homeSelectedMediaModels = composerModelOverrides.media ?? modelDefaults.defaultSelectedMediaModels;
  const activeCustomModel = useActiveCustomModel();
  const homeModelId = resolveActiveModelId(
    composerModelOverrides.modelId ?? modelDefaults.defaultModelId,
    activeCustomModel.data
  ) ?? void 0;
  const astraSendGate = useAstraSendGate(homeModelId);
  const handleSelectedMediaModelsChange = reactExports.useCallback(
    (next, rememberForNewChats = false) => {
      setComposerModelOverrides((previous) => ({ ...previous, media: next }));
      if (rememberForNewChats) void rememberDefaults({ media: next });
    },
    [rememberDefaults]
  );
  const handleModelSelectionChange = reactExports.useCallback(
    (selection, rememberForNewChats = true) => {
      if (composerSendPreparingRef.current) return;
      if (sceneAttachmentsLoading) invalidateSceneSelection(false);
      setComposerModelOverrides((previous) => ({ ...previous, ...selection }));
      if (rememberForNewChats) void rememberDefaults(selection);
    },
    [rememberDefaults, invalidateSceneSelection, sceneAttachmentsLoading]
  );
  const { loadUserMemory: rememberedMemory } = resolveNewProjectPreferences(config);
  const [workspaceFolder, setWorkspaceFolder] = useNewProjectFolder();
  const [selectedProjectId, setSelectedProjectId] = reactExports.useState(void 0);
  const composerSendSnapshotRef = reactExports.useRef(null);
  const handleComposerSendPreparingChange = reactExports.useCallback(
    (preparing) => {
      if (!canApplyHomeComposerMutation(mountedRef.current, homeHandoffCommitRef.current)) return;
      composerSendPreparingRef.current = preparing;
      setComposerSendPreparing(preparing);
      if (preparing) {
        composerSendSnapshotRef.current = {
          workspaceFolder,
          selectedProjectId,
          modelId: homeModelId,
          selectedMediaModels: homeSelectedMediaModels ? {
            ...homeSelectedMediaModels.image ? { image: [...homeSelectedMediaModels.image] } : {},
            ...homeSelectedMediaModels.video ? { video: [...homeSelectedMediaModels.video] } : {},
            ...homeSelectedMediaModels.audio ? { audio: [...homeSelectedMediaModels.audio] } : {}
          } : void 0,
          fillSource: lastFillSourceRef.current
        };
      } else if (!homeSubmitInFlightRef.current) {
        composerSendSnapshotRef.current = null;
      }
    },
    [homeModelId, homeSelectedMediaModels, selectedProjectId, workspaceFolder]
  );
  const { ensureGranted: ensureFolderGranted, dialog: folderPermissionDialog } = useFolderPermissionGate();
  const { addWorkspaceToProject } = useProjectActions();
  const handlePickWorkspaceFolder = reactExports.useCallback(async () => {
    if (composerSendPreparingRef.current) return;
    const showOpenDialog = platform.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
      title: t("workspace.newProject.selectFolderTitle", "选择工作区文件夹"),
      ...workspaceFolder ? { defaultPath: workspaceFolder } : {}
    }).catch(() => void 0);
    const pickedPath = picked?.[0];
    if (!pickedPath || composerSendPreparingRef.current) return;
    workspaceLog.info("home: folder-picked", { source: "home-input" });
    const granted = await ensureFolderGranted(pickedPath);
    if (!granted || composerSendPreparingRef.current) {
      workspaceLog.info("home: folder-consent-denied", { source: "home-input" });
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
  const draftSelectedMediaModelsRef = reactExports.useRef(
    snapshotSelectedMediaModels(homeSelectedMediaModels)
  );
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
      ...draftSelectedMediaModelsRef.current ? { selectedMediaModels: draftSelectedMediaModelsRef.current } : {},
      ...draftFillSourceRef.current ? { homeFillSource: draftFillSourceRef.current } : {}
    });
  }, [draftController]);
  reactExports.useEffect(() => {
    draftSelectedMediaModelsRef.current = snapshotSelectedMediaModels(homeSelectedMediaModels);
    if (draftTextRef.current || draftAttachmentsRef.current.length > 0) persistHomeDraft();
  }, [homeSelectedMediaModels, persistHomeDraft]);
  const handleInputChange = reactExports.useCallback(
    (text, editorDoc) => {
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
    },
    [invalidateSceneSelection, persistHomeDraft, sceneAttachmentsLoading]
  );
  const handleAttachmentsChange = reactExports.useCallback(
    (attachments) => {
      if (!canApplyHomeComposerMutation(mountedRef.current, homeHandoffCommitRef.current)) return;
      if (attachments.length === 0 && draftAttachmentsRef.current.length === 0 && inputTextRef.current.length === 0) {
        setHasInputContent(false);
        return;
      }
      if (!homeHandoffCommitRef.current) invalidatePendingHomeHandoff();
      draftAttachmentsRef.current = [...attachments];
      setHasInputContent(inputTextRef.current.length > 0 || attachments.length > 0);
      persistHomeDraft();
    },
    [persistHomeDraft]
  );
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
          draftSelectedMediaModelsRef.current = snapshotSelectedMediaModels(
            restored.draft.selectedMediaModels
          );
          handleSelectedMediaModelsChange(restored.draft.selectedMediaModels, false);
        }
        if (restored.draft.homeFillSource) {
          draftFillSourceRef.current = restored.draft.homeFillSource;
          lastFillSourceRef.current = restored.draft.homeFillSource;
        }
        if (restored.droppedCount > 0) {
          dedupedToast.warning(
            t(
              "chat.draft.attachmentsDropped",
              "Some attachments could not be restored — please re-add them."
            )
          );
        }
      }
    }
    return () => draftController.dispose();
  }, [draftController, handleSelectedMediaModelsChange, t]);
  const scenePanel = useScenePanel(quickStartCategories);
  const [featuredSkillsOpen, setFeaturedSkillsOpen] = reactExports.useState(false);
  const [featuredSkillInstallingName, setFeaturedSkillInstallingName] = reactExports.useState(
    null
  );
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
  const handleShowcaseSkillsRequest = reactExports.useCallback(
    (source) => {
      if (composerSendPreparingRef.current) return;
      setShowcaseSkillsRequested(true);
      if (source && source !== featuredSkillsSource) {
        setRequestedShowcaseSkillSource(source);
        return;
      }
      requestFeaturedSkills();
    },
    [featuredSkillsSource, requestFeaturedSkills]
  );
  reactExports.useEffect(() => {
    const source = featuredSkillsSource;
    if (featuredSkillsSourceRef.current === source) return;
    featuredSkillsSourceRef.current = source;
    featuredSkillsFetchedRef.current = false;
    if (source && (featuredSkillsOpen || showcaseSkillsRequested)) {
      featuredSkillsFetchedRef.current = true;
      void featuredSkillsMarket.fetchList();
    }
  }, [
    featuredSkillsMarket.fetchList,
    featuredSkillsOpen,
    featuredSkillsSource,
    showcaseSkillsRequested
  ]);
  reactExports.useEffect(() => {
    if (!featuredCategory && featuredSkillsOpen) setFeaturedSkillsOpen(false);
  }, [featuredCategory, featuredSkillsOpen]);
  reactExports.useCallback(
    (sceneId) => {
      if (composerSendPreparingRef.current) return;
      setFeaturedSkillsOpen(false);
      scenePanel.selectScene(sceneId);
    },
    [scenePanel.selectScene]
  );
  const { data: rawPopup } = usePopup();
  const featurePopup = reactExports.useMemo(() => {
    const normalized = normalizePopup(rawPopup);
    return normalized?.popup_type === PopupType.POPUP_TYPE_FEATURE ? normalized : null;
  }, [rawPopup]);
  const { execute: executeFeatureAction } = useFeaturePopupAction(featurePopup, {
    source: "home.h3-playground"
  });
  const { runImportFromUrl } = useProjectArchiveActions();
  const handleFeatureActionSelect = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    void executeFeatureAction();
  }, [executeFeatureAction]);
  const handleProjectArchiveSelect = reactExports.useCallback(
    ({ archiveUrl, projectName }) => {
      if (composerSendPreparingRef.current) return void 0;
      return runImportFromUrl(archiveUrl, projectName);
    },
    [runImportFromUrl]
  );
  const activeSceneLabel = scenePanel.activeScene ? t(
    `home.scene.${scenePanel.activeScene.id}`,
    i18n.language.startsWith("zh") ? scenePanel.activeScene.name : scenePanel.activeScene.nameEn
  ) : void 0;
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
    trackEvent(TRACK_EVENTS.HOME_TUTORIAL_CLICK, { locale: i18n.language });
    void openExternalUrl(platform, getTutorialUrlByLocale(i18n.language), {
      source: "home.tutorial"
    });
  }, [platform, i18n.language]);
  const handleFolderChipClick = reactExports.useCallback(
    async ({ folderId, currentPath }) => {
      if (composerSendPreparingRef.current) return;
      const showOpenDialog = platform.fs.showOpenDialog;
      if (!showOpenDialog) return;
      const picked = await showOpenDialog({
        directory: true,
        multiple: false,
        title: t("home.selectFolderTitle", "选择文件夹"),
        ...currentPath ? { defaultPath: currentPath } : {}
      }).catch(() => void 0);
      const folderPath = picked?.[0];
      if (!folderPath || composerSendPreparingRef.current) return;
      inputRef.current?.resolveFolderChip(folderId, folderPath);
    },
    [platform.fs, t]
  );
  const handleSend = reactExports.useCallback(
    async function submitHome(text, filePaths, _canvasNodeAttachments, entityRefs, _pluginNodeAttachments, allowDataDirectoryFallback = false) {
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
        ...homeSelectedMediaModels.image ? { image: [...homeSelectedMediaModels.image] } : {},
        ...homeSelectedMediaModels.video ? { video: [...homeSelectedMediaModels.video] } : {},
        ...homeSelectedMediaModels.audio ? { audio: [...homeSelectedMediaModels.audio] } : {}
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
          }).catch((err) => {
            createError = err;
            workspaceLog.error("home: create-workspace-error", { error: err });
            return null;
          });
          if (!result) {
            dedupedToast.error(
              isWorkspaceFolderMissingError(createError) ? t("home.workspaceFolderMissing", {
                defaultValue: "本地项目文件夹不存在，可能已被移动或删除。请重新选择文件夹，输入内容已保留。"
              }) : t("home.workspaceOpenFailed", {
                defaultValue: "创建工作区失败，输入内容已保留，请重试。"
              })
            );
            return false;
          }
          const openedRuntime = workspaceRuntimeFromOpenResult(result);
          if (!openedRuntime) {
            toastWorkspaceOpenResult(result, t, {
              onTemporaryDefault: result.kind === "storage_unavailable" && result.allowTemporaryDefault ? () => void submitHome(
                text,
                filePaths,
                _canvasNodeAttachments,
                entityRefs,
                _pluginNodeAttachments,
                true
              ) : void 0
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
        workspaceLog.error("home: submit-workspace-error", { error });
        if (!handoffAccepted) {
          dedupedToast.error(
            t("home.workspaceOpenFailed", {
              defaultValue: "创建工作区失败，输入内容已保留，请重试。"
            })
          );
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
    },
    [
      addWorkspaceToProject,
      gatewayReady,
      homeModelId,
      homeSelectedMediaModels,
      loginGuard,
      navigateToWorkspace,
      rememberedMemory,
      invalidateSceneSelection,
      sceneAttachmentsLoading,
      selectedProjectId,
      t,
      workspaceFolder
    ]
  );
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
    navigate({ to: "/skills" });
  }, [navigate]);
  const handleCreateSkill = reactExports.useCallback(() => {
    if (composerSendPreparingRef.current) return;
    invalidateSceneSelection(true);
    inputRef.current?.selectSkillByName("skill-creator");
  }, [invalidateSceneSelection]);
  const handleQuerySelect = reactExports.useCallback(
    async (query, sourceSceneId, feedbackOrigin, prefill) => {
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
      const inlineAttachments = query.attachments.filter((attachment) => !attachment.assetUrl);
      const segments = prefill ? [
        { type: "mentionRef", attrs: prefill.mention },
        { type: "text", text: ` ${rawText}` }
      ] : [
        ...target.connector ? [
          {
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
          },
          { type: "text", text: " " }
        ] : [],
        ...buildSceneSegments(rawText, inlineAttachments)
      ];
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
          const names = prepared.failedAttachments.map((attachment) => attachment.name).join("、");
          dedupedToast.warning(
            t("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh") ? "无法加载附件 {{names}}，已保留当前输入" : "Failed to load attachment {{names}}; your current input was preserved",
              names
            })
          );
          return false;
        }
        const messageInput = inputRef.current;
        if (!messageInput) return false;
        const staged = await messageInput.prepareSourceAttachmentReplacement(
          prepared.files,
          SCENE_ATTACHMENT_SOURCE
        );
        if (!isCurrent()) {
          if (staged.status === "ready") {
            await messageInput.rollbackPreparedSourceAttachments(staged.batch);
          }
          return false;
        }
        if (staged.status !== "ready") {
          dedupedToast.warning(
            t("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh") ? staged.status === "capacity-exceeded" ? "附件数量已达上限，已保留当前输入" : "无法准备场景附件，已保留当前输入" : staged.status === "capacity-exceeded" ? "Attachment limit reached; your current input was preserved" : "Failed to prepare scene attachments; your current input was preserved",
              names: query.attachments.map((attachment) => attachment.name).join("、")
            })
          );
          return false;
        }
        const nextSelectedMediaModels = query.models ? {
          ...snapshotSelectedMediaModels(homeSelectedMediaModels) ?? {},
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
          beforePublish: (nextAttachments) => {
            if (!isCurrent()) return false;
            const persisted = draftController.setNow(
              HOME_DRAFT_SESSION_KEY,
              {
                text: draftText,
                attachments: [...nextAttachments],
                ...nextSelectedMediaModels ? { selectedMediaModels: nextSelectedMediaModels } : {},
                homeFillSource: "home_scene_query"
              },
              { requireDurable: true }
            );
            if (!persisted) {
              dedupedToast.error(
                t("home.scene.draftPersistFailed", {
                  defaultValue: i18n.language.startsWith("zh") ? "无法安全保存场景输入，已保留当前内容" : "Could not safely save this scene; your current input was preserved"
                })
              );
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
          const persisted = await setConfigAsync(
            (current) => isCurrent() ? {
              ...current,
              homeAgentModelId: query.agentModelId,
              ...nextSelectedMediaModels ? { homeSelectedMediaModels: nextSelectedMediaModels } : {}
            } : current
          );
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
          workspaceLog.warn("home: scene-selection-prepare-error", { error });
          dedupedToast.warning(
            t("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh") ? "无法准备场景内容，已保留当前输入" : "Failed to prepare scene content; your current input was preserved",
              names: query.attachments.map((attachment) => attachment.name).join("、")
            })
          );
        }
      } finally {
        if (sceneSelectionGuard.complete(transaction)) {
          setSceneAttachmentsLoading(false);
        }
      }
      return false;
    },
    [
      composerLayerRef,
      draftController,
      ensureSkillReady,
      handleSelectedMediaModelsChange,
      homeSelectedMediaModels,
      loginGuard,
      sceneSelectionGuard,
      setConfigAsync,
      t,
      i18n.language,
      scenePanel.activeSceneId
    ]
  );
  const handlePromptPrefill = reactExports.useCallback(
    (prompt, options) => handleQuerySelect(
      {
        id: "popup-prefill",
        label: "",
        labelEn: "",
        queryCn: prompt,
        queryEn: prompt,
        attachments: []
      },
      void 0,
      void 0,
      options
    ),
    [handleQuerySelect]
  );
  reactExports.useEffect(
    () => () => {
      sceneSelectionGuard.invalidate();
    },
    [sceneSelectionGuard]
  );
  const handleFeaturedSkillSelect = reactExports.useCallback(
    async (skill) => {
      if (composerSendPreparingRef.current) return;
      if (!loginGuard()) return;
      const selectionSource = featuredSkillsSource;
      const preset = featuredCategory?.skills.find((candidate) => candidate.name === skill.name);
      if (featuredSkillInstallingRef.current) return;
      const transaction = sceneSelectionGuard.begin();
      setSceneAttachmentsLoading(true);
      featuredSkillInstallingRef.current = skill.name;
      setFeaturedSkillInstallingName(skill.name);
      setFeaturedSkillInstallingProgress(0.08);
      try {
        if (!await ensureSkillReady(skill.name, (progress) => {
          setFeaturedSkillInstallingProgress(progress);
        }))
          return;
        if (featuredSkillsSourceRef.current !== selectionSource || !sceneSelectionGuard.isCurrent(transaction))
          return;
        draftFillSourceRef.current = void 0;
        inputRef.current?.clearAttachments({ source: SCENE_ATTACHMENT_SOURCE });
        inputRef.current?.selectSkillDirect(
          marketSkillToReadySkill(skill),
          resolveHomeFeaturedSkillPrompt(skill, preset, i18n.language.startsWith("zh"))
        );
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
    },
    [
      ensureSkillReady,
      featuredCategory,
      featuredSkillsSource,
      i18n.language,
      loginGuard,
      sceneSelectionGuard
    ]
  );
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
  const handleHomeGridPointerMove = reactExports.useCallback((event) => {
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
      const { grid, clientX, clientY } = pending;
      const rect = grid.getBoundingClientRect();
      grid.style.setProperty("--home-grid-pointer-x", `${clientX - rect.left + grid.scrollLeft}px`);
      grid.style.setProperty("--home-grid-pointer-y", `${clientY - rect.top + grid.scrollTop}px`);
    });
  }, []);
  reactExports.useEffect(
    () => () => {
      if (homeGridFrameRef.current !== null) {
        window.cancelAnimationFrame(homeGridFrameRef.current);
        homeGridFrameRef.current = null;
      }
      homeGridPointerRef.current = null;
    },
    []
  );
  const homeComposer = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    isPromotionActive ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PromotionBadge,
      {
        onClick: () => {
          trackEvent(TRACK_EVENTS.HOME_PROMOTION_CLICK, {});
          promotionDialog.triggerManually();
        },
        className: "home-composer-promotion absolute bottom-full right-0 mb-0.5 z-20"
      }
    ) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MessageInput,
      {
        ref: inputRef,
        pageContext: "home",
        onSend: handleSend,
        onSendPreparingChange: handleComposerSendPreparingChange,
        sendDisabled: !gatewayReady,
        busy: homeSubmitting || composerSendPreparing || sceneAttachmentsLoading,
        placeholderBusy: sceneAttachmentsLoading ? t("home.scene.preparingInput") : void 0,
        onFolderChipClick: handleFolderChipClick,
        onInputChange: handleInputChange,
        showCompactPromptPreview: true,
        onAttachmentsChange: handleAttachmentsChange,
        pendingInput: restoredDraftText,
        pendingEditorDoc: restoredEditorDoc,
        onPendingInputConsumed: () => {
          setRestoredDraftText(void 0);
          setRestoredEditorDoc(null);
        },
        pendingAttachments: restoredDraftAttachments,
        onPendingAttachmentsConsumed: () => setRestoredDraftAttachments(null),
        hideAssetMention: true,
        showCurrentCanvasWorkflowTab: false,
        placeholderNode: ({ triggerMention, triggerSlash }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          CreationGuidePlaceholder,
          {
            guides: ["design"],
            source: "home",
            triggerMention,
            triggerSlash
          }
        ),
        autoFocus: true,
        guard: loginGuard,
        sendGuard: astraSendGate.sendGuard,
        sendLabel: astraSendGate.sendLabel,
        sendTooltip: astraSendGate.sendTooltip,
        slashPopoverPosition: "down",
        useDefaultDir: true,
        onExploreSkills: handleExploreSkills,
        onCreateSkill: handleCreateSkill,
        toolbar: ({ addFromLocal, uploading, triggerSlash, skillTriggerRef }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          HomeToolbar,
          {
            addFromLocal,
            uploading,
            triggerSlash,
            skillTriggerRef,
            selectedModelId: homeModelId,
            selectedMediaModels: homeSelectedMediaModels,
            onModelSelectionChange: handleModelSelectionChange,
            workspaceFolder,
            onPickWorkspaceFolder: () => void handlePickWorkspaceFolder(),
            onClearWorkspaceFolder: handleClearWorkspaceFolder,
            activeSceneLabel: activeRecommendationLabel,
            onClearActiveScene: handleClearActiveRecommendation,
            showResetInput: hasInputContent,
            onResetInput: handleResetInput
          }
        ),
        className: "message-input-surface home-input-surface relative z-10 flex w-full min-h-[var(--input-card-height)] flex-col justify-between rounded-[var(--home-input-radius)] p-[var(--message-input-card-padding)]"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-composer-project-tray relative z-0 mt-0 mx-8 flex min-h-[44px] items-end rounded-b-[var(--home-input-radius)] bg-[var(--home-composer-tray-bg)] px-3 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      HomeProjectPicker,
      {
        selectedProjectId,
        onChange: (projectId) => {
          if (!composerSendPreparingRef.current) setSelectedProjectId(projectId);
        }
      }
    ) })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "main",
    {
      ref: scrollContainerRef,
      className: "relative isolate flex-1 flex flex-col items-stretch overflow-y-auto overscroll-contain scrollbar-none bg-[var(--home-content-surface)] home-content-grid",
      onPointerMove: handleHomeGridPointerMove,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(HomePromptPrefillBridge, { onPrefill: handlePromptPrefill }),
        LoginDialog,
        folderPermissionDialog,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: composerLayerRef,
            className: "home-composer-motion-layer text-left",
            "data-action-ui-id": "home.composer-motion-layer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "home-hero-brand-motion-layer mac-window-drag-region",
                  "data-action-ui-id": "home.window-drag-region-brand",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-hero-title-row flex items-center justify-center", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(HomeWinkLogo, {}),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "home-hero-title flex items-center font-heading font-normal text-[var(--home-brand-foreground)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HubWordmark, { width: 263, height: 40, className: "translate-y-0.5" }) })
                  ] })
                }
              ),
              homeComposer
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": "true", className: "home-composer-sticky-backdrop" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "home-hero-zone relative flex shrink-0 flex-col items-center",
            "data-has-whats-new": "true",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  "aria-hidden": "true",
                  className: "mac-window-drag-overlay mac-window-drag-region absolute inset-x-0 top-0 z-0 h-10 select-none",
                  "data-action-ui-id": "home.window-drag-region-top"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full max-w-[var(--home-primary-stack-width)]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  "data-reduced-compositing": "true",
                  className: "home-hero-content home-fade-up relative flex flex-col items-center z-1",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-hero-announcement absolute inset-x-0 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      HomeWhatsNew,
                      {
                        getAriaLabel: (item) => t("home.whatsNew.aria", {
                          defaultValue: "查看最新内容：{{title}}",
                          title: item.tickerText
                        })
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "home-hero-title-block mac-window-drag-region relative z-20 flex flex-col items-center text-center",
                        "data-action-ui-id": "home.window-drag-region-title",
                        "data-locale": i18n.language.startsWith("zh") ? "zh" : "en",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": "true", className: "home-hero-title-row-placeholder" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "home-hero-subtitle font-heading font-normal text-muted-foreground", children: t("home.heroSubtitle") })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        ref: composerAnchorRef,
                        className: "home-composer-placeholder relative mt-1 w-full"
                      }
                    ),
                    null,
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-below-anchor", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      MediaShowcasePreview,
                      {
                        categories: quickStartCategories,
                        tabsConfig: tabsShowcaseConfig,
                        skillConfig: skillShowcaseConfig,
                        skillConfigLoading: skillShowcaseConfigLoading,
                        skillConfigAuthoritative: skillShowcaseConfigSource === "remote",
                        projectCategories: projectShowcaseConfig.categories,
                        projectDefaultSectionId: projectShowcaseConfig.defaultSectionId,
                        projectConfigLoading: projectShowcaseConfigLoading,
                        projectConfigAuthoritative: projectShowcaseConfigSource === "remote",
                        showcase: quickStartConfig.showcase,
                        configLoading: quickStartConfigSource === "loading" || tabsShowcaseConfigSource === "loading",
                        configAuthoritative: quickStartConfigSource === "remote" && tabsShowcaseConfigSource === "remote",
                        randomInspirationEnabled: !homeSubmitting && !composerSendPreparing && !sceneAttachmentsLoading,
                        featuredSkills: featuredSkillsMarket.skills,
                        featuredSkillsLoading: featuredSkillsMarket.loading,
                        featuredSkillsError: featuredSkillsMarket.error,
                        featuredSkillInstallingName,
                        featuredSkillInstallingProgress,
                        onQuerySelect: handleQuerySelect,
                        onFeatureSelect: featurePopup ? handleFeatureActionSelect : void 0,
                        onProjectArchiveSelect: handleProjectArchiveSelect,
                        onFeaturedSkillsRequest: handleShowcaseSkillsRequest,
                        onFeaturedSkillSelect: handleFeaturedSkillSelect
                      }
                    ) })
                  ]
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "aria-hidden": "true", className: "home-composer-scroll-runway shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PromotionDialog, { open: promotionDialog.open, onOpenChange: promotionDialog.setOpen })
      ]
    }
  );
}
function HomePage() {
  const { t } = useTranslation();
  const [browserOpen, setBrowserOpen] = reactExports.useState(false);
  const closeBrowser = reactExports.useCallback(() => setBrowserOpen(false), []);
  const browser = window.hilo?.browser;
  reactExports.useEffect(() => {
    if (!browser?.onPluginEvent || !browser.completeVideoDownload) return;
    return browser.onPluginEvent((request) => {
      if (request.type !== "video-download-requested") return;
      void browser.completeVideoDownload({
        requestId: request.requestId,
        ok: false,
        error: t("workspace.browser.videoOpenProject", "请先打开项目，再添加视频到对话或画布。")
      }).catch((error) => workspaceLog.warn("Browser video request rejection failed", { error }));
    });
  }, [browser, t]);
  reactExports.useEffect(() => {
    const openBrowser = () => setBrowserOpen(true);
    window.addEventListener(OPEN_BROWSER_EVENT, openBrowser);
    return () => window.removeEventListener(OPEN_BROWSER_EVENT, openBrowser);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: browserOpen, className: browserOpen ? "hidden" : "flex min-h-0 flex-1 flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HomeContent, {}) }),
    browserOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkspaceBrowser,
      {
        onBackToCanvas: closeBrowser,
        backLabel: t("homeSidebar.home"),
        surfaceSource: "fallback_card"
      }
    )
  ] });
}
const SplitComponent = HomePage;
export {
  SplitComponent as component
};
