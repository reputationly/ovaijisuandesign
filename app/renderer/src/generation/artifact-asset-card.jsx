// artifact-asset-card.jsx
import {
  classifyFileType,
  Copy,
  jsxRuntimeExports,
  PlaybackPlayIcon$1,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
  Video,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioBarsIcon } from "./domestic-param-labels.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { ImageOutlineIcon } from "../media-editing/package.jsx";
import { artifactAssetTypeFromPath } from "../chat/has-structured-success-payload.js";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { splitFilename } from "../canvas/uploading-assets.jsx";
import { buildResourceDragItem } from "../text-editor/build-asr-gateway-request.js";
import { buildVideoThumbnailUrl } from "../media-editing/build-video-thumb-base.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import { getNodeIdsForAsset } from "../infra/use-canvas-node-assets-store.js";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
import { CHAT_ARTIFACT_UI_ID } from "./to-workspace-browser-url.js";
import { useAssets } from "../settings/use-assets.js";
import { useMediaActions } from "../settings/use-media-actions.js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "./use-astra-send-gate.js";
import { joinFilePath } from "../assets/use-file-explorer-canvas-integration.js";
import { MediaLightbox } from "../assets/text-preview.jsx";
import { inferArtifactMime } from "../workspace/use-project-delete.js";

