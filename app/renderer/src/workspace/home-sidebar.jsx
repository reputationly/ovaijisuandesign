// home-sidebar.jsx
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight$1,
  dedupedToast,
  jsxRuntimeExports,
  Library,
  MonochromeIcon,
  Plus,
  reactExports,
  storageKeys,
  useNavigate,
  usePlatform,
  useQueryClient,
  useStorage,
  useTranslation,
  Workflow,
} from "../vendor.js";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { useLocation } from "../vendor-inline/vscode-base/linked-list.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAssetCenterRelocation } from "../assets/wrap-as-asset-center-error.js";
import { buildWorkspaceSearch } from "./use-deep-link-router.js";
import {
  groupRecentWorkspacesByProject,
  UNGROUPED_RECENT_GROUP_KEY,
} from "./tool-label-definitions.js";
import {
  GLOBAL_SIDEBAR_RAIL_WIDTH,
  HOME_SIDEBAR_WIDTH,
  useRecentWorkspacesRefresh,
} from "./set-home-widget-dev-preview-mode.js";
import { FolderOpen } from "../media-editing/package.jsx";
import { useChangelog } from "../settings/use-active-runtime.js";
import {
  persistRecentProjectDismissals,
  pinnedWorkspaceAliases,
  readRecentProjectDismissals,
  removePinnedWorkspacePaths,
  removeRecentProjectDismissal,
  splitPinnedInventory,
  upsertRecentProjectDismissal,
  useSidebarBadges,
} from "../infra/split-pinned-inventory.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { removeWorkspaceSessionTabs } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { useTopbarActions, useTopbarState } from "./topbar-state-context.jsx";
import { useResizableWidth } from "../generation/use-resizable-width.js";
import {
  isWorkspacePathCaseInsensitivePlatform,
  projectWorkspaceKey,
  resolveRecentProjectsSortMode,
  useProjectStore,
  workspaceInventoryPathKey,
} from "./normalize-project-entries.js";
import { mergeWorkspaceInventory } from "./merge-workspace-inventory.js";
import {
  cn$2,
  Dialog,
  DialogContent,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { DialogTitle } from "../infra/badge-variants.jsx";
import { homeService, PluginIcon } from "./home-service.jsx";
import { ChangelogTable } from "../settings/changelog-table.jsx";
import { ChangelogDetailDialog } from "../settings/changelog-detail-dialog.jsx";
import { ResizeColHandle } from "../assets/resize-col-handle.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { stageWorkspacePreview } from "./context-menu-content.jsx";
import { CreateProjectDialog } from "./create-project-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import {
  persistVisibleWorkspaceManualOrder,
  reorderVisibleRecentWorkspaces,
} from "../settings/persist-visible-workspace-manual-order.js";
import { HubLogo } from "../infra/hub-logo.jsx";
import {
  DissolveProjectDialog,
  HubWordmark,
} from "../infra/inline-rename-input.jsx";
import { UpdateSidebarWidget } from "../settings/update-sidebar-widget-inner.jsx";
import { useProjectDelete } from "./use-project-delete.js";
import { useNewWorkspaceDialog } from "./use-new-workspace-dialog.jsx";
import { RecentProjectRow } from "./recent-project-row.jsx";
import { SidebarReleaseBadge } from "./sidebar-release-badge.jsx";
import { useSidebarProjectDrag } from "./use-sidebar-project-drag.js";
import { SidebarNavButton } from "./sidebar-nav-button.jsx";
import {
  GlobalSidebarToggle,
  isInventoryItemPinned,
  isProjectPinned,
  MoveWorkspaceDialog,
  OPEN_GLOBAL_SEARCH_EVENT,
  persistSidebarCollapseState,
  pinnedWorkspaceKeySet,
  readSidebarCollapseState,
  reorderPinnedProjectIds,
  reorderPinnedWorkspacePaths,
  splitPinnedProjects,
  subscribeRecentProjectDismissals,
  togglePinnedProjectId,
  togglePinnedWorkspacePath,
} from "./move-workspace-dialog.jsx";
import { RecentProjectsHeaderActions } from "./recent-projects-header-actions.jsx";
import { DiagnosticsStatusButton } from "../settings/diagnostics-status-button.jsx";
import {
  buildChangelogRows,
  HOME_NAV_ACTIVE_CLASS,
  HOME_NAV_BUTTON_CLASS,
  HOME_NAV_HOVER_CLASS,
  HOME_NAV_ICON_SIZE,
  HOME_NAV_ICON_SLOT_CLASS,
  HOME_NAV_INACTIVE_TEXT_CLASS,
  HOME_NAV_PILL_CLASS,
  HOME_NEW_TASK_PLUS_SIZE,
  HOME_RAIL_PILL_CLASS,
  HOME_RECENT_SCROLL_BOTTOM_SAFE_AREA_CLASS,
  HOME_SIDEBAR_ICON_AXIS,
  HOME_SIDEBAR_MAX_WIDTH,
  HOME_SIDEBAR_MIN_WIDTH,
  pickLocale,
  PROJECT_PREVIEW_ITEM_LIMIT,
  recentProjectDropPosition,
  resolveRecentProjectsGroupMode,
  SearchButton,
  SIDEBAR_BADGE_TARGET_BY_ROUTE,
} from "../settings/search-button.jsx";
import { RecentProjectGroupHeader } from "../settings/recent-project-group-header.jsx";
import { SidebarUserMenu } from "../generation/logged-out-sidebar-action-presentation.jsx";

