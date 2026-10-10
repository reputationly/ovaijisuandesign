// use-workspace-canvas-persistence.js
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { homeService } from "./home-service.jsx";
import { HiloCanvasDataSource } from "../settings/hilo-canvas-data-source.js";
import {
  flushWorkspaceCanvasPersistence,
  registerWorkspaceCanvasPersistence,
  reportWorkspaceCanvasPersistence,
} from "../settings/settings-select.jsx";

export function useWorkspaceCanvasPersistence({
  workspaceId: workspaceId2,
  gatewayInstanceId,
  httpClient,
  sessionStore,
}) {
  const { t: t2 } = useTranslation();
  const registrationRef = reactExports.useRef(null);
  const dataSource = reactExports.useMemo(
    () =>
      httpClient
        ? new HiloCanvasDataSource(
            httpClient,
            sessionStore,
            {
              error: (message2) =>
                window.hilo?.logger?.error(message2, "http-client"),
            },
            gatewayInstanceId,
          )
        : null,
    [gatewayInstanceId, httpClient, sessionStore],
  );
  const persistenceInstanceId = dataSource?.persistenceInstanceId;
  const handlePersistenceControllerChange = reactExports.useCallback(
    (controller) => {
      registrationRef.current?.();
      registrationRef.current = null;
      if (!controller || !workspaceId2) return;
      registrationRef.current = registerWorkspaceCanvasPersistence(
        workspaceId2,
        persistenceInstanceId,
        controller,
        (status) => {
          const promise = homeService.hiloApp.reportWorkspacePersistence({
            workspaceId: workspaceId2,
            instanceId: persistenceInstanceId,
            state: status,
          });
          void promise.catch((error) => {
            console.error(
              "[canvas] Failed to report persistence state:",
              error,
            );
          });
          return promise;
        },
      );
    },
    [persistenceInstanceId, workspaceId2],
  );
  reactExports.useEffect(
    () => () => {
      registrationRef.current?.();
      registrationRef.current = null;
    },
    [],
  );
  const handlePersistenceStatusChange = reactExports.useCallback(
    (status) => {
      if (!workspaceId2) return;
      reportWorkspaceCanvasPersistence(
        workspaceId2,
        persistenceInstanceId,
        status,
      );
      const toastId = `canvas-persistence-${workspaceId2}`;
      if (status === "clean") {
        dedupedToast.dismiss(toastId);
        return;
      }
      if (status !== "failed") return;
      dedupedToast.error(t2("canvas.persistence.failed"), {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        description: t2("canvas.persistence.failedDetail"),
        action: {
          label: t2("common.retry"),
          onClick: () => {
            void flushWorkspaceCanvasPersistence(workspaceId2).catch(() => {});
          },
        },
      });
    },
    [persistenceInstanceId, t2, workspaceId2],
  );
  return {
    dataSource,
    handlePersistenceControllerChange,
    handlePersistenceStatusChange,
  };
}
