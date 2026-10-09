// use-move-dnd.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  Folder,
  Icon,
  ImageOutlineIcon,
  FileText,
  checkTextSafety,
  cloudErrorDisplayMessage,
  FileTypeIcon,
  classifyFileType,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File$1,
  DeferredThumbnailImage,
  isLive,
} from "../vendor.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { instantiationService, IProjectAssetsService } from "../m08/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  FolderDrillDownPicker,
  VideoThumbnailPlayIndicator,
  createCloudFolder,
} from "./asset-center-relocation-coach-mark.jsx";
export function FolderTileGlyph({ className }) {
  return (
    <span aria-hidden="true" className={cn$2("relative inline-block h-8 w-8 shrink-0", className)}>
      <span className="absolute left-[3px] top-[6px] h-[6px] w-[14px] rounded-[3px] bg-[color:color-mix(in_oklch,var(--brand-accent)_55%,var(--background))]" />
      <span className="absolute inset-x-[2px] top-[10px] bottom-[4px] rounded-[4px] bg-[color:color-mix(in_oklch,var(--brand-accent)_42%,var(--background))] shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
    </span>
  );
}
function typeBucketMeta(bucket) {
  switch (bucket) {
    case "folder":
      return {
        bucket,
        Icon: Folder,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "image":
      return {
        bucket,
        Icon: ImageOutlineIcon,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "video":
      return {
        bucket,
        Icon: FileVideo,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "audio":
      return {
        bucket,
        Icon: FileAudio,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "archive":
      return {
        bucket,
        Icon: FileArchive,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "document":
      return {
        bucket,
        Icon: FileText,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "code":
      return {
        bucket,
        Icon: FileCode,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    default:
      return {
        bucket,
        Icon: File$1,
        colorClass: "text-muted-foreground",
        containerClass: "bg-muted",
      };
  }
}
export function ProjectAssetThumbnail(props) {
  return (
    <ProjectAssetThumbnailGeneration
      key={`${props.thumbnailSrc ?? "fallback"}:${props.kind}:${props.typeBucket}:${props.variant}`}
      {...props}
    />
  );
}
function ProjectAssetThumbnailGeneration({
  name: name2,
  kind,
  typeBucket,
  thumbnailSrc,
  variant,
  muted = false,
  className,
}) {
  const [failed, setFailed] = reactExports.useState(false);
  const isGrid = variant === "grid";
  const canRenderThumbnail =
    kind === "file" &&
    Boolean(thumbnailSrc) &&
    (typeBucket === "image" || typeBucket === "video" || typeBucket === "audio");
  if (!isGrid && kind === "folder") {
    return <FolderTileGlyph className={cn$2(muted && "opacity-50", className)} />;
  }
  const containerClassName = cn$2(
    "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted",
    isGrid ? "aspect-[4/3] w-full border-b border-border" : "size-8 rounded-sm",
    className,
  );
  if (failed || !canRenderThumbnail) {
    const FallbackIcon2 = typeBucketMeta(typeBucket).Icon;
    return (
      <span className={containerClassName} aria-hidden="true">
        {kind === "file" ? (
          <FileTypeIcon
            {...classifyFileType({
              filename: name2,
              mediaKind:
                typeBucket === "image" || typeBucket === "video" || typeBucket === "audio"
                  ? typeBucket
                  : void 0,
            })}
            size={isGrid ? 48 : 24}
            decorative={true}
            className={muted ? "opacity-50" : void 0}
          />
        ) : (
          <Icon
            icon={FallbackIcon2}
            size={isGrid ? "lg" : "sm"}
            strokeWidth={isGrid ? 2 : 1.5}
            className={cn$2(
              "text-foreground opacity-50",
              isGrid && "size-8",
              kind === "folder" && "opacity-70",
              muted && "opacity-30",
            )}
            aria-hidden={true}
          />
        )}
      </span>
    );
  }
  return (
    <span className={containerClassName}>
      <DeferredThumbnailImage
        src={thumbnailSrc}
        alt={isGrid ? name2 : ""}
        draggable={false}
        onFailure={() => setFailed(true)}
        className={cn$2("size-full", isGrid ? "object-cover" : "object-contain")}
      />
      {typeBucket === "video" ? <VideoThumbnailPlayIndicator size={isGrid ? 24 : 12} /> : null}
    </span>
  );
}
export function useProjectAssetsService() {
  return reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IProjectAssetsService)),
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
      setTransfers((previous2) => previous2.filter((item) => item.id !== id2 || isLive(item)));
      void service2.removeTransfer(id2);
    },
    [service2],
  );
  const activeCount = reactExports.useMemo(() => transfers.filter(isLive).length, [transfers]);
  return {
    transfers,
    activeCount,
    cancelTransfer,
    clearFinished,
    removeTransfer,
  };
}
const ASSET_MOVE_MIME = "application/x-hilo-asset-move";
export function useMoveDnd(options) {
  const { keyOf, canDrop, onDrop } = options;
  const [dragging, setDragging] = reactExports.useState(null);
  const [overKey, setOverKey] = reactExports.useState(null);
  const startDrag = reactExports.useCallback((event, item, previewLabel) => {
    event.dataTransfer.setData(ASSET_MOVE_MIME, "1");
    event.dataTransfer.effectAllowed = "copyMove";
    if (previewLabel && typeof event.dataTransfer.setDragImage === "function") {
      const preview = document.createElement("div");
      preview.className =
        "pointer-events-none fixed -left-full top-0 rounded-md border border-border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-sm";
      preview.textContent = previewLabel;
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 16, 16);
      window.requestAnimationFrame(() => preview.remove());
    }
    setDragging(item);
  }, []);
  const endDrag = reactExports.useCallback(() => {
    setDragging(null);
    setOverKey(null);
  }, []);
  const targetProps = reactExports.useCallback(
    (target) => {
      const key2 = keyOf(target);
      return {
        onDragOver: (event) => {
          if (dragging === null) return;
          event.stopPropagation();
          if (!canDrop(dragging, target)) {
            setOverKey((previous2) => (previous2 === key2 ? null : previous2));
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOverKey(key2);
        },
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setOverKey((previous2) => (previous2 === key2 ? null : previous2));
        },
        onDrop: (event) => {
          if (dragging === null) return;
          event.stopPropagation();
          setOverKey(null);
          if (!canDrop(dragging, target)) return;
          event.preventDefault();
          const item = dragging;
          setDragging(null);
          onDrop(item, target);
        },
      };
    },
    [canDrop, dragging, keyOf, onDrop],
  );
  const blockerProps = reactExports.useCallback(
    () => ({
      onDragOver: (event) => {
        if (dragging === null) return;
        event.stopPropagation();
        setOverKey(null);
      },
      onDrop: (event) => {
        if (dragging !== null) event.stopPropagation();
      },
    }),
    [dragging],
  );
  return reactExports.useMemo(
    () => ({
      dragging,
      overKey,
      startDrag,
      endDrag,
      targetProps,
      blockerProps,
    }),
    [blockerProps, dragging, endDrag, overKey, startDrag, targetProps],
  );
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
export function transferFailureText(t2, item) {
  if (item.userMessage) return item.userMessage;
  switch (item.errorKind) {
    case "network":
      return t2("cloudAssets.failNetwork");
    case "fs":
      return t2("cloudAssets.failLocalFile");
    case "http":
      return t2("cloudAssets.failServer");
    default:
      return t2("cloudAssets.failUnknown");
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
    parts.length > 0 ? `${t2("cloudAssets.skippedPrefix")}${parts.join(" · ")}` : void 0;
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
export function formatCloudUpdatedAt(ts2, language2) {
  if (!Number.isFinite(ts2) || ts2 <= 0) return "";
  const date2 = new Date(ts2);
  const hm = `${String(date2.getHours()).padStart(2, "0")}:${String(date2.getMinutes()).padStart(2, "0")}`;
  if (language2.startsWith("zh")) {
    return `${date2.getFullYear()}.${date2.getMonth() + 1}.${date2.getDate()} ${hm}`;
  }
  const day = date2.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${day} ${hm}`;
}
export function DeleteNodeDialog({
  node: node2,
  batchNodes,
  onOpenChange,
  onConfirm,
  onCompleted,
}) {
  const { t: t2 } = useTranslation();
  const [pending2, setPending] = reactExports.useState(false);
  const targets = batchNodes?.length ? batchNodes : node2 ? [node2] : [];
  const isBatch = targets.length > 1;
  const run2 = reactExports.useCallback(async () => {
    if (targets.length === 0 || pending2) return;
    setPending(true);
    let failed = 0;
    try {
      for (const target of targets) {
        try {
          await onConfirm(target);
        } catch (err) {
          failed += 1;
          dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
        }
      }
      if (failed === 0) {
        await onCompleted?.();
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }, [onCompleted, onConfirm, onOpenChange, pending2, t2, targets]);
  const isFolder = targets.length === 1 && targets[0]?.kind === "folder";
  return (
    <Dialog open={targets.length > 0} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="cloud-assets.delete-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {isBatch
              ? t2("projectAssets.batchDeleteTitle", {
                  count: targets.length,
                })
              : isFolder
                ? t2("cloudAssets.deleteFolderTitle", {
                    name: targets[0]?.name ?? "",
                  })
                : t2("cloudAssets.deleteFileTitle", {
                    name: targets[0]?.name ?? "",
                  })}
          </DialogTitle>
          <DialogDescription className="text-[12px]/relaxed text-muted-foreground">
            {isBatch
              ? t2("projectAssets.batchDeleteCloudBody", {
                  count: targets.length,
                })
              : isFolder
                ? t2("cloudAssets.deleteFolderBody")
                : t2("cloudAssets.deleteFileBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            disabled={pending2}
            onClick={() => onOpenChange(false)}
            data-action-ui-id="cloud-assets.delete-cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            variant="destructive"
            size="sm"
            disabled={pending2}
            onClick={() => void run2()}
            data-action-ui-id="cloud-assets.delete-confirm"
          >
            {t2("cloudAssets.delete")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function MoveNodeDialog({
  open,
  name: name2,
  itemCount = 1,
  options,
  loading = false,
  noopKey,
  onOpenChange,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  const [selectedKey, setSelectedKey] = reactExports.useState(void 0);
  const [pending2, setPending] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (open) {
      setSelectedKey(void 0);
      setPending(false);
    }
  }, [open]);
  const selected2 = options.find((option2) => option2.key === selectedKey);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!selected2 || (noopKey !== void 0 && selected2.key === noopKey) || pending2) return;
    setPending(true);
    try {
      await onConfirm(selected2);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }, [noopKey, onConfirm, onOpenChange, pending2, selected2]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="grid-cols-1" data-action-ui-id="asset-move.dialog">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-baseline gap-1 pr-10 text-body-14 leading-5 font-medium">
            {itemCount > 1 ? (
              <span className="min-w-0 truncate">
                {t2("projectAssets.batchMoveDialogTitle", {
                  count: itemCount,
                })}
              </span>
            ) : (
              <>
                <span className="shrink-0">
                  {t2("localAssets.moveDialogTitlePrefix", {
                    defaultValue: "移动",
                  })}
                </span>
                <span className="min-w-0 flex-1 truncate" title={name2}>{`“${name2}”`}</span>
                <span className="shrink-0">
                  {t2("localAssets.moveDialogTitleSuffix", {
                    defaultValue: "到",
                  })}
                </span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {itemCount > 1
              ? t2("projectAssets.batchMoveDialogTitle", {
                  count: itemCount,
                })
              : t2("localAssets.moveDialogTitle", {
                  name: name2,
                })}
          </DialogDescription>
        </DialogHeader>
        <FolderDrillDownPicker
          options={options}
          value={selectedKey}
          onChange={setSelectedKey}
          loading={loading}
          actionUiId="asset-move.destination"
        />
        <DialogFooter>
          <Button$1 variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={
              !selected2 || (noopKey !== void 0 && selected2.key === noopKey) || pending2 || loading
            }
            onClick={() => void handleConfirm()}
            data-action-ui-id="asset-move.confirm"
          >
            {t2("localAssets.move")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function NewFolderDialog({ open, projectId, parentId, onOpenChange, onCreated }) {
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
      dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
    } finally {
      setPending(false);
    }
  }, [onCreated, onOpenChange, parentId, pending2, projectId, t2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="cloud-assets.new-folder-dialog">
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
          <Button$1 variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1 size="sm" disabled={!trimmed || pending2} onClick={() => void handleConfirm()}>
            {t2("common.confirm")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