export function HomeSidebar({
  width: controlledWidth,
  minWidth = HOME_SIDEBAR_MIN_WIDTH,
  maxWidth = HOME_SIDEBAR_MAX_WIDTH,
  topChromeInset = false,
  presentation = "docked",
  onResizeMouseDown,
  onResizeValueChange,
  onResetWidth,
  onPreviewInteractionEnter,
  onPreviewInteractionLeave,
  loadRecentThumbnails = presentation !== "rail",
  onOverlayOpenChange,
  holdPreviewOpen,
  releasePreviewHold,
} = {}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const caseInsensitiveWorkspacePaths = isWorkspacePathCaseInsensitivePlatform(
    platform2.app.os,
  );
  const { href, pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient2 = useQueryClient();
  const {
    currentWorkspaceId,
    entries: entries2,
    unreadCompletedTaskCount,
    workspaceStatusById,
  } = useTopbarState();
  const { createWorkspace, closeWorkspace } = useTopbarActions();
  const assetCenterRelocation = useAssetCenterRelocation();
  const {
    requestOpen: requestNewProject,
    requestOpenForProject: requestNewProjectInProject,
    dialog: newProjectDialog,
  } = useNewWorkspaceDialog(createWorkspace);
  const { projects, caseInsensitive: projectCaseInsensitive } =
    useProjectStore();
  const {
    addWorkspaceToProject,
    createProject,
    deleteProject,
    removeWorkspaceFromProject,
    reorderProject,
    moveWorkspace,
  } = useProjectActions();
  const { pendingDelete, requestDelete, confirmDelete, cancelDelete } =
    useProjectDelete(deleteProject);
  reactExports.useEffect(() => {
    if (!pendingDelete || !holdPreviewOpen || !releasePreviewHold) return;
    const token2 = `home-sidebar.project-delete:${pendingDelete.id}`;
    holdPreviewOpen(token2);
    return () => releasePreviewHold(token2);
  }, [holdPreviewOpen, pendingDelete, releasePreviewHold]);
  const [createProjectKind, setCreateProjectKind] = reactExports.useState(null);
  const [recentWorkspaces, , setRecentWorkspacesAsync] = useStorage(
    "global.recentWorkspaces",
  );
  const [recentProjectDismissals, setRecentProjectDismissals] =
    reactExports.useState(readRecentProjectDismissals);
  reactExports.useEffect(
    () =>
      subscribeRecentProjectDismissals((dismissals) => {
        setRecentProjectDismissals([...dismissals]);
      }),
    [],
  );
  const [recentWorkspacesIntent, setRecentWorkspacesIntent] =
    reactExports.useState(null);
  const recentWorkspacesIntentRevisionRef = reactExports.useRef(0);
  const effectiveRecentWorkspaces = recentWorkspacesIntent ?? recentWorkspaces;
  const [globalConfig, , setGlobalConfigAsync] = useStorage("global.config");
  const { badges: sidebarBadges, markSidebarBadgeVisited } = useSidebarBadges();
  const pinnedWorkspacePaths = reactExports.useMemo(
    () => globalConfig.pinnedWorkspacePaths ?? [],
    [globalConfig.pinnedWorkspacePaths],
  );
  const pinnedProjectIds = reactExports.useMemo(
    () => globalConfig.pinnedProjectIds ?? [],
    [globalConfig.pinnedProjectIds],
  );
  const pinnedWorkspaceKeys = reactExports.useMemo(
    () =>
      pinnedWorkspaceKeySet(
        pinnedWorkspacePaths,
        caseInsensitiveWorkspacePaths,
      ),
    [caseInsensitiveWorkspacePaths, pinnedWorkspacePaths],
  );
  const handleTogglePinWorkspace = reactExports.useCallback(
    (item) => {
      void setGlobalConfigAsync((previous2) => ({
        ...previous2,
        pinnedWorkspacePaths: togglePinnedWorkspacePath(
          previous2.pinnedWorkspacePaths ?? [],
          item,
          caseInsensitiveWorkspacePaths,
        ),
      }));
    },
    [caseInsensitiveWorkspacePaths, setGlobalConfigAsync],
  );
  const handleTogglePinProject = reactExports.useCallback(
    (projectId) => {
      void setGlobalConfigAsync((previous2) => ({
        ...previous2,
        pinnedProjectIds: togglePinnedProjectId(
          previous2.pinnedProjectIds ?? [],
          projectId,
        ),
      }));
    },
    [setGlobalConfigAsync],
  );
  const persistedRecentProjectsSortMode = resolveRecentProjectsSortMode(
    globalConfig.recentProjectsSortMode,
  );
  const persistedRecentProjectsGroupMode = resolveRecentProjectsGroupMode(
    globalConfig.recentProjectsGroupMode,
  );
  const [recentProjectsGroupModeIntent, setRecentProjectsGroupModeIntent] =
    reactExports.useState(null);
  const recentProjectsGroupMode =
    recentProjectsGroupModeIntent ?? persistedRecentProjectsGroupMode;
  const [recentProjectsSortModeIntent, setRecentProjectsSortModeIntent] =
    reactExports.useState(null);
  const recentProjectsSortMode =
    recentProjectsSortModeIntent ?? persistedRecentProjectsSortMode;
  const recentProjectsSortModeRevisionRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    if (
      recentProjectsSortModeIntent !== null &&
      recentProjectsSortModeIntent === persistedRecentProjectsSortMode
    ) {
      setRecentProjectsSortModeIntent(null);
    }
  }, [persistedRecentProjectsSortMode, recentProjectsSortModeIntent]);
  reactExports.useEffect(() => {
    if (
      recentProjectsGroupModeIntent !== null &&
      recentProjectsGroupModeIntent === persistedRecentProjectsGroupMode
    ) {
      setRecentProjectsGroupModeIntent(null);
    }
  }, [persistedRecentProjectsGroupMode, recentProjectsGroupModeIntent]);
  const [changelogOpen, setChangelogOpen] = reactExports.useState(false);
  const [selectedRow, setSelectedRow] = reactExports.useState(null);
  const { manifest: changelogManifest } = useChangelog();
  const {
    width: fallbackSidebarWidth,
    onMouseDown: fallbackResizeMouseDown,
    onValueChange: fallbackResizeValueChange,
    reset: fallbackResetSidebarWidth,
  } = useResizableWidth({
    defaultWidth: HOME_SIDEBAR_WIDTH,
    minWidth,
    maxWidth,
  });
  const [activeRecentDetailsPath, setActiveRecentDetailsPath] =
    reactExports.useState(null);
  const sidebarWidth = controlledWidth ?? fallbackSidebarWidth;
  const compactRail = presentation === "rail";
  const handleResizeMouseDown = onResizeMouseDown ?? fallbackResizeMouseDown;
  const handleResizeValueChange =
    onResizeValueChange ?? fallbackResizeValueChange;
  const resetSidebarWidth = onResetWidth ?? fallbackResetSidebarWidth;
  const handleRecentDetailsOpenChange = reactExports.useCallback(
    (workspacePath, open) => {
      setActiveRecentDetailsPath((currentPath) => {
        if (open) return workspacePath;
        return currentPath === workspacePath ? null : currentPath;
      });
    },
    [],
  );
  useRecentWorkspacesRefresh();
  const prevRouteRef = reactExports.useRef(href);
  reactExports.useEffect(() => {
    if (prevRouteRef.current !== href) {
      prevRouteRef.current = href;
      queryClient2.invalidateQueries({
        queryKey: storageKeys.global("recentWorkspaces"),
      });
    }
  }, [href, queryClient2]);
  const syntheticOpenedAtByPathRef = reactExports.useRef(new Map());
  for (const workspace of effectiveRecentWorkspaces) {
    const key2 = workspaceInventoryPathKey(
      workspace.path,
      caseInsensitiveWorkspacePaths,
    );
    const previousOpenedAt = syntheticOpenedAtByPathRef.current.get(key2);
    if (previousOpenedAt === void 0 || workspace.openedAt > previousOpenedAt) {
      syntheticOpenedAtByPathRef.current.set(key2, workspace.openedAt);
    }
  }
  const syntheticOpenedAtForEntry = reactExports.useCallback(
    (entry) => {
      const key2 = workspaceInventoryPathKey(
        entry.folderPath,
        caseInsensitiveWorkspacePaths,
      );
      const existing = syntheticOpenedAtByPathRef.current.get(key2);
      if (existing !== void 0) return existing;
      const firstSeenAt = Date.now();
      syntheticOpenedAtByPathRef.current.set(key2, firstSeenAt);
      return firstSeenAt;
    },
    [caseInsensitiveWorkspacePaths],
  );
  const baseWorkspaceInventory = reactExports.useMemo(
    () =>
      mergeWorkspaceInventory(effectiveRecentWorkspaces, entries2, {
        caseInsensitive: caseInsensitiveWorkspacePaths,
        dismissals: recentProjectDismissals,
        sortMode: recentProjectsSortMode,
        syntheticOpenedAtForEntry,
      }),
    [
      caseInsensitiveWorkspacePaths,
      entries2,
      recentProjectDismissals,
      recentProjectsSortMode,
      effectiveRecentWorkspaces,
      syntheticOpenedAtForEntry,
    ],
  );
  const workspaceInventory = reactExports.useMemo(() => {
    if (recentProjectsSortMode !== "priority") return baseWorkspaceInventory;
    const priorityRank = (item) => {
      const workspaceId2 = item.authoritativeEntry?.workspaceId;
      const status = workspaceId2
        ? workspaceStatusById.get(workspaceId2)
        : void 0;
      if (status?.needsUserAction) return 0;
      if (status?.running) return 1;
      if (status?.unread) return 2;
      return 3;
    };
    return baseWorkspaceInventory
      .map((item, index2) => ({
        item,
        index: index2,
        rank: priorityRank(item),
      }))
      .sort((a2, b3) => a2.rank - b3.rank || a2.index - b3.index)
      .map(({ item }) => item);
  }, [baseWorkspaceInventory, recentProjectsSortMode, workspaceStatusById]);
  const [draggedPath, setDraggedPath] = reactExports.useState(null);
  const [draggedSection, setDraggedSection] = reactExports.useState(null);
  const [draggedProjectId, setDraggedProjectId] = reactExports.useState(null);
  const draggedProjectIdRef = reactExports.useRef(null);
  const groupingEnabled = recentProjectsGroupMode === "project";
  const workspaceProjectById = reactExports.useMemo(() => {
    const index2 = new Map();
    for (const project2 of projects) {
      for (const path2 of project2.workspacePaths) {
        const key2 = projectWorkspaceKey(path2, projectCaseInsensitive);
        if (!index2.has(key2)) index2.set(key2, project2);
      }
    }
    return index2;
  }, [projectCaseInsensitive, projects]);
  const [dragOverTarget, setDragOverTarget] = reactExports.useState(null);
  const [dragInventorySnapshot, setDragInventorySnapshot] =
    reactExports.useState(null);
  const displayedWorkspaceInventory =
    dragInventorySnapshot ?? workspaceInventory;
  const { pinned: pinnedInventoryItems, unpinned: unpinnedWorkspaceInventory } =
    reactExports.useMemo(
      () =>
        splitPinnedInventory(
          displayedWorkspaceInventory,
          pinnedWorkspacePaths,
          caseInsensitiveWorkspacePaths,
        ),
      [
        caseInsensitiveWorkspacePaths,
        displayedWorkspaceInventory,
        pinnedWorkspacePaths,
      ],
    );
  const sidebarScrollRef = reactExports.useRef(null);
  const sidebarContentRef = reactExports.useRef(null);
  const [canScrollUp, setCanScrollUp] = reactExports.useState(false);
  const [canScrollDown, setCanScrollDown] = reactExports.useState(false);
  const hasSidebarOverflow = canScrollUp || canScrollDown;
  const syncSidebarScroll = reactExports.useCallback(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop < maxScrollTop - 1);
  }, []);
  reactExports.useLayoutEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    syncSidebarScroll();
    el.addEventListener("scroll", syncSidebarScroll, {
      passive: true,
    });
    const observer2 = new ResizeObserver(syncSidebarScroll);
    observer2.observe(el);
    if (sidebarContentRef.current) observer2.observe(sidebarContentRef.current);
    return () => {
      el.removeEventListener("scroll", syncSidebarScroll);
      observer2.disconnect();
    };
  }, [syncSidebarScroll]);
  const changelogLocale = reactExports.useMemo(
    () => changelogManifest[pickLocale(i18n.language)],
    [changelogManifest, i18n.language],
  );
  const changelogRows = reactExports.useMemo(
    () => buildChangelogRows(changelogLocale),
    [changelogLocale],
  );
  const SECTION_NAV_ITEMS = [
    ...(assetCenterRelocation.relocationPending
      ? [
          {
            to: "/asset-center",
            icon: Library,
            label: t2("homeSidebar.assetCenter"),
            badgeTarget: "assetCenter",
            releaseBadge: sidebarBadges.assetCenter,
          },
        ]
      : []),
    {
      to: "/skills",
      icon: PluginIcon,
      label: t2("homeSidebar.skillCommunity"),
      badgeTarget: "connectors",
      releaseBadge: sidebarBadges.connectors,
    },
    {
      to: "/workflows",
      icon: Workflow,
      label: t2("homeSidebar.comfyWorkflows"),
      badgeTarget: "workflows",
      releaseBadge: sidebarBadges.workflows,
    },
  ];
  const projectsBadge = sidebarBadges.projects;
  const handleNavClick = reactExports.useCallback(
    (to) => {
      if (to === "/") {
        trackEvent(TRACK_EVENTS.HOME_NAV_CLICK, {
          destination: "home",
          already_active: pathname === "/",
        });
      }
      const badgeTarget = SIDEBAR_BADGE_TARGET_BY_ROUTE[to];
      if (badgeTarget) markSidebarBadgeVisited(badgeTarget);
      void homeService.hiloApp.activateHome().catch(() => {});
      if (to === "/skills" && sidebarBadges.connectors) {
        void navigate({
          to: "/skills",
          search: {
            capability: "connectors",
          },
        });
        return;
      }
      void navigate({
        to,
      });
    },
    [markSidebarBadgeVisited, navigate, pathname, sidebarBadges.connectors],
  );
  const handleRecentClick = reactExports.useCallback(
    (workspace) => {
      void stageWorkspacePreview({
        hiloApp: homeService.hiloApp,
        folderPath: workspace.path,
        t: t2,
        onStaged: (entry) => {
          trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, {
            source: "home_sidebar_recent",
          });
          return navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(entry.workspaceId),
          });
        },
      }).catch(() => {});
    },
    [navigate, t2],
  );
  const handleRecentCloseRuntime = reactExports.useCallback(
    (item) => {
      const workspaceId2 = item.authoritativeEntry?.workspaceId;
      if (!workspaceId2) return;
      closeWorkspace(workspaceId2, "home-sidebar-recent");
    },
    [closeWorkspace],
  );
  const handleRecentDelete = reactExports.useCallback(
    (item) => {
      const recentPath = item.recentPath;
      if (!recentPath) return;
      const openWorkspaceId = item.authoritativeEntry?.workspaceId;
      if (openWorkspaceId)
        closeWorkspace(openWorkspaceId, "home-sidebar-recent-delete");
      const dismissal = {
        paths: Array.from(
          new Set(
            [
              recentPath,
              item.workspace.path,
              item.authoritativeEntry?.folderPath,
              item.authoritativeEntry?.workspaceId,
            ].filter((path2) => Boolean(path2)),
          ),
        ),
        recentOpenedAt: item.workspace.openedAt,
      };
      setRecentProjectDismissals((previous2) => {
        const next2 = upsertRecentProjectDismissal(previous2, dismissal);
        persistRecentProjectDismissals(next2);
        return next2;
      });
      setRecentWorkspacesIntent(null);
      const targetKey = workspaceInventoryPathKey(
        recentPath,
        caseInsensitiveWorkspacePaths,
      );
      void setRecentWorkspacesAsync((previous2) =>
        previous2.filter(
          (entry) =>
            workspaceInventoryPathKey(
              entry.path,
              caseInsensitiveWorkspacePaths,
            ) !== targetKey,
        ),
      )
        .then((persisted) => {
          if (persisted) return;
          setRecentProjectDismissals((previous2) => {
            const next2 = removeRecentProjectDismissal(previous2, dismissal);
            persistRecentProjectDismissals(next2);
            return next2;
          });
        })
        .catch(() => {
          setRecentProjectDismissals((previous2) => {
            const next2 = removeRecentProjectDismissal(previous2, dismissal);
            persistRecentProjectDismissals(next2);
            return next2;
          });
        });
      if (!item.authoritativeEntry) {
        void removeWorkspaceSessionTabs(recentPath, () => platform2.storage);
      }
      if (
        isInventoryItemPinned(
          item,
          pinnedWorkspaceKeys,
          caseInsensitiveWorkspacePaths,
        )
      ) {
        void setGlobalConfigAsync((previous2) => ({
          ...previous2,
          pinnedWorkspacePaths: removePinnedWorkspacePaths(
            previous2.pinnedWorkspacePaths ?? [],
            pinnedWorkspaceAliases(item),
            caseInsensitiveWorkspacePaths,
          ),
        }));
      }
    },
    [
      caseInsensitiveWorkspacePaths,
      closeWorkspace,
      pinnedWorkspaceKeys,
      platform2.storage,
      setGlobalConfigAsync,
      setRecentWorkspacesAsync,
    ],
  );
  const commitRecentSortMode = reactExports.useCallback(
    (mode2) => {
      const revision = recentProjectsSortModeRevisionRef.current + 1;
      recentProjectsSortModeRevisionRef.current = revision;
      setRecentProjectsSortModeIntent(mode2);
      void setGlobalConfigAsync((previous2) => ({
        ...previous2,
        recentProjectsSortMode: mode2,
      }))
        .then((persisted) => {
          if (
            !persisted &&
            recentProjectsSortModeRevisionRef.current === revision
          ) {
            setRecentProjectsSortModeIntent(null);
          }
        })
        .catch(() => {
          if (recentProjectsSortModeRevisionRef.current === revision) {
            setRecentProjectsSortModeIntent(null);
          }
        });
    },
    [setGlobalConfigAsync],
  );
  const handleRecentSortModeChange = commitRecentSortMode;
  const handleRecentGroupModeChange = reactExports.useCallback(
    (mode2) => {
      setRecentProjectsGroupModeIntent(mode2);
      void setGlobalConfigAsync((previous2) => ({
        ...previous2,
        recentProjectsGroupMode: mode2,
      })).catch(() => {
        setRecentProjectsGroupModeIntent(null);
      });
    },
    [setGlobalConfigAsync],
  );
  const handleCreateProject = reactExports.useCallback(
    async (name2, kind) => {
      const result = await createProject(name2, kind);
      if (!result.project) {
        dedupedToast.error(
          result.errorMessage ??
            t2(result.errorMessageKey ?? "project.create.failed"),
        );
        return;
      }
      setCreateProjectKind(null);
      void navigate({
        to: "/projects/$projectId",
        params: {
          projectId: result.project.id,
        },
      });
    },
    [createProject, navigate, t2],
  );
  const handleOpenAllCreations = reactExports.useCallback(() => {
    void homeService.hiloApp.activateHome().catch(() => {});
    void navigate({
      to: "/creations",
    });
  }, [navigate]);
  const handleOpenProjectDetail = reactExports.useCallback(
    (projectId) => {
      void homeService.hiloApp.activateHome().catch(() => {});
      void navigate({
        to: "/projects/$projectId",
        params: {
          projectId,
        },
      });
    },
    [navigate],
  );
  const handleAddWorkspaceToProject = reactExports.useCallback(
    (workspacePath, projectId) => {
      void addWorkspaceToProject(workspacePath, projectId, "sidebar-menu");
    },
    [addWorkspaceToProject],
  );
  const handleRemoveWorkspaceFromProject = reactExports.useCallback(
    (workspacePath) => {
      void removeWorkspaceFromProject(workspacePath, "sidebar-menu");
    },
    [removeWorkspaceFromProject],
  );
  const rowProjectIdByKey = reactExports.useMemo(() => {
    const index2 = new Map();
    for (const item of displayedWorkspaceInventory) {
      const ownerKey = projectWorkspaceKey(
        item.workspace.path,
        projectCaseInsensitive,
      );
      const recentKey = item.recentPath
        ? projectWorkspaceKey(item.recentPath, projectCaseInsensitive)
        : void 0;
      const projectId =
        (
          workspaceProjectById.get(ownerKey) ??
          (recentKey ? workspaceProjectById.get(recentKey) : void 0)
        )?.id ?? null;
      if (!index2.has(ownerKey)) index2.set(ownerKey, projectId);
      if (recentKey && !index2.has(recentKey)) index2.set(recentKey, projectId);
    }
    return index2;
  }, [
    displayedWorkspaceInventory,
    projectCaseInsensitive,
    workspaceProjectById,
  ]);
  const resolveRowProjectId = reactExports.useCallback(
    (workspacePath) =>
      rowProjectIdByKey.get(
        projectWorkspaceKey(workspacePath, projectCaseInsensitive),
      ) ?? null,
    [projectCaseInsensitive, rowProjectIdByKey],
  );
  const handleRecentDragStart = reactExports.useCallback(
    (event, workspacePath, section) => {
      setDraggedPath(workspacePath);
      setDraggedSection(section);
      draggedProjectIdRef.current = resolveRowProjectId(workspacePath);
      setDragInventorySnapshot(workspaceInventory);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", workspacePath);
    },
    [resolveRowProjectId, workspaceInventory],
  );
  const handleRecentDragOver = reactExports.useCallback(
    (
      event,
      workspacePath,
      section,
      position2 = recentProjectDropPosition(event),
    ) => {
      if (draggedSection !== section) {
        event.dataTransfer.dropEffect = "none";
        setDragOverTarget(null);
        return;
      }
      if (section === "recent" && groupingEnabled) {
        const targetProjectId = resolveRowProjectId(workspacePath);
        if (targetProjectId !== draggedProjectIdRef.current) {
          event.dataTransfer.dropEffect = "none";
          setDragOverTarget(null);
          return;
        }
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (workspacePath === draggedPath) {
        setDragOverTarget(null);
        return;
      }
      const nextTarget = {
        path: workspacePath,
        position: position2,
      };
      setDragOverTarget((previous2) =>
        previous2?.path === nextTarget.path &&
        previous2.position === nextTarget.position
          ? previous2
          : nextTarget,
      );
    },
    [draggedPath, draggedSection, groupingEnabled, resolveRowProjectId],
  );
  const clearRecentDragState = reactExports.useCallback(() => {
    setDraggedPath(null);
    setDraggedProjectId(null);
    setDraggedSection(null);
    draggedProjectIdRef.current = null;
    setDragOverTarget(null);
    setDragInventorySnapshot(null);
  }, []);
  const handleProjectHeaderDragStart = reactExports.useCallback(
    (event, projectId) => {
      setDraggedProjectId(projectId);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "");
    },
    [],
  );
  const handleProjectHeaderDragEnd = reactExports.useCallback(() => {
    setDraggedProjectId(null);
  }, []);
  const handleRecentDrop = reactExports.useCallback(
    (
      event,
      targetPath,
      section,
      position2 = recentProjectDropPosition(event),
    ) => {
      event.preventDefault();
      if (draggedSection !== section) {
        clearRecentDragState();
        return;
      }
      const sourcePath =
        draggedPath ?? event.dataTransfer.getData("text/plain");
      if (section === "recent" && groupingEnabled && sourcePath) {
        const targetProjectId = resolveRowProjectId(targetPath);
        if (targetProjectId !== draggedProjectIdRef.current) {
          clearRecentDragState();
          return;
        }
      }
      event.stopPropagation();
      if (section === "pinned") {
        if (sourcePath && sourcePath !== targetPath) {
          const dropPosition = position2;
          const visiblePinned = pinnedInventoryItems;
          void setGlobalConfigAsync((previous2) => ({
            ...previous2,
            pinnedWorkspacePaths: reorderPinnedWorkspacePaths(
              previous2.pinnedWorkspacePaths ?? [],
              visiblePinned,
              sourcePath,
              targetPath,
              dropPosition,
              caseInsensitiveWorkspacePaths,
            ),
          }));
        }
        clearRecentDragState();
        return;
      }
      const snapshot2 = dragInventorySnapshot ?? workspaceInventory;
      if (sourcePath && sourcePath !== targetPath && snapshot2.length > 0) {
        const dropPosition = position2;
        const visibleWorkspaces = snapshot2.map((item) => item.workspace);
        const reordered = reorderVisibleRecentWorkspaces(
          visibleWorkspaces,
          sourcePath,
          targetPath,
          dropPosition,
        );
        const orderChanged = reordered.some(
          (workspace, index2) =>
            workspace.path !== visibleWorkspaces[index2]?.path,
        );
        if (orderChanged) {
          const persistDropOrder = (previous2) => {
            const latestInventory = mergeWorkspaceInventory(
              previous2,
              entries2,
              {
                caseInsensitive: caseInsensitiveWorkspacePaths,
                dismissals: recentProjectDismissals,
                sortMode: recentProjectsSortMode,
                syntheticOpenedAtForEntry,
              },
            );
            return persistVisibleWorkspaceManualOrder(
              latestInventory,
              reordered,
              caseInsensitiveWorkspacePaths,
            );
          };
          const intentRevision = recentWorkspacesIntentRevisionRef.current + 1;
          recentWorkspacesIntentRevisionRef.current = intentRevision;
          setRecentWorkspacesIntent(persistDropOrder(recentWorkspaces));
          void setRecentWorkspacesAsync(persistDropOrder)
            .then(() => {
              if (
                recentWorkspacesIntentRevisionRef.current === intentRevision
              ) {
                setRecentWorkspacesIntent(null);
              }
            })
            .catch(() => {
              if (
                recentWorkspacesIntentRevisionRef.current === intentRevision
              ) {
                setRecentWorkspacesIntent(null);
              }
            });
          commitRecentSortMode("manual");
        }
      }
      clearRecentDragState();
    },
    [
      caseInsensitiveWorkspacePaths,
      clearRecentDragState,
      dragInventorySnapshot,
      draggedPath,
      draggedSection,
      entries2,
      groupingEnabled,
      pinnedInventoryItems,
      recentProjectsSortMode,
      recentProjectDismissals,
      recentWorkspaces,
      resolveRowProjectId,
      setGlobalConfigAsync,
      setRecentWorkspacesAsync,
      syntheticOpenedAtForEntry,
      workspaceInventory,
      commitRecentSortMode,
    ],
  );
  const handleRecentDragEnd = reactExports.useCallback(() => {
    clearRecentDragState();
  }, [clearRecentDragState]);
  const handleGlobalSearch = reactExports.useCallback(() => {
    window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT));
  }, []);
  const isActive2 = reactExports.useCallback(
    (to) => {
      if (to === "/") return pathname === "/";
      return pathname.startsWith(to);
    },
    [pathname],
  );
  const railProjectStatus = reactExports.useMemo(() => {
    let hasUnread = unreadCompletedTaskCount > 0;
    for (const [workspaceId2, status] of workspaceStatusById) {
      if (workspaceId2 === currentWorkspaceId) continue;
      if (status.needsUserAction) return "needs-user-action";
      if (status.unread) hasUnread = true;
    }
    return hasUnread ? "unread" : null;
  }, [currentWorkspaceId, unreadCompletedTaskCount, workspaceStatusById]);
  const newProjectEntryActive = isActive2("/");
  const recentWorkspaceGroups = reactExports.useMemo(() => {
    if (!groupingEnabled) return [];
    const { pinned: pinnedProjects, unpinned: unpinnedProjects } =
      splitPinnedProjects(projects, pinnedProjectIds);
    return groupRecentWorkspacesByProject(
      unpinnedWorkspaceInventory,
      [...pinnedProjects, ...unpinnedProjects],
      projectCaseInsensitive,
    );
  }, [
    groupingEnabled,
    pinnedProjectIds,
    projectCaseInsensitive,
    projects,
    unpinnedWorkspaceInventory,
  ]);
  const [collapsedProjectIds, setCollapsedProjectIds] = reactExports.useState(
    () => new Set(readSidebarCollapseState().collapsedGroupKeys),
  );
  const [showAllProjectIds, setShowAllProjectIds] = reactExports.useState(
    () => new Set(),
  );
  const handleToggleProjectItems = reactExports.useCallback((projectId) => {
    setShowAllProjectIds((previous2) => {
      const next2 = new Set(previous2);
      if (next2.has(projectId)) next2.delete(projectId);
      else next2.add(projectId);
      return next2;
    });
  }, []);
  const handleToggleProjectExpanded = reactExports.useCallback((projectId) => {
    setCollapsedProjectIds((prev) => {
      const next2 = new Set(prev);
      if (next2.has(projectId)) next2.delete(projectId);
      else next2.add(projectId);
      return next2;
    });
  }, []);
  const [recentSectionCollapsed, setRecentSectionCollapsed] =
    reactExports.useState(
      () => readSidebarCollapseState().projectsSectionCollapsed,
    );
  const toggleRecentSectionCollapsed = reactExports.useCallback(() => {
    setRecentSectionCollapsed((prev) => !prev);
  }, []);
  const [pinnedSectionCollapsed, setPinnedSectionCollapsed] =
    reactExports.useState(false);
  const togglePinnedSectionCollapsed = reactExports.useCallback(() => {
    setPinnedSectionCollapsed((prev) => !prev);
  }, []);
  reactExports.useEffect(() => {
    persistSidebarCollapseState({
      collapsedGroupKeys: [...collapsedProjectIds],
      projectsSectionCollapsed: recentSectionCollapsed,
    });
  }, [collapsedProjectIds, recentSectionCollapsed]);
  const selectedProjectId = reactExports.useMemo(() => {
    const match2 = pathname.match(/^\/projects\/([^/]+)/);
    return match2 ? decodeURIComponent(match2[1]) : null;
  }, [pathname]);
  const handleRevealMovedWorkspace = reactExports.useCallback((projectId) => {
    setRecentSectionCollapsed(false);
    if (projectId)
      setShowAllProjectIds((previous2) => new Set(previous2).add(projectId));
    setCollapsedProjectIds((previous2) => {
      const next2 = new Set(previous2);
      next2.delete(projectId ?? UNGROUPED_RECENT_GROUP_KEY);
      return next2;
    });
  }, []);
  const handleProjectReorder = reactExports.useCallback(
    (source, target, position2) => {
      if (!isProjectPinned(source, pinnedProjectIds)) {
        void reorderProject(source, target, position2).catch(() => {
          dedupedToast.error(t2("common.saveFailed"));
        });
        return;
      }
      void setGlobalConfigAsync((previous2) => ({
        ...previous2,
        pinnedProjectIds: reorderPinnedProjectIds(
          previous2.pinnedProjectIds ?? [],
          source,
          target,
          position2,
        ),
      }));
    },
    [pinnedProjectIds, reorderProject, setGlobalConfigAsync, t2],
  );
  const projectDrag = useSidebarProjectDrag({
    draggedPath,
    draggedProjectId,
    sourceSection: draggedSection,
    sourceProjectId: draggedProjectIdRef.current,
    inventory: displayedWorkspaceInventory,
    currentInventory: workspaceInventory,
    projects,
    pinnedProjectIds,
    sortMode: recentProjectsSortMode,
    caseInsensitive: projectCaseInsensitive,
    scrollRef: sidebarScrollRef,
    onClearDrag: clearRecentDragState,
    onRowOver: handleRecentDragOver,
    onRowDrop: handleRecentDrop,
    onProjectReorder: handleProjectReorder,
    onMove: moveWorkspace,
    onReveal: handleRevealMovedWorkspace,
    holdPreviewOpen,
    releasePreviewHold,
  });
  const displayedGroups = reactExports.useMemo(() => {
    if (
      projectDrag.temporaryUngrouped &&
      !recentWorkspaceGroups.some((group) => !group.project)
    ) {
      return [
        ...recentWorkspaceGroups,
        {
          key: UNGROUPED_RECENT_GROUP_KEY,
          items: [],
        },
      ];
    }
    return recentWorkspaceGroups;
  }, [recentWorkspaceGroups, projectDrag.temporaryUngrouped]);
  const renderRecentRow = reactExports.useCallback(
    (item, section) => {
      const workspace = item.workspace;
      const dragPath = workspace.path;
      const authoritativeId = item.authoritativeEntry?.workspaceId;
      const ownerKey = projectWorkspaceKey(
        workspace.path,
        projectCaseInsensitive,
      );
      const recentKey = item.recentPath
        ? projectWorkspaceKey(item.recentPath, projectCaseInsensitive)
        : void 0;
      const currentProject =
        workspaceProjectById.get(ownerKey) ??
        (recentKey ? workspaceProjectById.get(recentKey) : void 0);
      return (
        <RecentProjectRow
          key={authoritativeId ?? workspace.path}
          workspace={workspace}
          renamePath={item.recentPath}
          active={Boolean(
            authoritativeId && authoritativeId === currentWorkspaceId,
          )}
          status={
            authoritativeId ? workspaceStatusById.get(authoritativeId) : void 0
          }
          onOpen={handleRecentClick}
          onDelete={item.recentPath ? () => handleRecentDelete(item) : void 0}
          onCloseRuntime={
            authoritativeId ? () => handleRecentCloseRuntime(item) : void 0
          }
          dragOver={
            groupingEnabled && section === "recent"
              ? projectDrag.rowTarget?.path === dragPath
                ? projectDrag.rowTarget.position
                : void 0
              : dragOverTarget?.path === dragPath
                ? dragOverTarget.position
                : void 0
          }
          dragging={draggedPath === dragPath}
          moveCompleted={projectDrag.completedPath === dragPath}
          draggable={!projectDrag.pendingMove}
          onDragStart={(event) =>
            handleRecentDragStart(event, dragPath, section)
          }
          onDragOver={(event) => {
            if (!groupingEnabled || section === "pinned")
              handleRecentDragOver(event, dragPath, section);
          }}
          onDrop={(event) => {
            if (!groupingEnabled || section === "pinned")
              handleRecentDrop(event, dragPath, section);
          }}
          onDragEnd={handleRecentDragEnd}
          onPreviewInteractionEnter={onPreviewInteractionEnter}
          onPreviewInteractionLeave={onPreviewInteractionLeave}
          holdPreviewOpen={holdPreviewOpen}
          releasePreviewHold={releasePreviewHold}
          loadThumbnail={loadRecentThumbnails}
          detailsEnabled={!compactRail}
          detailsOpen={
            !compactRail && activeRecentDetailsPath === workspace.path
          }
          onDetailsOpenChange={handleRecentDetailsOpenChange}
          projects={projects}
          currentProject={currentProject}
          onAddToProject={handleAddWorkspaceToProject}
          onRemoveFromProject={handleRemoveWorkspaceFromProject}
          pinned={isInventoryItemPinned(
            item,
            pinnedWorkspaceKeys,
            caseInsensitiveWorkspacePaths,
          )}
          onTogglePin={() => handleTogglePinWorkspace(item)}
        />
      );
    },
    [
      activeRecentDetailsPath,
      caseInsensitiveWorkspacePaths,
      compactRail,
      currentWorkspaceId,
      dragOverTarget,
      draggedPath,
      groupingEnabled,
      projectDrag.rowTarget,
      projectDrag.completedPath,
      projectDrag.pendingMove,
      handleAddWorkspaceToProject,
      handleRecentClick,
      handleRecentCloseRuntime,
      handleRecentDelete,
      handleRecentDetailsOpenChange,
      handleRecentDragEnd,
      handleRecentDragOver,
      handleRecentDragStart,
      handleRecentDrop,
      handleRemoveWorkspaceFromProject,
      handleTogglePinWorkspace,
      holdPreviewOpen,
      loadRecentThumbnails,
      onPreviewInteractionEnter,
      onPreviewInteractionLeave,
      releasePreviewHold,
      pinnedWorkspaceKeys,
      projectCaseInsensitive,
      projects,
      workspaceProjectById,
      workspaceStatusById,
    ],
  );
  const recentProjectsContent = reactExports.useMemo(
    () => (
      <>
        {pinnedInventoryItems.length > 0 ? (
          <>
            <div
              className="flex items-center pl-5 pr-1 pt-[18px] pb-1.5"
              data-action-ui-id="home-sidebar.pinned-header"
            >
              <button
                type="button"
                aria-label={
                  pinnedSectionCollapsed
                    ? t2("project.expand")
                    : t2("project.collapse")
                }
                aria-expanded={!pinnedSectionCollapsed}
                data-action-ui-id="home-sidebar.pinned-section-toggle"
                onClick={togglePinnedSectionCollapsed}
                className="flex items-center gap-1 text-[13px] text-[var(--home-sidebar-section-text)] font-normal cursor-pointer rounded-sm hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none"
              >
                <span>{t2("homeSidebar.pinned", "置顶")}</span>
                {pinnedSectionCollapsed ? (
                  <ChevronRight$1
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                )}
              </button>
            </div>
            {!pinnedSectionCollapsed ? (
              <ul
                className="flex shrink-0 flex-col gap-px"
                data-action-ui-id="home-sidebar.pinned-items"
              >
                {pinnedInventoryItems.map((item) =>
                  renderRecentRow(item, "pinned"),
                )}
              </ul>
            ) : null}
          </>
        ) : null}
        <div
          className="group flex items-center pl-5 pr-1 pt-[18px] pb-0.5"
          data-action-ui-id="home-sidebar.recent-header"
          data-right-inset="2"
        >
          {groupingEnabled ? (
            <button
              type="button"
              aria-label={
                recentSectionCollapsed
                  ? t2("project.expand")
                  : t2("project.collapse")
              }
              aria-expanded={!recentSectionCollapsed}
              data-action-ui-id="home-sidebar.recent-section-toggle"
              onClick={toggleRecentSectionCollapsed}
              className="flex items-center gap-1 text-[13px] text-[var(--home-sidebar-section-text)] font-normal cursor-pointer rounded-sm hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none"
            >
              <span>{t2("project.sidebarTitle")}</span>
              {recentSectionCollapsed ? (
                <ChevronRight$1
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0"
                />
              ) : (
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0"
                />
              )}
            </button>
          ) : (
            <span className="text-[13px] text-[var(--home-sidebar-section-text)] font-normal">
              {t2("homeSidebar.recentProjects")}
            </span>
          )}
          {!groupingEnabled ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("home.viewAll")}
                      data-action-ui-id="home-sidebar.recent-view-all"
                      onClick={handleOpenAllCreations}
                      className="icon-sidebar-action-control ml-1 flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-[80ms] hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                    >
                      <MonochromeIcon tone="control">
                        <ArrowUpRight
                          size={16}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </MonochromeIcon>
                    </button>
                  }
                />
                <TooltipContent side="top">{t2("home.viewAll")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <RecentProjectsHeaderActions
            sortMode={recentProjectsSortMode}
            onSortModeChange={handleRecentSortModeChange}
            groupMode={recentProjectsGroupMode}
            onGroupModeChange={handleRecentGroupModeChange}
            onCreateProject={groupingEnabled ? void 0 : requestNewProject}
            onSelectCreateKind={groupingEnabled ? setCreateProjectKind : void 0}
            createLabel={
              groupingEnabled
                ? t2("project.create.trigger")
                : t2("project.newCreation")
            }
            holdPreviewOpen={holdPreviewOpen}
            releasePreviewHold={releasePreviewHold}
          />
        </div>
        {groupingEnabled ? (
          <div className="flex shrink-0 flex-col gap-1">
            {displayedGroups.map((group) => {
              const projectId = group.project?.id;
              const toggleKey = projectId ?? UNGROUPED_RECENT_GROUP_KEY;
              const expanded = !collapsedProjectIds.has(toggleKey);
              const selected2 = Boolean(
                projectId && projectId === selectedProjectId,
              );
              const isUngrouped = !group.project;
              const showAllItems =
                !projectId || showAllProjectIds.has(projectId);
              const visibleItems = showAllItems
                ? group.items
                : group.items.slice(0, PROJECT_PREVIEW_ITEM_LIMIT);
              if (recentSectionCollapsed && !isUngrouped) return null;
              const isProjectPinnedFlag = projectId
                ? isProjectPinned(projectId, pinnedProjectIds)
                : false;
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: drag-only drop zone for the ungrouped bucket; rows inside stay interactive.
                <section
                  key={group.key}
                  role="presentation"
                  data-action-ui-id="home-sidebar.recent-group"
                  data-project-id={projectId ?? "ungrouped"}
                  data-drop-highlight={
                    projectDrag.groupTarget?.projectId === (projectId ?? null)
                      ? "group"
                      : void 0
                  }
                  className={cn$2(
                    "flex flex-col gap-0.5",
                    isUngrouped && "mt-4 [&:not(:first-child)]:mt-3",
                    projectDrag.groupTarget?.projectId ===
                      (projectId ?? null) && "sidebar-drop-group",
                  )}
                  onDragOver={(event) =>
                    projectDrag.handleGroupDrag(event, projectId ?? null, false)
                  }
                  onDrop={(event) =>
                    projectDrag.handleGroupDrag(event, projectId ?? null, true)
                  }
                >
                  <RecentProjectGroupHeader
                    project={group.project}
                    expanded={expanded}
                    onToggle={handleToggleProjectExpanded}
                    ungroupedToggleKey={
                      isUngrouped ? UNGROUPED_RECENT_GROUP_KEY : void 0
                    }
                    selected={selected2}
                    depth={0}
                    onNewCreation={requestNewProjectInProject}
                    onOpenDetail={handleOpenProjectDetail}
                    onRequestDelete={requestDelete}
                    onNewCreationUngrouped={
                      isUngrouped ? requestNewProject : void 0
                    }
                    onOpenAllUngrouped={
                      isUngrouped ? handleOpenAllCreations : void 0
                    }
                    ungroupedSortMode={
                      isUngrouped ? recentProjectsSortMode : void 0
                    }
                    onUngroupedSortModeChange={
                      isUngrouped ? handleRecentSortModeChange : void 0
                    }
                    holdPreviewOpen={holdPreviewOpen}
                    releasePreviewHold={releasePreviewHold}
                    pinned={isProjectPinnedFlag}
                    onTogglePin={
                      projectId
                        ? () => handleTogglePinProject(projectId)
                        : void 0
                    }
                    draggable={Boolean(projectId) && !projectDrag.pendingMove}
                    dragging={draggedProjectId === projectId}
                    dragOver={
                      projectDrag.projectTarget &&
                      projectDrag.projectTarget.id === projectId
                        ? projectDrag.projectTarget.position
                        : void 0
                    }
                    onDragStart={
                      projectId
                        ? (event) =>
                            handleProjectHeaderDragStart(event, projectId)
                        : void 0
                    }
                    onDragEnd={projectId ? handleProjectHeaderDragEnd : void 0}
                  />
                  {expanded ? (
                    group.items.length > 0 ? (
                      <ul
                        className="flex shrink-0 flex-col gap-0.5"
                        style={{
                          paddingLeft: isUngrouped ? 0 : 16,
                        }}
                        data-action-ui-id="home-sidebar.recent-group-items"
                      >
                        {visibleItems.map((item) =>
                          renderRecentRow(item, "recent"),
                        )}
                        {projectId &&
                        group.items.length > PROJECT_PREVIEW_ITEM_LIMIT ? (
                          <li>
                            <button
                              type="button"
                              className="flex h-8 w-full items-center pl-6 text-left text-[13px] font-normal text-[var(--home-sidebar-section-text)] rounded-md hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              aria-expanded={showAllItems}
                              data-action-ui-id="home-sidebar.project-items-toggle"
                              onClick={() =>
                                handleToggleProjectItems(projectId)
                              }
                            >
                              {t2(
                                showAllItems
                                  ? "project.sidebar.showLess"
                                  : "project.sidebar.showMore",
                              )}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p
                        className="flex h-[32px] items-center text-xs text-foreground/30 -mt-[6px]"
                        style={{
                          paddingLeft: 40,
                        }}
                        data-action-ui-id="home-sidebar.recent-group-empty"
                      >
                        {t2(
                          isUngrouped
                            ? "project.move.emptyUngrouped"
                            : "project.creationsEmptySidebar",
                        )}
                      </p>
                    )
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <ul className="flex shrink-0 flex-col gap-px">
            {unpinnedWorkspaceInventory.map((item) =>
              renderRecentRow(item, "recent"),
            )}
          </ul>
        )}
      </>
    ),
    [
      collapsedProjectIds,
      showAllProjectIds,
      handleToggleProjectItems,
      groupingEnabled,
      projectDrag.groupTarget,
      projectDrag.projectTarget,
      projectDrag.handleGroupDrag,
      projectDrag.pendingMove,
      draggedProjectId,
      displayedGroups,
      handleOpenAllCreations,
      handleOpenProjectDetail,
      handleProjectHeaderDragEnd,
      handleProjectHeaderDragStart,
      handleRecentGroupModeChange,
      handleRecentSortModeChange,
      handleTogglePinProject,
      handleToggleProjectExpanded,
      holdPreviewOpen,
      pinnedInventoryItems,
      pinnedProjectIds,
      pinnedSectionCollapsed,
      recentProjectsGroupMode,
      recentProjectsSortMode,
      recentSectionCollapsed,
      releasePreviewHold,
      toggleRecentSectionCollapsed,
      togglePinnedSectionCollapsed,
      renderRecentRow,
      requestNewProject,
      requestDelete,
      requestNewProjectInProject,
      unpinnedWorkspaceInventory,
      selectedProjectId,
      t2,
    ],
  );
  return (
    <aside
      aria-label={t2("topbar.toggleGlobalSidebar")}
      className="transparent-window-home-sidebar relative flex h-full shrink-0 flex-col bg-transparent"
      style={{
        width: sidebarWidth,
        "--home-sidebar-icon-axis": `${HOME_SIDEBAR_ICON_AXIS}px`,
      }}
      data-action-ui-id="home-sidebar"
      data-presentation={presentation}
      data-sidebar-density={compactRail ? "rail" : "full"}
      data-icon-axis={HOME_SIDEBAR_ICON_AXIS}
    >
      <div
        className={cn$2(
          "relative flex h-10 items-center justify-end",
          topChromeInset
            ? "mac-window-drag-region shrink-0"
            : "pointer-events-none absolute inset-x-0 top-2 z-10",
        )}
        data-action-ui-id="global-sidebar.chrome-inset"
        data-presentation={presentation}
        data-traffic-light-safe={topChromeInset ? "true" : "false"}
        style={
          // The sidebar always lays out at its expanded width. Clamp the hidden
          // rail chrome so its off-rail controls cannot cover the canvas.
          compactRail
            ? {
                width: GLOBAL_SIDEBAR_RAIL_WIDTH,
                paddingLeft: 0,
                overflow: "hidden",
              }
            : {
                paddingLeft: topChromeInset ? 76 : 4,
              }
        }
      >
        <div
          aria-hidden={compactRail}
          className={cn$2(
            "home-sidebar-chrome-controls home-sidebar-detail no-drag pointer-events-auto relative z-50 flex h-8 shrink-0 items-center gap-0.5",
            topChromeInset ? "mr-0.5" : "mr-[70px]",
          )}
          data-action-ui-id="home-sidebar.chrome-controls"
          data-control-alignment="right"
        >
          <div
            className="no-drag pointer-events-auto relative z-50 flex h-8 shrink-0 items-center gap-0.5"
            data-action-ui-id="home-sidebar.chrome-actions"
            data-layout-slot="window-sidebar-actions"
          >
            {topChromeInset && (
              <>
                <div
                  data-layout-slot="window-network-status"
                  data-status-position="left"
                >
                  <DiagnosticsStatusButton />
                </div>
                <SearchButton
                  dataActionUiId="home-sidebar.global-search"
                  onClick={handleGlobalSearch}
                />
                <GlobalSidebarToggle />
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn$2(
          "home-sidebar-brand-row relative flex h-10 shrink-0 items-center gap-1 pr-0.5",
          topChromeInset && "mac-window-drag-region",
          !topChromeInset && "mt-2",
        )}
        data-action-ui-id="home-sidebar.brand-row"
        data-icon-axis="32"
        style={
          compactRail
            ? {
                width: GLOBAL_SIDEBAR_RAIL_WIDTH,
                overflow: "hidden",
              }
            : void 0
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <div className="relative flex size-[22px] shrink-0 items-center justify-center">
            <span
              className="no-drag absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              data-action-ui-id="home-sidebar.brand-hover-hit-area"
              data-sidebar-preview-hotspot="true"
            >
              <span
                role="img"
                aria-label={t2("common.appName")}
                className="flex size-[22px] items-center justify-center"
                data-action-ui-id="home-sidebar.brand"
              >
                <HubLogo
                  size={22}
                  alt=""
                  aria-hidden="true"
                  eyeTrackingScope={'[data-action-ui-id="home-sidebar"]'}
                />
              </span>
            </span>
          </div>
          <HubWordmark
            width={92}
            height={14}
            alt=""
            aria-hidden="true"
            className="home-sidebar-detail min-w-0 max-w-[92px] flex-1 shrink"
          />
        </div>
        {!topChromeInset && (
          <div
            aria-hidden={compactRail}
            className={cn$2(
              "home-sidebar-detail ml-auto flex shrink-0 items-center gap-0.5",
              compactRail ? "pointer-events-none absolute right-0" : "no-drag",
            )}
            data-action-ui-id="home-sidebar.brand-actions"
            data-right-inset="2"
          >
            <div
              data-layout-slot="window-network-status"
              data-status-position="left"
            >
              <DiagnosticsStatusButton />
            </div>
            <GlobalSidebarToggle />
            <SearchButton
              surface="sidebar"
              dataActionUiId="home-sidebar.global-search"
              onClick={handleGlobalSearch}
            />
          </div>
        )}
      </div>
      <div className="shrink-0 pt-1">
        <div>
          <SidebarNavButton
            item={{
              to: "/",
              icon: Plus,
              iconClassName: newProjectEntryActive
                ? void 0
                : "home-new-task-icon rounded-full",
              iconSize: HOME_NEW_TASK_PLUS_SIZE,
              label: t2("home.newProject"),
              badgeTarget: "launchpad",
              releaseBadge: sidebarBadges.launchpad,
            }}
            active={newProjectEntryActive}
            onClick={handleNavClick}
            compact={compactRail}
          />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {canScrollUp && (
          <div
            className="home-sidebar-scroll-divider"
            data-action-ui-id="home-sidebar.scroll-divider"
            aria-hidden="true"
          />
        )}
        <section
          ref={sidebarScrollRef}
          aria-label={t2("homeSidebar.navigation", "Sidebar navigation")}
          data-action-ui-id="home-sidebar.scroll"
          className={cn$2(
            "home-sidebar-scroll flex h-full min-h-0 flex-col overflow-y-auto scrollbar-none",
            hasSidebarOverflow && "home-sidebar-scroll-mask-active",
            canScrollUp && "home-sidebar-scroll-mask-top",
            canScrollDown && "home-sidebar-scroll-mask-bottom",
          )}
        >
          <div
            ref={sidebarContentRef}
            data-action-ui-id="home-sidebar.scroll-content"
            className={cn$2(
              "flex shrink-0 flex-col",
              hasSidebarOverflow && HOME_RECENT_SCROLL_BOTTOM_SAFE_AREA_CLASS,
            )}
          >
            <div className="group relative flex h-9 w-full items-center">
              <button
                type="button"
                aria-label={
                  compactRail || projectsBadge
                    ? `${t2("project.hubTitle")}${projectsBadge ? `, ${projectsBadge.label}` : ""}`
                    : void 0
                }
                title={compactRail ? t2("project.hubTitle") : void 0}
                aria-current={isActive2("/projects") ? "page" : void 0}
                data-action-ui-id="home-sidebar-nav-projects"
                onClick={() => handleNavClick("/projects")}
                className={cn$2(
                  HOME_NAV_BUTTON_CLASS,
                  "icon-sidebar-nav-control min-w-0 flex-1",
                  isActive2("/projects")
                    ? "text-foreground"
                    : HOME_NAV_INACTIVE_TEXT_CLASS,
                )}
              >
                <span
                  className={cn$2(
                    HOME_NAV_PILL_CLASS,
                    compactRail && HOME_RAIL_PILL_CLASS,
                    isActive2("/projects")
                      ? HOME_NAV_ACTIVE_CLASS
                      : HOME_NAV_HOVER_CLASS,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0"
                    data-action-ui-id="home-sidebar-nav-projects-coachmark-anchor"
                    data-presentation={compactRail ? "rail" : "full"}
                    style={{
                      width: compactRail ? GLOBAL_SIDEBAR_RAIL_WIDTH : "100%",
                    }}
                  />
                  <span
                    className={cn$2(HOME_NAV_ICON_SLOT_CLASS, "relative")}
                    data-action-ui-id="home-sidebar.nav-icon-slot"
                  >
                    <MonochromeIcon tone="control">
                      <FolderOpen size={HOME_NAV_ICON_SIZE} strokeWidth={1.5} />
                    </MonochromeIcon>
                    {compactRail && railProjectStatus ? (
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-brand-accent ring-1 ring-[var(--topbar-transparent-bg)]"
                        data-action-ui-id="home-sidebar.rail-project-status"
                        data-status={railProjectStatus}
                      />
                    ) : compactRail ? (
                      <SidebarReleaseBadge
                        compact={true}
                        target="projects"
                        releaseBadge={projectsBadge}
                      />
                    ) : null}
                  </span>
                  <span className="home-sidebar-detail truncate leading-[normal]">
                    {t2("project.hubTitle")}
                  </span>
                  {!compactRail ? (
                    <SidebarReleaseBadge
                      target="projects"
                      releaseBadge={projectsBadge}
                    />
                  ) : null}
                </span>
              </button>
            </div>
            <div className="flex flex-col">
              <TooltipProvider>
                {SECTION_NAV_ITEMS.map((item) => (
                  <SidebarNavButton
                    key={item.to}
                    item={item}
                    active={isActive2(item.to)}
                    onClick={handleNavClick}
                    compact={compactRail}
                  />
                ))}
              </TooltipProvider>
            </div>
            <div
              aria-hidden={compactRail}
              data-action-ui-id="home-sidebar.recent-projects"
              hidden={compactRail}
            >
              {recentProjectsContent}
            </div>
          </div>
        </section>
      </div>
      <div
        className="home-sidebar-footer relative w-full shrink-0 py-2"
        data-icon-axis="32"
        style={
          compactRail
            ? {
                width: GLOBAL_SIDEBAR_RAIL_WIDTH,
              }
            : void 0
        }
      >
        <SidebarUserMenu
          popupPosition="top-right"
          showUsername={!compactRail}
          onChangelog={() => setChangelogOpen(true)}
          onOverlayOpenChange={onOverlayOpenChange}
          trailingAction={
            <span
              className="update-sidebar-slot inline-flex h-7 shrink-0 items-center"
              data-action-ui-id="update.sidebar.slot"
              data-sidebar-compact={compactRail ? "true" : "false"}
            >
              <UpdateSidebarWidget compact={compactRail} />
            </span>
          }
        />
      </div>
      <MoveWorkspaceDialog
        move={projectDrag.pendingMove?.summary ?? null}
        submitting={projectDrag.submitting}
        error={projectDrag.error}
        onCancel={projectDrag.handleCancel}
        onConfirm={() => void projectDrag.handleConfirm()}
      />
      {newProjectDialog}
      <DissolveProjectDialog
        project={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <CreateProjectDialog
        open={createProjectKind !== null}
        kind={createProjectKind ?? "local"}
        onConfirm={handleCreateProject}
        onOpenChange={(open) => {
          if (!open) setCreateProjectKind(null);
        }}
      />
      <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogTitle className="text-sm font-heading font-medium">
            {t2("homeSidebar.changelog")}
          </DialogTitle>
          <ChangelogTable rows={changelogRows} onRowClick={setSelectedRow} />
        </DialogContent>
      </Dialog>
      <ChangelogDetailDialog
        item={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
      {!compactRail ? (
        <ResizeColHandle
          tabIndex={0}
          aria-label={t2("a11y.resizeGlobalSidebar")}
          aria-orientation="vertical"
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={sidebarWidth}
          data-action-ui-id="home-sidebar.resize-handle"
          data-global-sidebar-hover-region="true"
          baseClassName="no-drag absolute inset-y-0 -right-1 z-30 m-0 h-full w-2 cursor-col-resize border-0 bg-transparent p-0"
          indicatorVariant="grip"
          onMouseDown={handleResizeMouseDown}
          onValueChange={handleResizeValueChange}
          onDoubleClick={resetSidebarWidth}
        />
      ) : null}
    </aside>
  );
}
