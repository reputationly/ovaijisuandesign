// use-lightbox-media-actions.jsx
import {
  Archive,
  Copy,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download, FolderOpen, useCanvasBridge } from "./package.jsx";
import { getCanvasFileManagerLabelKey } from "./use-warn-missing-asset-meta.jsx";
function getLightboxDownloadSource(item) {
  return item?.filePath || item?.url || void 0;
}
function getLightboxDownloadFileName(item) {
  if (item?.fileName) return item.fileName;
  const source = getLightboxDownloadSource(item);
  if (!source) return void 0;
  const clean = source.split(/[?#]/)[0] ?? source;
  return clean.split("/").pop() || void 0;
}
function getLightboxCopySource(item) {
  if (item?.kind !== "image") return void 0;
  return item.filePath || item.url || void 0;
}
function isLightboxItemCopyable(item, onCopyImage) {
  return !!getLightboxCopySource(item) && !!onCopyImage;
}
function isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs) {
  if (!item?.url) return false;
  if (item.filePath && onSaveAs) return true;
  return !!onSaveUrlAs;
}
function getBatchDownloadableLightboxItems(items) {
  if (!items || items.length === 0) return [];
  const seen2 = new Set();
  const downloadable = [];
  for (const item of items) {
    const downloadSource = getLightboxDownloadSource(item);
    if (!downloadSource) continue;
    if (seen2.has(downloadSource)) continue;
    seen2.add(downloadSource);
    downloadable.push({
      ...item,
      downloadSource,
    });
  }
  return downloadable;
}
const CONTEXT_MENU_WIDTH = 176;
const CONTEXT_MENU_ROW_HEIGHT = 32;
const CONTEXT_MENU_PADDING = 8;
const VIEWPORT_MARGIN = 8;
function LightboxMediaContextMenu({
  x: x2,
  y: y4,
  copyLabel,
  saveLabel,
  saveAllLabel,
  showInFolderLabel,
  canCopy,
  canSave,
  canSaveAll,
  canReveal,
  onCopy,
  onSaveAs,
  onSaveAllAs,
  onShowInFolder,
}) {
  return reactDomExports.createPortal(
    <div
      role="menu"
      tabIndex={-1}
      data-action-ui-id="canvas.media-lightbox.context-menu"
      className="fixed z-[10000] min-w-44 rounded-lg border border-white/10 bg-neutral-950/95 p-1 text-xs text-white/85 shadow-lg"
      style={{
        left: x2,
        top: y4,
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {canCopy && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.copy"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onCopy}
        >
          <Copy size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{copyLabel}</span>
        </button>
      )}
      {canSave && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.save-as"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onSaveAs}
        >
          <Download size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveLabel}</span>
        </button>
      )}
      {canSaveAll && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.save-all-as"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onSaveAllAs}
        >
          <Archive size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveAllLabel}</span>
        </button>
      )}
      {canReveal && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.show-in-folder"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onShowInFolder}
        >
          <FolderOpen size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{showInFolderLabel}</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
function clampMenuPoint(x2, y4, rowCount) {
  const viewportWidth =
    typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? 768 : window.innerHeight;
  const width = CONTEXT_MENU_WIDTH;
  const height = rowCount * CONTEXT_MENU_ROW_HEIGHT + CONTEXT_MENU_PADDING;
  const maxX = Math.max(
    VIEWPORT_MARGIN,
    viewportWidth - width - VIEWPORT_MARGIN,
  );
  const maxY = Math.max(
    VIEWPORT_MARGIN,
    viewportHeight - height - VIEWPORT_MARGIN,
  );
  return {
    x: Math.min(Math.max(x2, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(y4, VIEWPORT_MARGIN), maxY),
  };
}
export function useLightboxMediaActions({ item, items }) {
  const { t: t2 } = useTranslation();
  const { onCopyImage, onSaveAs, onSaveManyAs, onSaveUrlAs, onShowInFolder } =
    useCanvasBridge();
  const [menuPoint, setMenuPoint] = reactExports.useState(null);
  const canCopy = isLightboxItemCopyable(item, onCopyImage);
  const canSave = isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs);
  const canReveal = !!item?.filePath && !!onShowInFolder;
  const batchDownloadableItems = reactExports.useMemo(
    () => getBatchDownloadableLightboxItems(items),
    [items],
  );
  const canSaveAll = batchDownloadableItems.length > 1 && !!onSaveManyAs;
  const canOpenMenu = canCopy || canSave || canReveal || canSaveAll;
  const handleCopyImage = reactExports.useCallback(() => {
    const source = getLightboxCopySource(item);
    if (!source || !onCopyImage) return;
    onCopyImage(source);
    setMenuPoint(null);
  }, [item, onCopyImage]);
  const handleDownload = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (item?.filePath && onSaveAs) {
        onSaveAs(item.filePath, getLightboxDownloadFileName(item));
        return;
      }
      if (item?.url && onSaveUrlAs) {
        onSaveUrlAs(item.url, getLightboxDownloadFileName(item));
      }
    },
    [item, onSaveAs, onSaveUrlAs],
  );
  const handleDownloadAll = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
      onSaveManyAs(
        batchDownloadableItems.map((candidate) => ({
          filePath: candidate.downloadSource,
          fileName: getLightboxDownloadFileName(candidate),
        })),
      );
    },
    [batchDownloadableItems, onSaveManyAs],
  );
  const handleContextMenu = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canOpenMenu) {
        setMenuPoint(null);
        return;
      }
      const rowCount =
        Number(canCopy) +
        Number(canSave) +
        Number(canSaveAll) +
        Number(canReveal);
      setMenuPoint(clampMenuPoint(event.clientX, event.clientY, rowCount));
    },
    [canOpenMenu, canCopy, canSave, canSaveAll, canReveal],
  );
  const handleSaveAs = reactExports.useCallback(() => {
    if (item?.filePath && onSaveAs) {
      onSaveAs(item.filePath, getLightboxDownloadFileName(item));
      setMenuPoint(null);
      return;
    }
    if (item?.url && onSaveUrlAs) {
      onSaveUrlAs(item.url, getLightboxDownloadFileName(item));
    }
    setMenuPoint(null);
  }, [item, onSaveAs, onSaveUrlAs]);
  const handleShowInFolderAction = reactExports.useCallback(() => {
    if (!item?.filePath || !onShowInFolder) return;
    onShowInFolder(item.filePath);
    setMenuPoint(null);
  }, [item?.filePath, onShowInFolder]);
  const handleShowInFolder = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleShowInFolderAction();
    },
    [handleShowInFolderAction],
  );
  const handleSaveAllAs = reactExports.useCallback(() => {
    if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
    onSaveManyAs(
      batchDownloadableItems.map((candidate) => ({
        filePath: candidate.downloadSource,
        fileName: getLightboxDownloadFileName(candidate),
      })),
    );
    setMenuPoint(null);
  }, [batchDownloadableItems, onSaveManyAs]);
  const itemActionKey = `${item?.kind ?? ""}\0${item?.url ?? ""}\0${item?.filePath ?? ""}`;
  reactExports.useEffect(() => {
    setMenuPoint((point2) => (point2 && itemActionKey ? null : point2));
  }, [itemActionKey]);
  reactExports.useEffect(() => {
    if (!menuPoint) return;
    const close2 = () => setMenuPoint(null);
    const handleKeyDown2 = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close2();
      }
    };
    document.addEventListener("mousedown", close2);
    document.addEventListener("keydown", handleKeyDown2, true);
    window.addEventListener("blur", close2);
    return () => {
      document.removeEventListener("mousedown", close2);
      document.removeEventListener("keydown", handleKeyDown2, true);
      window.removeEventListener("blur", close2);
    };
  }, [menuPoint]);
  const contextMenu = reactExports.useMemo(() => {
    if (!menuPoint || !canOpenMenu) return null;
    return (
      <LightboxMediaContextMenu
        x={menuPoint.x}
        y={menuPoint.y}
        copyLabel={t2("common.copy")}
        saveLabel={t2("common.saveAs")}
        saveAllLabel={t2("canvas.lightbox.downloadAll")}
        showInFolderLabel={t2(getCanvasFileManagerLabelKey())}
        canCopy={canCopy}
        canSave={canSave}
        canSaveAll={canSaveAll}
        canReveal={canReveal}
        onCopy={handleCopyImage}
        onSaveAs={handleSaveAs}
        onSaveAllAs={handleSaveAllAs}
        onShowInFolder={handleShowInFolderAction}
      />
    );
  }, [
    menuPoint,
    canOpenMenu,
    t2,
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleSaveAs,
    handleSaveAllAs,
    handleShowInFolderAction,
  ]);
  return {
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu,
  };
}
