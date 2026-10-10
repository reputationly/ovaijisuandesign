// 云端资产节点的展示：面包屑、审核标记、菜单、卡片与行。
import { useTranslation, jsxRuntimeExports, ChevronRight$1 as ChevronRight, FolderInput } from "../../vendor.js";
import { cn$2 as cn, DropdownMenuTrigger } from "../../infra/dialog-content.jsx";
import { DropdownMenu, MoreVerticalIcon } from "../../vendor-inline/vscode-base/graph.jsx";
import { Trash2, Download, FolderOpen } from "../../media-editing/package.jsx";
import { formatBytes, resolveSyncState, isCloudFileDownloadEnabled } from "../../assets/use-cloud-review-nodes.js";
import { resolveTypeBucket } from "../../assets/list-all-cloud-folders.js";
import { ContextMenu } from "../../workspace/topbar-state-context.jsx";
import { ContextMenuTrigger, ActionDropdownMenuContent, ActionDropdownMenuItem, ActionContextMenuContent, ActionContextMenuItem } from "../../workspace/context-menu-content.jsx";
import { ProjectAssetThumbnail } from "../../infra/project-asset-thumbnail-generation.jsx";
import { NodeUpdatedMeta, SyncBadge } from "../../canvas/uploading-assets.jsx";
import { PlatformFileManagerLabel } from "../../settings/request-prompt-prefill.jsx";
import { PencilIcon } from "../../workspace/home-service.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { AssetsRowCheckbox } from "../assets-common.jsx";
export function Breadcrumb$1({ stack, onCrumb, crumbDnd, crumbDropActive }) {
  const { t } = useTranslation();
  const rootLabel = t("cloudAssets.breadcrumbRoot", {
    defaultValue: "全部文件",
  });
  const items = [
    {
      index: -1,
      name: rootLabel,
      isCurrent: stack.length === 0,
    },
    ...stack.map((crumb, i) => ({
      index: i,
      name: crumb.name,
      isCurrent: i === stack.length - 1,
    })),
  ];
  return (
    <div
      className="flex min-w-0 items-center gap-0.5 text-[14px]"
      data-action-ui-id="cloud-assets.breadcrumb"
    >
      {items.map((item, i) => (
        <div key={`${item.index}:${item.name}`} className="flex min-w-0 items-center gap-0.5">
          {i > 0 ? (
            <ChevronRight
              size={13}
              strokeWidth={1}
              className="shrink-0 text-muted-foreground/60"
              aria-hidden="true"
            />
          ) : null}
          {item.isCurrent ? (
            <span
              className="max-w-40 truncate rounded-md px-1.5 py-0.5 text-foreground"
              data-current="true"
            >
              {item.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onCrumb(item.index)}
              {...crumbDnd?.(item.index)}
              className={cn(
                "max-w-40 truncate rounded-md px-1.5 py-0.5 transition-colors text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                crumbDropActive?.(item.index) && "bg-primary/10 text-foreground",
              )}
            >
              {item.name}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
export function isCloudNodeDownloadable(node, downloadingIds) {
  if (node.kind === "folder") return true;
  return node.review === "pass" && Boolean(node.cdnUrl) && !downloadingIds.has(node.id);
}
export function mediaKind$1(node) {
  if (node.mimeType.startsWith("image/")) return "image";
  if (node.mimeType.startsWith("video/")) return "video";
  return void 0;
}
function ReviewBadge({ node }) {
  const { t } = useTranslation();
  if (node.kind === "folder" || node.review === "pass") return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[11px] font-medium",
        node.review === "reviewing"
          ? "bg-muted text-muted-foreground"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {node.review === "reviewing" ? t("cloudAssets.reviewing") : t("cloudAssets.blocked")}
    </span>
  );
}
function NodeMenu$1({
  node,
  syncMap,
  downloadingIds,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  className,
}) {
  const { t } = useTranslation();
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("cloudAssets.moreActions")}
        data-action-ui-id="cloud-assets.node-menu"
        className={cn(
          "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <MoreVerticalIcon size={14} />
      </DropdownMenuTrigger>
      <ActionDropdownMenuContent align="end" side="bottom" sideOffset={2}>
        {node.kind === "file" ? (
          <>
            <ActionDropdownMenuItem
              disabled={!isCloudFileDownloadEnabled(node, syncState)}
              onClick={() => onDownload(node)}
            >
              <Download size={14} strokeWidth={1.5} />
              {syncState === "stale" ? t("cloudAssets.redownload") : t("cloudAssets.download")}
            </ActionDropdownMenuItem>
            <ActionDropdownMenuItem disabled={!syncMap.has(node.id)} onClick={() => onReveal(node)}>
              <FolderOpen size={14} strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ActionDropdownMenuItem>
          </>
        ) : (
          <ActionDropdownMenuItem onClick={() => onDownloadFolder(node)}>
            <Download size={14} strokeWidth={1.5} />
            {t("cloudAssets.download")}
          </ActionDropdownMenuItem>
        )}
        <ActionDropdownMenuItem disabled={node.review === "block"} onClick={() => onRename(node)}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t("cloudAssets.rename")}
        </ActionDropdownMenuItem>
        <ActionDropdownMenuItem onClick={() => onMove(node)}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t("cloudAssets.moveTo")}
        </ActionDropdownMenuItem>
        <ActionDropdownMenuItem variant="destructive" onClick={() => onDelete(node)}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t("cloudAssets.delete")}
        </ActionDropdownMenuItem>
      </ActionDropdownMenuContent>
    </DropdownMenu>
  );
}
function NodeContextMenuContent$1({
  node,
  syncMap,
  downloadingIds,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets,
}) {
  const { t } = useTranslation();
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  const targets = actionTargets?.length ? actionTargets : [node];
  const isBatch = targets.length > 1;
  const handleRevealAction = () => {
    if (onRevealTargets) onRevealTargets(isBatch ? targets : [node]);
    else onReveal(node);
  };
  const handleMoveAction = () => {
    if (onMoveTargets) onMoveTargets(isBatch ? targets : [node]);
    else onMove(node);
  };
  const handleDeleteAction = () => {
    if (onDeleteTargets) onDeleteTargets(isBatch ? targets : [node]);
    else onDelete(node);
  };
  return (
    <ActionContextMenuContent data-action-ui-id="cloud-assets.node-context-menu">
      {!isBatch && node.kind === "file" ? (
        <ActionContextMenuItem
          disabled={!isCloudFileDownloadEnabled(node, syncState)}
          onClick={() => onDownload(node)}
        >
          <Download size={14} strokeWidth={1.5} />
          {syncState === "stale" ? t("cloudAssets.redownload") : t("cloudAssets.download")}
        </ActionContextMenuItem>
      ) : !isBatch ? (
        <ActionContextMenuItem onClick={() => onDownloadFolder(node)}>
          <Download size={14} strokeWidth={1.5} />
          {t("cloudAssets.download")}
        </ActionContextMenuItem>
      ) : null}
      <ActionContextMenuItem
        disabled={!isBatch && !syncMap.has(node.id)}
        onClick={handleRevealAction}
      >
        <FolderOpen size={14} strokeWidth={1.5} />
        <PlatformFileManagerLabel />
      </ActionContextMenuItem>
      {!isBatch ? (
        <ActionContextMenuItem disabled={node.review === "block"} onClick={() => onRename(node)}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t("cloudAssets.rename")}
        </ActionContextMenuItem>
      ) : null}
      <ActionContextMenuItem onClick={handleMoveAction}>
        <FolderInput size={14} strokeWidth={1.5} />
        {isBatch ? t("projectAssets.batchMove") : t("cloudAssets.moveTo")}
      </ActionContextMenuItem>
      <ActionContextMenuItem variant="destructive" onClick={handleDeleteAction}>
        <Trash2 size={14} strokeWidth={1.5} />
        {isBatch ? t("projectAssets.batchDelete") : t("cloudAssets.delete")}
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
export function NodeCard$1({
  node,
  thumbSrc,
  syncMap,
  downloadingIds,
  memberNames,
  onOpen,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive,
}) {
  const { t } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.mimeType,
  });
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            {...dndProps}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40",
              dropActive && "border-primary bg-primary/5",
            )}
            data-action-ui-id="cloud-assets.node-card"
          >
            <button
              type="button"
              onClick={() => onOpen(node)}
              className={cn(
                "flex w-full flex-col text-left",
                node.review === "block" && "opacity-60",
              )}
            >
              <ProjectAssetThumbnail
                name={node.name}
                kind={node.kind}
                typeBucket={typeBucket}
                thumbnailSrc={thumbSrc}
                variant="grid"
                muted={node.review === "reviewing"}
              />
              <div className="flex w-full flex-col gap-0.5 p-3 pr-9">
                <span className="truncate text-[13px] text-foreground">{node.name}</span>
                <span className="truncate text-[12px] text-muted-foreground">
                  {node.kind === "folder"
                    ? t("cloudAssets.folderMeta", {
                        count: node.totalFileCount,
                      })
                    : formatBytes(node.size)}
                </span>
                <NodeUpdatedMeta
                  node={node}
                  memberNames={memberNames}
                  className="text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            </button>
            <div className="absolute left-2 top-2 flex items-center gap-1">
              <ReviewBadge node={node} />
              <SyncBadge state={syncState} />
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <NodeMenu$1
                node={node}
                syncMap={syncMap}
                downloadingIds={downloadingIds}
                onDownload={onDownload}
                onDownloadFolder={onDownloadFolder}
                onReveal={onReveal}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
              />
            </div>
          </div>
        }
      />
      <NodeContextMenuContent$1
        node={node}
        syncMap={syncMap}
        downloadingIds={downloadingIds}
        onDownload={onDownload}
        onDownloadFolder={onDownloadFolder}
        onReveal={onReveal}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      />
    </ContextMenu>
  );
}
export function NodeRow$1({
  node,
  thumbSrc,
  isLast,
  syncMap,
  downloadingIds,
  memberNames,
  selected,
  onToggleSelect,
  onOpen,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onContextMenu,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets,
  dndProps,
  dropActive,
}) {
  const { t } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.mimeType,
  });
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => onContextMenu?.(node)}
        render={
          <div
            {...dndProps}
            className={cn(
              "group/row relative w-full",
              dropActive && "bg-primary/10",
              selected && "bg-foreground/[0.04]",
            )}
            data-action-ui-id="cloud-assets.node-row"
          >
            {onToggleSelect ? (
              <span className="absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center">
                <AssetsRowCheckbox
                  selected={selected ?? false}
                  onToggle={onToggleSelect}
                  ariaLabel={t("projectAssets.selectRow")}
                  actionUiId="cloud-assets.row-select"
                />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onOpen(node)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:outline-none",
                !isLast && "border-b border-border",
                node.review === "block" && "opacity-60",
              )}
            >
              <ProjectAssetThumbnail
                name={node.name}
                kind={node.kind}
                typeBucket={typeBucket}
                thumbnailSrc={thumbSrc}
                variant="list"
                muted={node.review === "reviewing"}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate text-[13px] text-foreground">{node.name}</span>
                  <SyncBadge state={syncState} />
                  <ReviewBadge node={node} />
                </span>
              </span>
              <span className="hidden w-28 shrink-0 truncate text-[12px] text-muted-foreground md:block">
                {memberNames.get(node.uploaderId) ?? ""}
              </span>
              <NodeUpdatedMeta
                node={{
                  uploaderId: "",
                  updatedAt: node.updatedAt,
                }}
                memberNames={memberNames}
                className="-translate-x-4 hidden w-32 shrink-0 truncate text-[12px] text-muted-foreground md:block"
              />
              <span className="-translate-x-4 w-20 shrink-0 pr-3 text-[12px] text-muted-foreground">
                {node.kind === "folder"
                  ? t("cloudAssets.folderMeta", {
                      count: node.totalFileCount,
                    })
                  : formatBytes(node.size)}
              </span>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <NodeMenu$1
                node={node}
                syncMap={syncMap}
                downloadingIds={downloadingIds}
                onDownload={onDownload}
                onDownloadFolder={onDownloadFolder}
                onReveal={onReveal}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
              />
            </div>
          </div>
        }
      />
      <NodeContextMenuContent$1
        node={node}
        syncMap={syncMap}
        downloadingIds={downloadingIds}
        onDownload={onDownload}
        onDownloadFolder={onDownloadFolder}
        onReveal={onReveal}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
        actionTargets={actionTargets}
        onRevealTargets={onRevealTargets}
        onMoveTargets={onMoveTargets}
        onDeleteTargets={onDeleteTargets}
      />
    </ContextMenu>
  );
}
