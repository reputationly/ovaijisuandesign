// new-folder-dialog.jsx
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  checkTextSafety,
  cloudErrorDisplayMessage,
} from "../workspace/asset-lineage-query-key.js";
import {
  Button,
  cn$2 as cn,
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
  const service2 = useProjectAssetsService();
  const [transfers, setTransfers] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let disposed = false;
    void service2.listTransfers().then((items) => {
      if (!disposed) setTransfers(items);
    });
    void service2.refreshReviewingTransfers();
    const subscription = service2.onDidChangeTransfer((item) => {
      setTransfers((previous2) => {
        const index2 = previous2.findIndex((entry) => entry.id === item.id);
        if (index2 === -1) return [item, ...previous2];
        const next2 = [...previous2];
        next2[index2] = item;
        return next2;
      });
    });
    return () => {
      disposed = true;
      subscription.dispose();
    };
  }, [service2]);
  const cancelTransfer = reactExports.useCallback(
    (id2) => {
      void service2.cancelTransfer(id2);
    },
    [service2],
  );
  const clearFinished = reactExports.useCallback(() => {
    setTransfers((previous2) => previous2.filter(isLive));
    void service2.clearFinishedTransfers();
  }, [service2]);
  const removeTransfer = reactExports.useCallback(
    (id2) => {
      setTransfers((previous2) =>
        previous2.filter((item) => item.id !== id2 || isLive(item)),
      );
      void service2.removeTransfer(id2);
    },
    [service2],
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
export function rejectionToastText(t2, rejected) {
  const name2 = rejected.fileName;
  switch (rejected.rejection) {
    case "unsupported-type":
      return t2("cloudAssets.rejectUnsupported", {
        name: name2,
      });
    case "file-too-large":
      return t2("cloudAssets.rejectTooLarge", {
        name: name2,
      });
    case "duration-exceeded":
      return t2("cloudAssets.rejectTooLong", {
        name: name2,
      });
    case "no-local-path":
      return t2("cloudAssets.rejectNoPath", {
        name: name2,
      });
    case "name-safety-blocked":
      return t2("rename.safetyBlocked");
    default:
      return t2("cloudAssets.rejectUnsupported", {
        name: name2,
      });
  }
}
export function toastFolderDownloadSummary(t2, summary) {
  const parts = [];
  if (summary.skippedSynced > 0) {
    parts.push(
      t2("cloudAssets.skipSynced", {
        count: summary.skippedSynced,
      }),
    );
  }
  if (summary.skippedReviewing > 0) {
    parts.push(
      t2("cloudAssets.skipReviewing", {
        count: summary.skippedReviewing,
      }),
    );
  }
  if (summary.skippedBlocked > 0) {
    parts.push(
      t2("cloudAssets.skipBlocked", {
        count: summary.skippedBlocked,
      }),
    );
  }
  if (summary.skippedActive > 0) {
    parts.push(
      t2("cloudAssets.skipActive", {
        count: summary.skippedActive,
      }),
    );
  }
  if (summary.skippedNoUrl > 0) {
    parts.push(
      t2("cloudAssets.skipNoUrl", {
        count: summary.skippedNoUrl,
      }),
    );
  }
  const description =
    parts.length > 0
      ? `${t2("cloudAssets.skippedPrefix")}${parts.join(" · ")}`
      : void 0;
  if (summary.enqueued > 0) {
    dedupedToast.success(
      t2("cloudAssets.folderDownloadStarted", {
        count: summary.enqueued,
      }),
      {
        description,
      },
    );
  } else {
    dedupedToast.info(t2("cloudAssets.folderDownloadNothing"), {
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
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const trimmed = name2.trim();
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending2) return;
    setPending(true);
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(t2("rename.safetyBlocked"));
        return;
      }
      await createCloudFolder(projectId, parentId, trimmed);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      dedupedToast.error(
        cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"),
      );
    } finally {
      setPending(false);
    }
  }, [onCreated, onOpenChange, parentId, pending2, projectId, t2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="cloud-assets.new-folder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("cloudAssets.newFolderTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t2("cloudAssets.newFolderTitle")}
          </DialogDescription>
        </DialogHeader>
        <Input3
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("cloudAssets.newFolderPlaceholder")}
          placeholder={t2("cloudAssets.newFolderPlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t2("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!trimmed || pending2}
            onClick={() => void handleConfirm()}
          >
            {t2("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
