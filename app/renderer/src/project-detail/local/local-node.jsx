// 本地资产节点的展示：面包屑、菜单、卡片与行。
import { useTranslation, ChevronRight$1 as ChevronRight, FolderInput, ExternalLink } from "../../vendor.js";
import { cn$2 as cn, DropdownMenuTrigger } from "../../infra/dialog-content.jsx";
import { DropdownMenu, MoreVerticalIcon } from "../../vendor-inline/vscode-base/graph.jsx";
import { Trash2, FolderOpen } from "../../media-editing/package.jsx";
import { formatBytes } from "../../assets/use-cloud-review-nodes.js";
import { resolveTypeBucket } from "../../assets/list-all-cloud-folders.js";
import { ContextMenu } from "../../workspace/topbar-state-context.jsx";
import { ContextMenuTrigger, ActionDropdownMenuContent, ActionDropdownMenuItem, ActionContextMenuContent, ActionContextMenuItem } from "../../workspace/context-menu-content.jsx";
import { ProjectAssetThumbnail } from "../../infra/project-asset-thumbnail-generation.jsx";
import { PlatformFileManagerLabel } from "../../settings/request-prompt-prefill.jsx";
import { PencilIcon } from "../../workspace/home-service.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { AssetsRowCheckbox } from "../assets-common.jsx";
import { nodeMeta, nodeUpdatedAt } from "./local-nodes.js";
export function Breadcrumb({ segments, onCrumb, crumbDnd, crumbDropActive }) {
  const { t } = useTranslation();
  const rootLabel = t("localAssets.breadcrumbRoot", {
    defaultValue: "全部文件",
  });
  const items = [
    {
      index: -1,
      name: rootLabel,
      isCurrent: segments.length === 0,
    },
    ...segments.map((name, i) => ({
      index: i,
      name,
      isCurrent: i === segments.length - 1,
    })),
  ];
  return (
    <div
      className="flex min-w-0 items-center gap-0.5 text-[14px]"
      data-action-ui-id="local-assets.breadcrumb"
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
export function mediaKind(node) {
  if (node.kind !== "file") return void 0;
  const mime = node.record?.mime ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return void 0;
}
function NodeMenu({ node, onOpenFile, onReveal, onRename, onMove, onDelete, className }) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("localAssets.moreActions")}
        data-action-ui-id="local-assets.node-menu"
        className={cn(
          "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <MoreVerticalIcon size={14} />
      </DropdownMenuTrigger>
      <ActionDropdownMenuContent align="end" side="bottom" sideOffset={2}>
        {node.kind === "file" ? (
          <ActionDropdownMenuItem onClick={() => onOpenFile(node)}>
            <ExternalLink size={14} strokeWidth={1.5} />
            {t("localAssets.open")}
          </ActionDropdownMenuItem>
        ) : null}
        <ActionDropdownMenuItem onClick={() => onReveal(node)}>
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ActionDropdownMenuItem>
        <ActionDropdownMenuItem onClick={() => onRename(node)}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t("localAssets.rename")}
        </ActionDropdownMenuItem>
        <ActionDropdownMenuItem onClick={() => onMove(node)}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t("localAssets.moveTo")}
        </ActionDropdownMenuItem>
        <ActionDropdownMenuItem variant="destructive" onClick={() => onDelete(node)}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t("localAssets.delete")}
        </ActionDropdownMenuItem>
      </ActionDropdownMenuContent>
    </DropdownMenu>
  );
}
function NodeContextMenuContent({
  node,
  onOpenFile,
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
    <ActionContextMenuContent data-action-ui-id="local-assets.node-context-menu">
      {!isBatch && node.kind === "file" ? (
        <ActionContextMenuItem onClick={() => onOpenFile(node)}>
          <ExternalLink size={14} strokeWidth={1.5} />
          {t("localAssets.open")}
        </ActionContextMenuItem>
      ) : null}
      <ActionContextMenuItem onClick={handleRevealAction}>
        <FolderOpen size={14} strokeWidth={1.5} />
        <PlatformFileManagerLabel />
      </ActionContextMenuItem>
      {!isBatch ? (
        <ActionContextMenuItem onClick={() => onRename(node)}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t("localAssets.rename")}
        </ActionContextMenuItem>
      ) : null}
      <ActionContextMenuItem onClick={handleMoveAction}>
        <FolderInput size={14} strokeWidth={1.5} />
        {isBatch ? t("projectAssets.batchMove") : t("localAssets.moveTo")}
      </ActionContextMenuItem>
      <ActionContextMenuItem variant="destructive" onClick={handleDeleteAction}>
        <Trash2 size={14} strokeWidth={1.5} />
        {isBatch ? t("projectAssets.batchDelete") : t("localAssets.delete")}
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
export function NodeCard({
  node,
  thumbSrc,
  onOpen,
  onOpenFile,
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
    mime: node.record?.mime,
  });
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
            data-action-ui-id="local-assets.node-card"
          >
            <button
              type="button"
              onClick={() => onOpen(node)}
              className="flex w-full flex-col text-left"
            >
              <ProjectAssetThumbnail
                name={node.name}
                kind={node.kind}
                typeBucket={typeBucket}
                thumbnailSrc={thumbSrc}
                variant="grid"
              />
              <div className="flex w-full flex-col gap-0.5 p-3 pr-9">
                <span className="truncate text-[13px] text-foreground">{node.name}</span>
                <span className="truncate text-[12px] text-muted-foreground">
                  {nodeMeta(node, t)}
                </span>
              </div>
            </button>
            <div className="absolute bottom-2 right-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <NodeMenu
                node={node}
                onOpenFile={onOpenFile}
                onReveal={onReveal}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
              />
            </div>
          </div>
        }
      />
      <NodeContextMenuContent
        node={node}
        onOpenFile={onOpenFile}
        onReveal={onReveal}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      />
    </ContextMenu>
  );
}
export function NodeRow({
  node,
  thumbSrc,
  selected,
  onToggleSelect,
  onOpen,
  onOpenFile,
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
  const { t, i18n } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.record?.mime,
  });
  const updatedAt = nodeUpdatedAt(node, i18n.language);
  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => onContextMenu?.(node)}
        render={
          <div
            {...dndProps}
            className={cn(
              "group/row relative h-11 w-full border-b border-border/60",
              dropActive && "rounded-md bg-primary/10",
              selected && "bg-foreground/[0.04]",
            )}
            data-action-ui-id="local-assets.node-row"
          >
            {onToggleSelect ? (
              <span className="absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center">
                <AssetsRowCheckbox
                  selected={selected ?? false}
                  onToggle={onToggleSelect}
                  ariaLabel={t("projectAssets.selectRow")}
                  actionUiId="local-assets.row-select"
                />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onOpen(node)}
              className="flex h-full w-full items-center gap-2 px-3 pr-14 text-left transition-colors hover:bg-foreground/[0.04]"
            >
              <ProjectAssetThumbnail
                name={node.name}
                kind={node.kind}
                typeBucket={typeBucket}
                thumbnailSrc={thumbSrc}
                variant="list"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="min-w-0 truncate text-[13px] text-foreground">{node.name}</span>
              </span>
              <span className="w-24 shrink-0 text-right text-[12px] text-muted-foreground">
                {node.kind === "folder" ? "—" : formatBytes(node.record?.size ?? 0)}
              </span>
              <span className="w-28 shrink-0 text-right text-[12px] text-muted-foreground">
                {updatedAt ?? "—"}
              </span>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <NodeMenu
                node={node}
                onOpenFile={onOpenFile}
                onReveal={onReveal}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
              />
            </div>
          </div>
        }
      />
      <NodeContextMenuContent
        node={node}
        onOpenFile={onOpenFile}
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