function artifactDisplayName(path2, url2) {
  const raw2 = path2 || url2;
  const clean = raw2.split("?")[0]?.split("#")[0] ?? raw2;
  return clean.split("/").filter(Boolean).pop() ?? clean;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanPath(raw2) {
  try {
    const url2 = new URL(raw2);
    return safeDecodeURIComponent(url2.pathname);
  } catch {
    return safeDecodeURIComponent(raw2.split(/[?#]/)[0] ?? raw2);
  }
}

function stripLeadingSlash(path2) {
  return path2.replace(/^\/+/, "");
}

function toWorkspaceRelativePath(raw2) {
  if (!raw2) return void 0;
  const clean = cleanPath(raw2).replace(/\\/g, "/");
  const filesIdx = clean.indexOf("/files/");
  if (filesIdx >= 0)
    return stripLeadingSlash(clean.slice(filesIdx + "/files/".length));
  const outputIdx = clean.indexOf("output_files/");
  if (outputIdx >= 0)
    return stripLeadingSlash(clean.slice(outputIdx + "output_files/".length));
  if (/^https?:\/\//i.test(raw2)) return void 0;
  if (clean.startsWith("/")) return void 0;
  return stripLeadingSlash(clean.replace(/^\.\//, "")) || void 0;
}

function artifactRelativePath(artifact) {
  const fromUrl = toWorkspaceRelativePath(artifact.url);
  if (fromUrl) return fromUrl;
  if (/^https?:\/\//i.test(artifact.url)) return void 0;
  return toWorkspaceRelativePath(artifact.path);
}

function artifactVideoThumbnailUrl(artifact, resolvedSrc, displayWidth) {
  if (artifact.type !== "video") return void 0;
  const relativePath = artifactRelativePath(artifact);
  return relativePath
    ? buildVideoThumbnailUrl(resolvedSrc, relativePath, displayWidth)
    : void 0;
}

function normalizePath(path2) {
  return stripLeadingSlash(path2.replace(/\\/g, "/"));
}

function findAssetForRelativePath(assets, relativePath) {
  if (!relativePath) return void 0;
  const target = normalizePath(relativePath);
  return assets.find((asset) => normalizePath(asset.path) === target);
}

function artifactDragSource({
  relativePath,
  workspacePath,
  filename,
  assetId,
}) {
  return {
    relativePath,
    workspacePath,
    name: filename,
    assetId,
  };
}

function artifactCanvasItem({ relativePath, absolutePath, filename, assetId }) {
  if (!relativePath || !absolutePath || !filename) return void 0;
  return buildResourceDragItem(
    absolutePath,
    relativePath,
    filename,
    false,
    assetId,
  );
}

function ArtifactIcon({ filename, compact = false }) {
  const type2 = artifactAssetTypeFromPath(filename);
  const className = compact ? "size-3.5" : "size-4";
  if (type2 === "image")
    return <ImageOutlineIcon className={className} strokeWidth={1.5} />;
  if (type2 === "video")
    return <Video className={className} strokeWidth={1.5} />;
  if (type2 === "audio") return <AudioBarsIcon className={className} />;
  return (
    <FileTypeIcon
      {...classifyFileType({
        filename,
      })}
      size={compact ? 14 : 24}
      decorative={true}
    />
  );
}

function previewUnavailableLabel(type2, t2) {
  if (type2 === "image")
    return t2("assetPreview.imageUnavailable", "Preview unavailable");
  if (type2 === "video")
    return t2("assetPreview.videoUnavailable", "Preview unavailable");
  if (type2 === "audio")
    return t2("assetPreview.audioUnavailable", "Preview unavailable");
  return t2("assetPreview.unsupportedText", "Preview not supported");
}

function ArtifactPreviewFailed({ type: type2, filename, compact }) {
  const { t: t2 } = useTranslation();
  const label = previewUnavailableLabel(type2, t2);
  return (
    <div
      className={cn$2(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground",
        compact ? "p-0" : "p-2",
      )}
    >
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={compact ? 14 : 24}
        decorative={true}
      />
      {!compact && (
        <span className="max-w-full truncate text-caption-10 leading-none">
          {label}
        </span>
      )}
    </div>
  );
}

function ArtifactThumbnail({ type: type2, src, filename, onFailure }) {
  const [loaded, setLoaded] = reactExports.useState(false);
  return (
    <span className="relative flex h-full w-full items-center justify-center bg-muted/40">
      {!loaded && (
        <span
          data-action-ui-id="chat-turn-artifact-thumbnail-placeholder"
          className="text-muted-foreground"
        >
          <ArtifactIcon filename={filename} compact={true} />
        </span>
      )}
      <DeferredThumbnailImage
        src={src}
        alt={filename}
        className={cn$2(
          "absolute inset-0 h-full w-full object-cover",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onFailure={onFailure}
      />
      {type2 === "video" && loaded && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
          <PlaybackPlayIcon$1 size={12} strokeWidth={2} fill="currentColor" />
        </span>
      )}
    </span>
  );
}

function ArtifactChipBody({
  artifact,
  filename,
  previewSrc,
  previewFailed,
  onPreviewError,
}) {
  const { head: stem, tail: ext } = splitFilename(filename);
  const showThumbnail =
    (artifact.type === "image" || artifact.type === "video") &&
    Boolean(previewSrc) &&
    !previewFailed;
  return (
    <>
      <span
        className={cn$2(
          "shrink-0 relative h-7 w-7 overflow-hidden rounded-sm flex items-center justify-center",
          artifact.type === "audio"
            ? "bg-[var(--chat-audio-artifact-icon-bg)]"
            : "bg-muted/40",
        )}
      >
        {showThumbnail &&
          previewSrc &&
          (artifact.type === "image" || artifact.type === "video") && (
            <ArtifactThumbnail
              key={previewSrc}
              type={artifact.type}
              src={previewSrc}
              filename={filename}
              onFailure={onPreviewError}
            />
          )}
        {!showThumbnail && (
          <span
            className={
              artifact.type === "audio"
                ? "text-[var(--chat-audio-artifact-icon-fg)]"
                : "text-muted-foreground"
            }
          >
            <ArtifactIcon filename={filename} compact={true} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 flex items-baseline text-[14px] leading-none font-normal text-foreground/80">
        <span className="min-w-0 truncate">{stem}</span>
        {ext && <span className="shrink-0">{ext}</span>}
      </span>
    </>
  );
}

export function ArtifactAssetCard({
  artifact,
  assetId,
  src,
  size: size2 = "lg",
  showLabel = true,
}) {
  const { t: t2 } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const [insertPromptOpen, setInsertPromptOpen] = reactExports.useState(false);
  const [failedPreviewKey, setFailedPreviewKey] = reactExports.useState(null);
  const cardRef = reactExports.useRef(null);
  const locateTimerRef = reactExports.useRef(null);
  const postInsertFocusTimerRef = reactExports.useRef(null);
  const workspacePath = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => artifactRelativePath(artifact),
    [artifact],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForRelativePath(assets, relativePath),
    [assets, relativePath],
  );
  const resolvedAssetId = assetId ?? artifact.assetId ?? asset?.id;
  const absolutePath =
    relativePath && workspacePath
      ? joinFilePath(workspacePath, relativePath)
      : void 0;
  const { copyFile, copyImage, copyPath, showInFolder, openWithDefault } =
    useMediaActions();
  const filename = artifactDisplayName(artifact.path, artifact.url);
  const canOpenLightbox =
    artifact.type === "image" || artifact.type === "video";
  const previewDisplayWidth =
    size2 === "lg" ? 144 : size2 === "md" ? 64 : size2 === "sm" ? 32 : 28;
  const previewSrc =
    artifact.type === "image"
      ? withThumbnail(src, size2 === "sm" ? 64 : 240)
      : artifactVideoThumbnailUrl(artifact, src, previewDisplayWidth);
  const previewKey = `${artifact.type}:${src}`;
  const previewFailed = failedPreviewKey === previewKey;
  const previewUnavailable =
    previewFailed || (artifact.type === "video" && previewSrc === void 0);
  const label = `${filename}`;
  const dragSource = reactExports.useMemo(
    () =>
      artifactDragSource({
        relativePath,
        workspacePath,
        filename,
        assetId: resolvedAssetId,
      }),
    [filename, relativePath, resolvedAssetId, workspacePath],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const canvasItem = reactExports.useMemo(
    () =>
      artifactCanvasItem({
        relativePath,
        absolutePath,
        filename,
        assetId: resolvedAssetId,
      }),
    [absolutePath, filename, relativePath, resolvedAssetId],
  );
  reactExports.useEffect(() => {
    return () => {
      if (locateTimerRef.current != null)
        window.clearTimeout(locateTimerRef.current);
      if (postInsertFocusTimerRef.current != null) {
        window.clearTimeout(postInsertFocusTimerRef.current);
      }
    };
  }, []);
  const locateOnCanvas = reactExports.useCallback(() => {
    if (!workspacePath) return;
    if (artifact.nodeIds?.length) {
      setInsertPromptOpen(false);
      workspaceEvents.fireCanvasFocus(workspacePath, [...artifact.nodeIds], {
        select: true,
      });
      return;
    }
    if (!resolvedAssetId) {
      if (canvasItem) setInsertPromptOpen(true);
      return;
    }
    const nodeIds = getNodeIdsForAsset(resolvedAssetId, workspacePath);
    if (nodeIds.length === 0) {
      if (canvasItem) setInsertPromptOpen(true);
      return;
    }
    setInsertPromptOpen(false);
    workspaceEvents.fireCanvasFocus(workspacePath, nodeIds, {
      select: true,
    });
  }, [artifact.nodeIds, canvasItem, resolvedAssetId, workspacePath]);
  const handleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null)
      window.clearTimeout(locateTimerRef.current);
    locateTimerRef.current = window.setTimeout(() => {
      locateTimerRef.current = null;
      locateOnCanvas();
    }, 180);
  }, [locateOnCanvas]);
  const handleDoubleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) {
      window.clearTimeout(locateTimerRef.current);
      locateTimerRef.current = null;
    }
    if (canOpenLightbox) {
      setLightboxOpen(true);
      return;
    }
    if (absolutePath) openWithDefault(absolutePath);
  }, [absolutePath, canOpenLightbox, openWithDefault]);
  const handleCopy = reactExports.useCallback(() => {
    if (artifact.type === "image") {
      copyImage(absolutePath ?? src);
      return;
    }
    if (absolutePath) {
      copyFile(absolutePath);
      return;
    }
    copyPath(src);
  }, [absolutePath, artifact.type, copyFile, copyImage, copyPath, src]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (locateTimerRef.current != null) {
        window.clearTimeout(locateTimerRef.current);
        locateTimerRef.current = null;
      }
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  const focusAssetAfterInsert = reactExports.useCallback(
    (attempt = 0) => {
      if (!workspacePath) return;
      const nodeIds = artifact.nodeIds?.length
        ? [...artifact.nodeIds]
        : resolvedAssetId
          ? getNodeIdsForAsset(resolvedAssetId, workspacePath)
          : [];
      if (nodeIds.length > 0) {
        workspaceEvents.fireCanvasFocus(workspacePath, nodeIds, {
          select: true,
        });
        return;
      }
      if (attempt >= 12) return;
      postInsertFocusTimerRef.current = window.setTimeout(
        () => focusAssetAfterInsert(attempt + 1),
        120,
      );
    },
    [artifact.nodeIds, resolvedAssetId, workspacePath],
  );
  const handleInsertToCanvas = reactExports.useCallback(() => {
    if (!canvasItem) return;
    workspaceEvents.fireAddToCanvas([canvasItem]);
    setInsertPromptOpen(false);
    if (postInsertFocusTimerRef.current != null) {
      window.clearTimeout(postInsertFocusTimerRef.current);
    }
    focusAssetAfterInsert();
  }, [canvasItem, focusAssetAfterInsert]);
  const isSmall = size2 === "sm";
  const isChip = size2 === "chip";
  const isCompactFailure = previewUnavailable && size2 !== "lg";
  const cardClassName =
    size2 === "lg"
      ? "h-20 w-36 rounded-sm"
      : size2 === "md"
        ? cn$2("h-16 rounded-sm", isCompactFailure ? "w-16" : "min-w-16")
        : size2 === "chip"
          ? "flex h-8 w-full items-center gap-1.5 rounded-md bg-foreground/[0.05] pr-2 pl-0.5 hover:bg-foreground/[0.08]"
          : "h-8 w-8 rounded-sm";
  const actionUiId =
    artifact.type === "file" ? void 0 : CHAT_ARTIFACT_UI_ID[artifact.type];
  const title = previewUnavailable
    ? `${filename} · ${previewUnavailableLabel(artifact.type, t2)}`
    : filename;
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger render={<div className="shrink-0" />}>
          <button
            ref={cardRef}
            type="button"
            data-action-ui-id={actionUiId}
            data-artifact-type={artifact.type}
            data-artifact-path={src}
            data-artifact-mime={
              artifact.type === "file"
                ? void 0
                : inferArtifactMime(src, artifact.type)
            }
            aria-label={filename}
            className={cn$2(
              "group relative text-left transition-opacity cursor-pointer",
              isChip
                ? "overflow-hidden"
                : "shrink-0 overflow-hidden bg-muted/60 hover:opacity-80",
              cardClassName,
            )}
            draggable={canDrag}
            onClick={handleClick2}
            onDoubleClick={handleDoubleClick2}
            onDragStart={handleDragStart}
            title={title}
          >
            {isChip ? (
              <ArtifactChipBody
                artifact={artifact}
                filename={filename}
                previewSrc={previewSrc}
                previewFailed={previewFailed}
                onPreviewError={() => setFailedPreviewKey(previewKey)}
              />
            ) : (
              <>
                {artifact.type === "image" && previewSrc && !previewFailed && (
                  <ArtifactThumbnail
                    key={previewSrc}
                    type="image"
                    src={previewSrc}
                    filename={filename}
                    onFailure={() => setFailedPreviewKey(previewKey)}
                  />
                )}
                {artifact.type === "video" && previewSrc && !previewFailed && (
                  <ArtifactThumbnail
                    key={previewSrc}
                    type="video"
                    src={previewSrc}
                    filename={filename}
                    onFailure={() => setFailedPreviewKey(previewKey)}
                  />
                )}
                {previewUnavailable && (
                  <ArtifactPreviewFailed
                    type={artifact.type}
                    filename={filename}
                    compact={isSmall || size2 === "md"}
                  />
                )}
                {!previewFailed &&
                  (artifact.type === "audio" || artifact.type === "file") && (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <ArtifactIcon filename={filename} />
                    </div>
                  )}
                {showLabel && !isSmall && (
                  <div
                    className={cn$2(
                      "absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-background/95 via-background/70 to-background/0 font-medium text-foreground",
                      size2 === "lg"
                        ? "gap-1.5 px-2 pb-1 pt-2 text-caption-11"
                        : "gap-1 px-1.5 pb-1 pt-2 text-caption-10",
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      <ArtifactIcon filename={filename} compact={true} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </div>
                )}
              </>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={handleCopy}
            className="cursor-pointer"
            data-action-ui-id="chat-turn-artifact-copy"
          >
            <Copy />
            {t2("common.copy")}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              if (absolutePath) showInFolder(absolutePath);
            }}
            disabled={!absolutePath}
            className="cursor-pointer disabled:cursor-default"
            data-action-ui-id="chat-turn-artifact-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <PopoverRoot open={insertPromptOpen} onOpenChange={setInsertPromptOpen}>
        {insertPromptOpen && cardRef.current && (
          <PopoverPortal>
            <PopoverPositioner
              anchor={cardRef.current}
              align="center"
              side="right"
              sideOffset={8}
              className="isolate z-50"
            >
              <PopoverPopup
                data-slot="chat-turn-artifact-locate-missing-popover"
                className={cn$2(
                  "elevated-surface-border z-50 flex w-64 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
                  "dp-motion-quick-zoom",
                )}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm text-foreground">
                    {t2("fileExplorer.locateMissing.title")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t2("fileExplorer.locateMissing.description")}
                  </span>
                </div>
                <div className="flex justify-end gap-1">
                  <Button$1
                    size="sm"
                    variant="ghost"
                    onClick={() => setInsertPromptOpen(false)}
                    data-action-ui-id="chat-turn-artifact-locate-missing-cancel"
                  >
                    {t2("common.cancel")}
                  </Button$1>
                  <Button$1
                    size="sm"
                    onClick={handleInsertToCanvas}
                    data-action-ui-id="chat-turn-artifact-locate-missing-confirm"
                  >
                    {t2("fileExplorer.locateMissing.confirm")}
                  </Button$1>
                </div>
              </PopoverPopup>
            </PopoverPositioner>
          </PopoverPortal>
        )}
      </PopoverRoot>
      {lightboxOpen &&
        (artifact.type === "image" || artifact.type === "video") && (
          <MediaLightbox
            kind={artifact.type}
            src={src}
            alt={filename}
            onClose={() => setLightboxOpen(false)}
          />
        )}
    </>
  );
}
