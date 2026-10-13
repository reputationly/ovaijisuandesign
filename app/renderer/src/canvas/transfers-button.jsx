// transfers-button.jsx
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CloudUpload,
  jsxRuntimeExports,
  LoaderCircle,
  reactExports,
  useTranslation,
  X$7 as XIcon,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { formatBytes } from "../assets/use-cloud-review-nodes.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
function transferFailureText(translate, item) {
  if (item.userMessage) return item.userMessage;
  switch (item.errorKind) {
    case "network":
      return translate("cloudAssets.failNetwork");
    case "fs":
      return translate("cloudAssets.failLocalFile");
    case "http":
      return translate("cloudAssets.failServer");
    default:
      return translate("cloudAssets.failUnknown");
  }
}
function TabButton({ active, label, icon, onClick, actionId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-action-ui-id={actionId}
      className={cn(
        "flex h-6 flex-1 items-center justify-center gap-1 rounded-md text-[12px] transition-colors",
        active
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
function EmptyState({ loading }) {
  const { t: translate } = useTranslation();
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
      {translate("cloudAssets.transfersEmpty")}
    </p>
  );
}
function UploadTransferRow({ item, onRemove }) {
  const { t: translate } = useTranslation();
  const failed = item.status === "failed";
  const statusText = failed
    ? translate("cloudAssets.statusFailed")
    : item.status === "reviewing"
      ? translate("cloudAssets.statusReviewing")
      : translate("cloudAssets.statusUploading");
  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowUpFromLine
        size={14}
        strokeWidth={1.5}
        className={cn(
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
          className={cn(
            "truncate text-[11px]",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {statusText}
          {item.totalBytes ? ` · ${formatBytes(item.totalBytes)}` : null}
        </span>
        {failed ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {transferFailureText(translate, item)}
          </span>
        ) : null}
      </div>
      {failed ? (
        <button
          type="button"
          aria-label={translate("cloudAssets.removeRecord")}
          title={translate("cloudAssets.removeRecord")}
          onClick={() => onRemove(item.id)}
          data-action-ui-id="cloud-assets.remove-transfer"
          className="shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground"
        >
          <XIcon size={14} strokeWidth={1.5} />
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
function ReviewNodeRow({ node, onDelete }) {
  const { t: translate } = useTranslation();
  const blocked = node.review === "block";
  return (
    <div
      className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowUpFromLine
        size={14}
        strokeWidth={1.5}
        className={cn(
          "mt-0.5 shrink-0",
          blocked ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12px] text-foreground">
          {node.name}
        </span>
        <span
          className={cn(
            "truncate text-[11px]",
            blocked ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {blocked
            ? translate("cloudAssets.statusReviewFailed")
            : translate("cloudAssets.statusReviewing")}
          {node.size > 0 ? ` · ${formatBytes(node.size)}` : null}
        </span>
        {blocked ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {translate("cloudAssets.reviewFailedHint")}
          </span>
        ) : null}
      </div>
      {blocked ? (
        <button
          type="button"
          onClick={() => onDelete(node)}
          data-action-ui-id="cloud-assets.delete-blocked"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 size={13} strokeWidth={1.5} />
          {translate("cloudAssets.deleteFile")}
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
function DownloadRow({ item, onCancel, onRemove }) {
  const { t: translate } = useTranslation();
  const failed = item.status === "failed";
  const percent =
    item.status === "downloading" && item.totalBytes && item.totalBytes > 0
      ? Math.min(
          99,
          Math.floor(((item.transferredBytes ?? 0) / item.totalBytes) * 100),
        )
      : void 0;
  const statusText = failed
    ? translate("cloudAssets.statusFailed")
    : item.status === "pending"
      ? translate("cloudAssets.statusPending")
      : translate("cloudAssets.statusDownloading");
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-popup-item-hover"
      data-action-ui-id="cloud-assets.transfer-row"
    >
      <ArrowDownToLine
        size={14}
        strokeWidth={1.5}
        className={cn(
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
          className={cn(
            "truncate text-[11px]",
            failed ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {statusText}
          {percent !== void 0 ? ` · ${percent}%` : null}
          {item.batchLabel ? ` · ${item.batchLabel}` : null}
        </span>
        {failed ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {transferFailureText(translate, item)}
          </span>
        ) : null}
      </div>
      {failed ? (
        <button
          type="button"
          aria-label={translate("cloudAssets.removeRecord")}
          title={translate("cloudAssets.removeRecord")}
          onClick={() => onRemove(item.id)}
          data-action-ui-id="cloud-assets.remove-transfer"
          className="shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground"
        >
          <XIcon size={14} strokeWidth={1.5} />
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
            aria-label={translate("common.cancel")}
            onClick={() => onCancel(item.id)}
            data-action-ui-id="cloud-assets.cancel-download"
            className="hidden shrink-0 rounded-sm p-0.5 text-foreground/60 transition-colors hover:text-foreground group-hover:block"
          >
            <XIcon size={14} strokeWidth={1.5} />
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
  const { t: translate } = useTranslation();
  const [tab, setTab] = reactExports.useState("upload");
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
    const knownIds = new Set(reviewNodes.map((node) => node.id));
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
    reviewNodes.filter((node) => node.review === "reviewing").length;
  const failedCount =
    failedUploads.length +
    reviewNodes.filter((node) => node.review === "block").length;
  const hasLiveDownloads = downloads.some((item) => item.status !== "failed");
  const showFailureWarning =
    failedCount > 0 && uploadCount === failedCount && !hasLiveDownloads;
  const failureHint = translate("cloudAssets.transferFailuresHint");
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
            ? `${translate("cloudAssets.transferTitle")}: ${failureHint}`
            : translate("cloudAssets.transferTitle")
        }
        title={showFailureWarning ? failureHint : void 0}
        data-action-ui-id="cloud-assets.transfers"
        className={cn(
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
            {translate("cloudAssets.transferTitle")}
          </span>
        </div>
        <div className="mx-1 mb-1 flex gap-0.5 rounded-lg bg-muted p-0.5">
          <TabButton
            active={tab === "upload"}
            label={translate("cloudAssets.tabUploads")}
            icon={<ArrowUpFromLine size={12} strokeWidth={1.5} />}
            onClick={() => setTab("upload")}
            actionId="cloud-assets.transfers-tab-upload"
          />
          <TabButton
            active={tab === "download"}
            label={translate("cloudAssets.tabDownloads")}
            icon={<ArrowDownToLine size={12} strokeWidth={1.5} />}
            onClick={() => setTab("download")}
            actionId="cloud-assets.transfers-tab-download"
          />
        </div>
        {tab === "upload" ? (
          uploadEmpty ? (
            <EmptyState loading={reviewLoading} />
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
              {reviewNodes.map((node) => (
                <ReviewNodeRow
                  key={node.id}
                  node={node}
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
          <EmptyState loading={false} />
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
