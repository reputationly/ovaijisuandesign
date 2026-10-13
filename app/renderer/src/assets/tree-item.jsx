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
function getThumbnailUrl(gatewayUrl, fileName, absPath, rootPath) {
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
      withThumbnail(gatewayUrl(API_PATHS.serveFile(relativePath)), 18) ?? null
    );
  }
  if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
    return gatewayUrl(API_PATHS.thumbnail(relativePath)) ?? null;
  }
  return null;
}
function FileThumbnail({ url, name: fileName, isVideo }) {
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
    return <FileTypeBadge fileName={fileName} variant="inline" />;
  }
  const src = retried
    ? `${url}${url.includes("?") ? "&" : "?"}force=1`
    : url;
  return (
    <div className="relative shrink-0 size-5 rounded-[2px] overflow-hidden">
      <img
        src={src}
        alt={fileName}
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
function arePropsEqual(prev, next) {
  const prevIsRenaming = prev.renamingPath === prev.entry.path;
  const nextIsRenaming = next.renamingPath === next.entry.path;
  if (prevIsRenaming !== nextIsRenaming) return false;
  const previousEntry = prev.entry;
  const nextEntry = next.entry;
  if (previousEntry.path !== nextEntry.path) return false;
  if (previousEntry.name !== nextEntry.name) return false;
  if (previousEntry.isDirectory !== nextEntry.isDirectory) return false;
  if (previousEntry.status !== nextEntry.status) return false;
  if (previousEntry.isDirectory) {
    if ((previousEntry.children?.length ?? 0) !== (nextEntry.children?.length ?? 0))
      return false;
  }
  if (previousEntry.status === "missing" || nextEntry.status === "missing") {
    if (previousEntry.candidate?.asset_id !== nextEntry.candidate?.asset_id) return false;
  }
  if (prev.asset !== next.asset) {
    const previousAsset = prev.asset;
    const nextAsset = next.asset;
    if (!previousAsset || !nextAsset) return false;
    if (previousAsset.id !== nextAsset.id) return false;
    if (previousAsset.path !== nextAsset.path) return false;
    if (previousAsset.name !== nextAsset.name) return false;
    if (previousAsset.type !== nextAsset.type) return false;
    if (previousAsset.status !== nextAsset.status) return false;
    if (previousAsset.duration !== nextAsset.duration) return false;
    if (previousAsset.candidate?.asset_id !== nextAsset.candidate?.asset_id) return false;
    if (previousAsset.candidate?.path !== nextAsset.candidate?.path) return false;
  }
  return arePropsRefEqualExcept(prev, next, SPECIAL_PROPS);
}
export const TreeItem = reactExports.memo(function TreeItem({
  entry,
  depth,
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
  const { t: translate } = useTranslation();
  const gatewayUrl = useGatewayUrl();
  const isRenaming = renamingPath === entry.path;
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [contextOpen, setContextOpen] = reactExports.useState(false);
  const [openWithSubOpen, setOpenWithSubOpen] = reactExports.useState(false);
  const paddingLeft = depth * 16;
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
    const path = entry.path;
    const el = rowRef.current;
    if (!el) return;
    onAnchorMount(path, el);
    return () => onAnchorMount(path, null);
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
  const handleDelete = reactExports.useCallback(
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
    (pointerEvent) => {
      if (!asset || !onHoverIntent) return;
      onHoverIntent({
        asset,
        anchor: pointerEvent.currentTarget,
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
  const handleDragStart = (dragEvent) => {
    dragEvent.dataTransfer.setData(RESOURCE_DRAG_MIME, buildDragPayload(entry.path));
    dragEvent.dataTransfer.setData(DRAG_MIME, entry.path);
    dragEvent.dataTransfer.effectAllowed = "copyMove";
  };
  const handleDragOver = (dragEvent) => {
    if (!entry.isDirectory) return;
    const types = dragEvent.dataTransfer.types;
    if (!types.includes(RESOURCE_DRAG_MIME) && !types.includes(DRAG_MIME))
      return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (dragEvent) => {
    setDragOver(false);
    if (!entry.isDirectory) return;
    dragEvent.preventDefault();
    const sourcePaths = extractDropSourcePaths(dragEvent.dataTransfer);
    if (sourcePaths.length === 0) return;
    if (isInvalidDropTarget(sourcePaths, entry.path)) return;
    onMove(sourcePaths, entry.path);
  };
  const handleClick = (clickEvent) => {
    if (entry.isDirectory && !(clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey)) {
      onToggle(entry.path);
    }
    onFileSelect(entry.path, clickEvent);
  };
  const handleDoubleClick = () => {
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
      onDelete={handleDelete}
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
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                const { head: stem, tail: ext } = splitFilename(entry.name);
                return (
                  <span className="min-w-0 flex flex-1 items-baseline text-foreground/70">
                    <span className="truncate">{stem}</span>
                    {ext && <span className="shrink-0">{ext}</span>}
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
    gatewayUrl,
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
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
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
            const { head: stem, tail: ext } = splitFilename(entry.name);
            return (
              <span
                className={cn(
                  "min-w-0 flex flex-1 items-baseline",
                  isMissing ? "text-foreground/30" : "text-foreground/70",
                )}
              >
                <span className="truncate">{stem}</span>
                {ext && <span className="shrink-0">{ext}</span>}
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
            aria-label={translate("fileExplorer.locateOnCanvas")}
            title={translate("fileExplorer.locateOnCanvas")}
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
