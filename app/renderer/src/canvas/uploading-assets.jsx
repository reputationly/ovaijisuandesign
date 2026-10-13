// uploading-assets.jsx
import {
  requestJson,
  resolveTypeBucket,
} from "../assets/list-all-cloud-folders.js";
import { classifyFileType, Cloud, CloudDownload, jsxRuntimeExports, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  Button,
  cn$2 as mergeClassNames,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { cloudErrorDisplayMessage } from "../workspace/asset-lineage-query-key.js";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { formatBytes } from "../assets/use-cloud-review-nodes.js";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { ProjectAssetThumbnail } from "../infra/project-asset-thumbnail-generation.jsx";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
async function renameCloudNode(nodeId, newName) {
  await requestJson(
    `/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}/rename`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_name: newName,
      }),
    },
  );
}
function formatCloudUpdatedAt(timestamp, language2) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const date2 = new Date(timestamp);
  const time = `${String(date2.getHours()).padStart(2, "0")}:${String(date2.getMinutes()).padStart(2, "0")}`;
  if (language2.startsWith("zh")) {
    return `${date2.getFullYear()}.${date2.getMonth() + 1}.${date2.getDate()} ${time}`;
  }
  const dateLabel = date2.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateLabel} ${time}`;
}
export function SyncBadge({ state: state2, className }) {
  const { t: translate } = useTranslation();
  if (!state2) return null;
  if (state2 === "synced") return null;
  const label =
    state2 === "stale"
      ? translate("cloudAssets.syncStale")
      : state2 === "downloading"
        ? translate("cloudAssets.syncDownloading")
        : translate("cloudAssets.syncNotDownloaded");
  const chip = (
    <span
      role="img"
      aria-label={label}
      data-action-ui-id="cloud-assets.sync-badge"
      data-sync-state={state2}
      className={mergeClassNames(
        "flex size-6 shrink-0 cursor-default items-center justify-center rounded-full text-[11px] font-medium",
        // Every state is icon-only; hover reveals text via Tooltip while the
        // accessible name remains available without adding a no-op tab stop.
        state2 === "stale" ? "text-primary/60" : "text-muted-foreground",
        className,
      )}
    >
      {state2 === "downloading" ? (
        <CloudDownload
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="animate-pulse"
        />
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
  const { t: translate, i18n } = useTranslation();
  const time = formatCloudUpdatedAt(node2.updatedAt, i18n.language);
  if (!time) return null;
  const name2 = memberNames.get(node2.uploaderId);
  const title = name2
    ? translate("cloudAssets.updatedByAt", {
        name: name2,
        time,
      })
    : translate("cloudAssets.updatedAtOnly", {
        time,
      });
  return (
    <span
      title={title}
      data-action-ui-id="cloud-assets.updated-meta"
      className={mergeClassNames(
        "shrink-0 truncate text-[12px] text-muted-foreground",
        className,
      )}
    >
      {name2 ? `${name2} · ${time}` : time}
    </span>
  );
}
export function getFileName(path2) {
  const separatorIndex = Math.max(path2.lastIndexOf("/"), path2.lastIndexOf("\\"));
  return separatorIndex >= 0 ? path2.slice(separatorIndex + 1) : path2;
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
export function AssetRenameInput({
  extension: extension2,
  className,
  inputClassName,
  ...props
}) {
  const extensionId = reactExports.useId();
  return (
    <div
      className={mergeClassNames(
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
        className={mergeClassNames(
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
  const { t: translate } = useTranslation();
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
    } catch (error) {
      dedupedToast.error(
        cloudErrorDisplayMessage(error) ?? translate("cloudAssets.failServer"),
      );
    } finally {
      setPending(false);
    }
  }, [fullName, node2, onOpenChange, onRenamed, pending2, translate]);
  return (
    <Dialog open={node2 !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="cloud-assets.rename-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {translate("cloudAssets.renameTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {translate("cloudAssets.renameTitle")}
          </DialogDescription>
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
          aria-label={translate("cloudAssets.renamePlaceholder")}
          placeholder={translate("cloudAssets.renamePlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {translate("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!fullName || pending2 || fullName === node2?.name}
            onClick={() => void handleConfirm()}
          >
            {translate("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { t: translate } = useTranslation();
  const isGrid = viewMode === "grid";
  return transfers.map((item) => {
    const pending2 = item.status === "pending";
    const statusText = pending2
      ? translate("cloudAssets.statusWaitingUpload")
      : translate("cloudAssets.statusUploading");
    const status = (
      <span
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
        role="status"
      >
        {!pending2 ? (
          <Spinner
            aria-hidden="true"
            className="size-3 shrink-0 motion-reduce:animate-none"
          />
        ) : null}
        <span>{statusText}</span>
      </span>
    );
    return (
      <div
        key={item.id}
        className={mergeClassNames(
          "min-w-0",
          isGrid
            ? "overflow-hidden rounded-lg border border-border bg-card"
            : compact
              ? "flex h-8 w-full items-center gap-1.5 rounded-md py-1 pl-6 pr-2"
              : "flex w-full items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
        )}
        data-action-ui-id="cloud-assets.upload-item"
      >
        <div className={mergeClassNames("relative", !isGrid && "shrink-0")}>
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
          className={mergeClassNames(
            "flex min-w-0 flex-1",
            isGrid ? "flex-col gap-1 p-3" : "items-center gap-2",
          )}
        >
          <span
            className="min-w-0 truncate text-[13px] text-foreground"
            title={item.name}
          >
            {item.name}
          </span>
          {!isGrid ? status : null}
          {isGrid && item.totalBytes !== void 0 ? (
            <span className="text-xs text-muted-foreground">
              {formatBytes(item.totalBytes)}
            </span>
          ) : null}
        </div>
        {!isGrid && !compact ? (
          <>
            <span
              className="hidden w-28 shrink-0 md:block"
              aria-hidden="true"
            />
            <span
              className="-translate-x-4 hidden w-32 shrink-0 md:block"
              aria-hidden="true"
            />
            <span className="-translate-x-4 w-20 shrink-0 pr-3 text-xs text-muted-foreground">
              {item.totalBytes !== void 0 ? formatBytes(item.totalBytes) : null}
            </span>
          </>
        ) : null}
      </div>
    );
  });
}
export async function importPickedFiles({
  service: service2,
  folderName,
  folderSegments,
  files,
  t: translate,
}) {
  const sourcePaths = [];
  for (const file of files) {
    const path2 = window.hilo?.webUtils?.getPathForFile(file);
    if (!path2) {
      dedupedToast.error(
        translate("localAssets.importNoPath", {
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
        const name2 =
          result.sourcePath.split(/[/\\]/).pop() ?? result.sourcePath;
        dedupedToast.error(
          translate("localAssets.importFailed", {
            name: name2,
          }),
        );
      }
    }
  } catch (error) {
    dedupedToast.error(error instanceof Error ? error.message : String(error));
  }
  return true;
}
