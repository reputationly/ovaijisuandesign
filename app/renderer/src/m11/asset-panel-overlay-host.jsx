// asset-panel-overlay-host.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, API_PATHS, ChevronDown, ChevronRight$1, X$7, Loader2, classifyFileType, Check, Crosshair, AlertTriangle, PopoverRoot, PopoverPortal, PopoverPositioner, PopoverPopup, useVirtualizer, AtSign, ShieldAlert } from "../vendor.js";
import { useEntities } from "../m15/check-cloud-asset-upload.js";
import { FileTypeIcon } from "../m15/create-recently-added-store.jsx";
import { withThumbnail } from "../m15/deferred-thumbnail-image-generation.jsx";
import { formatDuration$3 } from "../m15/global-sidebar-provider.jsx";
import { TooltipProvider, Tooltip, TooltipTrigger, DropdownMenu } from "../m15/graph.jsx";
import { FolderOpen, Folder, FileText } from "../m15/parse-item.jsx";
import { ContextMenu } from "../m15/use-hub-logo-hover-animation.jsx";
import { useGatewayUrl } from "../m15/use-resizable-width.js";
import {
  Button$1,
  cn$2,
  TooltipContent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  Badge,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  splitFilename,
  buildRenamedFilename,
  AssetRenameInput,
  FileTypeThumbnail,
  getFileName$1,
} from "../m10/delete-local-node-dialog.jsx";
import { RESOURCE_DRAG_MIME } from "../m01/myers-line-hunks.js";
import { LocalFolderIcon, PlaybackPlayIcon } from "../m08/browser-inspiration-urls.jsx";
import { ContextMenuTrigger } from "../m10/new-workspace-dialog.jsx";
import { trackAssetCreate, classifyAssetError } from "../asset-center/shared/misc-02.jsx";
import {
  useMaterializeEntity,
  useCreateEntityFromPaths,
} from "../asset-center/shared/use-materialize-entity.js";
import {
  useAppendAttachmentFromWorkspace,
  trackAssetPromoteValidationFailed,
  AssetMentionList,
} from "../m10/asset-mention-list.jsx";
import { ENTITY_TYPES, CollapsibleTags } from "../asset-center/shared/attachment-upload-zone.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../m08/shortcut-categories.jsx";
import {
  resolveTagIds,
  isCanvasColorTag,
  PRESET_COLOR_NAME_KEYS,
  MAX_VISIBLE_CANVAS_TAG_COLORS,
} from "../m01/normalize-tag-registry.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { extractDropSourcePaths, isInvalidDropTarget } from "./use-asset-menu-shortcuts.js";
import { useTagRegistry } from "./use-canvas-tags.jsx";
import { AssetContextMenuContent, AssetHoverPopup } from "./use-flatten-tree.jsx";
const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 150;
export const AssetPanelOverlayHost = reactExports.forwardRef(function AssetPanelOverlayHost2(
  { onLocateOnCanvas, onLocateMissingConfirmInsert },
  ref,
) {
  const { t: t2 } = useTranslation();
  const [state2, setState] = reactExports.useState({
    kind: "idle",
  });
  const stateRef = reactExports.useRef(state2);
  const openTimerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const setBoth = reactExports.useCallback((next2) => {
    stateRef.current = next2;
    setState(next2);
  }, []);
  const cancelOpen2 = reactExports.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);
  const cancelClose = reactExports.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);
  reactExports.useImperativeHandle(
    ref,
    () => ({
      notifyHoverIntent: (target) => {
        if (target.asset.status === "missing") return;
        if (stateRef.current.kind === "locate-missing") return;
        cancelClose();
        cancelOpen2();
        openTimerRef.current = setTimeout(() => {
          openTimerRef.current = null;
          if (stateRef.current.kind === "locate-missing") return;
          setBoth({
            kind: "hover",
            target,
          });
        }, HOVER_OPEN_DELAY_MS);
      },
      notifyHoverEnd: () => {
        cancelOpen2();
        if (stateRef.current.kind !== "hover") return;
        cancelClose();
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          if (stateRef.current.kind === "hover")
            setBoth({
              kind: "idle",
            });
        }, HOVER_CLOSE_DELAY_MS);
      },
      showLocateMissing: (anchor, absolutePath) => {
        cancelOpen2();
        cancelClose();
        setBoth({
          kind: "locate-missing",
          anchor,
          absolutePath,
        });
      },
      hideLocateMissing: () => {
        if (stateRef.current.kind === "locate-missing")
          setBoth({
            kind: "idle",
          });
      },
    }),
    [cancelClose, cancelOpen2, setBoth],
  );
  const handlePopupMouseEnter = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
  }, [cancelClose, cancelOpen2]);
  const handlePopupMouseLeave = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelClose, cancelOpen2, setBoth]);
  const handlePopupLocateOnCanvas = reactExports.useCallback(() => {
    const s2 = stateRef.current;
    if (s2.kind !== "hover" || !onLocateOnCanvas) return;
    onLocateOnCanvas(s2.target.absolutePath);
  }, [onLocateOnCanvas]);
  const handleLocateOpenChange = reactExports.useCallback(
    (next2) => {
      if (!next2 && stateRef.current.kind === "locate-missing")
        setBoth({
          kind: "idle",
        });
    },
    [setBoth],
  );
  const handleLocateConfirm = reactExports.useCallback(() => {
    const s2 = stateRef.current;
    if (s2.kind !== "locate-missing") return;
    const path2 = s2.absolutePath;
    setBoth({
      kind: "idle",
    });
    onLocateMissingConfirmInsert(path2);
  }, [onLocateMissingConfirmInsert, setBoth]);
  const handleLocateCancel = reactExports.useCallback(() => {
    setBoth({
      kind: "idle",
    });
  }, [setBoth]);
  const activeAnchor =
    state2.kind === "hover"
      ? state2.target.anchor
      : state2.kind === "locate-missing"
        ? state2.anchor
        : null;
  reactExports.useEffect(() => {
    if (!activeAnchor) return;
    if (!activeAnchor.isConnected) {
      setBoth({
        kind: "idle",
      });
      return;
    }
    const io2 = new IntersectionObserver(
      (entries2) => {
        for (const entry of entries2) {
          if (!entry.isIntersecting)
            setBoth({
              kind: "idle",
            });
        }
      },
      {
        threshold: 0,
      },
    );
    io2.observe(activeAnchor);
    return () => io2.disconnect();
  }, [activeAnchor, setBoth]);
  reactExports.useEffect(() => {
    return () => {
      cancelOpen2();
      cancelClose();
    };
  }, [cancelOpen2, cancelClose]);
  return (
    <>
      <AssetHoverPopup
        target={state2.kind === "hover" ? state2.target : null}
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
        onLocateOnCanvas={onLocateOnCanvas ? handlePopupLocateOnCanvas : void 0}
      />
      <PopoverRoot open={state2.kind === "locate-missing"} onOpenChange={handleLocateOpenChange}>
        {state2.kind === "locate-missing" && (
          <PopoverPortal>
            <PopoverPositioner
              anchor={state2.anchor}
              align="center"
              side="left"
              sideOffset={8}
              className="isolate z-50"
            >
              <PopoverPopup
                data-slot="locate-missing-popover"
                className={cn$2(
                  "elevated-surface-border z-50 flex w-64 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
                  "dp-motion-quick-zoom",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm text-foreground">
                      {t2("fileExplorer.locateMissing.title")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t2("fileExplorer.locateMissing.description")}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-1">
                  <Button$1
                    size="sm"
                    variant="ghost"
                    onClick={handleLocateCancel}
                    data-action-ui-id="asset-panel.locate-missing-cancel"
                  >
                    {t2("common.cancel")}
                  </Button$1>
                  <Button$1
                    size="sm"
                    onClick={handleLocateConfirm}
                    data-action-ui-id="asset-panel.locate-missing-confirm"
                  >
                    {t2("fileExplorer.locateMissing.confirm")}
                  </Button$1>
                </div>
              </PopoverPopup>
            </PopoverPositioner>
          </PopoverPortal>
        )}
      </PopoverRoot>
    </>
  );
});
export function DeleteConfirmDialog$1({ entries: entries2, onCancel, onConfirm }) {
  const { t: t2 } = useTranslation();
  const head2 = entries2[0];
  return (
    <AlertDialog open={entries2.length > 0} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {entries2.length > 1
              ? t2("fileExplorer.deleteMultiple", {
                  count: entries2.length,
                })
              : head2?.isDirectory
                ? t2("fileExplorer.deleteFolder")
                : t2("fileExplorer.deleteFile")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {entries2.length > 1
              ? t2("fileExplorer.deleteMultipleConfirm", {
                  count: entries2.length,
                })
              : head2?.isDirectory
                ? t2("fileExplorer.deleteFolderConfirm", {
                    name: head2.name,
                  })
                : t2("fileExplorer.deleteFileConfirm", {
                    name: head2?.name,
                  })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t2("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function DropOverlay() {
  const { t: t2 } = useTranslation();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 border-2 border-dashed border-primary rounded-lg pointer-events-none">
      <p className="text-sm text-primary font-medium">{t2("fileExplorer.dropToImport")}</p>
    </div>
  );
}
const CANVAS_TAG_THEME_COLOR_BY_PRESET = {
  "#0A84FF": "var(--canvas-node-tag-blue-surface, #54A9FF)",
  "#BF5AF2": "var(--canvas-node-tag-purple-surface, #D28CF6)",
  "#FF9F0A": "var(--canvas-node-tag-orange-surface, #FFBC54)",
  "#5E3DF5": "var(--canvas-node-tag-deep-purple-surface, #8E77F8)",
  "#FF5F57": "var(--canvas-node-tag-red-surface, #FF8F89)",
  "#30D158": "var(--canvas-node-tag-green-surface, #6EDF8A)",
  "#FFD60A": "var(--canvas-node-tag-yellow-surface, #FFE254)",
};
export function getCanvasTagPresentationColor(color2) {
  if (!color2) return void 0;
  return (
    CANVAS_TAG_THEME_COLOR_BY_PRESET[color2.toUpperCase()] ??
    `color-mix(in srgb, ${color2} var(--canvas-tag-presentation-strength, 70%), var(--canvas-tag-presentation-base, #ffffff))`
  );
}
export function getCanvasTagSelectedForegroundColor(color2) {
  if (color2.toUpperCase() === "#FFD60A") {
    return "var(--canvas-node-tag-yellow-selected-foreground, #A87E00)";
  }
  return getCanvasTagPresentationColor(color2) ?? color2;
}
function TagDots({ tagIds, size: size2 = 9, className, ringColor }) {
  const registry2 = useTagRegistry();
  const { t: t2 } = useTranslation();
  const tags2 = resolveTagIds(tagIds, registry2).filter(isCanvasColorTag);
  if (tags2.length === 0) return null;
  const name2 = (id2, custom) =>
    custom && custom.length > 0 ? custom : t2(PRESET_COLOR_NAME_KEYS[id2] ?? "") || id2;
  const visibleTags = tags2.slice(0, MAX_VISIBLE_CANVAS_TAG_COLORS);
  const title = visibleTags.map((tag) => name2(tag.id, tag.name)).join("、");
  const overlap = Math.round(size2 * 0.4);
  const ring = ringColor ?? "var(--background, #fff)";
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn$2("inline-flex shrink-0 items-center", className)}
              onPointerEnter={(e2) => e2.stopPropagation()}
              onPointerMove={(e2) => e2.stopPropagation()}
              onPointerLeave={(e2) => e2.stopPropagation()}
            >
              {visibleTags.map((tag, index2) => (
                <span
                  key={tag.id}
                  className="rounded-full"
                  style={{
                    width: size2,
                    height: size2,
                    backgroundColor: getCanvasTagPresentationColor(tag.color),
                    marginLeft: index2 === 0 ? 0 : -overlap,
                    boxShadow: `0 0 0 0.7px ${ring}`,
                    zIndex: visibleTags.length - index2,
                    position: "relative",
                  }}
                />
              ))}
            </span>
          }
        />
        <TooltipContent side="top">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
function arePropsRefEqualExcept(prev, next2, except) {
  for (const key2 in prev) {
    if (!Object.hasOwn(prev, key2)) continue;
    if (except.includes(key2)) continue;
    if (prev[key2] !== next2[key2]) return false;
  }
  return true;
}
function DurationBadge$1({ seconds, className }) {
  const text2 = formatDuration$3(seconds);
  if (!text2) return null;
  return (
    <span
      data-slot="duration-badge"
      className={cn$2(
        "absolute bottom-1 left-1 px-1 py-0.5 rounded bg-foreground/60 text-background text-[10px] font-medium tabular-nums leading-none pointer-events-none",
        className,
      )}
    >
      {text2}
    </span>
  );
}
export function FileTypeBadge({ fileName, variant }) {
  return variant === "inline" ? (
    <FileTypeThumbnail filename={fileName} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <FileTypeIcon
        {...classifyFileType({
          filename: fileName,
        })}
        size={48}
        decorative={true}
      />
    </div>
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
      className={cn$2(
        "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase leading-none tracking-wide pointer-events-none",
        CATEGORY_CLASS[category],
        className,
      )}
    >
      {normalized}
    </span>
  );
}
function InlineInput({ initialName, isDirectory, onConfirm, onCancel, className }) {
  const { head: stem, tail: extension2 } = splitFilename(
    initialName,
    isDirectory ? "folder" : "file",
  );
  const [value, setValue] = reactExports.useState(stem);
  const inputRef = reactExports.useRef(null);
  const settledRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);
  const handleConfirm = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    const fullName = buildRenamedFilename(initialName, value, isDirectory ? "folder" : "file");
    if (fullName && fullName !== initialName) {
      onConfirm(fullName);
    } else {
      onCancel();
    }
  };
  return (
    <AssetRenameInput
      ref={inputRef}
      extension={extension2}
      className={cn$2(
        "h-auto flex-1 rounded-lg border-primary bg-background px-1 py-0 text-sm text-foreground outline-none focus-within:border-primary",
        className,
      )}
      inputClassName="h-auto px-0 py-0"
      data-action-ui-id="file-explorer.inline-name-input"
      value={value}
      onChange={(e2) => setValue(e2.target.value)}
      onKeyDown={(e2) => {
        e2.stopPropagation();
        if (e2.nativeEvent.isComposing) return;
        if (e2.key === "Enter") {
          e2.preventDefault();
          handleConfirm();
        }
        if (e2.key === "Escape") {
          e2.preventDefault();
          if (!settledRef.current) {
            settledRef.current = true;
            onCancel();
          }
        }
      }}
      onBlur={handleConfirm}
      onClick={(e2) => e2.stopPropagation()}
    />
  );
}
function MissingCandidateActions({
  candidate,
  onMerge,
  onRemove: onRemove2,
  onLocate,
  variant,
  busy,
}) {
  const { t: t2 } = useTranslation();
  const stop = (cb) => (e2) => {
    e2.stopPropagation();
    e2.preventDefault();
    cb();
  };
  if (variant === "grid") {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: action strip swallows clicks for parent select
      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation is event-isolating, not interactive; buttons inside handle their own keyboard events
      <div className="flex flex-col gap-1 w-full px-1" onClick={(e2) => e2.stopPropagation()}>
        {candidate && (
          <p className="text-[9px] text-foreground/30 truncate text-center" title={candidate.path}>
            {t2("missing.candidateFound", {
              path: candidate.path,
            })}
          </p>
        )}
        <div className="flex gap-1 items-center justify-center">
          {candidate ? (
            <Button$1
              size="icon-xs"
              variant="outline"
              data-action-ui-id="missing-merge"
              disabled={busy}
              onClick={stop(onMerge)}
              title={t2("missing.merge")}
              aria-label={t2("missing.merge")}
            >
              <Check />
            </Button$1>
          ) : (
            <Button$1
              size="icon-xs"
              variant="outline"
              data-action-ui-id="missing-locate"
              disabled={busy}
              onClick={stop(onLocate)}
              title={t2("missing.locate")}
              aria-label={t2("missing.locate")}
            >
              <LocalFolderIcon className="size-3.5" />
            </Button$1>
          )}
          <Button$1
            size="icon-xs"
            variant="destructive"
            data-action-ui-id="missing-remove"
            disabled={busy}
            onClick={stop(onRemove2)}
            title={t2("missing.remove")}
            aria-label={t2("missing.remove")}
          >
            <X$7 />
          </Button$1>
        </div>
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: action strip swallows clicks for parent select
    // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation is event-isolating, not interactive; buttons inside handle their own keyboard events
    <div
      className={cn$2("flex gap-0.5 items-center shrink-0 ml-auto")}
      onClick={(e2) => e2.stopPropagation()}
    >
      {candidate ? (
        <Button$1
          size="icon-xs"
          variant="ghost"
          data-action-ui-id="missing-merge"
          disabled={busy}
          onClick={stop(onMerge)}
          title={t2("missing.mergeWithPath", {
            path: candidate.path,
          })}
          aria-label={t2("missing.merge")}
        >
          <Check />
        </Button$1>
      ) : (
        <Button$1
          size="icon-xs"
          variant="ghost"
          data-action-ui-id="missing-locate"
          disabled={busy}
          onClick={stop(onLocate)}
          title={t2("missing.locate")}
          aria-label={t2("missing.locate")}
        >
          <LocalFolderIcon className="size-3.5" />
        </Button$1>
      )}
      <Button$1
        size="icon-xs"
        variant="ghost"
        data-action-ui-id="missing-remove"
        disabled={busy}
        onClick={stop(onRemove2)}
        title={t2("missing.remove")}
        aria-label={t2("missing.remove")}
      >
        <X$7 />
      </Button$1>
    </div>
  );
}
function AssetGridItemImpl({
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
  const fileName = asset.name || getFileName$1(asset.path) || asset.path;
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
    () => (onSaveToProjectAssets ? () => onSaveToProjectAssets(target) : void 0),
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
      return withThumbnail(gatewayUrl2(API_PATHS.serveFile(asset.path)), 200) ?? null;
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
      e2.dataTransfer.setData(RESOURCE_DRAG_MIME, buildDragPayload(absolutePath));
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
            className={cn$2(
              "flex flex-col gap-1 p-1 cursor-pointer select-none transition-colors outline-none rounded-lg",
              isSelected || contextOpen ? "bg-foreground/[0.12]" : "hover:bg-foreground/5",
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
          {asset.type === "video" && !isMissing && resolvedThumbnailUrl && !imgError && (
            <VideoIndicator />
          )}
          {!isMissing && (asset.type === "video" || asset.type === "audio") && (
            <DurationBadge$1 seconds={asset.duration} />
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
                  className={cn$2(
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
const SPECIAL_PROPS$1 = ["renamingPath", "asset"];
function arePropsEqual$1(prev, next2) {
  const prevIsRenaming = prev.renamingPath === prev.absolutePath;
  const nextIsRenaming = next2.renamingPath === next2.absolutePath;
  if (prevIsRenaming !== nextIsRenaming) return false;
  if (prev.asset !== next2.asset) {
    if (prev.asset.id !== next2.asset.id) return false;
    if (prev.asset.path !== next2.asset.path) return false;
    if (prev.asset.name !== next2.asset.name) return false;
    if (prev.asset.type !== next2.asset.type) return false;
    if (prev.asset.status !== next2.asset.status) return false;
    if (prev.asset.duration !== next2.asset.duration) return false;
    if (prev.asset.candidate?.asset_id !== next2.asset.candidate?.asset_id) return false;
    if (prev.asset.candidate?.path !== next2.asset.candidate?.path) return false;
  }
  return arePropsRefEqualExcept(prev, next2, SPECIAL_PROPS$1);
}
const AssetGridItem = reactExports.memo(AssetGridItemImpl, arePropsEqual$1);
function MissingPlaceholder() {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1">
      <AlertTriangle size={20} strokeWidth={1.5} className="text-foreground/30" />
      <span className="text-[9px] text-foreground/30">{t2("fileExplorer.assetMissing")}</span>
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
const GRID_ITEM_PADDING = 8;
const GRID_ITEM_GAP = 4;
const GRID_NAME_AREA = 24;
const GRID_ROW_GAP = 4;
const GRID_ROW_FALLBACK_HEIGHT = 120;
export const FileExplorerGridView = reactExports.memo(function FileExplorerGridView2({
  sortedFilteredAssets,
  containerWidth,
  selectedPaths,
  viewMode,
  renamingPath,
  resolveAssetPath,
  scrollEl,
  handlers: handlers2,
}) {
  const columnsPerRow = 2;
  const gridRowEstimateHeight = reactExports.useMemo(() => {
    if (containerWidth === 0) return GRID_ROW_FALLBACK_HEIGHT;
    const cellWidth = containerWidth / columnsPerRow;
    const thumbHeight = cellWidth - GRID_ITEM_PADDING;
    return thumbHeight + GRID_ITEM_GAP + GRID_NAME_AREA + GRID_ITEM_PADDING + GRID_ROW_GAP;
  }, [containerWidth]);
  const assetGridRows = reactExports.useMemo(() => {
    const rows = [];
    for (let i2 = 0; i2 < sortedFilteredAssets.length; i2 += columnsPerRow) {
      rows.push(sortedFilteredAssets.slice(i2, i2 + columnsPerRow));
    }
    return rows;
  }, [sortedFilteredAssets]);
  const gridVirtualizer = useVirtualizer({
    count: assetGridRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => gridRowEstimateHeight,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });
  return (
    <div
      style={{
        height: gridVirtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
      }}
    >
      {gridVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = assetGridRows[virtualRow.index];
        return (
          <div
            key={virtualRow.index}
            ref={gridVirtualizer.measureElement}
            data-index={virtualRow.index}
            className="grid gap-1 px-1 absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              // minmax(0, 1fr) 必需:默认 1fr 实际是 minmax(auto, 1fr),
              // cell 内长文件名 / 长 stem 会按 max-content 撑大 track,
              // 表现为同一行内 cell 宽度不一致.
              gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
            }}
          >
            {row.map((asset) => {
              const absPath = resolveAssetPath(asset.path);
              return (
                <AssetGridItem
                  key={asset.path}
                  asset={asset}
                  absolutePath={absPath}
                  isSelected={selectedPaths.has(absPath)}
                  viewMode={viewMode}
                  buildDragPayload={handlers2.buildDragPayload}
                  onSelect={handlers2.onSelect}
                  onDoubleClick={handlers2.onDoubleClick}
                  onDelete={handlers2.onDelete}
                  onCopyPath={handlers2.onCopyPath}
                  onCopyFile={handlers2.onCopyFile}
                  onDuplicate={handlers2.onDuplicate}
                  onShowInFolder={handlers2.onShowInFolder}
                  onStartRename={handlers2.onStartRename}
                  onRename={handlers2.onRename}
                  onRenameCancel={handlers2.onRenameCancel}
                  renamingPath={renamingPath}
                  onMergeCandidate={handlers2.onMergeCandidate}
                  onRemoveMissing={handlers2.onRemoveMissing}
                  onLocateMissing={handlers2.onLocateMissing}
                  onSwitchViewMode={handlers2.onSwitchViewMode}
                  onAddToCanvas={handlers2.onAddToCanvas}
                  onAddToChat={handlers2.onAddToChat}
                  onPromoteToAsset={handlers2.onPromoteToAsset}
                  onSaveToProjectAssets={handlers2.onSaveToProjectAssets}
                  onLocateOnCanvas={handlers2.onLocateOnCanvas}
                  onAnchorMount={handlers2.onAnchorMount}
                  onOpenDefault={handlers2.onOpenDefault}
                  onOpenWith={handlers2.onOpenWith}
                  onPickAppAndOpen={handlers2.onPickAppAndOpen}
                  onHoverIntent={handlers2.onHoverIntent}
                  onHoverEnd={handlers2.onHoverEnd}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"]);
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
  const prefix = rootPath.endsWith("/") || rootPath.endsWith("\\") ? rootPath : `${rootPath}/`;
  const relativePath = absPath.startsWith(prefix) ? absPath.slice(prefix.length) : absPath;
  if (IMAGE_EXTS.has(ext)) {
    return withThumbnail(gatewayUrl2(API_PATHS.serveFile(relativePath)), 18) ?? null;
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
  const src = retried ? `${url2}${url2.includes("?") ? "&" : "?"}force=1` : url2;
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
const TreeItem = reactExports.memo(function TreeItem2({
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
    () => (onSaveToProjectAssets ? () => onSaveToProjectAssets(target) : void 0),
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
  const handleDuplicate = reactExports.useCallback(() => onDuplicate(entry), [onDuplicate, entry]);
  const handleStartRename = reactExports.useCallback(
    () => onStartRename(entry.path),
    [onStartRename, entry.path],
  );
  const handleDelete2 = reactExports.useCallback(() => onDelete(entry), [onDelete, entry]);
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
        <div className={cn$2(TREE_ROW_INNER_CLASS, !entry.isDirectory && "h-8 gap-2")}>
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
    if (!types2.includes(RESOURCE_DRAG_MIME) && !types2.includes(DRAG_MIME)) return;
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
        entry.isDirectory && onStartCreateInside ? () => onStartCreateInside(entry.path) : void 0
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
    const Arrow = isExpanded ? ChevronDown : ChevronRight$1;
    return (
      <ContextMenu onOpenChange={onMenuOpenChange}>
        <ContextMenuTrigger
          render={
            <button
              type="button"
              draggable={!isRenaming}
              className={cn$2(TREE_ROW_OUTER_CLASS, "cursor-pointer text-left")}
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
            className={cn$2(
              TREE_ROW_INNER_CLASS,
              dragOver || isSelected || contextOpen
                ? TREE_ROW_SELECTED_CLASS
                : TREE_ROW_HOVER_CLASS,
            )}
          >
            <Arrow size={12} strokeWidth={1.5} className="shrink-0 text-foreground/30" />
            <div className="shrink-0 size-5 p-0.5 inline-flex items-center justify-center">
              <FolderIcon size={16} strokeWidth={1.5} className="text-foreground/30" />
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
  const thumbUrl = getThumbnailUrl(gatewayUrl2, entry.name, entry.path, rootPath);
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
          className={cn$2(TREE_ROW_OUTER_CLASS, "cursor-pointer", isMissing && "opacity-50")}
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
        className={cn$2(
          TREE_ROW_INNER_CLASS,
          "h-8 gap-2",
          isSelected || contextOpen ? TREE_ROW_SELECTED_CLASS : TREE_ROW_HOVER_CLASS,
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
                className={cn$2(
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
        {!isRenaming && !isMissing && asset?.tagIds && asset.tagIds.length > 0 && (
          <TagDots tagIds={asset.tagIds} size={10.8} className="ml-auto pl-2" />
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
            className={cn$2(
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
    if ((pe2.children?.length ?? 0) !== (ne2.children?.length ?? 0)) return false;
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
const TREE_ROW_HEIGHT = 32;
export const FileExplorerTreeView = reactExports.memo(function FileExplorerTreeView2({
  flatRows,
  expanded,
  selectedPaths,
  rootPath,
  viewMode,
  assetByAbsPath,
  renamingPath,
  scrollEl,
  creatingEntry,
  handlers: handlers2,
}) {
  const treeVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: 10,
  });
  reactExports.useEffect(() => {
    if (!creatingEntry) return;
    const creatingPath = `${creatingEntry.parentPath}/__creating__`;
    const index2 = flatRows.findIndex((r2) => r2.entry.path === creatingPath);
    if (index2 >= 0) {
      treeVirtualizer.scrollToIndex(index2, {
        align: "auto",
      });
    }
  }, [creatingEntry, flatRows, treeVirtualizer]);
  return (
    <div
      style={{
        height: treeVirtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
      }}
    >
      {treeVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = flatRows[virtualRow.index];
        const isCreatingRow = row.entry.path.endsWith("/__creating__");
        return (
          <div
            key={row.entry.path}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TreeItem
              entry={row.entry}
              depth={row.depth}
              isExpanded={expanded.has(row.entry.path)}
              isSelected={selectedPaths.has(row.entry.path)}
              isCreating={isCreatingRow}
              rootPath={rootPath}
              viewMode={viewMode}
              asset={assetByAbsPath.get(row.entry.path)}
              buildDragPayload={handlers2.buildDragPayload}
              onToggle={handlers2.onToggle}
              onFileSelect={handlers2.onFileSelect}
              onFileDoubleClick={handlers2.onFileDoubleClick}
              onRename={handlers2.onRename}
              onDelete={handlers2.onDelete}
              onCopyPath={handlers2.onCopyPath}
              onCopyFile={handlers2.onCopyFile}
              onDuplicate={handlers2.onDuplicate}
              onMove={handlers2.onMove}
              onStartRename={handlers2.onStartRename}
              onCreateConfirm={handlers2.onCreateConfirm}
              onCreateCancel={handlers2.onCreateCancel}
              onStartCreateInside={handlers2.onStartCreateInside}
              renamingPath={renamingPath}
              onRenameCancel={handlers2.onRenameCancel}
              onShowInFolder={handlers2.onShowInFolder}
              onMergeCandidate={handlers2.onMergeCandidate}
              onRemoveMissing={handlers2.onRemoveMissing}
              onLocateMissing={handlers2.onLocateMissing}
              onSwitchViewMode={handlers2.onSwitchViewMode}
              onAddToCanvas={handlers2.onAddToCanvas}
              onAddToChat={handlers2.onAddToChat}
              onPromoteToAsset={handlers2.onPromoteToAsset}
              onSaveToProjectAssets={handlers2.onSaveToProjectAssets}
              onLocateOnCanvas={handlers2.onLocateOnCanvas}
              onAnchorMount={handlers2.onAnchorMount}
              onOpenDefault={handlers2.onOpenDefault}
              onOpenWith={handlers2.onOpenWith}
              onPickAppAndOpen={handlers2.onPickAppAndOpen}
              onHoverIntent={handlers2.onHoverIntent}
              onHoverEnd={handlers2.onHoverEnd}
            />
          </div>
        );
      })}
    </div>
  );
});
function emptyPerFileMeta() {
  return {
    user_desc: "",
    expanded: false,
  };
}
const TYPE_OPTIONS$1 = ENTITY_TYPES;
export function PromoteToAssetForm({
  files,
  workspaceRoot,
  onCancel,
  onSuccess,
  onSubmittingChange,
  variant = "dialog",
}) {
  const { t: t2 } = useTranslation();
  const appendMutation = useAppendAttachmentFromWorkspace();
  const createMutation = useCreateEntityFromPaths();
  const materializeMutation = useMaterializeEntity();
  const [mode2, setMode] = reactExports.useState("new");
  const existingEntitiesQuery = useEntities();
  const hasExistingEntities = (existingEntitiesQuery.data ?? []).length > 0;
  reactExports.useEffect(() => {
    if (!hasExistingEntities && mode2 !== "new") {
      setMode("new");
    }
  }, [hasExistingEntities, mode2]);
  const [pickedEntity, setPickedEntity] = reactExports.useState(null);
  const [newType, setNewType] = reactExports.useState("character");
  const [newName, setNewName] = reactExports.useState("");
  const [newDescription, setNewDescription] = reactExports.useState("");
  const [tags2, setTags] = reactExports.useState([]);
  const [submitAttempted, setSubmitAttempted] = reactExports.useState(false);
  const nameInputRef = reactExports.useRef(null);
  const [perFileMeta, setPerFileMeta] = reactExports.useState({});
  const [error, setError] = reactExports.useState(null);
  const isSubmitting = appendMutation.isPending || createMutation.isPending;
  const filesLen = files.length;
  reactExports.useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);
  const isPopover = variant === "popover";
  const pickerMaxHeight = isPopover ? 180 : 220;
  const trimmedNewName = newName.trim();
  const nameMissing = mode2 === "new" && trimmedNewName.length === 0;
  const appendTargetMissing = mode2 === "append" && !pickedEntity;
  const showNameError = submitAttempted && nameMissing;
  const showAppendTargetError = submitAttempted && appendTargetMissing;
  const submitDisabled = isSubmitting || filesLen === 0;
  const getMeta = reactExports.useCallback(
    (absPath) => perFileMeta[absPath] ?? emptyPerFileMeta(),
    [perFileMeta],
  );
  const updateMeta = reactExports.useCallback((absPath, patch2) => {
    setPerFileMeta((prev) => {
      const existing = prev[absPath] ?? emptyPerFileMeta();
      return {
        ...prev,
        [absPath]: {
          ...existing,
          ...patch2,
        },
      };
    });
  }, []);
  const toggleExpand = reactExports.useCallback(
    (absPath) => {
      const current2 = getMeta(absPath);
      updateMeta(absPath, {
        expanded: !current2.expanded,
      });
    },
    [getMeta, updateMeta],
  );
  const handleSelectEntity = reactExports.useCallback((target) => {
    setPickedEntity(target);
    setSubmitAttempted(false);
    setError(null);
  }, []);
  const handleModeChange = reactExports.useCallback((value) => {
    setMode(value);
    setSubmitAttempted(false);
    setError(null);
  }, []);
  const handleSubmit = reactExports.useCallback(async () => {
    setSubmitAttempted(true);
    if (submitDisabled) {
      if (filesLen === 0) {
        trackAssetPromoteValidationFailed({
          promote_mode: mode2,
          entity_type: mode2 === "new" ? newType : pickedEntity?.entityType,
          attachment_count: 0,
          reason: "no_files",
        });
      }
      return;
    }
    setError(null);
    if (mode2 === "new" && newName.trim().length === 0) {
      trackAssetPromoteValidationFailed({
        promote_mode: "new",
        entity_type: newType,
        attachment_count: filesLen,
        reason: "missing_name",
      });
      nameInputRef.current?.focus();
      return;
    }
    if (mode2 === "append" && !pickedEntity) {
      trackAssetPromoteValidationFailed({
        promote_mode: "append",
        attachment_count: filesLen,
        reason: "missing_entity",
      });
      return;
    }
    if (mode2 === "append" && pickedEntity) {
      let successCount = 0;
      try {
        for (const f2 of files) {
          const meta2 = getMeta(f2.absolutePath);
          const trimmedDesc = meta2.user_desc.trim();
          await appendMutation.mutateAsync({
            entityId: pickedEntity.entityId,
            input: {
              // absolutePath: source of truth for fs.statSync on the gateway
              // — required because asset-center home gateway baseDir isn't
              // the workspace root, so workspaceRelPath alone can't be
              // resolved correctly there.
              absolutePath: f2.absolutePath,
              // workspaceRelPath: optional, used by gateway purely for
              // vault metadata.prompt lookup (vault is indexed by
              // workspace-relative paths). Passing both is the standard
              // pattern in workspace-context callers.
              workspaceRelPath: f2.workspaceRelPath,
              ...(trimmedDesc
                ? {
                    user_desc: trimmedDesc,
                  }
                : {}),
            },
          });
          successCount += 1;
        }
        dedupedToast.success(
          t2("assetCenter.promote.toastAppended", {
            entity: pickedEntity.entityName,
            count: successCount,
          }),
        );
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          success: true,
          has_description: false,
          promote_mode: "append",
          attachment_count: successCount,
        });
        onSuccess();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (successCount > 0) {
          dedupedToast.error(
            t2("assetCenter.promote.partialAppendError", {
              done: successCount,
              total: files.length,
              message: msg,
            }),
          );
          trackAssetCreate({
            source: "workspace_panel",
            method: "promote",
            success: false,
            has_description: false,
            promote_mode: "append",
            error_type: classifyAssetError(err),
          });
        } else {
          setError(msg);
          trackAssetCreate({
            source: "workspace_panel",
            method: "promote",
            success: false,
            has_description: false,
            promote_mode: "append",
            error_type: classifyAssetError(err),
          });
        }
      }
      return;
    }
    if (mode2 === "new") {
      try {
        const trimmedName = newName.trim();
        const trimmedDesc = newDescription.trim();
        const filesForServer = files.map((f2) => {
          const meta2 = getMeta(f2.absolutePath);
          const trimmedFileDesc = meta2.user_desc.trim();
          return {
            absolutePath: f2.absolutePath,
            ...(trimmedFileDesc
              ? {
                  user_desc: trimmedFileDesc,
                }
              : {}),
          };
        });
        const entity = await createMutation.mutateAsync({
          input: {
            type: newType,
            name: trimmedName,
            ...(trimmedDesc
              ? {
                  description: trimmedDesc,
                }
              : {}),
            ...(tags2.length > 0
              ? {
                  metadata: {
                    tags: tags2,
                  },
                }
              : {}),
            files: filesForServer,
            ...(workspaceRoot
              ? {
                  workspaceRootForVault: workspaceRoot,
                }
              : {}),
          },
        });
        if (workspaceRoot && entity.id) {
          try {
            await materializeMutation.mutateAsync({
              entityId: entity.id,
              input: {
                workspacePath: workspaceRoot,
              },
              _track: {
                entity_type: newType,
                trigger: "post_create",
              },
            });
          } catch {}
        }
        dedupedToast.success(
          t2("assetCenter.promote.toastCreated", {
            entity: entity.name,
            count: files.length,
          }),
        );
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          entity_type: newType,
          success: true,
          attachment_count: files.length,
          has_description: !!trimmedDesc,
          promote_mode: "new",
          auto_materialized: !!(workspaceRoot && entity.id),
        });
        onSuccess({
          entityName: entity.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          entity_type: newType,
          success: false,
          has_description: !!newDescription.trim(),
          promote_mode: "new",
          error_type: classifyAssetError(err),
        });
      }
    }
  }, [
    files,
    filesLen,
    submitDisabled,
    mode2,
    pickedEntity,
    getMeta,
    appendMutation,
    createMutation,
    materializeMutation,
    newType,
    newName,
    newDescription,
    tags2,
    workspaceRoot,
    onSuccess,
    t2,
  ]);
  return (
    <>
      <Tabs value={mode2} onValueChange={handleModeChange}>
        {hasExistingEntities && (
          <TabsList className="w-full bg-muted/40 p-0.5 gap-0 rounded-md h-auto">
            <TabsTrigger
              value="new"
              className="flex-1 px-3 py-1.5 text-[13px] rounded-[5px] bg-transparent data-[active]:bg-muted-foreground/15 data-[active]:shadow-none text-muted-foreground hover:text-foreground data-[active]:text-foreground transition-all"
              data-action-ui-id="asset-panel.promote-tab-new"
            >
              {t2("assetCenter.promote.tabNew")}
            </TabsTrigger>
            <TabsTrigger
              value="append"
              className="flex-1 px-3 py-1.5 text-[13px] rounded-[5px] bg-transparent data-[active]:bg-muted-foreground/15 data-[active]:shadow-none text-muted-foreground hover:text-foreground data-[active]:text-foreground transition-all"
              data-action-ui-id="asset-panel.promote-tab-append"
            >
              {t2("assetCenter.promote.tabAppend")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="append" className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <span
              className={cn$2(
                "text-sm font-medium block",
                showAppendTargetError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {t2("assetCenter.promote.targetEntityLabel")}
            </span>
            <div
              className={cn$2("rounded-md", showAppendTargetError && "ring-1 ring-destructive/30")}
              data-action-ui-id="asset-panel.promote-entity-picker"
            >
              <AssetMentionList
                onSelect={handleSelectEntity}
                materializedOnly={false}
                maxHeight={pickerMaxHeight}
                selectedEntityId={pickedEntity?.entityId ?? null}
                bordered={true}
              />
            </div>
            {showAppendTargetError && (
              <p
                className="text-xs text-destructive"
                data-action-ui-id="asset-panel.promote-target-error"
              >
                {t2("assetCenter.promote.targetRequired", "请选择一个要加入的目标资产")}
              </p>
            )}
            {pickedEntity && (
              <span
                className="text-xs text-muted-foreground/70 block"
                data-action-ui-id="asset-panel.promote-picked-name"
              >
                {t2("assetCenter.promote.pickedLabel", {
                  name: pickedEntity.entityName,
                })}
              </span>
            )}
          </div>
        </TabsContent>
        <TabsContent value="new" className={hasExistingEntities ? "space-y-3 mt-3" : "space-y-3"}>
          <div className="space-y-1.5">
            <div
              className={cn$2(
                "flex items-center gap-2 -mx-2 rounded-md border border-transparent px-2 py-1.5 transition-colors",
                showNameError && "border-destructive/50 bg-destructive/10",
              )}
            >
              <AtSign
                size={12}
                className={cn$2(
                  "shrink-0",
                  showNameError ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <input
                ref={nameInputRef}
                id="promote-new-name"
                value={newName}
                onChange={(e2) => {
                  setNewName(e2.target.value);
                  if (submitAttempted && e2.target.value.trim().length > 0) {
                    setSubmitAttempted(false);
                  }
                }}
                placeholder={`${t2("assetCenter.create.namePlaceholder")}（${t2("common.required", "必填")}）`}
                aria-invalid={showNameError}
                aria-describedby={showNameError ? "promote-new-name-error" : void 0}
                className={cn$2(
                  "flex-1 min-w-0 bg-transparent font-heading text-sm font-medium outline-none",
                  showNameError
                    ? "text-destructive placeholder:text-destructive/65"
                    : "placeholder:text-muted-foreground/40",
                )}
                data-action-ui-id="asset-panel.promote-new-name"
              />
            </div>
            {showNameError && (
              <p
                id="promote-new-name-error"
                className="text-xs text-destructive"
                data-action-ui-id="asset-panel.promote-new-name-error"
              >
                {t2("assetCenter.promote.nameRequired", "请输入资产名称后再创建")}
              </p>
            )}
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 cursor-pointer transition-colors hover:opacity-80 mr-2"
                data-action-ui-id="asset-panel.promote-new-type"
              >
                <Badge
                  variant="secondary"
                  className="text-[13px] h-[21px] px-1.5 font-medium gap-0.5 rounded-sm bg-muted-foreground/15 text-secondary-foreground"
                >
                  {t2(`assetCenter.types.${newType}`)}
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {TYPE_OPTIONS$1.map((opt) => (
                  <DropdownMenuItem key={opt} onClick={() => setNewType(opt)}>
                    {t2(`assetCenter.types.${opt}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-0.5 h-2.5 shrink-0 bg-muted-foreground/20 mr-3" />
            <textarea
              id="promote-new-description"
              value={newDescription}
              onChange={(e2) => setNewDescription(e2.target.value)}
              placeholder={t2("assetCenter.create.descriptionPlaceholder")}
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
              data-action-ui-id="asset-panel.promote-new-description"
            />
          </div>
        </TabsContent>
      </Tabs>
      <div>
        <TooltipProvider delay={300}>
          <ul
            className={cn$2(
              "overflow-y-auto border border-border rounded-md divide-y divide-border",
              isPopover ? "max-h-40" : "max-h-56",
            )}
            data-action-ui-id="asset-panel.promote-files-list"
          >
            {files.map((f2) => {
              const meta2 = getMeta(f2.absolutePath);
              const rowButton = (
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(f2.absolutePath)}
                  data-action-ui-id="asset-panel.promote-file-toggle"
                >
                  <FileText size={14} className="shrink-0 text-foreground opacity-35" />
                  <span className="flex-1 truncate text-left">{f2.displayName}</span>
                  {meta2.expanded ? (
                    <ChevronDown size={12} className="shrink-0 text-muted-foreground opacity-50" />
                  ) : (
                    <ChevronRight$1
                      size={12}
                      className="shrink-0 text-muted-foreground opacity-50"
                    />
                  )}
                </button>
              );
              return (
                <li key={f2.absolutePath}>
                  {f2.vaultPrompt ? (
                    <Tooltip>
                      <TooltipTrigger render={rowButton} />
                      <TooltipContent side="left" className="max-w-md text-sm whitespace-pre-wrap">
                        {f2.vaultPrompt}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    rowButton
                  )}
                  {meta2.expanded && (
                    <div className="px-2.5 pb-2 pt-0.5 flex items-start">
                      <div className="w-0.5 shrink-0 self-stretch bg-muted-foreground/15 rounded-full mr-2.5 ml-[3px]" />
                      <textarea
                        value={meta2.user_desc}
                        onChange={(e2) =>
                          updateMeta(f2.absolutePath, {
                            user_desc: e2.target.value,
                          })
                        }
                        placeholder={t2("assetCenter.create.attachmentCaptionPlaceholder")}
                        rows={1}
                        className="flex-1 min-w-0 bg-muted/30 rounded px-2 py-1.5 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
                        data-action-ui-id="asset-panel.promote-file-user-desc"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </div>
      {mode2 === "new" && <CollapsibleTags tags={tags2} onChange={setTags} />}
      {error && (
        <div
          className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 rounded-md"
          data-action-ui-id="asset-panel.promote-error"
        >
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="mt-1 flex items-center justify-end gap-2">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button$1
            variant="ghost"
            size="sm"
            className="h-8 rounded-md"
            onClick={onCancel}
            disabled={isSubmitting}
            data-action-ui-id="asset-panel.promote-close"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() => void handleSubmit()}
            disabled={submitDisabled}
            data-action-ui-id="asset-panel.promote-submit"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {mode2 === "append"
              ? t2("assetCenter.promote.submitAppend")
              : t2("assetCenter.promote.submitNew")}
          </Button$1>
        </div>
      </div>
    </>
  );
}
