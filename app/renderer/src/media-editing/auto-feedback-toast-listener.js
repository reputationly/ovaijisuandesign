// auto-feedback-toast-listener.js
import reactExports from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { buildWorkspaceSearch } from "../workspace/use-deep-link-router.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { useSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import {
  deleteMemory,
  useOptionalWSConnection,
} from "../settings/changelog-table.jsx";

function autoFeedbackToastId(autoFeedbackEvent, gatewayScopeKey) {
  const memoryEntryName = encodeURIComponent(autoFeedbackEvent.name);
  if (autoFeedbackEvent.scope === "project") {
    return `memory-auto:project:${encodeURIComponent(gatewayScopeKey)}:${memoryEntryName}`;
  }
  return `memory-auto:user:${memoryEntryName}`;
}

export function AutoFeedbackToastListener({
  workspaceId,
  isActive,
}) {
  const connection = useOptionalWSConnection();
  const subscribe = connection?.subscribe;
  const missingProviderWarnedRef = reactExports.useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { openSettings } = useSettingsDialog();
  const navigate = useNavigate();
  const gatewayScopeKey = useGatewayScopeKey();
  const fetcher = useGatewayFetch();
  reactExports.useEffect(() => {
    if (!subscribe || connection.scope !== "workspace") {
      if (!missingProviderWarnedRef.current) {
        missingProviderWarnedRef.current = true;
        try {
          void window.hilo?.logger?.warn?.(
            "[AutoFeedbackToastListener] workspace WS provider unavailable; listener disabled",
          );
        } catch {}
      }
      return;
    }
    return subscribe((websocketMessage) => {
      if (websocketMessage.type !== "memory_changed") return;
      const memoryChangedEvent = websocketMessage;
      if (!memoryChangedEvent.auto_extracted || memoryChangedEvent.action !== "created") return;
      const toastId = autoFeedbackToastId(memoryChangedEvent, gatewayScopeKey);
      dedupedToast.success(
        t("memory.autoToast.title", "Agent learnt a preference"),
        {
          id: toastId,
          description: t("memory.autoToast.description", {
            name: memoryChangedEvent.name,
            defaultValue:
              'Captured "{{name}}". Find it under Settings → Memory.',
          }),
          action: {
            label: t("memory.autoToast.view", "View"),
            onClick: () => {
              if (memoryChangedEvent.scope === "project" && !isActive) {
                void navigate({
                  to: "/workspace",
                  search: buildWorkspaceSearch(workspaceId),
                }).then(
                  () => openSettings("memory"),
                  (error) => {
                    void window.hilo?.logger?.warn?.(
                      `[AutoFeedbackToastListener] failed to open source workspace memory: ${error instanceof Error ? error.message : String(error)}`,
                    );
                  },
                );
                return;
              }
              openSettings("memory");
            },
          },
          cancel: {
            label: t("memory.autoToast.undo", "Undo"),
            onClick: () => {
              void (async () => {
                try {
                  const deleteResult = await deleteMemory(fetcher, memoryChangedEvent.scope, memoryChangedEvent.name);
                  dedupedToast.dismiss(toastId);
                  if (deleteResult.deleted) {
                    dedupedToast.success(
                      t(
                        "memory.autoToast.undoSuccess",
                        "Undone — entry removed",
                      ),
                    );
                  } else {
                    dedupedToast.info(
                      t(
                        "memory.autoToast.undoNotFound",
                        "Entry was already removed",
                      ),
                    );
                  }
                  queryClient.invalidateQueries({
                    queryKey: ["memory"],
                  });
                } catch (err) {
                  dedupedToast.error(
                    t("memory.autoToast.undoFailed", "Undo failed") +
                      (err instanceof Error ? `: ${err.message}` : ""),
                  );
                }
              })();
            },
          },
        },
      );
    });
  }, [
    connection?.scope,
    subscribe,
    t,
    queryClient,
    fetcher,
    gatewayScopeKey,
    isActive,
    navigate,
    openSettings,
    workspaceId,
  ]);
  return null;
}
