// topbar-provider.jsx
import {
  reactExports,
  useNavigate,
  usePlatform,
  useStorage,
  useTranslation,
  workspaceLog,
} from "../vendor.js";
import { visiblePreviewTabsStore } from "./create-visible-preview-tabs-store.js";
import {
  pruneWorkspaceBundleCache,
  services,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  buildWorkspaceSearch,
  getNextPreviewTabIdAfterHide,
  resolveVisiblePreviewEntries,
  useNavigateToWorkspace,
} from "./use-deep-link-router.js";
import {
  INotificationMainService,
  instantiationService,
} from "./home-service.jsx";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import {
  hideVisiblePreviewTabs,
  requestWorkspaceRuntimeClose,
} from "../assets/credit-query-keys.jsx";
import { showVisiblePreviewTab } from "./show-visible-preview-tab.js";
import {
  useIsKnownWorkspacePath,
  usePersistPickedWorkspaceName,
} from "./tool-label-definitions.js";
import { useProjectActions } from "../settings/use-project-actions.js";
import {
  handleNewWorkspaceOpenResult,
  stageWorkspacePreview,
} from "./context-menu-content.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  normalizeWorkspaceId,
  setTopbarActiveWorkspaceSnapshot,
  useActiveRuntime,
} from "../settings/use-active-runtime.js";
import { useWorkspaceFocusNavigation } from "./use-workspace-focus-navigation.js";
import {
  TopbarActionsContext,
  TopbarStateContext,
} from "./topbar-state-context.jsx";
import { workspaceDisplayName } from "../generation/use-model-catalog-scope-key.js";
function useVisiblePreviewTabsSnapshot() {
  return reactExports.useSyncExternalStore(
    visiblePreviewTabsStore.subscribe,
    visiblePreviewTabsStore.getSnapshot,
    visiblePreviewTabsStore.getSnapshot,
  );
}
function useWindowTitleSync(entries2, currentWorkspaceId, platform2) {
  reactExports.useEffect(() => {
    const active2 = entries2.find(
      (e2) => e2.workspaceId === currentWorkspaceId,
    );
    const title = active2
      ? `${active2.projectName} - MiniMax Design`
      : "MiniMax Design";
    platform2.window.setTitle(title);
  }, [currentWorkspaceId, entries2, platform2.window]);
}
function useLastActivePersistence(currentWorkspaceId, platform2) {
  reactExports.useEffect(() => {
    if (currentWorkspaceId) {
      platform2.storage
        ?.globalSet("lastActiveWorkspacePath", currentWorkspaceId)
        .catch(() => {});
    }
  }, [currentWorkspaceId, platform2.storage]);
}
const COMPLETED_TASK_LIMIT = 20;
function getTaskCompletionKey(task) {
  const prompt = task.promptPreview?.trim();
  return prompt
    ? `${task.workspaceId}:prompt:${prompt}`
    : `${task.workspaceId}:task:${task.id}`;
}
const listeners = new Set();
let emitScheduled = false;
function scheduleEmit() {
  if (emitScheduled) return;
  emitScheduled = true;
  queueMicrotask(() => {
    emitScheduled = false;
    for (const listener of listeners) listener();
  });
}
function shallowEqualObject(previous2, next2) {
  if (Object.is(previous2, next2)) return true;
  const previousKeys = Object.keys(previous2);
  const nextKeys = Object.keys(next2);
  if (previousKeys.length !== nextKeys.length) return false;
  return previousKeys.every(
    (key2) =>
      Object.hasOwn(next2, key2) && Object.is(previous2[key2], next2[key2]),
  );
}
function areShallowEqualArrays(previous2, next2) {
  if (Object.is(previous2, next2)) return true;
  if (previous2.length !== next2.length) return false;
  return previous2.every((item, index2) =>
    shallowEqualObject(item, next2[index2]),
  );
}
function areTopbarSnapshotsEqual(previous2, next2) {
  return (
    areShallowEqualArrays(previous2.sessions, next2.sessions) &&
    areShallowEqualArrays(previous2.tasks, next2.tasks)
  );
}
let snapshots = new Map();
function setTopbarSnapshot(workspaceId2, snapshot2) {
  const previousSnapshot = snapshots.get(workspaceId2);
  if (previousSnapshot && areTopbarSnapshotsEqual(previousSnapshot, snapshot2))
    return;
  snapshots = new Map(snapshots).set(workspaceId2, snapshot2);
  scheduleEmit();
}
function pruneTopbarSnapshots(activeWorkspaceIds) {
  let changed = false;
  const next2 = new Map(snapshots);
  for (const id2 of next2.keys()) {
    if (!activeWorkspaceIds.has(id2)) {
      next2.delete(id2);
      changed = true;
    }
  }
  if (!changed) return;
  snapshots = next2;
  scheduleEmit();
}
function getTopbarSnapshots() {
  return snapshots;
}
function subscribeTopbarSnapshots(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getNextWorkspaceIdAfterClose(entries2, closingWorkspaceId) {
  return getNextPreviewTabIdAfterHide(
    entries2.map((entry) => entry.workspaceId),
    closingWorkspaceId,
  );
}
function performWorkspacePreviewHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  activeTaskCount,
  source,
  effects,
) {
  const nextWorkspaceId = getNextWorkspaceIdAfterClose(entries2, workspaceId2);
  const wasActive = workspaceId2 === currentWorkspaceId;
  effects.record({
    workspaceId: workspaceId2,
    source,
    wasActive,
    activeTaskCount,
    ...(nextWorkspaceId
      ? {
          nextWorkspaceId,
        }
      : {}),
  });
  effects.hidePreview(workspaceId2);
  if (wasActive) {
    if (nextWorkspaceId) {
      effects.activateWorkspace(nextWorkspaceId);
    } else {
      effects.activateHome();
    }
  }
  effects.requestRuntimeClose(workspaceId2, source);
}
function performWorkspacePreviewsBatchHide(
  workspaceId2,
  currentWorkspaceId,
  hiddenWorkspaceIds,
  source,
  effects,
) {
  if (hiddenWorkspaceIds.length === 0) return;
  const currentWasHidden = Boolean(
    currentWorkspaceId && hiddenWorkspaceIds.includes(currentWorkspaceId),
  );
  effects.hidePreviews(hiddenWorkspaceIds);
  effects.record({
    source,
    keptWorkspaceId: workspaceId2,
    hiddenWorkspaceIds,
  });
  if (currentWasHidden) effects.activateWorkspace(workspaceId2);
  for (const hiddenWorkspaceId of hiddenWorkspaceIds) {
    effects.requestRuntimeClose(hiddenWorkspaceId, source);
  }
}
function performOtherWorkspacePreviewsHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  effects,
) {
  if (!entries2.some((entry) => entry.workspaceId === workspaceId2)) return;
  performWorkspacePreviewsBatchHide(
    workspaceId2,
    currentWorkspaceId,
    entries2
      .filter((entry) => entry.workspaceId !== workspaceId2)
      .map((entry) => entry.workspaceId),
    "topbar-context-close-others",
    effects,
  );
}
function performWorkspacePreviewsToRightHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  effects,
) {
  const index2 = entries2.findIndex(
    (entry) => entry.workspaceId === workspaceId2,
  );
  if (index2 === -1) return;
  performWorkspacePreviewsBatchHide(
    workspaceId2,
    currentWorkspaceId,
    entries2.slice(index2 + 1).map((entry) => entry.workspaceId),
    "topbar-context-close-right",
    effects,
  );
}
async function activateWorkspaceIfAvailable(
  hiloApp2,
  workspaceId2,
  navigateToWorkspaceId,
) {
  const runtime = await hiloApp2.activateWorkspace(workspaceId2);
  if (!runtime) return;
  await navigateToWorkspaceId(runtime.workspaceId);
}
function shouldActivateWorkspaceThroughRoute(entries2, workspaceId2) {
  const entry = entries2.find(
    (candidate) => candidate.workspaceId === workspaceId2,
  );
  return Boolean(entry && !entry.gatewayUrl);
}
let _service = null;
function getNotificationMainService() {
  if (!_service) {
    _service = services.get(INotificationMainService);
  }
  return _service;
}
function notifyTaskNeedsUserAction(
  task,
  t2,
  onNotificationShown,
  onNotificationSettled,
) {
  const needsAnswer = task.status === "needs-answer";
  const title = needsAnswer
    ? t2("topbar.notification.taskNeedsAnswerTitle", "Waiting for your answer")
    : t2(
        "topbar.notification.taskNeedsConfirmationTitle",
        "Waiting for your confirmation",
      );
  const body2 = task.promptPreview
    ? needsAnswer
      ? t2(
          "topbar.notification.taskNeedsAnswerBody",
          '"{{prompt}}" is waiting for your answer. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
      : t2(
          "topbar.notification.taskNeedsConfirmationBody",
          '"{{prompt}}" is waiting for your confirmation. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
    : needsAnswer
      ? t2(
          "topbar.notification.taskNeedsAnswerFallbackBody",
          "The Agent is waiting for your answer. Click to continue.",
        )
      : t2(
          "topbar.notification.taskNeedsConfirmationFallbackBody",
          "The Agent is waiting for your confirmation. Click to continue.",
        );
  void getNotificationMainService()
    .show({
      title,
      body: body2,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show user-action notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function getTaskCompletionBody(count2, promptPreview, t2) {
  if (count2 === 1) {
    return promptPreview
      ? t2(
          "topbar.notification.taskCompletedBody",
          "“{{prompt}}” has finished generating. Click to view the result.",
          {
            prompt: promptPreview,
          },
        )
      : t2(
          "topbar.notification.taskCompletedFallbackBody",
          "Your generation is complete. Click to view the result.",
        );
  }
  return promptPreview
    ? t2(
        "topbar.notification.multipleTasksCompletedBody",
        "{{count}} generation tasks including “{{prompt}}” are complete. Click to view results.",
        {
          prompt: promptPreview,
          count: count2,
        },
      )
    : t2(
        "topbar.notification.multipleTasksCompletedFallbackBody",
        "{{count}} generation tasks are complete. Click to view results.",
        {
          count: count2,
        },
      );
}
function notifyTaskCompletion(
  tasks,
  t2,
  onNotificationShown,
  onNotificationSettled,
) {
  if (tasks.length === 0) return;
  const first2 = tasks[0];
  const promptPreview = first2.promptPreview;
  const title =
    tasks.length === 1
      ? t2("topbar.notification.taskCompletedTitle", "Generation complete")
      : t2(
          "topbar.notification.multipleTasksCompletedTitle",
          "Multiple generations complete",
        );
  const body2 = getTaskCompletionBody(tasks.length, promptPreview, t2);
  void getNotificationMainService()
    .show({
      title,
      body: body2,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show completion notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function useCompletedTasks(entries2, options = {}) {
  const { t: t2 } = useTranslation();
  const [completedTasks, setCompletedTasks] = reactExports.useState([]);
  const [unreadCompletedTaskIds, setUnreadCompletedTaskIds] =
    reactExports.useState(() => new Set());
  const notificationTargetsRef = reactExports.useRef(new Map());
  const earlyClickedNotificationIdsRef = reactExports.useRef(new Set());
  const pendingNotificationsRef = reactExports.useRef(0);
  const activeWorkspaceIdRef = reactExports.useRef(
    options.activeWorkspaceId ?? null,
  );
  const onCompletionNotificationClickRef = reactExports.useRef(
    options.onCompletionNotificationClick,
  );
  const recentCompletionKeysRef = reactExports.useRef(new Set());
  const activeUserActionKeysRef = reactExports.useRef(new Set());
  reactExports.useEffect(() => {
    activeWorkspaceIdRef.current = options.activeWorkspaceId ?? null;
    onCompletionNotificationClickRef.current =
      options.onCompletionNotificationClick;
  }, [options.activeWorkspaceId, options.onCompletionNotificationClick]);
  const markCompletedTasksRead = reactExports.useCallback(() => {
    setUnreadCompletedTaskIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);
  const handleNotificationTargetClick = reactExports.useCallback(
    (target) => {
      if (target.kind === "completion") markCompletedTasksRead();
      onCompletionNotificationClickRef.current?.(target.task);
    },
    [markCompletedTasksRead],
  );
  const markWorkspaceCompletedTasksRead = reactExports.useCallback(
    (workspaceId2) => {
      setUnreadCompletedTaskIds((prev) => {
        if (prev.size === 0) return prev;
        const completedTaskById = new Map(
          completedTasks.map((task) => [task.id, task]),
        );
        const workspaceTaskIdPrefix = `${workspaceId2}:`;
        const next2 = new Set(
          [...prev].filter((taskId) => {
            const task = completedTaskById.get(taskId);
            return (
              task?.workspaceId !== workspaceId2 &&
              !taskId.startsWith(workspaceTaskIdPrefix)
            );
          }),
        );
        return next2.size === prev.size ? prev : next2;
      });
    },
    [completedTasks],
  );
  reactExports.useEffect(() => {
    const notificationService = getNotificationMainService();
    const clickDisposable = notificationService.onDidClickNotification(
      (notificationId) => {
        const target = notificationTargetsRef.current.get(notificationId);
        if (target) {
          notificationTargetsRef.current.delete(notificationId);
          handleNotificationTargetClick(target);
          return;
        }
        if (pendingNotificationsRef.current <= 0) return;
        earlyClickedNotificationIdsRef.current.add(notificationId);
      },
    );
    const closeDisposable = notificationService.onDidCloseNotification(
      (notificationId) => {
        notificationTargetsRef.current.delete(notificationId);
        earlyClickedNotificationIdsRef.current.delete(notificationId);
      },
    );
    return () => {
      clickDisposable.dispose();
      closeDisposable.dispose();
    };
  }, [handleNotificationTargetClick]);
  reactExports.useEffect(() => {
    const currentKeys = new Set();
    const newlyActionable = [];
    for (const task of options.activeTasks ?? []) {
      if (
        task.status !== "needs-answer" &&
        task.status !== "needs-confirmation"
      )
        continue;
      const key2 = `${task.id}:${task.status}:${task.userActionId ?? "current"}`;
      currentKeys.add(key2);
      if (activeUserActionKeysRef.current.has(key2)) continue;
      if (task.workspaceId === activeWorkspaceIdRef.current) continue;
      newlyActionable.push(task);
    }
    activeUserActionKeysRef.current = currentKeys;
    for (const task of newlyActionable) {
      const target = {
        task,
        kind: "user-action",
      };
      pendingNotificationsRef.current += 1;
      notifyTaskNeedsUserAction(
        task,
        t2,
        (notificationId) => {
          if (earlyClickedNotificationIdsRef.current.delete(notificationId)) {
            handleNotificationTargetClick(target);
            return;
          }
          notificationTargetsRef.current.set(notificationId, target);
        },
        () => {
          pendingNotificationsRef.current = Math.max(
            0,
            pendingNotificationsRef.current - 1,
          );
        },
      );
    }
  }, [handleNotificationTargetClick, options.activeTasks, t2]);
  const reportTaskCompleted = reactExports.useCallback(
    (task) => {
      if (task.source === "canvas") return;
      const key2 = getTaskCompletionKey(task);
      if (recentCompletionKeysRef.current.has(key2)) return;
      recentCompletionKeysRef.current.add(key2);
      const notificationTarget = {
        task,
        kind: "completion",
      };
      pendingNotificationsRef.current += 1;
      notifyTaskCompletion(
        [task],
        t2,
        (notificationId) => {
          if (earlyClickedNotificationIdsRef.current.delete(notificationId)) {
            handleNotificationTargetClick(notificationTarget);
            return;
          }
          notificationTargetsRef.current.set(
            notificationId,
            notificationTarget,
          );
        },
        () => {
          pendingNotificationsRef.current = Math.max(
            0,
            pendingNotificationsRef.current - 1,
          );
        },
      );
      setUnreadCompletedTaskIds((existing) => {
        if (task.workspaceId === activeWorkspaceIdRef.current) return existing;
        const next2 = new Set(existing);
        next2.add(task.id);
        return next2;
      });
      setCompletedTasks((existing) => {
        const seen2 = new Set();
        const merged = [];
        for (const t22 of [task, ...existing]) {
          if (seen2.has(t22.id)) continue;
          seen2.add(t22.id);
          merged.push(t22);
          if (merged.length >= COMPLETED_TASK_LIMIT) break;
        }
        return merged;
      });
    },
    [handleNotificationTargetClick, t2],
  );
  reactExports.useEffect(() => {
    const openIds = new Set(entries2.map((entry) => entry.workspaceId));
    setCompletedTasks((prev) => {
      const filtered = prev.filter((task) => openIds.has(task.workspaceId));
      return filtered.length === prev.length ? prev : filtered;
    });
    for (const key2 of recentCompletionKeysRef.current) {
      const wsId = key2.split(":")[0];
      if (!openIds.has(wsId)) recentCompletionKeysRef.current.delete(key2);
    }
  }, [entries2]);
  reactExports.useEffect(() => {
    const completedIds = new Set(completedTasks.map((task) => task.id));
    setUnreadCompletedTaskIds((prev) => {
      const next2 = new Set(
        [...prev].filter((taskId) => completedIds.has(taskId)),
      );
      return next2.size === prev.size ? prev : next2;
    });
  }, [completedTasks]);
  const dismissCompletedTask = reactExports.useCallback((taskId) => {
    setUnreadCompletedTaskIds((prev) => {
      if (!prev.has(taskId)) return prev;
      const next2 = new Set(prev);
      next2.delete(taskId);
      return next2;
    });
    setCompletedTasks((prev) => {
      const next2 = prev.filter((t22) => t22.id !== taskId);
      return next2.length === prev.length ? prev : next2;
    });
  }, []);
  const unreadCompletedTasks = reactExports.useMemo(
    () => completedTasks.filter((task) => unreadCompletedTaskIds.has(task.id)),
    [completedTasks, unreadCompletedTaskIds],
  );
  return {
    completedTasks,
    unreadCompletedTaskCount: unreadCompletedTaskIds.size,
    unreadCompletedTasks,
    reportTaskCompleted,
    dismissCompletedTask,
    markCompletedTasksRead,
    markWorkspaceCompletedTasksRead,
  };
}
function useTopbarEntries() {
  const [entries2, setEntries] = reactExports.useState([]);
  const [workspaceSnapshots, setWorkspaceSnapshots] = reactExports.useState(
    () => getTopbarSnapshots(),
  );
  const visiblePreviewTabs = useVisiblePreviewTabsSnapshot();
  const hiloApp2 = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const applyEntries = reactExports.useCallback((rawList) => {
    const liveIds = new Set(rawList.map((e2) => e2.workspaceId));
    visiblePreviewTabsStore.initialize(rawList);
    setEntries(rawList);
    pruneTopbarSnapshots(liveIds);
    pruneWorkspaceBundleCache(liveIds);
  }, []);
  reactExports.useEffect(() => {
    let disposed = false;
    const disposable = hiloApp2.onWorkspaceEntriesChanged((list2) =>
      applyEntries(list2),
    );
    hiloApp2.listWorkspaceEntries().then((list2) => {
      if (!disposed) applyEntries(list2);
    });
    return () => {
      disposed = true;
      disposable.dispose();
    };
  }, [hiloApp2, applyEntries]);
  reactExports.useEffect(
    () =>
      subscribeTopbarSnapshots(() =>
        setWorkspaceSnapshots(getTopbarSnapshots()),
      ),
    [],
  );
  const previewEntries = reactExports.useMemo(
    () => resolveVisiblePreviewEntries(entries2, visiblePreviewTabs.tabs),
    [entries2, visiblePreviewTabs.tabs],
  );
  const reorderTabs = reactExports.useCallback((activeId, overId) => {
    visiblePreviewTabsStore.reorder(activeId, overId);
  }, []);
  const reportWorkspaceSnapshot = reactExports.useCallback(
    (workspaceId2, snapshot2) => {
      setTopbarSnapshot(workspaceId2, snapshot2);
    },
    [],
  );
  return {
    entries: entries2,
    previewEntries,
    workspaceSnapshots,
    hiloApp: hiloApp2,
    reorderTabs,
    reportWorkspaceSnapshot,
  };
}
function useTopbarNavigation(
  hiloApp2,
  allEntries,
  previewEntries,
  currentWorkspaceId,
  workspaceSnapshots,
) {
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const navigateToWorkspace = useNavigateToWorkspace();
  const persistPickedWorkspaceName = usePersistPickedWorkspaceName();
  const isKnownWorkspacePath = useIsKnownWorkspacePath();
  const { addWorkspaceToProject } = useProjectActions();
  const allEntriesRef = reactExports.useRef(allEntries);
  allEntriesRef.current = allEntries;
  const entriesRef = reactExports.useRef(previewEntries);
  entriesRef.current = previewEntries;
  const currentWorkspaceIdRef = reactExports.useRef(currentWorkspaceId);
  currentWorkspaceIdRef.current = currentWorkspaceId;
  const workspaceSnapshotsRef = reactExports.useRef(workspaceSnapshots);
  workspaceSnapshotsRef.current = workspaceSnapshots;
  const activateHome = reactExports.useCallback(() => {
    void hiloApp2.activateHome();
    void navigate({
      to: "/",
    });
  }, [hiloApp2, navigate]);
  const activateWorkspace = reactExports.useCallback(
    (workspaceId2) => {
      showVisiblePreviewTab(workspaceId2);
      if (
        shouldActivateWorkspaceThroughRoute(allEntriesRef.current, workspaceId2)
      ) {
        void navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(workspaceId2),
        });
        return;
      }
      void activateWorkspaceIfAvailable(
        hiloApp2,
        workspaceId2,
        (activatedWorkspaceId) => {
          showVisiblePreviewTab(activatedWorkspaceId);
          return navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(activatedWorkspaceId),
          });
        },
      ).catch((err) => {
        console.error("[Topbar] activateWorkspace failed:", err);
      });
    },
    [hiloApp2, navigate],
  );
  const requestRuntimeClose = reactExports.useCallback(
    (workspaceId2, source) => {
      void requestWorkspaceRuntimeClose(hiloApp2, workspaceId2, source);
    },
    [hiloApp2],
  );
  const closeWorkspace = reactExports.useCallback(
    (workspaceId2, source = "topbar") => {
      const activeTaskCount =
        workspaceSnapshotsRef.current.get(workspaceId2)?.tasks.length ?? 0;
      performWorkspacePreviewHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        activeTaskCount,
        source,
        {
          hidePreview: (id2) => hideVisiblePreviewTabs(id2),
          activateWorkspace,
          activateHome,
          requestRuntimeClose,
          record: (properties2) =>
            recordAction("workspace:preview-hidden", properties2),
        },
      );
    },
    [activateHome, activateWorkspace, requestRuntimeClose],
  );
  const closeOtherWorkspacePreviews = reactExports.useCallback(
    (workspaceId2) => {
      performOtherWorkspacePreviewsHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids2) => hideVisiblePreviewTabs(ids2),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties2) =>
            recordAction("workspace:preview-hidden-batch", properties2),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const closeWorkspacePreviewsToRight = reactExports.useCallback(
    (workspaceId2) => {
      performWorkspacePreviewsToRightHide(
        entriesRef.current,
        workspaceId2,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids2) => hideVisiblePreviewTabs(ids2),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties2) =>
            recordAction("workspace:preview-hidden-batch", properties2),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const createWorkspace = reactExports.useCallback(
    async (name2, options, navigateOptions) => {
      const pickedFolder = options?.folderPath;
      const targetProjectId = options?.projectId;
      if (pickedFolder) {
        workspaceLog.info("topbar: open-workspace-start", {
          source: "topbar-new",
        });
      }
      const alreadyKnown = pickedFolder
        ? await isKnownWorkspacePath(pickedFolder)
        : false;
      if (pickedFolder && alreadyKnown) {
        if (targetProjectId)
          await addWorkspaceToProject(
            pickedFolder,
            targetProjectId,
            "workspace-create",
          );
        const staged = await stageWorkspacePreview({
          hiloApp: hiloApp2,
          folderPath: pickedFolder,
          t: t2,
          onStaged: (entry) =>
            navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(entry.workspaceId, navigateOptions),
            }),
        });
        return Boolean(staged);
      }
      const result = await hiloApp2.createWorkspaceWithResult({
        name: name2,
        folderPath: pickedFolder,
        projectId: targetProjectId,
        parentFolderPath: options?.parentFolderPath,
        loadUserMemory: options?.loadUserMemory,
        allowDataDirectoryFallback: options?.allowDataDirectoryFallback,
      });
      if (pickedFolder) {
        workspaceLog.info("topbar: open-workspace-result", {
          kind: result.kind,
        });
        if ((result.kind === "opened" || result.kind === "reused") && name2) {
          await persistPickedWorkspaceName(result.runtime.folderPath, name2);
        }
      }
      if (
        targetProjectId &&
        (result.kind === "opened" || result.kind === "reused")
      ) {
        await addWorkspaceToProject(
          result.runtime.folderPath,
          targetProjectId,
          "workspace-create",
        );
      }
      return Boolean(
        handleNewWorkspaceOpenResult(
          result,
          t2,
          (runtime) => navigateToWorkspace(runtime, navigateOptions),
          alreadyKnown,
        ),
      );
    },
    [
      addWorkspaceToProject,
      hiloApp2,
      isKnownWorkspacePath,
      navigate,
      navigateToWorkspace,
      persistPickedWorkspaceName,
      t2,
    ],
  );
  const openWorkspaceFromDialog = reactExports.useCallback(() => {
    void (async () => {
      const paths = await platform2.fs.showOpenDialog?.({
        directory: true,
      });
      const folderPath = paths?.[0];
      if (!folderPath) return;
      await stageWorkspacePreview({
        hiloApp: hiloApp2,
        folderPath,
        t: t2,
        onStaged: (entry) =>
          navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(entry.workspaceId),
          }),
      });
    })();
  }, [hiloApp2, navigate, platform2.fs, t2]);
  return {
    activateHome,
    activateWorkspace,
    closeWorkspace,
    closeOtherWorkspacePreviews,
    closeWorkspacePreviewsToRight,
    createWorkspace,
    openWorkspaceFromDialog,
  };
}
export function TopbarProvider({ children: children2 }) {
  const platform2 = usePlatform();
  const routerLocation = useRouterState({
    select: (state2) => ({
      pathname: state2.location.pathname,
      search: state2.location.search,
    }),
  });
  const routerSearch = routerLocation.search;
  const isWorkspaceRoute = routerLocation.pathname.startsWith("/workspace");
  const currentWorkspaceId =
    normalizeWorkspaceId(routerSearch?.workspaceId) ?? null;
  const isHomeActive = currentWorkspaceId === null;
  const {
    entries: rawEntries,
    previewEntries: rawPreviewEntries,
    workspaceSnapshots,
    hiloApp: hiloApp2,
    reorderTabs,
    reportWorkspaceSnapshot,
  } = useTopbarEntries();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const entries2 = reactExports.useMemo(() => {
    if (rawEntries.length === 0) return rawEntries;
    return rawEntries.map((entry) => {
      const recent = recentWorkspaces.find(
        (w3) => w3.path === entry.folderPath,
      );
      if (!recent) return entry;
      const resolved = workspaceDisplayName(recent);
      return resolved === entry.projectName
        ? entry
        : {
            ...entry,
            projectName: resolved,
          };
    });
  }, [rawEntries, recentWorkspaces]);
  const previewEntries = reactExports.useMemo(() => {
    const entriesById = new Map(
      entries2.map((entry) => [entry.workspaceId, entry]),
    );
    return rawPreviewEntries.map(
      (entry) => entriesById.get(entry.workspaceId) ?? entry,
    );
  }, [entries2, rawPreviewEntries]);
  reactExports.useEffect(() => {
    if (currentWorkspaceId) showVisiblePreviewTab(currentWorkspaceId);
  }, [currentWorkspaceId]);
  reactExports.useEffect(() => {
    if (isWorkspaceRoute) return;
    void hiloApp2.activateHome().catch((error) => {
      console.error(
        "[Topbar] activateHome failed after global navigation:",
        error,
      );
    });
  }, [hiloApp2, isWorkspaceRoute]);
  useWindowTitleSync(entries2, currentWorkspaceId, platform2);
  useLastActivePersistence(currentWorkspaceId, platform2);
  const activeRuntime = useActiveRuntime(currentWorkspaceId, hiloApp2);
  reactExports.useEffect(() => {
    setTopbarActiveWorkspaceSnapshot({
      currentWorkspaceId,
      activeRuntime,
    });
  }, [activeRuntime, currentWorkspaceId]);
  reactExports.useEffect(() => {
    return () => {
      setTopbarActiveWorkspaceSnapshot({
        currentWorkspaceId: null,
        activeRuntime: null,
      });
    };
  }, []);
  const nav2 = useTopbarNavigation(
    hiloApp2,
    entries2,
    previewEntries,
    currentWorkspaceId,
    workspaceSnapshots,
  );
  const activeSnapshot = currentWorkspaceId
    ? workspaceSnapshots.get(currentWorkspaceId)
    : void 0;
  const activeTasks = reactExports.useMemo(
    () => Array.from(workspaceSnapshots.values()).flatMap((s2) => s2.tasks),
    [workspaceSnapshots],
  );
  const { navigateAndFocus } = useWorkspaceFocusNavigation(
    currentWorkspaceId,
    nav2.activateWorkspace,
  );
  const {
    completedTasks,
    unreadCompletedTaskCount,
    unreadCompletedTasks,
    reportTaskCompleted,
    dismissCompletedTask,
    markCompletedTasksRead,
    markWorkspaceCompletedTasksRead,
  } = useCompletedTasks(entries2, {
    activeWorkspaceId: currentWorkspaceId,
    activeTasks,
    onCompletionNotificationClick: navigateAndFocus,
  });
  reactExports.useEffect(() => {
    if (!currentWorkspaceId || unreadCompletedTaskCount === 0) return;
    markWorkspaceCompletedTasksRead(currentWorkspaceId);
  }, [
    currentWorkspaceId,
    unreadCompletedTaskCount,
    markWorkspaceCompletedTasksRead,
  ]);
  const workspaceStatusById = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const task of activeTasks) {
      const prev = map3.get(task.workspaceId);
      const taskAction =
        task.status === "needs-answer"
          ? "answer"
          : task.status === "needs-confirmation"
            ? "confirmation"
            : void 0;
      const needsUserAction =
        prev?.needsUserAction === "answer" || taskAction === "answer"
          ? "answer"
          : (taskAction ?? prev?.needsUserAction);
      map3.set(task.workspaceId, {
        running: true,
        unread: prev?.unread ?? false,
        ...(needsUserAction
          ? {
              needsUserAction,
            }
          : {}),
      });
    }
    for (const task of unreadCompletedTasks) {
      if (task.workspaceId === currentWorkspaceId) continue;
      const prev = map3.get(task.workspaceId);
      map3.set(task.workspaceId, {
        running: prev?.running ?? false,
        unread: true,
        ...(prev?.needsUserAction
          ? {
              needsUserAction: prev.needsUserAction,
            }
          : {}),
      });
    }
    return map3;
  }, [activeTasks, unreadCompletedTasks, currentWorkspaceId]);
  const searchWorkspaces = reactExports.useMemo(
    () =>
      entries2.map((entry) => ({
        workspaceId: entry.workspaceId,
        workspaceName: entry.projectName,
        folderPath: entry.folderPath,
        gatewayUrl:
          entry.gatewayUrl ??
          (activeRuntime?.workspaceId === entry.workspaceId
            ? activeRuntime.gatewayUrl
            : ""),
        workspaceClaim:
          entry.workspaceClaim ??
          (activeRuntime?.workspaceId === entry.workspaceId
            ? activeRuntime.workspaceClaim
            : void 0),
        gatewayBinding:
          entry.gatewayBinding ??
          (activeRuntime?.workspaceId === entry.workspaceId
            ? activeRuntime.gatewayBinding
            : void 0),
        sessions: workspaceSnapshots.get(entry.workspaceId)?.sessions ?? [],
      })),
    [activeRuntime, entries2, workspaceSnapshots],
  );
  const stateValue = reactExports.useMemo(
    () => ({
      entries: entries2,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      activeRuntime,
      searchSessions: activeSnapshot?.sessions ?? [],
      searchWorkspaces,
      activeTasks,
      completedTasks,
      unreadCompletedTaskCount,
      workspaceStatusById,
    }),
    [
      activeRuntime,
      activeSnapshot,
      activeTasks,
      completedTasks,
      unreadCompletedTaskCount,
      workspaceStatusById,
      entries2,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      searchWorkspaces,
    ],
  );
  const actionsValue = reactExports.useMemo(
    () => ({
      ...nav2,
      reorderTabs,
      reportWorkspaceSnapshot,
      reportTaskCompleted,
      dismissCompletedTask,
      markCompletedTasksRead,
      markWorkspaceCompletedTasksRead,
    }),
    [
      nav2,
      reorderTabs,
      reportWorkspaceSnapshot,
      reportTaskCompleted,
      dismissCompletedTask,
      markCompletedTasksRead,
      markWorkspaceCompletedTasksRead,
    ],
  );
  return (
    <TopbarStateContext value={stateValue}>
      <TopbarActionsContext value={actionsValue}>
        {children2}
      </TopbarActionsContext>
    </TopbarStateContext>
  );
}
