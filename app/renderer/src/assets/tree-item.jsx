// tree-item.jsx
import {
  API_PATHS,
  ChevronDown,
  ChevronRight$1 as ChevronRight,
  Crosshair,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  arePropsRefEqualExcept,
  FileTypeBadge,
  InlineInput,
  TagDots,
} from "./inline-input.jsx";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import { MissingCandidateActions } from "./missing-candidate-actions.jsx";
import { Folder, FolderOpen } from "../media-editing/package.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { splitFilename } from "../canvas/uploading-assets.jsx";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";
import { ContextMenuTrigger } from "../workspace/context-menu-content.jsx";
import {
  extractDropSourcePaths,
  isInvalidDropTarget,
} from "./use-file-explorer-canvas-integration.js";
import { AssetContextMenuContent } from "./asset-context-menu-content.jsx";
const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "bmp",
]);
const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "webm", "mkv"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "flac", "aac", "m4a"]);
const DRAG_MIME = "application/x-file-explorer-path";
const TREE_ROW_OUTER_CLASS =
  "group flex h-8 mx-2 w-[calc(100%-1rem)] items-center text-[13px] select-none transition-colors outline-none";
const TREE_ROW_INNER_CLASS =
  "flex h-7 w-full min-w-0 items-center gap-0.5 rounded-md px-2 transition-colors";
