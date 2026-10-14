// comfy-ui-download-progress-host.jsx
import { countUnavailableComfyUiModels } from "../vendor-inline/vscode-base/linked-list.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  ComfyUiDownloadProgressContext,
  isActiveComfyUiDownloadTask,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { homeService } from "./home-service.jsx";

function isComfyUiModelAlreadyDownloaded(task) {
  return (
    task.downloadedModels.length === 0 &&
    task.skippedModels.length > 0 &&
    countUnavailableComfyUiModels(task) === 0
  );
}

export function ComfyUiDownloadProgressHost({ children }) {
  const { t: translate } = useTranslation();
  const [tasks, setTasks] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let mounted = true;
    void homeService.comfyUiModelDownload.getTasks().then((initial) => {
      if (mounted)
        setTasks(
          initial.filter((task) => !task.hidden || task.status === "failed"),
        );
    });
    const subscription = homeService.comfyUiModelDownload.onDidChange(
      (task) => {
        setTasks((current) => {
          const withoutTask = current.filter((item) => item.id !== task.id);
          return task.hidden && task.status !== "failed"
            ? withoutTask
            : [...withoutTask, task];
        });
        if (task.hidden && task.status !== "failed") return;
        if (task.status === "completed") {
          if (task.untrustedSourceModels.length) {
            dedupedToast.warning(
              translate("chat.workflow.downloadCompletedUnsupportedSources", {
                count: task.untrustedSourceModels.length,
              }),
            );
          } else if (isComfyUiModelAlreadyDownloaded(task)) {
            dedupedToast.success(translate("chat.workflow.downloadAlreadyAvailable"));
          } else if (task.missingSourceModels.length) {
            dedupedToast.success(
              translate("chat.workflow.downloadCompletedMissingSources", {
                count: task.missingSourceModels.length,
              }),
            );
          } else {
            dedupedToast.success(translate("chat.workflow.downloadCompleted"));
          }
        } else if (task.status === "failed") {
          dedupedToast.error(task.error || translate("chat.workflow.downloadFailed"));
        }
      },
    );
    return () => {
      mounted = false;
      subscription.dispose();
    };
  }, [translate]);
  const activeTasks = reactExports.useMemo(
    () => tasks.filter(isActiveComfyUiDownloadTask),
    [tasks],
  );
  const cancelTask = reactExports.useCallback((taskId) => {
    void homeService.comfyUiModelDownload.cancelTask(taskId);
  }, []);
  const dismissTask = reactExports.useCallback((taskId) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    void homeService.comfyUiModelDownload.dismissTask(taskId);
  }, []);
  const clearFinished = reactExports.useCallback(() => {
    const finished = tasks.filter((task) => !isActiveComfyUiDownloadTask(task));
    setTasks((current) => current.filter(isActiveComfyUiDownloadTask));
    void Promise.all(
      finished.map((task) =>
        homeService.comfyUiModelDownload.dismissTask(task.id),
      ),
    );
  }, [tasks]);
  const openModelsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openModelsFolder().catch(() => {
      dedupedToast.error(translate("chat.workflow.downloadOpenFolderFailed"));
    });
  }, [translate]);
  const value = reactExports.useMemo(
    () => ({
      tasks,
      activeTasks,
      cancelTask,
      dismissTask,
      clearFinished,
      openModelsFolder,
    }),
    [
      activeTasks,
      cancelTask,
      clearFinished,
      dismissTask,
      openModelsFolder,
      tasks,
    ],
  );
  return (
    <ComfyUiDownloadProgressContext.Provider value={value}>
      {children}
    </ComfyUiDownloadProgressContext.Provider>
  );
}
