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
  mergeTailwindClasses as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
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
function formatCloudUpdatedAt(ts, language) {
  if (!Number.isFinite(ts) || ts <= 0) return "";
  const date = new Date(ts);
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (language.startsWith("zh")) {
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${hm}`;
  }
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${day} ${hm}`;
}
export function SyncBadge({ state, className }) {
  const { t: translate } = useTranslation();
  if (!state) return null;
  if (state === "synced") return null;
  const label =
    state === "stale"
      ? translate("cloudAssets.syncStale")
      : state === "downloading"
        ? translate("cloudAssets.syncDownloading")
        : translate("cloudAssets.syncNotDownloaded");
  const chip = (
    <span
      role="img"
      aria-label={label}
      data-action-ui-id="cloud-assets.sync-badge"
      data-sync-state={state}
      className={cn(
        "flex size-6 shrink-0 cursor-default items-center justify-center rounded-full text-[11px] font-medium",
        // Every state is icon-only; hover reveals text via Tooltip while the
        // accessible name remains available without adding a no-op tab stop.
        state === "stale" ? "text-primary/60" : "text-muted-foreground",
        className,
      )}
    >
      {state === "downloading" ? (
        <CloudDownload
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="animate-pulse"
        />
      ) : state === "stale" ? (
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
export function NodeUpdatedMeta({ node, memberNames, className }) {
  const { t: translate, i18n } = useTranslation();
  const time = formatCloudUpdatedAt(node.updatedAt, i18n.language);
  if (!time) return null;
  const uploaderName = memberNames.get(node.uploaderId);
  const title = uploaderName
    ? translate("cloudAssets.updatedByAt", {
        name: uploaderName,
        time,
      })
    : translate("cloudAssets.updatedAtOnly", {
        time,
      });
  return (
    <span
      title={title}
      data-action-ui-id="cloud-assets.updated-meta"
      className={cn(
        "shrink-0 truncate text-[12px] text-muted-foreground",
        className,
      )}
    >
      {uploaderName ? `${uploaderName} · ${time}` : time}
    </span>
  );
}
export function getFileName(path) {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx >= 0 ? path.slice(idx + 1) : path;
}
export function splitFilename(fileName, kind = "file") {
  const dot = fileName.lastIndexOf(".");
  if (kind === "folder" || dot <= 0 || dot === fileName.length - 1)
    return {
      head: fileName,
      tail: "",
    };
  return {
    head: fileName.slice(0, dot),
    tail: fileName.slice(dot),
  };
}
export function buildRenamedFilename(originalName, newStem, kind = "file") {
  const trimmed = newStem.trim();
  return trimmed ? trimmed + splitFilename(originalName, kind).tail : "";
}
export function AssetRenameInput({
  extension,
  className,
  inputClassName,
  ...props
}) {
  const extensionId = reactExports.useId();
  return (
    <div
      className={cn(
        "flex h-8 min-w-0 items-center overflow-hidden rounded-lg border border-input text-xs focus-within:border-foreground",
        className,
      )}
    >
      <Input
        {...props}
        aria-describedby={
          [props["aria-describedby"], extension ? extensionId : void 0]
            .filter(Boolean)
            .join(" ") || void 0
        }
        className={cn(
          "h-full flex-1 rounded-none border-0 text-[length:inherit] md:text-[length:inherit]",
          inputClassName,
        )}
      />
      {extension && (
        <span
          id={extensionId}
          className="max-w-1/2 shrink-0 truncate pr-2.5 text-muted-foreground"
          title={extension}
        >
          {extension}
        </span>
      )}
    </div>
  );
}
export function RenameNodeDialog({ node, onOpenChange, onRenamed }) {
  const { t: translate } = useTranslation();
  const [baseName, setBaseName] = reactExports.useState("");
  const [pending, setPending] = reactExports.useState(false);
  const { tail: extension } = splitFilename(node?.name ?? "", node?.kind);
  const fullName = buildRenamedFilename(node?.name ?? "", baseName, node?.kind);
  reactExports.useEffect(() => {
    setBaseName(splitFilename(node?.name ?? "", node?.kind).head);
    setPending(false);
  }, [node]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!node || !fullName || pending || fullName === node.name) return;
    setPending(true);
    try {
      await renameCloudNode(node.id, fullName);
      onOpenChange(false);
      onRenamed(node, fullName);
    } catch (err) {
      dedupedToast.error(
        cloudErrorDisplayMessage(err) ?? translate("cloudAssets.failServer"),
      );
    } finally {
      setPending(false);
    }
  }, [fullName, node, onOpenChange, onRenamed, pending, translate]);
  return (
    <Dialog open={node !== null} onOpenChange={onOpenChange}>
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
          extension={extension}
          data-action-ui-id="cloud-assets.rename-input"
          autoFocus={true}
          value={baseName}
          onChange={(event) => setBaseName(event.target.value)}
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
            disabled={!fullName || pending || fullName === node?.name}
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
    const pending = item.status === "pending";
    const statusText = pending
      ? translate("cloudAssets.statusWaitingUpload")
      : translate("cloudAssets.statusUploading");
    const status = (
      <span
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
        role="status"
      >
        {!pending ? (
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
        className={cn(
          "min-w-0",
          isGrid
            ? "overflow-hidden rounded-lg border border-border bg-card"
            : compact
              ? "flex h-8 w-full items-center gap-1.5 rounded-md py-1 pl-6 pr-2"
              : "flex w-full items-center gap-3 border-b border-border px-3 py-2 last:border-b-0",
        )}
        data-action-ui-id="cloud-assets.upload-item"
      >
        <div className={cn("relative", !isGrid && "shrink-0")}>
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
          className={cn(
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
  service,
  folderName,
  folderSegments,
  files,
  t: translate,
}) {
  const sourcePaths = [];
  for (const file of files) {
    const path = window.hilo?.webUtils?.getPathForFile(file);
    if (!path) {
      dedupedToast.error(
        translate("localAssets.importNoPath", {
          name: file.name,
        }),
      );
      continue;
    }
    sourcePaths.push(path);
  }
  if (sourcePaths.length === 0) return false;
  try {
    const results = await service.importLocalAssets({
      projectFolderName: folderName,
      sourcePaths,
      folderSegments,
    });
    for (const result of results) {
      if (result.error) {
        const sourceFileName =
          result.sourcePath.split(/[/\\]/).pop() ?? result.sourcePath;
        dedupedToast.error(
          translate("localAssets.importFailed", {
            name: sourceFileName,
          }),
        );
      }
    }
  } catch (err) {
    dedupedToast.error(err instanceof Error ? err.message : String(err));
  }
  return true;
}