const TREE_ROW_HOVER_CLASS = "group-hover:bg-foreground/5";
const TREE_ROW_SELECTED_CLASS = "bg-foreground/[0.12]";
function getThumbnailUrl(gatewayUrl2, fileName, absPath, rootPath) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const prefix =
    rootPath.endsWith("/") || rootPath.endsWith("\\")
      ? rootPath
      : `${rootPath}/`;
  const relativePath = absPath.startsWith(prefix)
    ? absPath.slice(prefix.length)
    : absPath;
  if (IMAGE_EXTS.has(ext)) {
    return (
      withThumbnail(gatewayUrl2(API_PATHS.serveFile(relativePath)), 18) ?? null
    );
  }
  if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
    return gatewayUrl2(API_PATHS.thumbnail(relativePath)) ?? null;
  }
  return null;
}
function FileThumbnail({ url: url2, name: name2, isVideo }) {
  const [error, setError] = reactExports.useState(false);
  const [retried, setRetried] = reactExports.useState(false);
  const handleError = () => {
    if (!retried) {
      setRetried(true);
    } else {
      setError(true);
    }
  };
  if (error) {
    return <FileTypeBadge fileName={name2} variant="inline" />;
  }
  const src = retried
    ? `${url2}${url2.includes("?") ? "&" : "?"}force=1`
    : url2;
  return (
    <div className="relative shrink-0 size-5 rounded-[2px] overflow-hidden">
      <img
        src={src}
        alt={name2}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={handleError}
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <PlaybackPlayIcon
            size={10}
            className="text-[var(--media-overlay-foreground)] drop-shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
const SPECIAL_PROPS = ["renamingPath", "entry", "asset"];
function arePropsEqual(prev, next2) {
  const prevIsRenaming = prev.renamingPath === prev.entry.path;
  const nextIsRenaming = next2.renamingPath === next2.entry.path;
  if (prevIsRenaming !== nextIsRenaming) return false;
  const pe2 = prev.entry;
  const ne2 = next2.entry;
  if (pe2.path !== ne2.path) return false;
  if (pe2.name !== ne2.name) return false;
  if (pe2.isDirectory !== ne2.isDirectory) return false;
  if (pe2.status !== ne2.status) return false;
  if (pe2.isDirectory) {
    if ((pe2.children?.length ?? 0) !== (ne2.children?.length ?? 0))
      return false;
  }
  if (pe2.status === "missing" || ne2.status === "missing") {
    if (pe2.candidate?.asset_id !== ne2.candidate?.asset_id) return false;
  }
  if (prev.asset !== next2.asset) {
    const pa = prev.asset;
    const na = next2.asset;
    if (!pa || !na) return false;
    if (pa.id !== na.id) return false;
    if (pa.path !== na.path) return false;
    if (pa.name !== na.name) return false;
    if (pa.type !== na.type) return false;
    if (pa.status !== na.status) return false;
    if (pa.duration !== na.duration) return false;
    if (pa.candidate?.asset_id !== na.candidate?.asset_id) return false;
    if (pa.candidate?.path !== na.candidate?.path) return false;
  }
  return arePropsRefEqualExcept(prev, next2, SPECIAL_PROPS);
}
export const TreeItem = reactExports.memo(function TreeItem2({
  entry,
  depth: depth2,
  isExpanded,
  isSelected,
  isCreating,
  rootPath,
  viewMode,
  onSwitchViewMode,
  asset,
  buildDragPayload,
  onToggle,
  onFileSelect,
  onFileDoubleClick,
  onRename,
  onDelete,
  onCopyPath,
  onCopyFile,
  onDuplicate,
  onMove,
  onStartRename,
  onCreateConfirm,
  onCreateCancel,
  onStartCreateInside,
  renamingPath,
  onRenameCancel,
  onAddToCanvas,
  onAddToChat,
  onPromoteToAsset,
  onSaveToProjectAssets,
  onLocateOnCanvas,
  onAnchorMount,
  onOpenDefault,
  onOpenWith,
  onPickAppAndOpen,
  onShowInFolder,
  onMergeCandidate,
  onRemoveMissing,
  onLocateMissing,
  onHoverIntent,
  onHoverEnd,
}) {
  const { t: t2 } = useTranslation();
  const gatewayUrl2 = useGatewayUrl();
  const isRenaming = renamingPath === entry.path;
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [contextOpen, setContextOpen] = reactExports.useState(false);
  const [openWithSubOpen, setOpenWithSubOpen] = reactExports.useState(false);
  const paddingLeft = depth2 * 16;
  const target = reactExports.useMemo(
    () => ({
      path: entry.path,
      name: entry.name,
      isDirectory: entry.isDirectory,
      isMissing: entry.status === "missing",
    }),
    [entry.path, entry.name, entry.isDirectory, entry.status],
  );
  const handleAddToCanvas = reactExports.useCallback(
    () => onAddToCanvas(target),
    [onAddToCanvas, target],
  );
  const handleAddToChat = reactExports.useCallback(
    () => onAddToChat(target),
    [onAddToChat, target],
  );
  const handlePromoteToAsset = reactExports.useMemo(
    () => (onPromoteToAsset ? () => onPromoteToAsset(target) : void 0),
    [onPromoteToAsset, target],
  );
  const handleSaveToProjectAssets = reactExports.useMemo(
    () =>
      onSaveToProjectAssets ? () => onSaveToProjectAssets(target) : void 0,
    [onSaveToProjectAssets, target],
  );
  const handleLocateOnCanvas = reactExports.useCallback(
    () => onLocateOnCanvas(target),
    [onLocateOnCanvas, target],
  );
  const handleLocateButtonClick = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      handleLocateOnCanvas();
    },
    [handleLocateOnCanvas],
  );
  const rowRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!onAnchorMount || entry.isDirectory || isCreating) return;
    const path2 = entry.path;
    const el = rowRef.current;
    if (!el) return;
    onAnchorMount(path2, el);
    return () => onAnchorMount(path2, null);
  }, [onAnchorMount, entry.path, entry.isDirectory, isCreating]);
  const handleOpenDefault = reactExports.useCallback(
    () => onOpenDefault(entry.path),
    [onOpenDefault, entry.path],
  );
  const handleShowInFolder = reactExports.useCallback(
    () => onShowInFolder(entry.path),
    [onShowInFolder, entry.path],
  );
  const handleCopyPath = reactExports.useCallback(
    () => onCopyPath(entry.path),
    [onCopyPath, entry.path],
  );
  const handleCopyFile = reactExports.useCallback(
    () => onCopyFile(entry.path),
    [onCopyFile, entry.path],
  );
  const handleDuplicate = reactExports.useCallback(
    () => onDuplicate(entry),
    [onDuplicate, entry],
  );
  const handleStartRename = reactExports.useCallback(
    () => onStartRename(entry.path),
    [onStartRename, entry.path],
  );
  const handleDelete2 = reactExports.useCallback(
    () => onDelete(entry),
    [onDelete, entry],
  );
  const handleOpenWith = reactExports.useCallback(
    (appPath) => onOpenWith(entry.path, appPath),
    [onOpenWith, entry.path],
  );
  const handlePickAppAndOpen = reactExports.useCallback(
    () => onPickAppAndOpen(entry.path),
    [onPickAppAndOpen, entry.path],
  );
  const handleContextMenu = reactExports.useCallback(() => {
    if (!isSelected) {
      onFileSelect(entry.path, {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
      });
    }
  }, [entry.path, isSelected, onFileSelect]);
  const handlePointerEnter = reactExports.useCallback(
    (e2) => {
      if (!asset || !onHoverIntent) return;
      onHoverIntent({
        asset,
        anchor: e2.currentTarget,
        absolutePath: entry.path,
      });
    },
    [asset, onHoverIntent, entry.path],
  );
  const handlePointerLeave = reactExports.useCallback(() => {
    onHoverEnd?.();
  }, [onHoverEnd]);
  if (isCreating) {
    return (
      <div
        className={TREE_ROW_OUTER_CLASS}
        style={{
          paddingLeft,
        }}
      >
        <div
          className={cn(
            TREE_ROW_INNER_CLASS,
            !entry.isDirectory && "h-8 gap-2",
          )}
        >
          <span className="w-3 shrink-0" aria-hidden={true} />
          {entry.isDirectory ? (
            <Folder size={20} className="shrink-0 text-foreground/30" />
          ) : (
            <FileTypeBadge fileName="" variant="inline" />
          )}
          <InlineInput
            initialName=""
            isDirectory={entry.isDirectory}
            onConfirm={onCreateConfirm}
            onCancel={onCreateCancel}
          />
        </div>
      </div>
    );
  }
  const handleDragStart = (e2) => {
    e2.dataTransfer.setData(RESOURCE_DRAG_MIME, buildDragPayload(entry.path));
    e2.dataTransfer.setData(DRAG_MIME, entry.path);
    e2.dataTransfer.effectAllowed = "copyMove";
  };
  const handleDragOver = (e2) => {
    if (!entry.isDirectory) return;
    const types2 = e2.dataTransfer.types;
    if (!types2.includes(RESOURCE_DRAG_MIME) && !types2.includes(DRAG_MIME))
      return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop2 = (e2) => {
    setDragOver(false);
    if (!entry.isDirectory) return;
    e2.preventDefault();
    const sourcePaths = extractDropSourcePaths(e2.dataTransfer);
    if (sourcePaths.length === 0) return;
    if (isInvalidDropTarget(sourcePaths, entry.path)) return;
    onMove(sourcePaths, entry.path);
  };
  const handleClick2 = (e2) => {
    if (entry.isDirectory && !(e2.metaKey || e2.ctrlKey || e2.shiftKey)) {
      onToggle(entry.path);
    }
    onFileSelect(entry.path, e2);
  };
  const handleDoubleClick2 = () => {
    if (!entry.isDirectory) {
      onFileDoubleClick?.(entry.path);
    }
  };
  const menuContent = (
    <AssetContextMenuContent
      target={target}
      viewMode={viewMode}
      onSwitchViewMode={onSwitchViewMode}
      onAddToCanvas={handleAddToCanvas}
      onAddToChat={handleAddToChat}
      onAddToLibrary={handlePromoteToAsset}
      onSaveToProjectAssets={handleSaveToProjectAssets}
      onLocateOnCanvas={handleLocateOnCanvas}
      onOpenDefault={handleOpenDefault}
      onOpenWith={handleOpenWith}
      onPickAppAndOpen={handlePickAppAndOpen}
      onShowInFolder={handleShowInFolder}
      onCopyPath={handleCopyPath}
      onCopyFile={handleCopyFile}
      onDuplicate={handleDuplicate}
      onRename={handleStartRename}
      onDelete={handleDelete2}
      onNewFolderInside={
        entry.isDirectory && onStartCreateInside
          ? () => onStartCreateInside(entry.path)
          : void 0
      }
      openWithSubOpen={openWithSubOpen}
      onOpenWithSubOpenChange={setOpenWithSubOpen}
    />
  );
  const onMenuOpenChange = (open) => {
    setContextOpen(open);
    if (!open) setOpenWithSubOpen(false);
  };
  if (entry.isDirectory) {
    const FolderIcon = isExpanded ? FolderOpen : Folder;
    const Arrow = isExpanded ? ChevronDown : ChevronRight;
    return (
      <ContextMenu onOpenChange={onMenuOpenChange}>
        <ContextMenuTrigger
          render={
            <button
              type="button"
              draggable={!isRenaming}
              className={cn(TREE_ROW_OUTER_CLASS, "cursor-pointer text-left")}
              style={{
                paddingLeft,
              }}
              onClick={handleClick2}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop2}
            />
          }
        >
          <div
            className={cn(
              TREE_ROW_INNER_CLASS,
              dragOver || isSelected || contextOpen
                ? TREE_ROW_SELECTED_CLASS
                : TREE_ROW_HOVER_CLASS,
            )}
          >
            <Arrow
              size={12}
              strokeWidth={1.5}
              className="shrink-0 text-foreground/30"
            />
            <div className="shrink-0 size-5 p-0.5 inline-flex items-center justify-center">
              <FolderIcon
                size={16}
                strokeWidth={1.5}
                className="text-foreground/30"
              />
            </div>
            {isRenaming ? (
              <InlineInput
                initialName={entry.name}
                isDirectory={true}
                onConfirm={(newName) => onRename(entry.path, newName)}
                onCancel={onRenameCancel}
              />
            ) : (
              (() => {
                const { head: stem, tail: ext2 } = splitFilename(entry.name);
                return (
                  <span className="min-w-0 flex flex-1 items-baseline text-foreground/70">
                    <span className="truncate">{stem}</span>
                    {ext2 && <span className="shrink-0">{ext2}</span>}
                  </span>
                );
              })()
            )}
          </div>
        </ContextMenuTrigger>
        {menuContent}
      </ContextMenu>
    );
  }
  const thumbUrl = getThumbnailUrl(
    gatewayUrl2,
    entry.name,
    entry.path,
    rootPath,
  );
  const isMissing = entry.status === "missing";
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = VIDEO_EXTS.has(ext);
  const triggerNode = (
    <ContextMenuTrigger
      render={
        // biome-ignore lint/a11y/noStaticElementInteractions: drag source for file tree
        // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard accelerators are dispatched at the panel level (FileExplorer window listener), not per row
        <div
          ref={rowRef}
          draggable={!isRenaming}
          data-coach-anchor="file-item"
          className={cn(
            TREE_ROW_OUTER_CLASS,
            "cursor-pointer",
            isMissing && "opacity-50",
          )}
          style={{
            paddingLeft,
          }}
          onClick={handleClick2}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick2}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onDragStart={handleDragStart}
        />
      }
    >
      <div
        className={cn(
          TREE_ROW_INNER_CLASS,
          "h-8 gap-2",
          isSelected || contextOpen
            ? TREE_ROW_SELECTED_CLASS
            : TREE_ROW_HOVER_CLASS,
        )}
      >
        {thumbUrl ? (
          <FileThumbnail url={thumbUrl} name={entry.name} isVideo={isVideo} />
        ) : (
          <FileTypeBadge fileName={entry.name} variant="inline" />
        )}
        {isRenaming ? (
          <InlineInput
            initialName={entry.name}
            isDirectory={false}
            onConfirm={(newName) => onRename(entry.path, newName)}
            onCancel={onRenameCancel}
          />
        ) : (
          (() => {
            const { head: stem, tail: ext2 } = splitFilename(entry.name);
            return (
              <span
                className={cn(
                  "min-w-0 flex flex-1 items-baseline",
                  isMissing ? "text-foreground/30" : "text-foreground/70",
                )}
              >
                <span className="truncate">{stem}</span>
                {ext2 && <span className="shrink-0">{ext2}</span>}
              </span>
            );
          })()
        )}
        {!isRenaming &&
          !isMissing &&
          asset?.tagIds &&
          asset.tagIds.length > 0 && (
            <TagDots
              tagIds={asset.tagIds}
              size={10.8}
              className="ml-auto pl-2"
            />
          )}
        {isMissing && !isRenaming && (
          <MissingCandidateActions
            variant="tree"
            candidate={entry.candidate}
            onMerge={() => onMergeCandidate?.(entry)}
            onLocate={() => onLocateMissing?.(entry)}
            onRemove={() => onRemoveMissing?.(entry)}
          />
        )}
        {!isMissing && !isRenaming && (
          <button
            type="button"
            aria-label={t2("fileExplorer.locateOnCanvas")}
            title={t2("fileExplorer.locateOnCanvas")}
            data-action-ui-id="asset-panel.row-locate-on-canvas"
            onClick={handleLocateButtonClick}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-sm",
              "text-foreground/40 opacity-0 transition-colors",
              "group-hover:opacity-100 hover:bg-foreground/5 hover:text-foreground/70",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          >
            <Crosshair size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </ContextMenuTrigger>
  );
  return (
    <ContextMenu onOpenChange={onMenuOpenChange}>
      {triggerNode}
      {menuContent}
    </ContextMenu>
  );
}, arePropsEqual);
