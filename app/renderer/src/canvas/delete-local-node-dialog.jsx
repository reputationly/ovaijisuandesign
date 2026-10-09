// delete-local-node-dialog.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, X$7, LoaderCircle, classifyFileType, CloudDownload, Cloud, CloudUpload, ArrowUpFromLine, ArrowDownToLine } from "../vendor.js";
import { Popover, PopoverTrigger } from "../assets/apply-asset-change.jsx";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { Tooltip, TooltipTrigger } from "../vendor-inline/vscode-base/graph.jsx";
import { Trash2 } from "../media-editing/parse-item.jsx";
import { cloudErrorDisplayMessage } from "../workspace/record-recent-workspace-opened.jsx";
import { resolveTypeBucket } from "../assets/use-cloud-search.js";
import { formatBytes$1 } from "../assets/use-entity-hover-preview.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn$2,
  TooltipContent,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { RetryIcon } from "../workspace/browser-inspiration-urls.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { renameCloudNode } from "../assets/asset-center-relocation-coach-mark.jsx";
import {
  ProjectAssetThumbnail,
  formatCloudUpdatedAt,
  transferFailureText,
} from "../infra/use-move-dnd.jsx";
export function SyncBadge({ state: state2, className }) {
  const { t: t2 } = useTranslation();
  if (!state2) return null;
  if (state2 === "synced") return null;
  const label =
    state2 === "stale"
      ? t2("cloudAssets.syncStale")
      : state2 === "downloading"
        ? t2("cloudAssets.syncDownloading")
        : t2("cloudAssets.syncNotDownloaded");
  const chip = (
    <span
      role="img"
      aria-label={label}
      data-action-ui-id="cloud-assets.sync-badge"
      data-sync-state={state2}
      className={cn$2(
        "flex size-6 shrink-0 cursor-default items-center justify-center rounded-full text-[11px] font-medium",
        // Every state is icon-only; hover reveals text via Tooltip while the
        // accessible name remains available without adding a no-op tab stop.
        state2 === "stale" ? "text-primary/60" : "text-muted-foreground",
        className,
      )}
    >
      {state2 === "downloading" ? (
        <CloudDownload size={14} strokeWidth={1.75} aria-hidden="true" className="animate-pulse" />
      ) : state2 === "stale" ? (
        <RetryIcon size={14} aria-hidden="true" />
      ) : (
        <Cloud size={14} strokeWidth={1.75} aria-hidden="true" />
      )}
    </span>
  );
  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
export function NodeUpdatedMeta({ node: node2, memberNames, className }) {
  const { t: t2, i18n } = useTranslation();
  const time = formatCloudUpdatedAt(node2.updatedAt, i18n.language);
  if (!time) return null;
  const name2 = memberNames.get(node2.uploaderId);
  const title = name2
    ? t2("cloudAssets.updatedByAt", {
        name: name2,
        time,
      })
    : t2("cloudAssets.updatedAtOnly", {
        time,
      });
  return (
    <span
      title={title}
      data-action-ui-id="cloud-assets.updated-meta"
      className={cn$2("shrink-0 truncate text-[12px] text-muted-foreground", className)}
    >
      {name2 ? `${name2} · ${time}` : time}
    </span>
  );
}
export function getFileName$1(path2) {
  const idx = Math.max(path2.lastIndexOf("/"), path2.lastIndexOf("\\"));
  return idx >= 0 ? path2.slice(idx + 1) : path2;
}
export function splitFilename(name2, kind = "file") {
  const dot2 = name2.lastIndexOf(".");
  if (kind === "folder" || dot2 <= 0 || dot2 === name2.length - 1)
    return {
      head: name2,
      tail: "",
    };
  return {
    head: name2.slice(0, dot2),
    tail: name2.slice(dot2),
  };
}
export function buildRenamedFilename(originalName, newStem, kind = "file") {
  const trimmed = newStem.trim();
  return trimmed ? trimmed + splitFilename(originalName, kind).tail : "";
}
export function AssetRenameInput({ extension: extension2, className, inputClassName, ...props }) {
  const extensionId = reactExports.useId();
  return (
    <div
      className={cn$2(
        "flex h-8 min-w-0 items-center overflow-hidden rounded-lg border border-input text-xs focus-within:border-foreground",
        className,
      )}
    >
      <Input3
        {...props}
        aria-describedby={
          [props["aria-describedby"], extension2 ? extensionId : void 0]
            .filter(Boolean)
            .join(" ") || void 0
        }
        className={cn$2(
          "h-full flex-1 rounded-none border-0 text-[length:inherit] md:text-[length:inherit]",
          inputClassName,
        )}
      />
      {extension2 && (
        <span
          id={extensionId}
          className="max-w-1/2 shrink-0 truncate pr-2.5 text-muted-foreground"
          title={extension2}
        >
          {extension2}
        </span>
      )}
    </div>
  );
}
export function RenameNodeDialog({ node: node2, onOpenChange, onRenamed }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const { tail: extension2 } = splitFilename(node2?.name ?? "", node2?.kind);
  const fullName = buildRenamedFilename(node2?.name ?? "", name2, node2?.kind);
  reactExports.useEffect(() => {
    setName(splitFilename(node2?.name ?? "", node2?.kind).head);
    setPending(false);
  }, [node2]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!node2 || !fullName || pending2 || fullName === node2.name) return;
    setPending(true);
    try {
      await renameCloudNode(node2.id, fullName);
      onOpenChange(false);
      onRenamed(node2, fullName);
    } catch (err) {
      dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
    } finally {
      setPending(false);
    }
  }, [fullName, node2, onOpenChange, onRenamed, pending2, t2]);
  return (
    <Dialog open={node2 !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="cloud-assets.rename-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("cloudAssets.renameTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t2("cloudAssets.renameTitle")}</DialogDescription>
        </DialogHeader>
        <AssetRenameInput
          extension={extension2}
          data-action-ui-id="cloud-assets.rename-input"
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("cloudAssets.renamePlaceholder")}
          placeholder={t2("cloudAssets.renamePlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button$1 variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={!fullName || pending2 || fullName === node2?.name}
            onClick={() => void handleConfirm()}
          >
            {t2("common.confirm")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function TransfersButton({
  reviewNodes,
  reviewLoading,
  transfers,
  onOpen,
  onCancelTransfer,
  onDeleteBlocked,
  onRemoveTransfer,
}) {
  const { t: t2 } = useTranslation();
  const [tab2, setTab] = reactExports.useState("upload");
  const uploading = reactExports.useMemo(
    () =>
      transfers.filter(
        (item) =>
          item.kind === "upload" && (item.status === "pending" || item.status === "uploading"),
      ),
    [transfers],
  );
  const localReviewing = reactExports.useMemo(() => {
    const knownIds = new Set(reviewNodes.map((node2) => node2.id));
    return transfers.filter(
      (item) =>
        item.kind === "upload" &&
        item.status === "reviewing" &&
        (!item.nodeId || !knownIds.has(item.nodeId)),
    );
  }, [transfers, reviewNodes]);
  const failedUploads = reactExports.useMemo(
    () =>
      transfers.filter(
        (item) =>
          item.kind === "upload" && item.status === "failed" && item.errorKind !== "review_blocked",
      ),
    [transfers],
  );
  const downloads = reactExports.useMemo(
    () =>
      transfers.filter(
        (item) =>
          item.kind === "download" &&
          (item.status === "pending" || item.status === "downloading" || item.status === "failed"),
      ),
    [transfers],
  );
  const uploadCount =
    uploading.length + localReviewing.length + reviewNodes.length + failedUploads.length;
  const badgeCount =
    uploading.filter((item) => item.status === "uploading").length +
    localReviewing.length +
    reviewNodes.filter((node2) => node2.review === "reviewing").length;
  const failedCount =
    failedUploads.length + reviewNodes.filter((node2) => node2.review === "block").length;
  const hasLiveDownloads = downloads.some((item) => item.status !== "failed");
  const showFailureWarning = failedCount > 0 && uploadCount === failedCount && !hasLiveDownloads;
  const failureHint = t2("cloudAssets.transferFailuresHint");
  const uploadEmpty = uploadCount === 0;
  const downloadEmpty = downloads.length === 0;
  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) return;
        onOpen();
        if (uploadEmpty && !downloadEmpty) setTab("download");
        else setTab("upload");
      }}
    >
      <PopoverTrigger
        aria-label={
          showFailureWarning
            ? `${t2("cloudAssets.transferTitle")}: ${failureHint}`
            : t2("cloudAssets.transferTitle")
        }
        title={showFailureWarning ? failureHint : void 0}
        data-action-ui-id="cloud-assets.transfers"
        className={cn$2(
          "relative flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-muted",
          showFailureWarning
            ? "text-destructive hover:text-destructive"
            : "text-foreground hover:text-foreground",
        )}
      >
        <CloudUpload size={15} strokeWidth={1.5} />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-medium leading-none text-background">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : showFailureWarning ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium leading-none text-destructive-foreground"
          >
            !
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <div className="flex items-center px-2 py-1.5">
          <span className="text-[12px] font-medium text-foreground">
            {t2("cloudAssets.transferTitle")}
          </span>
        </div>
        <div className="mx-1 mb-1 flex gap-0.5 rounded-lg bg-muted p-0.5">
          <TabButton
            active={tab2 === "upload"}
            label={t2("cloudAssets.tabUploads")}
            icon={<ArrowUpFromLine size={12} strokeWidth={1.5} />}
            onClick={() => setTab("upload")}
            actionId="cloud-assets.transfers-tab-upload"
          />
          <TabButton
            active={tab2 === "download"}
            label={t2("cloudAssets.tabDownloads")}
            icon={<ArrowDownToLine size={12} strokeWidth={1.5} />}
            onClick={() => setTab("download")}
            actionId="cloud-assets.transfers-tab-download"
          />
        </div>
        {tab2 === "upload" ? (
          uploadEmpty ? (
            <EmptyState$1 loading={reviewLoading} />
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {uploading.map((item) => (
                <UploadTransferRow key={item.id} item={item} onRemove={onRemoveTransfer} />
              ))}
              {localReviewing.map((item) => (
                <UploadTransferRow key={item.id} item={item} onRemove={onRemoveTransfer} />
              ))}
              {reviewNodes.map((node2) => (
                <ReviewNodeRow key={node2.id} node={node2} onDelete={onDeleteBlocked} />
              ))}
              {failedUploads.map((item) => (
                <UploadTransferRow key={item.id} item={item} onRemove={onRemoveTransfer} />
              ))}
            </div>
          )
        ) : downloadEmpty ? (
          <EmptyState$1 loading={false} />
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {downloads.map((item) => (
              <DownloadRow
                key={item.id}
                item={item}
                onCancel={onCancelTransfer}
                onRemove={onRemoveTransfer}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
function TabButton({ active: active2, label, icon, onClick, actionId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-action-ui-id={actionId}
      className={cn$2(
        "flex h-6 flex-1 items-center justify-center gap-1 rounded-md text-[12px] transition-colors",
        active2
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
function EmptyState$1({ loading }) {
  const { t: t2 } = useTranslation();
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <LoaderCircle size={16} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
      {t2("cloudAssets.transfersEmpty")}
    </p>
  );
}
function UploadTransferRow({ item, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const failed = item.status === "failed";
  const statusText = failed
    ? t2("cloudAssets.statusFailed")
    : item.status === "reviewing"
      ? t2("cloudAssets.statusReviewing")
      : t2("cloudAssets.statusUploading");
  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowUpFromLine
        size={14}
        strokeWidth={1.5}
        className={cn$2("shrink-0", failed ? "text-destructive" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">{item.name}</span>
        <span
          className={cn$2(
            "truncate text-[11px]",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {statusText}
          {item.totalBytes ? ` · ${formatBytes$1(item.totalBytes)}` : null}
        </span>
        {failed ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {transferFailureText(t2, item)}
          </span>
        ) : null}
      </div>
      {failed ? (
        <button
          type="button"
          aria-label={t2("cloudAssets.removeRecord")}
          title={t2("cloudAssets.removeRecord")}
          onClick={() => onRemove2(item.id)}
          data-action-ui-id="cloud-assets.remove-transfer"
          className="shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground"
        >
          <X$7 size={14} strokeWidth={1.5} />
        </button>
      ) : (
        <LoaderCircle
          size={14}
          strokeWidth={1.5}
          className="shrink-0 animate-spin text-muted-foreground"
        />
      )}
    </div>
  );
}
function ReviewNodeRow({ node: node2, onDelete }) {
  const { t: t2 } = useTranslation();
  const blocked = node2.review === "block";
  return (
    <div
      className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowUpFromLine
        size={14}
        strokeWidth={1.5}
        className={cn$2("mt-0.5 shrink-0", blocked ? "text-destructive" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">{node2.name}</span>
        <span
          className={cn$2(
            "truncate text-[11px]",
            blocked ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {blocked ? t2("cloudAssets.statusReviewFailed") : t2("cloudAssets.statusReviewing")}
          {node2.size > 0 ? ` · ${formatBytes$1(node2.size)}` : null}
        </span>
        {blocked ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {t2("cloudAssets.reviewFailedHint")}
          </span>
        ) : null}
      </div>
      {blocked ? (
        <button
          type="button"
          onClick={() => onDelete(node2)}
          data-action-ui-id="cloud-assets.delete-blocked"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 size={13} strokeWidth={1.5} />
          {t2("cloudAssets.deleteFile")}
        </button>
      ) : (
        <LoaderCircle
          size={14}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 animate-spin text-muted-foreground"
        />
      )}
    </div>
  );
}
function DownloadRow({ item, onCancel, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const failed = item.status === "failed";
  const percent2 =
    item.status === "downloading" && item.totalBytes && item.totalBytes > 0
      ? Math.min(99, Math.floor(((item.transferredBytes ?? 0) / item.totalBytes) * 100))
      : void 0;
  const statusText = failed
    ? t2("cloudAssets.statusFailed")
    : item.status === "pending"
      ? t2("cloudAssets.statusPending")
      : t2("cloudAssets.statusDownloading");
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowDownToLine
        size={14}
        strokeWidth={1.5}
        className={cn$2("shrink-0", failed ? "text-destructive" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">{item.name}</span>
        <span
          className={cn$2(
            "truncate text-[11px]",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {statusText}
          {percent2 !== void 0 ? ` · ${percent2}%` : null}
          {item.batchLabel ? ` · ${item.batchLabel}` : null}
        </span>
        {failed ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {transferFailureText(t2, item)}
          </span>
        ) : null}
      </div>
      {failed ? (
        <button
          type="button"
          aria-label={t2("cloudAssets.removeRecord")}
          title={t2("cloudAssets.removeRecord")}
          onClick={() => onRemove2(item.id)}
          data-action-ui-id="cloud-assets.remove-transfer"
          className="shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground"
        >
          <X$7 size={14} strokeWidth={1.5} />
        </button>
      ) : (
        <>
          <LoaderCircle
            size={14}
            strokeWidth={1.5}
            className="shrink-0 animate-spin text-muted-foreground group-hover:hidden"
          />
          <button
            type="button"
            aria-label={t2("common.cancel")}
            onClick={() => onCancel(item.id)}
            data-action-ui-id="cloud-assets.cancel-download"
            className="hidden shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground group-hover:block"
          >
            <X$7 size={14} strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  );
}
export function FileTypeThumbnail({ filename, mime }) {
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-[2px] bg-foreground/4"
      data-slot="file-type-thumbnail"
    >
      <FileTypeIcon
        {...classifyFileType({
          filename,
          mime,
        })}
        size={14}
        className="-translate-x-[0.5px]"
        decorative={true}
      />
    </span>
  );
}
export function UploadingAssets({ transfers, viewMode, compact = false }) {
  const { t: t2 } = useTranslation();
  const isGrid = viewMode === "grid";
  return transfers.map((item) => {
    const pending2 = item.status === "pending";
    const statusText = pending2
      ? t2("cloudAssets.statusWaitingUpload")
      : t2("cloudAssets.statusUploading");
    const status = (
      <span
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
        role="status"
      >
        {!pending2 ? (
          <Spinner aria-hidden="true" className="size-3 shrink-0 motion-reduce:animate-none" />
        ) : null}
        <span>{statusText}</span>
      </span>
    );
    return (
      <div
        key={item.id}
        className={cn$2(
          "min-w-0",
          isGrid
            ? "overflow-hidden rounded-lg border border-border bg-card"
            : compact
              ? "flex h-8 w-full items-center gap-1.5 rounded-md py-1 pl-6 pr-2"
              : "flex w-full items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
        )}
        data-action-ui-id="cloud-assets.upload-item"
      >
        <div className={cn$2("relative", !isGrid && "shrink-0")}>
          {compact && !isGrid ? (
            <FileTypeThumbnail filename={item.name} />
          ) : (
            <ProjectAssetThumbnail
              name={item.name}
              kind="file"
              typeBucket={resolveTypeBucket({
                kind: "file",
                name: item.name,
              })}
              variant={viewMode}
            />
          )}
          {isGrid ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <span className="rounded-full bg-card px-2 py-1.5">{status}</span>
            </div>
          ) : null}
        </div>
        <div
          className={cn$2(
            "flex min-w-0 flex-1",
            isGrid ? "flex-col gap-1 p-3" : "items-center gap-2",
          )}
        >
          <span className="min-w-0 truncate text-[13px] text-foreground" title={item.name}>
            {item.name}
          </span>
          {!isGrid ? status : null}
          {isGrid && item.totalBytes !== void 0 ? (
            <span className="text-xs text-muted-foreground">{formatBytes$1(item.totalBytes)}</span>
          ) : null}
        </div>
        {!isGrid && !compact ? (
          <>
            <span className="hidden w-28 shrink-0 md:block" aria-hidden="true" />
            <span className="-translate-x-4 hidden w-32 shrink-0 md:block" aria-hidden="true" />
            <span className="-translate-x-4 w-20 shrink-0 pr-3 text-xs text-muted-foreground">
              {item.totalBytes !== void 0 ? formatBytes$1(item.totalBytes) : null}
            </span>
          </>
        ) : null}
      </div>
    );
  });
}
export function DeleteLocalNodeDialog({
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
          dedupedToast.error(err instanceof Error ? err.message : String(err));
        }
      }
      if (failed === 0) {
        await onCompleted?.();
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }, [onCompleted, onConfirm, onOpenChange, pending2, targets]);
  const isFolder = targets.length === 1 && targets[0]?.kind === "folder";
  return (
    <Dialog open={targets.length > 0} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.delete-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {isBatch
              ? t2("projectAssets.batchDeleteTitle", {
                  count: targets.length,
                })
              : isFolder
                ? t2("localAssets.deleteFolderTitle", {
                    name: targets[0]?.name ?? "",
                  })
                : t2("localAssets.deleteFileTitle", {
                    name: targets[0]?.name ?? "",
                  })}
          </DialogTitle>
          <DialogDescription className="text-[12px]/relaxed text-muted-foreground">
            {isBatch
              ? t2("projectAssets.batchDeleteLocalBody", {
                  count: targets.length,
                })
              : isFolder
                ? t2("localAssets.deleteFolderBody")
                : t2("localAssets.deleteFileBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            disabled={pending2}
            onClick={() => onOpenChange(false)}
            data-action-ui-id="local-assets.delete-cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            variant="destructive"
            size="sm"
            disabled={pending2}
            onClick={() => void run2()}
            data-action-ui-id="local-assets.delete-confirm"
          >
            {t2("localAssets.delete")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export async function importPickedFiles({
  service: service2,
  folderName,
  folderSegments,
  files,
  t: t2,
}) {
  const sourcePaths = [];
  for (const file of files) {
    const path2 = window.hilo?.webUtils?.getPathForFile(file);
    if (!path2) {
      dedupedToast.error(
        t2("localAssets.importNoPath", {
          name: file.name,
        }),
      );
      continue;
    }
    sourcePaths.push(path2);
  }
  if (sourcePaths.length === 0) return false;
  try {
    const results = await service2.importLocalAssets({
      projectFolderName: folderName,
      sourcePaths,
      folderSegments,
    });
    for (const result of results) {
      if (result.error) {
        const name2 = result.sourcePath.split(/[/\\]/).pop() ?? result.sourcePath;
        dedupedToast.error(
          t2("localAssets.importFailed", {
            name: name2,
          }),
        );
      }
    }
  } catch (err) {
    dedupedToast.error(err instanceof Error ? err.message : String(err));
  }
  return true;
}
