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
  workspaceId,
  gatewayInstanceId,
  httpClient,
  sessionStore,
}) {
  const { t: translate } = useTranslation();
  const registrationRef = reactExports.useRef(null);
  const dataSource = reactExports.useMemo(
    () =>
      httpClient
        ? new HiloCanvasDataSource(
            httpClient,
            sessionStore,
            {
              error: (message) =>
                window.hilo?.logger?.error(message, "http-client"),
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
      if (!controller || !workspaceId) return;
      registrationRef.current = registerWorkspaceCanvasPersistence(
        workspaceId,
        persistenceInstanceId,
        controller,
        (status) => {
          const promise = homeService.hiloApp.reportWorkspacePersistence({
            workspaceId,
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
    [persistenceInstanceId, workspaceId],
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
      if (!workspaceId) return;
      reportWorkspaceCanvasPersistence(
        workspaceId,
        persistenceInstanceId,
        status,
      );
      const toastId = `canvas-persistence-${workspaceId}`;
      if (status === "clean") {
        dedupedToast.dismiss(toastId);
        return;
      }
      if (status !== "failed") return;
      dedupedToast.error(translate("canvas.persistence.failed"), {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        description: translate("canvas.persistence.failedDetail"),
        action: {
          label: translate("common.retry"),
          onClick: () => {
            void flushWorkspaceCanvasPersistence(workspaceId).catch(() => {});
          },
        },
      });
    },
    [persistenceInstanceId, translate, workspaceId],
  );
  return {
    dataSource,
    handlePersistenceControllerChange,
    handlePersistenceStatusChange,
  };
}
