// auto-feedback-toast-listener.js
import {
  dedupedToast,
  reactExports,
  useNavigate,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
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

function autoFeedbackToastId(evt, gatewayScopeKey) {
  const name2 = encodeURIComponent(evt.name);
  if (evt.scope === "project") {
    return `memory-auto:project:${encodeURIComponent(gatewayScopeKey)}:${name2}`;
  }
  return `memory-auto:user:${name2}`;
}

export function AutoFeedbackToastListener({
  workspaceId: workspaceId2,
  isActive: isActive2,
}) {
  const connection = useOptionalWSConnection();
  const subscribe2 = connection?.subscribe;
  const missingProviderWarnedRef = reactExports.useRef(false);
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { openSettings } = useSettingsDialog();
  const navigate = useNavigate();
  const gatewayScopeKey = useGatewayScopeKey();
  const fetcher = useGatewayFetch();
  reactExports.useEffect(() => {
    if (!subscribe2 || connection.scope !== "workspace") {
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
    return subscribe2((msg) => {
      if (msg.type !== "memory_changed") return;
      const evt = msg;
      if (!evt.auto_extracted || evt.action !== "created") return;
      const toastId = autoFeedbackToastId(evt, gatewayScopeKey);
      dedupedToast.success(
        t2("memory.autoToast.title", "Agent learnt a preference"),
        {
          id: toastId,
          description: t2("memory.autoToast.description", {
            name: evt.name,
            defaultValue:
              'Captured "{{name}}". Find it under Settings → Memory.',
          }),
          action: {
            label: t2("memory.autoToast.view", "View"),
            onClick: () => {
              if (evt.scope === "project" && !isActive2) {
                void navigate({
                  to: "/workspace",
                  search: buildWorkspaceSearch(workspaceId2),
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
            label: t2("memory.autoToast.undo", "Undo"),
            onClick: () => {
              void (async () => {
                try {
                  const res = await deleteMemory(fetcher, evt.scope, evt.name);
                  dedupedToast.dismiss(toastId);
                  if (res.deleted) {
                    dedupedToast.success(
                      t2(
                        "memory.autoToast.undoSuccess",
                        "Undone — entry removed",
                      ),
                    );
                  } else {
                    dedupedToast.info(
                      t2(
                        "memory.autoToast.undoNotFound",
                        "Entry was already removed",
                      ),
                    );
                  }
                  queryClient2.invalidateQueries({
                    queryKey: ["memory"],
                  });
                } catch (err) {
                  dedupedToast.error(
                    t2("memory.autoToast.undoFailed", "Undo failed") +
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
    subscribe2,
    t2,
    queryClient2,
    fetcher,
    gatewayScopeKey,
    isActive2,
    navigate,
    openSettings,
    workspaceId2,
  ]);
  return null;
}
