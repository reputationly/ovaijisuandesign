// transfers-button.jsx
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudUpload,
  jsxRuntimeExports,
  LoaderCircle,
  reactExports,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { formatBytes$1 } from "../assets/use-cloud-review-nodes.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";

function transferFailureText(t2, item) {
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
        <LoaderCircle
          size={16}
          strokeWidth={1.5}
          className="animate-spin text-muted-foreground"
        />
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
        className={cn$2(
          "shrink-0",
          failed ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">
          {item.name}
        </span>
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
        className={cn$2(
          "mt-0.5 shrink-0",
          blocked ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">
          {node2.name}
        </span>
        <span
          className={cn$2(
            "truncate text-[11px]",
            blocked ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {blocked
            ? t2("cloudAssets.statusReviewFailed")
            : t2("cloudAssets.statusReviewing")}
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
      ? Math.min(
          99,
          Math.floor(((item.transferredBytes ?? 0) / item.totalBytes) * 100),
        )
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
        className={cn$2(
          "shrink-0",
          failed ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">
          {item.name}
        </span>
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
          item.kind === "upload" &&
          (item.status === "pending" || item.status === "uploading"),
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
          item.kind === "upload" &&
          item.status === "failed" &&
          item.errorKind !== "review_blocked",
      ),
    [transfers],
  );
  const downloads = reactExports.useMemo(
    () =>
      transfers.filter(
        (item) =>
          item.kind === "download" &&
          (item.status === "pending" ||
            item.status === "downloading" ||
            item.status === "failed"),
      ),
    [transfers],
  );
  const uploadCount =
    uploading.length +
    localReviewing.length +
    reviewNodes.length +
    failedUploads.length;
  const badgeCount =
    uploading.filter((item) => item.status === "uploading").length +
    localReviewing.length +
    reviewNodes.filter((node2) => node2.review === "reviewing").length;
  const failedCount =
    failedUploads.length +
    reviewNodes.filter((node2) => node2.review === "block").length;
  const hasLiveDownloads = downloads.some((item) => item.status !== "failed");
  const showFailureWarning =
    failedCount > 0 && uploadCount === failedCount && !hasLiveDownloads;
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
                <UploadTransferRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveTransfer}
                />
              ))}
              {localReviewing.map((item) => (
                <UploadTransferRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveTransfer}
                />
              ))}
              {reviewNodes.map((node2) => (
                <ReviewNodeRow
                  key={node2.id}
                  node={node2}
                  onDelete={onDeleteBlocked}
                />
              ))}
              {failedUploads.map((item) => (
                <UploadTransferRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveTransfer}
                />
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
