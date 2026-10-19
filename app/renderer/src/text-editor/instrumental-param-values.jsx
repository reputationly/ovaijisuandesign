import { MediaLightbox as MediaLightbox$1 } from "../assets/text-preview.jsx";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { hasFileExtension } from "../media-editing/file-extension-pattern.jsx";
import { Archive, Copy, Download as Download$2, FolderOpen } from "lucide-react";
import { default as reactExports } from "react";
import { default as reactDomExports } from "react-dom";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export const INSTRUMENTAL_PARAM_VALUES = new Set(["instrumental", "true"]);
export function getCompositionPlanLyrics(compositionPlan) {
  if (!compositionPlan?.trim()) return void 0;
  try {
    const parsed = JSON.parse(compositionPlan);
    if (!parsed || typeof parsed !== "object") return void 0;
    const plan = parsed;
    if (Array.isArray(plan.chunks)) {
      const blocks = plan.chunks.map(chunk2 => {
        if (!chunk2 || typeof chunk2 !== "object") return "";
        const text2 = chunk2.text;
        return typeof text2 === "string" ? text2.trim() : "";
      }).filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
    if (Array.isArray(plan.sections)) {
      const blocks = plan.sections.map(section => {
        if (!section || typeof section !== "object") return "";
        const lines = section.lines;
        if (!Array.isArray(lines)) return "";
        return lines.filter(line => typeof line === "string").map(line => line.trim()).filter(Boolean).join("\n");
      }).filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
  } catch {
    return void 0;
  }
  return void 0;
}
export function isInstrumentalAudioAsset(meta2) {
  const mode2 = meta2?.params?.is_instrumental;
  return mode2 !== void 0 && INSTRUMENTAL_PARAM_VALUES.has(mode2);
}
export function getDisplayLyrics(meta2) {
  if (!meta2 || isInstrumentalAudioAsset(meta2)) return void 0;
  if (meta2.lyrics?.trim()) return meta2.lyrics;
  return getCompositionPlanLyrics(meta2.compositionPlan);
}
export function resolveCanvasPlatform(platform2) {
  const value = (typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent).toLowerCase();
  if (value.includes("mac")) return "mac";
  if (value.includes("win")) return "windows";
  return "other";
}
export function getCanvasFileManagerLabelKey(platform2) {
  const os2 = resolveCanvasPlatform();
  if (os2 === "mac") return "canvas.lightbox.openInFinder";
  if (os2 === "windows") return "canvas.lightbox.openInFileExplorer";
  return "canvas.lightbox.openInFileManager";
}
export const LightboxMediaActionsContext = reactExports.createContext({});
export function useLightboxMediaActionsBridge() {
  return reactExports.useContext(LightboxMediaActionsContext);
}
export function lightboxItemFromAssetMeta(kind2, meta2) {
  if (!meta2?.url) return void 0;
  return {
    kind: kind2,
    url: meta2.url,
    filePath: meta2.path,
    fileName: meta2.name
  };
}
export function normalizeLegacyLightboxItems(kind2, items, item, sources, src) {
  if (items && items.length > 0) {
    return items.filter(candidate => !!candidate.url);
  }
  if (item?.url) {
    return [item];
  }
  const urls = sources && sources.length > 0 ? sources : src ? [src] : [];
  const normalized = [];
  for (const url2 of urls) {
    if (typeof url2 !== "string" || url2.length === 0) continue;
    const candidate = {
      kind: kind2,
      url: url2
    };
    if (normalized.some(existing2 => existing2.kind === candidate.kind && existing2.url === candidate.url && existing2.filePath === candidate.filePath)) {
      continue;
    }
    normalized.push(candidate);
  }
  return normalized;
}
export function getLightboxDownloadSource(item) {
  return item?.filePath || item?.url || void 0;
}
export function getSourceBaseName(source) {
  if (!source) return void 0;
  const clean2 = source.split(/[?#]/)[0] ?? source;
  return clean2.split(/[/\\]/).pop() || void 0;
}
export function getLightboxDownloadFileName(item) {
  if (!item) return void 0;
  if (item.fileName && hasFileExtension(item.fileName)) return item.fileName;
  const pathName = getSourceBaseName(item.filePath);
  if (pathName && hasFileExtension(pathName)) return pathName;
  const urlName = getSourceBaseName(item.url);
  if (urlName && hasFileExtension(urlName)) return urlName;
  return item.fileName || pathName || urlName;
}
export function getLightboxCopySource(item) {
  if (item?.kind !== "image") return void 0;
  return item.filePath || item.url || void 0;
}
export function isLightboxItemCopyable(item, onCopyImage) {
  return !!getLightboxCopySource(item) && !!onCopyImage;
}
export function isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs) {
  if (!item?.url) return false;
  if (item.filePath && onSaveAs) return true;
  return !!onSaveUrlAs;
}
export function getBatchDownloadableLightboxItems(items) {
  if (!items || items.length === 0) return [];
  const seen = new Set();
  const downloadable = [];
  for (const item of items) {
    const downloadSource = getLightboxDownloadSource(item);
    if (!downloadSource) continue;
    if (seen.has(downloadSource)) continue;
    seen.add(downloadSource);
    downloadable.push({
      ...item,
      downloadSource
    });
  }
  return downloadable;
}
export const lightboxActionButtonClassName = "pointer-events-auto inline-flex h-8 min-w-[8.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--canvas-lightbox-foreground)]/10 bg-[var(--canvas-lightbox-surface)]/55 px-3 text-xs font-normal text-[var(--canvas-lightbox-foreground)]/85 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-[var(--canvas-lightbox-foreground)]/20 hover:bg-[var(--canvas-lightbox-surface)]/70 hover:text-[var(--canvas-lightbox-foreground)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-lightbox-foreground)]/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[var(--canvas-lightbox-foreground)]/10 disabled:hover:bg-[var(--canvas-lightbox-surface)]/55 disabled:hover:text-[var(--canvas-lightbox-foreground)]/85 disabled:active:scale-100";
export function LightboxActionButton({
  label,
  dataActionUiId,
  icon: Icon2,
  iconElement,
  onClick,
  className,
  disabled = false,
  busy = false
}) {
  return <button type="button" data-action-ui-id={dataActionUiId} aria-label={label} aria-busy={busy || void 0} title={label} disabled={disabled} className={cn$5(lightboxActionButtonClassName, className)} onClick={onClick}>
      {iconElement ?? (Icon2 ? <Icon2 size={14} strokeWidth={1.25} aria-hidden={true} /> : null)}
      <span className="whitespace-nowrap">{label}</span>
    </button>;
}
export const CONTEXT_MENU_WIDTH = 176;
export const CONTEXT_MENU_ROW_HEIGHT = 32;
export const CONTEXT_MENU_PADDING = 8;
export const VIEWPORT_MARGIN = 8;
export function useLightboxMediaActions({
  item,
  items
}) {
  const {
    t: t2
  } = useTranslation();
  const {
    onCopyImage,
    onSaveAs,
    onSaveManyAs,
    onSaveUrlAs,
    onShowInFolder
  } = useLightboxMediaActionsBridge();
  const [menuPoint, setMenuPoint] = reactExports.useState(null);
  const canCopy = isLightboxItemCopyable(item, onCopyImage);
  const canSave = isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs);
  const canReveal = !!item?.filePath && !!onShowInFolder;
  const batchDownloadableItems = reactExports.useMemo(() => getBatchDownloadableLightboxItems(items), [items]);
  const canSaveAll = batchDownloadableItems.length > 1 && !!onSaveManyAs;
  const canOpenMenu = canCopy || canSave || canReveal || canSaveAll;
  const handleCopyImage = reactExports.useCallback(() => {
    const source = getLightboxCopySource(item);
    if (!source || !onCopyImage) return;
    onCopyImage(source);
    setMenuPoint(null);
  }, [item, onCopyImage]);
  const handleDownload = reactExports.useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    if (item?.filePath && onSaveAs) {
      onSaveAs(item.filePath, getLightboxDownloadFileName(item));
      return;
    }
    if (item?.url && onSaveUrlAs) {
      onSaveUrlAs(item.url, getLightboxDownloadFileName(item));
    }
  }, [item, onSaveAs, onSaveUrlAs]);
  const handleDownloadAll = reactExports.useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
    onSaveManyAs(batchDownloadableItems.map(candidate => ({
      filePath: candidate.downloadSource,
      fileName: getLightboxDownloadFileName(candidate)
    })));
  }, [batchDownloadableItems, onSaveManyAs]);
  const handleContextMenu = reactExports.useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    if (!canOpenMenu) {
      setMenuPoint(null);
      return;
    }
    const rowCount = Number(canCopy) + Number(canSave) + Number(canSaveAll) + Number(canReveal);
    setMenuPoint(clampMenuPoint(event.clientX, event.clientY, rowCount));
  }, [canOpenMenu, canCopy, canSave, canSaveAll, canReveal]);
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
  const handleShowInFolder = reactExports.useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    handleShowInFolderAction();
  }, [handleShowInFolderAction]);
  const handleSaveAllAs = reactExports.useCallback(() => {
    if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
    onSaveManyAs(batchDownloadableItems.map(candidate => ({
      filePath: candidate.downloadSource,
      fileName: getLightboxDownloadFileName(candidate)
    })));
    setMenuPoint(null);
  }, [batchDownloadableItems, onSaveManyAs]);
  const itemActionKey = `${item?.kind ?? ""}\0${item?.url ?? ""}\0${item?.filePath ?? ""}`;
  reactExports.useEffect(() => {
    setMenuPoint(point2 => point2 && itemActionKey ? null : point2);
  }, [itemActionKey]);
  reactExports.useEffect(() => {
    if (!menuPoint) return;
    const close2 = () => setMenuPoint(null);
    const handleKeyDown2 = event => {
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
    return <LightboxMediaContextMenu x={menuPoint.x} y={menuPoint.y} copyLabel={t2("common.copy")} saveLabel={t2("common.saveAs")} saveAllLabel={t2("canvas.lightbox.downloadAll")} showInFolderLabel={t2(getCanvasFileManagerLabelKey())} canCopy={canCopy} canSave={canSave} canSaveAll={canSaveAll} canReveal={canReveal} onCopy={handleCopyImage} onSaveAs={handleSaveAs} onSaveAllAs={handleSaveAllAs} onShowInFolder={handleShowInFolderAction} />;
  }, [menuPoint, canOpenMenu, t2, canCopy, canSave, canSaveAll, canReveal, handleCopyImage, handleSaveAs, handleSaveAllAs, handleShowInFolderAction]);
  return {
    batchDownloadableItems,
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu
  };
}
export function LightboxMediaContextMenu({
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
  onShowInFolder
}) {
  return reactDomExports.createPortal(<div role="menu" tabIndex={-1} data-action-ui-id="canvas.media-lightbox.context-menu" className="fixed z-[10000] min-w-44 rounded-lg border border-white/10 bg-neutral-950/95 p-1 text-xs text-white/85 shadow-lg" style={{
    left: x2,
    top: y4
  }} onContextMenu={event => {
    event.preventDefault();
    event.stopPropagation();
  }} onMouseDown={event => event.stopPropagation()}>
      {canCopy && <button type="button" data-action-ui-id="canvas.media-lightbox.context-menu.copy" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none" onClick={onCopy}>
          <Copy size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{copyLabel}</span>
        </button>}
      {canSave && <button type="button" data-action-ui-id="canvas.media-lightbox.context-menu.save-as" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none" onClick={onSaveAs}>
          <Download$2 size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveLabel}</span>
        </button>}
      {canSaveAll && <button type="button" data-action-ui-id="canvas.media-lightbox.context-menu.save-all-as" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none" onClick={onSaveAllAs}>
          <Archive size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveAllLabel}</span>
        </button>}
      {canReveal && <button type="button" data-action-ui-id="canvas.media-lightbox.context-menu.show-in-folder" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none" onClick={onShowInFolder}>
          <FolderOpen size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{showInFolderLabel}</span>
        </button>}
    </div>, document.body);
}
export function clampMenuPoint(x2, y4, rowCount) {
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const width = CONTEXT_MENU_WIDTH;
  const height = rowCount * CONTEXT_MENU_ROW_HEIGHT + CONTEXT_MENU_PADDING;
  const maxX = Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, viewportHeight - height - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(x2, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(y4, VIEWPORT_MARGIN), maxY)
  };
}
export const AudioLightbox = reactExports.memo(function AudioLightbox2({
  src,
  name: name2,
  lyrics,
  onClose,
  item
}) {
  const {
    t: t2
  } = useTranslation();
  const current2 = item ?? normalizeLegacyLightboxItems("audio", void 0, void 0, void 0, src)[0];
  const downloadLabel = t2("canvas.lightbox.downloadCurrent");
  const {
    canSave,
    canReveal,
    handleShowInFolder,
    handleDownload,
    handleContextMenu,
    contextMenu
  } = useLightboxMediaActions({
    item: current2
  });
  if (!current2?.url) return null;
  return <MediaLightbox$1 onClose={onClose} onContextMenu={handleContextMenu}>
      <div className="flex flex-col items-center gap-4 cursor-default" onClick={e2 => e2.stopPropagation()}>
        {name2 && <span className="text-sm font-medium text-white/80 max-w-[60vw] truncate">{name2}</span>}
        {lyrics && <div className="w-[min(480px,80vw)] max-h-[50vh] overflow-y-auto rounded-md border border-white/10 bg-white/5 px-4 py-3">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/85">{lyrics}</pre>
          </div>}
        <audio src={current2.url} className="w-[min(480px,80vw)]" controls={true} autoPlay={true} />
      </div>
      {contextMenu}
      {(canSave || canReveal) && <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 pointer-events-auto">
          {canReveal && <LightboxActionButton label={t2("canvas.lightbox.showInFolder")} icon={FolderOpen} dataActionUiId="canvas.audio-lightbox.show-in-folder" onClick={handleShowInFolder} />}
          {canSave && <LightboxActionButton label={downloadLabel} icon={Download$2} dataActionUiId="canvas.audio-lightbox.download" onClick={handleDownload} />}
        </div>}
    </MediaLightbox$1>;
});