// new-folder-dialog.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "./agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  checkTextSafety,
  cloudErrorDisplayMessage,
} from "../workspace/asset-lineage-query-key.js";
import {
  Button,
  mergeTailwindClasses as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "./dialog-content.jsx";
import { DialogDescription, DialogTitle } from "./badge-variants.jsx";
import { Input3 } from "./select-content.jsx";
import { createCloudFolder } from "../assets/read-entity-drag-data.js";
import {
  instantiationService,
  IProjectAssetsService,
} from "../workspace/home-service.jsx";
function isLive(item) {
  return (
    item.status === "pending" ||
    item.status === "uploading" ||
    item.status === "downloading" ||
    item.status === "reviewing"
  );
}
export function FolderTileGlyph({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block h-8 w-8 shrink-0", className)}
    >
      <span className="absolute left-[3px] top-[6px] h-[6px] w-[14px] rounded-[3px] bg-[color:color-mix(in_oklch,var(--brand-accent)_55%,var(--background))]" />
      <span className="absolute inset-x-[2px] top-[10px] bottom-[4px] rounded-[4px] bg-[color:color-mix(in_oklch,var(--brand-accent)_42%,var(--background))] shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
    </span>
  );
}
export function useProjectAssetsService() {
  return reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IProjectAssetsService),
      ),
    [],
  );
}
export function useTransfers() {
  const service = useProjectAssetsService();
  const [transfers, setTransfers] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let disposed = false;
    void service.listTransfers().then((items) => {
      if (!disposed) setTransfers(items);
    });
    void service.refreshReviewingTransfers();
    const subscription = service.onDidChangeTransfer((item) => {
      setTransfers((previous) => {
        const index = previous.findIndex((entry) => entry.id === item.id);
        if (index === -1) return [item, ...previous];
        const next = [...previous];
        next[index] = item;
        return next;
      });
    });
    return () => {
      disposed = true;
      subscription.dispose();
    };
  }, [service]);
  const cancelTransfer = reactExports.useCallback(
    (id) => {
      void service.cancelTransfer(id);
    },
    [service],
  );
  const clearFinished = reactExports.useCallback(() => {
    setTransfers((previous) => previous.filter(isLive));
    void service.clearFinishedTransfers();
  }, [service]);
  const removeTransfer = reactExports.useCallback(
    (id) => {
      setTransfers((previous) =>
        previous.filter((item) => item.id !== id || isLive(item)),
      );
      void service.removeTransfer(id);
    },
    [service],
  );
  const activeCount = reactExports.useMemo(
    () => transfers.filter(isLive).length,
    [transfers],
  );
  return {
    transfers,
    activeCount,
    cancelTransfer,
    clearFinished,
    removeTransfer,
  };
}
export function rejectionToastText(t, rejected) {
  const rejectedFileName = rejected.fileName;
  switch (rejected.rejection) {
    case "unsupported-type":
      return t("cloudAssets.rejectUnsupported", {
        name: rejectedFileName,
      });
    case "file-too-large":
      return t("cloudAssets.rejectTooLarge", {
        name: rejectedFileName,
      });
    case "duration-exceeded":
      return t("cloudAssets.rejectTooLong", {
        name: rejectedFileName,
      });
    case "no-local-path":
      return t("cloudAssets.rejectNoPath", {
        name: rejectedFileName,
      });
    case "name-safety-blocked":
      return t("rename.safetyBlocked");
    default:
      return t("cloudAssets.rejectUnsupported", {
        name: rejectedFileName,
      });
  }
}
export function toastFolderDownloadSummary(t, summary) {
  const parts = [];
  if (summary.skippedSynced > 0) {
    parts.push(
      t("cloudAssets.skipSynced", {
        count: summary.skippedSynced,
      }),
    );
  }
  if (summary.skippedReviewing > 0) {
    parts.push(
      t("cloudAssets.skipReviewing", {
        count: summary.skippedReviewing,
      }),
    );
  }
  if (summary.skippedBlocked > 0) {
    parts.push(
      t("cloudAssets.skipBlocked", {
        count: summary.skippedBlocked,
      }),
    );
  }
  if (summary.skippedActive > 0) {
    parts.push(
      t("cloudAssets.skipActive", {
        count: summary.skippedActive,
      }),
    );
  }
  if (summary.skippedNoUrl > 0) {
    parts.push(
      t("cloudAssets.skipNoUrl", {
        count: summary.skippedNoUrl,
      }),
    );
  }
  const description =
    parts.length > 0
      ? `${t("cloudAssets.skippedPrefix")}${parts.join(" · ")}`
      : void 0;
  if (summary.enqueued > 0) {
    dedupedToast.success(
      t("cloudAssets.folderDownloadStarted", {
        count: summary.enqueued,
      }),
      {
        description,
      },
    );
  } else {
    dedupedToast.info(t("cloudAssets.folderDownloadNothing"), {
      description,
    });
  }
}
export function NewFolderDialog({
  open,
  projectId,
  parentId,
  onOpenChange,
  onCreated,
}) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = reactExports.useState("");
  const [pending, setPending] = reactExports.useState(false);
  const trimmed = folderName.trim();
  reactExports.useEffect(() => {
    if (open) return;
    setFolderName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending) return;
    setPending(true);
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(t("rename.safetyBlocked"));
        return;
      }
      await createCloudFolder(projectId, parentId, trimmed);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      dedupedToast.error(
        cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"),
      );
    } finally {
      setPending(false);
    }
  }, [onCreated, onOpenChange, parentId, pending, projectId, t, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="cloud-assets.new-folder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t("cloudAssets.newFolderTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("cloudAssets.newFolderTitle")}
          </DialogDescription>
        </DialogHeader>
        <Input3
          autoFocus={true}
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t("cloudAssets.newFolderPlaceholder")}
          placeholder={t("cloudAssets.newFolderPlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!trimmed || pending}
            onClick={() => void handleConfirm()}
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
