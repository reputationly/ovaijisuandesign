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
function useWindowTitleSync(entries, currentWorkspaceId, platform) {
  reactExports.useEffect(() => {
    const active = entries.find(
      (entry) => entry.workspaceId === currentWorkspaceId,
    );
    const title = active ? `${active.projectName} - 蒜狸小助手` : "蒜狸小助手";
    platform.window.setTitle(title);
  }, [currentWorkspaceId, entries, platform.window]);
}
function useLastActivePersistence(currentWorkspaceId, platform) {
  reactExports.useEffect(() => {
    if (currentWorkspaceId) {
      platform.storage
        ?.globalSet("lastActiveWorkspacePath", currentWorkspaceId)
        .catch(() => {});
    }
  }, [currentWorkspaceId, platform.storage]);
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
function shallowEqualObject(previous, next) {
  if (Object.is(previous, next)) return true;
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return false;
  return previousKeys.every(
    (key) =>
      Object.hasOwn(next, key) && Object.is(previous[key], next[key]),
  );
}
function areShallowEqualArrays(previous, next) {
  if (Object.is(previous, next)) return true;
  if (previous.length !== next.length) return false;
  return previous.every((item, index) =>
    shallowEqualObject(item, next[index]),
  );
}
function areTopbarSnapshotsEqual(previous, next) {
  return (
    areShallowEqualArrays(previous.sessions, next.sessions) &&
    areShallowEqualArrays(previous.tasks, next.tasks)
  );
}
let snapshots = new Map();
function setTopbarSnapshot(workspaceId, snapshot) {
  const previousSnapshot = snapshots.get(workspaceId);
  if (previousSnapshot && areTopbarSnapshotsEqual(previousSnapshot, snapshot))
    return;
  snapshots = new Map(snapshots).set(workspaceId, snapshot);
  scheduleEmit();
}
function pruneTopbarSnapshots(activeWorkspaceIds) {
  let changed = false;
  const next = new Map(snapshots);
  for (const workspaceId of next.keys()) {
    if (!activeWorkspaceIds.has(workspaceId)) {
      next.delete(workspaceId);
      changed = true;
    }
  }
  if (!changed) return;
  snapshots = next;
  scheduleEmit();
}
function getTopbarSnapshots() {
  return snapshots;
}
function subscribeTopbarSnapshots(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getNextWorkspaceIdAfterClose(entries, closingWorkspaceId) {
  return getNextPreviewTabIdAfterHide(
    entries.map((entry) => entry.workspaceId),
    closingWorkspaceId,
  );
}
function performWorkspacePreviewHide(
  entries,
  workspaceId,
  currentWorkspaceId,
  activeTaskCount,
  source,
  effects,
) {
  const nextWorkspaceId = getNextWorkspaceIdAfterClose(entries, workspaceId);
  const wasActive = workspaceId === currentWorkspaceId;
  effects.record({
    workspaceId,
    source,
    wasActive,
    activeTaskCount,
    ...(nextWorkspaceId
      ? {
          nextWorkspaceId,
        }
      : {}),
  });
  effects.hidePreview(workspaceId);
  if (wasActive) {
    if (nextWorkspaceId) {
      effects.activateWorkspace(nextWorkspaceId);
    } else {
      effects.activateHome();
    }
  }
  effects.requestRuntimeClose(workspaceId, source);
}
function performWorkspacePreviewsBatchHide(
  workspaceId,
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
    keptWorkspaceId: workspaceId,
    hiddenWorkspaceIds,
  });
  if (currentWasHidden) effects.activateWorkspace(workspaceId);
  for (const hiddenWorkspaceId of hiddenWorkspaceIds) {
    effects.requestRuntimeClose(hiddenWorkspaceId, source);
  }
}
function performOtherWorkspacePreviewsHide(
  entries,
  workspaceId,
  currentWorkspaceId,
  effects,
) {
  if (!entries.some((entry) => entry.workspaceId === workspaceId)) return;
  performWorkspacePreviewsBatchHide(
    workspaceId,
    currentWorkspaceId,
    entries
      .filter((entry) => entry.workspaceId !== workspaceId)
      .map((entry) => entry.workspaceId),
    "topbar-context-close-others",
    effects,
  );
}
function performWorkspacePreviewsToRightHide(
  entries,
  workspaceId,
  currentWorkspaceId,
  effects,
) {
  const index = entries.findIndex(
    (entry) => entry.workspaceId === workspaceId,
  );
  if (index === -1) return;
  performWorkspacePreviewsBatchHide(
    workspaceId,
    currentWorkspaceId,
    entries.slice(index + 1).map((entry) => entry.workspaceId),
    "topbar-context-close-right",
    effects,
  );
}
async function activateWorkspaceIfAvailable(
  hiloApp,
  workspaceId,
  navigateToWorkspaceId,
) {
  const runtime = await hiloApp.activateWorkspace(workspaceId);
  if (!runtime) return;
  await navigateToWorkspaceId(runtime.workspaceId);
}
function shouldActivateWorkspaceThroughRoute(entries, workspaceId) {
  const entry = entries.find(
    (candidate) => candidate.workspaceId === workspaceId,
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
  translate,
  onNotificationShown,
  onNotificationSettled,
) {
  const needsAnswer = task.status === "needs-answer";
  const title = needsAnswer
    ? translate("topbar.notification.taskNeedsAnswerTitle", "Waiting for your answer")
    : translate(
        "topbar.notification.taskNeedsConfirmationTitle",
        "Waiting for your confirmation",
      );
  const body = task.promptPreview
    ? needsAnswer
      ? translate(
          "topbar.notification.taskNeedsAnswerBody",
          '"{{prompt}}" is waiting for your answer. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
      : translate(
          "topbar.notification.taskNeedsConfirmationBody",
          '"{{prompt}}" is waiting for your confirmation. Click to continue.',
          {
            prompt: task.promptPreview,
          },
        )
    : needsAnswer
      ? translate(
          "topbar.notification.taskNeedsAnswerFallbackBody",
          "The Agent is waiting for your answer. Click to continue.",
        )
      : translate(
          "topbar.notification.taskNeedsConfirmationFallbackBody",
          "The Agent is waiting for your confirmation. Click to continue.",
        );
  void getNotificationMainService()
    .show({
      title,
      body,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show user-action notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function getTaskCompletionBody(count, promptPreview, translate) {
  if (count === 1) {
    return promptPreview
      ? translate(
          "topbar.notification.taskCompletedBody",
          "“{{prompt}}” has finished generating. Click to view the result.",
          {
            prompt: promptPreview,
          },
        )
      : translate(
          "topbar.notification.taskCompletedFallbackBody",
          "Your generation is complete. Click to view the result.",
        );
  }
  return promptPreview
    ? translate(
        "topbar.notification.multipleTasksCompletedBody",
        "{{count}} generation tasks including “{{prompt}}” are complete. Click to view results.",
        {
          prompt: promptPreview,
          count,
        },
      )
    : translate(
        "topbar.notification.multipleTasksCompletedFallbackBody",
        "{{count}} generation tasks are complete. Click to view results.",
        {
          count,
        },
      );
}
function notifyTaskCompletion(
  tasks,
  translate,
  onNotificationShown,
  onNotificationSettled,
) {
  if (tasks.length === 0) return;
  const first = tasks[0];
  const promptPreview = first.promptPreview;
  const title =
    tasks.length === 1
      ? translate("topbar.notification.taskCompletedTitle", "Generation complete")
      : translate(
          "topbar.notification.multipleTasksCompletedTitle",
          "Multiple generations complete",
        );
  const body = getTaskCompletionBody(tasks.length, promptPreview, translate);
  void getNotificationMainService()
    .show({
      title,
      body,
    })
    .then((result) => {
      if (result.success && result.id) onNotificationShown?.(result.id);
    })
    .catch((error) => {
      console.warn("[topbar] Failed to show completion notification:", error);
    })
    .finally(() => onNotificationSettled?.());
}
function useCompletedTasks(entries, options = {}) {
  const { t: translate } = useTranslation();
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
    (workspaceId) => {
      setUnreadCompletedTaskIds((prev) => {
        if (prev.size === 0) return prev;
        const completedTaskById = new Map(
          completedTasks.map((task) => [task.id, task]),
        );
        const workspaceTaskIdPrefix = `${workspaceId}:`;
        const next = new Set(
          [...prev].filter((taskId) => {
            const task = completedTaskById.get(taskId);
            return (
              task?.workspaceId !== workspaceId &&
              !taskId.startsWith(workspaceTaskIdPrefix)
            );
          }),
        );
        return next.size === prev.size ? prev : next;
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
      const key = `${task.id}:${task.status}:${task.userActionId ?? "current"}`;
      currentKeys.add(key);
      if (activeUserActionKeysRef.current.has(key)) continue;
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
        translate,
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
  }, [handleNotificationTargetClick, options.activeTasks, translate]);
  const reportTaskCompleted = reactExports.useCallback(
    (task) => {
      if (task.source === "canvas") return;
      const key = getTaskCompletionKey(task);
      if (recentCompletionKeysRef.current.has(key)) return;
      recentCompletionKeysRef.current.add(key);
      const notificationTarget = {
        task,
        kind: "completion",
      };
      pendingNotificationsRef.current += 1;
      notifyTaskCompletion(
        [task],
        translate,
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
        const next = new Set(existing);
        next.add(task.id);
        return next;
      });
      setCompletedTasks((existing) => {
        const seen = new Set();
        const merged = [];
        for (const completedTask of [task, ...existing]) {
          if (seen.has(completedTask.id)) continue;
          seen.add(completedTask.id);
          merged.push(completedTask);
          if (merged.length >= COMPLETED_TASK_LIMIT) break;
        }
        return merged;
      });
    },
    [handleNotificationTargetClick, translate],
  );
  reactExports.useEffect(() => {
    const openIds = new Set(entries.map((entry) => entry.workspaceId));
    setCompletedTasks((prev) => {
      const filtered = prev.filter((task) => openIds.has(task.workspaceId));
      return filtered.length === prev.length ? prev : filtered;
    });
    for (const key of recentCompletionKeysRef.current) {
      const wsId = key.split(":")[0];
      if (!openIds.has(wsId)) recentCompletionKeysRef.current.delete(key);
    }
  }, [entries]);
  reactExports.useEffect(() => {
    const completedIds = new Set(completedTasks.map((task) => task.id));
    setUnreadCompletedTaskIds((prev) => {
      const next = new Set(
        [...prev].filter((taskId) => completedIds.has(taskId)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [completedTasks]);
  const dismissCompletedTask = reactExports.useCallback((taskId) => {
    setUnreadCompletedTaskIds((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setCompletedTasks((prev) => {
      const next = prev.filter((task) => task.id !== taskId);
      return next.length === prev.length ? prev : next;
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
  const [entries, setEntries] = reactExports.useState([]);
  const [workspaceSnapshots, setWorkspaceSnapshots] = reactExports.useState(
    () => getTopbarSnapshots(),
  );
  const visiblePreviewTabs = useVisiblePreviewTabsSnapshot();
  const hiloApp = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const applyEntries = reactExports.useCallback((rawList) => {
    const liveIds = new Set(rawList.map((entry) => entry.workspaceId));
    visiblePreviewTabsStore.initialize(rawList);
    setEntries(rawList);
    pruneTopbarSnapshots(liveIds);
    pruneWorkspaceBundleCache(liveIds);
  }, []);
  reactExports.useEffect(() => {
    let disposed = false;
    const disposable = hiloApp.onWorkspaceEntriesChanged((list) =>
      applyEntries(list),
    );
    hiloApp.listWorkspaceEntries().then((list) => {
      if (!disposed) applyEntries(list);
    });
    return () => {
      disposed = true;
      disposable.dispose();
    };
  }, [hiloApp, applyEntries]);
  reactExports.useEffect(
    () =>
      subscribeTopbarSnapshots(() =>
        setWorkspaceSnapshots(getTopbarSnapshots()),
      ),
    [],
  );
  const previewEntries = reactExports.useMemo(
    () => resolveVisiblePreviewEntries(entries, visiblePreviewTabs.tabs),
    [entries, visiblePreviewTabs.tabs],
  );
  const reorderTabs = reactExports.useCallback((activeId, overId) => {
    visiblePreviewTabsStore.reorder(activeId, overId);
  }, []);
  const reportWorkspaceSnapshot = reactExports.useCallback(
    (workspaceId, snapshot) => {
      setTopbarSnapshot(workspaceId, snapshot);
    },
    [],
  );
  return {
    entries,
    previewEntries,
    workspaceSnapshots,
    hiloApp,
    reorderTabs,
    reportWorkspaceSnapshot,
  };
}
function useTopbarNavigation(
  hiloApp,
  allEntries,
  previewEntries,
  currentWorkspaceId,
  workspaceSnapshots,
) {
  const platform = usePlatform();
  const { t: translate } = useTranslation();
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
    void hiloApp.activateHome();
    void navigate({
      to: "/",
    });
  }, [hiloApp, navigate]);
  const activateWorkspace = reactExports.useCallback(
    (workspaceId) => {
      showVisiblePreviewTab(workspaceId);
      if (
        shouldActivateWorkspaceThroughRoute(allEntriesRef.current, workspaceId)
      ) {
        void navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(workspaceId),
        });
        return;
      }
      void activateWorkspaceIfAvailable(
        hiloApp,
        workspaceId,
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
    [hiloApp, navigate],
  );
  const requestRuntimeClose = reactExports.useCallback(
    (workspaceId, source) => {
      void requestWorkspaceRuntimeClose(hiloApp, workspaceId, source);
    },
    [hiloApp],
  );
  const closeWorkspace = reactExports.useCallback(
    (targetWorkspaceId, source = "topbar") => {
      const activeTaskCount =
        workspaceSnapshotsRef.current.get(targetWorkspaceId)?.tasks.length ?? 0;
      performWorkspacePreviewHide(
        entriesRef.current,
        targetWorkspaceId,
        currentWorkspaceIdRef.current,
        activeTaskCount,
        source,
        {
          hidePreview: (workspaceId) => hideVisiblePreviewTabs(workspaceId),
          activateWorkspace,
          activateHome,
          requestRuntimeClose,
          record: (properties) =>
            recordAction("workspace:preview-hidden", properties),
        },
      );
    },
    [activateHome, activateWorkspace, requestRuntimeClose],
  );
  const closeOtherWorkspacePreviews = reactExports.useCallback(
    (workspaceId) => {
      performOtherWorkspacePreviewsHide(
        entriesRef.current,
        workspaceId,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids) => hideVisiblePreviewTabs(ids),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties) =>
            recordAction("workspace:preview-hidden-batch", properties),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const closeWorkspacePreviewsToRight = reactExports.useCallback(
    (workspaceId) => {
      performWorkspacePreviewsToRightHide(
        entriesRef.current,
        workspaceId,
        currentWorkspaceIdRef.current,
        {
          hidePreviews: (ids) => hideVisiblePreviewTabs(ids),
          activateWorkspace,
          requestRuntimeClose,
          record: (properties) =>
            recordAction("workspace:preview-hidden-batch", properties),
        },
      );
    },
    [activateWorkspace, requestRuntimeClose],
  );
  const createWorkspace = reactExports.useCallback(
    async (workspaceName, options, navigateOptions) => {
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
          hiloApp,
          folderPath: pickedFolder,
          t: translate,
          onStaged: (entry) =>
            navigate({
              to: "/workspace",
              search: buildWorkspaceSearch(entry.workspaceId, navigateOptions),
            }),
        });
        return Boolean(staged);
      }
      const result = await hiloApp.createWorkspaceWithResult({
        name: workspaceName,
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
        if ((result.kind === "opened" || result.kind === "reused") && workspaceName) {
          await persistPickedWorkspaceName(result.runtime.folderPath, workspaceName);
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
          translate,
          (runtime) => navigateToWorkspace(runtime, navigateOptions),
          alreadyKnown,
        ),
      );
    },
    [
      addWorkspaceToProject,
      hiloApp,
      isKnownWorkspacePath,
      navigate,
      navigateToWorkspace,
      persistPickedWorkspaceName,
      translate,
    ],
  );
  const openWorkspaceFromDialog = reactExports.useCallback(() => {
    void (async () => {
      const paths = await platform.fs.showOpenDialog?.({
        directory: true,
      });
      const folderPath = paths?.[0];
      if (!folderPath) return;
      await stageWorkspacePreview({
        hiloApp,
        folderPath,
        t: translate,
        onStaged: (entry) =>
          navigate({
            to: "/workspace",
            search: buildWorkspaceSearch(entry.workspaceId),
          }),
      });
    })();
  }, [hiloApp, navigate, platform.fs, translate]);
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
export function TopbarProvider({ children }) {
  const platform = usePlatform();
  const routerLocation = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search,
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
    hiloApp,
    reorderTabs,
    reportWorkspaceSnapshot,
  } = useTopbarEntries();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const entries = reactExports.useMemo(() => {
    if (rawEntries.length === 0) return rawEntries;
    return rawEntries.map((entry) => {
      const recent = recentWorkspaces.find(
        (recentWorkspace) => recentWorkspace.path === entry.folderPath,
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
      entries.map((entry) => [entry.workspaceId, entry]),
    );
    return rawPreviewEntries.map(
      (entry) => entriesById.get(entry.workspaceId) ?? entry,
    );
  }, [entries, rawPreviewEntries]);
  reactExports.useEffect(() => {
    if (currentWorkspaceId) showVisiblePreviewTab(currentWorkspaceId);
  }, [currentWorkspaceId]);
  reactExports.useEffect(() => {
    if (isWorkspaceRoute) return;
    void hiloApp.activateHome().catch((error) => {
      console.error(
        "[Topbar] activateHome failed after global navigation:",
        error,
      );
    });
  }, [hiloApp, isWorkspaceRoute]);
  useWindowTitleSync(entries, currentWorkspaceId, platform);
  useLastActivePersistence(currentWorkspaceId, platform);
  const activeRuntime = useActiveRuntime(currentWorkspaceId, hiloApp);
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
  const nav = useTopbarNavigation(
    hiloApp,
    entries,
    previewEntries,
    currentWorkspaceId,
    workspaceSnapshots,
  );
  const activeSnapshot = currentWorkspaceId
    ? workspaceSnapshots.get(currentWorkspaceId)
    : void 0;
  const activeTasks = reactExports.useMemo(
    () => Array.from(workspaceSnapshots.values()).flatMap((workspaceSnapshot) => workspaceSnapshot.tasks),
    [workspaceSnapshots],
  );
  const { navigateAndFocus } = useWorkspaceFocusNavigation(
    currentWorkspaceId,
    nav.activateWorkspace,
  );
  const {
    completedTasks,
    unreadCompletedTaskCount,
    unreadCompletedTasks,
    reportTaskCompleted,
    dismissCompletedTask,
    markCompletedTasksRead,
    markWorkspaceCompletedTasksRead,
  } = useCompletedTasks(entries, {
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
    const map = new Map();
    for (const task of activeTasks) {
      const prev = map.get(task.workspaceId);
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
      map.set(task.workspaceId, {
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
      const prev = map.get(task.workspaceId);
      map.set(task.workspaceId, {
        running: prev?.running ?? false,
        unread: true,
        ...(prev?.needsUserAction
          ? {
              needsUserAction: prev.needsUserAction,
            }
          : {}),
      });
    }
    return map;
  }, [activeTasks, unreadCompletedTasks, currentWorkspaceId]);
  const searchWorkspaces = reactExports.useMemo(
    () =>
      entries.map((entry) => ({
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
    [activeRuntime, entries, workspaceSnapshots],
  );
  const stateValue = reactExports.useMemo(
    () => ({
      entries,
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
      entries,
      previewEntries,
      currentWorkspaceId,
      isHomeActive,
      searchWorkspaces,
    ],
  );
  const actionsValue = reactExports.useMemo(
    () => ({
      ...nav,
      reorderTabs,
      reportWorkspaceSnapshot,
      reportTaskCompleted,
      dismissCompletedTask,
      markCompletedTasksRead,
      markWorkspaceCompletedTasksRead,
    }),
    [
      nav,
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
        {children}
      </TopbarActionsContext>
    </TopbarStateContext>
  );
}
