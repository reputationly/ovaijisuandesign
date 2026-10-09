// asset-grid-item-impl.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { formatDuration } from "../workspace/set-home-widget-dev-preview-mode.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import {
  AlertTriangle,
  API_PATHS,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { FileTypeBadge, InlineInput, TagDots } from "./inline-input.jsx";
import { MissingCandidateActions } from "./missing-candidate-actions.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { getFileName, splitFilename } from "../canvas/uploading-assets.jsx";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";
import { ContextMenuTrigger } from "../workspace/context-menu-content.jsx";
import { AssetContextMenuContent } from "./asset-context-menu-content.jsx";
function DurationBadge({ seconds, className }) {
  const text2 = formatDuration(seconds);
  if (!text2) return null;
  return (
    <span
      data-slot="duration-badge"
      className={cn(
        "absolute bottom-1 left-1 px-1 py-0.5 rounded bg-foreground/60 text-background text-[10px] font-medium tabular-nums leading-none pointer-events-none",
        className,
      )}
    >
      {text2}
    </span>
  );
}
const CATEGORY_CLASS = {
  pdf: "bg-destructive text-destructive-foreground",
  doc: "bg-primary text-primary-foreground",
  neutral: "bg-muted text-muted-foreground",
};
function categoryFor(ext) {
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "doc";
  return "neutral";
}
function FormatBadge({ ext, className }) {
  if (!ext) return null;
  const normalized = ext.replace(/^\./, "").toLowerCase().trim();
  if (!normalized) return null;
  const category = categoryFor(normalized);
  return (
    <span
      data-slot="format-badge"
      data-format-category={category}
      className={cn(
        "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase leading-none tracking-wide pointer-events-none",
        CATEGORY_CLASS[category],
        className,
      )}
    >
      {normalized}
    </span>
  );
}
function MissingPlaceholder() {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1">
      <AlertTriangle
        size={20}
        strokeWidth={1.5}
        className="text-foreground/30"
      />
      <span className="text-[9px] text-foreground/30">
        {t2("fileExplorer.assetMissing")}
      </span>
    </div>
  );
}
function VideoIndicator() {
  return (
    <div
      className="pointer-events-none absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full"
      data-video-play-indicator="true"
    >
      <PlaybackPlayIcon
        size={14}
        className="text-[var(--media-overlay-foreground)] drop-shadow-sm"
      />
    </div>
  );
}
export function AssetGridItemImpl({
  asset,
  absolutePath,
  isSelected,
  viewMode,
  onSwitchViewMode,
  buildDragPayload,
  onSelect,
  onDoubleClick,
  onAddToCanvas,
  onAddToChat,
  onPromoteToAsset,
  onSaveToProjectAssets,
  onLocateOnCanvas,
  onAnchorMount,
  onOpenDefault,
  onOpenWith,
  onPickAppAndOpen,
  onDelete,
  onStartRename,
  onRename,
  onRenameCancel,
  renamingPath,
  onCopyPath,
  onCopyFile,
  onDuplicate,
  onShowInFolder,
  onMergeCandidate,
  onRemoveMissing,
  onLocateMissing,
  onHoverIntent,
  onHoverEnd,
}) {
  const [contextOpen, setContextOpen] = reactExports.useState(false);
  const [openWithSubOpen, setOpenWithSubOpen] = reactExports.useState(false);
  const [imgError, setImgError] = reactExports.useState(false);
  const [imgRetried, setImgRetried] = reactExports.useState(false);
  const gatewayUrl2 = useGatewayUrl();
  const isMissing = asset.status === "missing";
  const fileName = asset.name || getFileName(asset.path) || asset.path;
  const target = reactExports.useMemo(
    () => ({
      path: absolutePath,
      name: fileName,
      isDirectory: false,
      isMissing,
    }),
    [absolutePath, fileName, isMissing],
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
  const handleOpenDefault = reactExports.useCallback(
    () => onOpenDefault(absolutePath),
    [onOpenDefault, absolutePath],
  );
  const handleShowInFolder = reactExports.useCallback(
    () => onShowInFolder(absolutePath),
    [onShowInFolder, absolutePath],
  );
  const handleCopyPath = reactExports.useCallback(
    () => onCopyPath(absolutePath),
    [onCopyPath, absolutePath],
  );
  const handleCopyFile = reactExports.useCallback(
    () => onCopyFile(absolutePath),
    [onCopyFile, absolutePath],
  );
  const handleDuplicate = reactExports.useCallback(
    () => onDuplicate(absolutePath),
    [onDuplicate, absolutePath],
  );
  const handleStartRename = reactExports.useCallback(
    () => onStartRename(absolutePath),
    [onStartRename, absolutePath],
  );
  const handleDelete2 = reactExports.useCallback(
    () => onDelete(absolutePath),
    [onDelete, absolutePath],
  );
  const handleOpenWith = reactExports.useCallback(
    (appPath) => onOpenWith(absolutePath, appPath),
    [onOpenWith, absolutePath],
  );
  const handlePickAppAndOpen = reactExports.useCallback(
    () => onPickAppAndOpen(absolutePath),
    [onPickAppAndOpen, absolutePath],
  );
  const handleContextMenu = reactExports.useCallback(() => {
    if (!isSelected) {
      onSelect(asset.path, {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
      });
    }
  }, [isSelected, onSelect, asset.path]);
  const thumbnailUrl = reactExports.useMemo(() => {
    if (isMissing) return null;
    if (asset.type === "image") {
      return (
        withThumbnail(gatewayUrl2(API_PATHS.serveFile(asset.path)), 200) ?? null
      );
    }
    if (asset.type === "video" || asset.type === "audio") {
      return gatewayUrl2(API_PATHS.thumbnail(asset.path)) ?? null;
    }
    return null;
  }, [asset.path, asset.type, gatewayUrl2, isMissing]);
  const handleImgError = reactExports.useCallback(() => {
    if (!imgRetried) {
      setImgRetried(true);
    } else {
      setImgError(true);
    }
  }, [imgRetried]);
  const resolvedThumbnailUrl = reactExports.useMemo(() => {
    if (!thumbnailUrl || !imgRetried) return thumbnailUrl;
    return `${thumbnailUrl}${thumbnailUrl.includes("?") ? "&" : "?"}force=1`;
  }, [thumbnailUrl, imgRetried]);
  const ext = reactExports.useMemo(() => {
    const base2 = asset.path.split(/[/\\]/).pop() ?? "";
    const dotIdx = base2.lastIndexOf(".");
    if (dotIdx <= 0) return "";
    return base2.slice(dotIdx + 1).toLowerCase();
  }, [asset.path]);
  const handleDragStart = reactExports.useCallback(
    (e2) => {
      e2.dataTransfer.setData(
        RESOURCE_DRAG_MIME,
        buildDragPayload(absolutePath),
      );
      e2.dataTransfer.effectAllowed = "copyMove";
    },
    [buildDragPayload, absolutePath],
  );
  const handlePointerEnter = reactExports.useCallback(
    (e2) => {
      if (!onHoverIntent) return;
      onHoverIntent({
        asset,
        anchor: e2.currentTarget,
        absolutePath,
      });
    },
    [asset, onHoverIntent, absolutePath],
  );
  const handlePointerLeave = reactExports.useCallback(() => {
    onHoverEnd?.();
  }, [onHoverEnd]);
  const cellRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!onAnchorMount) return;
    const path2 = absolutePath;
    const el = cellRef.current;
    if (!el) return;
    onAnchorMount(path2, el);
    return () => onAnchorMount(path2, null);
  }, [onAnchorMount, absolutePath]);
  return (
    <ContextMenu
      onOpenChange={(open) => {
        setContextOpen(open);
        if (!open) setOpenWithSubOpen(false);
      }}
    >
      <ContextMenuTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: interactive grid item with context menu
          // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard accelerators are dispatched at the panel level (FileExplorer window listener), not per row
          <div
            ref={cellRef}
            draggable={true}
            data-coach-anchor="file-item"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            className={cn(
              "flex flex-col gap-1 p-1 cursor-pointer select-none transition-colors outline-none rounded-lg",
              isSelected || contextOpen
                ? "bg-foreground/[0.12]"
                : "hover:bg-foreground/5",
            )}
            onClick={(e2) => onSelect(asset.path, e2)}
            onContextMenu={handleContextMenu}
            onDoubleClick={() => onDoubleClick?.(asset.path)}
            onDragStart={handleDragStart}
          />
        }
      >
        <div className="relative w-full aspect-square overflow-hidden rounded-sm bg-muted flex items-center justify-center">
          {isMissing ? (
            <MissingPlaceholder />
          ) : resolvedThumbnailUrl && !imgError ? (
            <img
              src={resolvedThumbnailUrl}
              alt={fileName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <FileTypeBadge fileName={fileName} variant="block" />
          )}
          {asset.type === "video" &&
            !isMissing &&
            resolvedThumbnailUrl &&
            !imgError && <VideoIndicator />}
          {!isMissing && (asset.type === "video" || asset.type === "audio") && (
            <DurationBadge seconds={asset.duration} />
          )}
          {!isMissing &&
            asset.type !== "image" &&
            asset.type !== "video" &&
            asset.type !== "audio" && <FormatBadge ext={ext} />}
          {!isMissing && asset.tagIds && asset.tagIds.length > 0 && (
            <TagDots
              tagIds={asset.tagIds}
              size={10.8}
              className="absolute top-1 left-1"
              ringColor="rgba(255, 255, 255, 0.72)"
            />
          )}
        </div>
        <div className="w-full py-1">
          {renamingPath === absolutePath ? (
            <InlineInput
              initialName={fileName}
              isDirectory={false}
              onConfirm={(newName) => onRename(absolutePath, newName)}
              onCancel={onRenameCancel}
              className="w-full rounded-lg border border-primary bg-background px-1 py-0 text-[12px] text-foreground outline-none"
            />
          ) : (
            (() => {
              const { head: stem, tail: ext2 } = splitFilename(fileName);
              return (
                <span
                  className={cn(
                    "text-[12px] w-full leading-tight flex items-baseline min-w-0",
                    isMissing ? "text-foreground/30" : "text-foreground/70",
                  )}
                >
                  <span className="truncate min-w-0">{stem}</span>
                  {ext2 && <span className="shrink-0">{ext2}</span>}
                </span>
              );
            })()
          )}
        </div>
        {isMissing && (
          <MissingCandidateActions
            variant="grid"
            candidate={asset.candidate}
            onMerge={() => onMergeCandidate?.(asset)}
            onLocate={() => onLocateMissing?.(asset)}
            onRemove={() => onRemoveMissing?.(asset)}
          />
        )}
      </ContextMenuTrigger>
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
        openWithSubOpen={openWithSubOpen}
        onOpenWithSubOpenChange={setOpenWithSubOpen}
      />
    </ContextMenu>
  );
}
