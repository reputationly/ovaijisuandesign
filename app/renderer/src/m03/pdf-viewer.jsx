// pdf-viewer.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useCanvasBridge,
  useCanvasActions,
  reactExports,
  useAssetMeta,
  useCanvasIsMultiSelect,
  useCanvasIsBoxSelecting,
  TooltipProvider$1,
  NodeResizeFrame,
  Position,
  FileTypeIcon,
  classifyFileType,
  useHtmlFullscreenApi,
  useFileUrl,
  usePluginMeta,
  pickLocalized,
  useHtmlViewerHandle,
  usePluginRunInfo,
  useViewerActive,
  CompositedSvg,
  useIsHtmlFullscreen,
  useFileBytes,
  __webpack_exports__,
  __webpack_exports__getDocument,
  pickViewerKind,
  useWorkspaceContentBudgetScope,
  HTML_VIEWER_UNLOAD_AFTER_MS,
  ACTIVE_GATED_VIEWER_KINDS,
  useWorkspaceFileViewerAdmission,
  useNodeRename,
  FILE_CARD_DEFAULT_SIZE,
} from "../vendor.js";
import {
  useCanvasNodeIsDragging,
  AddToChatIcon,
  FullscreenIcon$1,
  RunIcon,
  PluginIcon$1,
  RefreshIcon,
  MinimizeIcon,
  RenameIcon,
  formatFileSize,
  getFileExtension,
  CardViewIcon,
  PreviewViewIcon,
  VisibleIcon,
  areNodePropsEqual,
} from "../m01/generating-media-area.jsx";
import { FILE_PREVIEW_SIZE, FILE_PREVIEW_MIN_SIZE } from "../m01/prune-persisted-node-data.js";
import {
  CLIP_STUDIO_PLUGIN_ID,
  DIRECTOR_STAGE_PLUGIN_ID,
  COMFYUI_PLUGIN_ID$1,
  isPluginEditorSurface,
  shouldShowPluginNodeSourceAffordance,
  PANORAMA_VIEWER_PLUGIN_ID,
} from "../m02/canvas-image.jsx";
import { NodeToolbar, isCloneData } from "../m01/use-lightbox-media-actions.jsx";
import { useAddToChat, NodeShell, NodeBody } from "../m01/use-media-node-actions.jsx";
import {
  NodeHeader,
  NodeHandles,
  useInlineRename,
  NodeQuickTagTrigger,
} from "../m01/use-inline-rename.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { renderAsync } from "docx-preview";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ComfyUiPluginLauncher,
  DirectorStageHeaderIcon,
  VideoEditorHeaderIcon,
} from "./comfy-ui-plugin-launcher.jsx";
import { PanoramaNode } from "./panorama-node.jsx";
import {
  CodeViewer,
  JSZip,
  PluginLauncher,
  UnpreviewableViewer,
  VIEWER_SIZE_LIMITS,
} from "./plugin-launcher.jsx";
import { HtmlViewer, ViewerError, ViewerLoading } from "./use-plugin-host.jsx";
function DocxViewer({ filePath, interactive, displayName: displayName2, sizeLabel }) {
  const bytes2 = useFileBytes(filePath, VIEWER_SIZE_LIMITS.docx, {
    revalidate: true,
  });
  const bodyRef = reactExports.useRef(null);
  const styleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (bytes2.status !== "success" || !bytes2.bytes) return;
    if (!bodyRef.current || !styleRef.current) return;
    let cancelled = false;
    const body2 = bodyRef.current;
    const styleHost = styleRef.current;
    const nextBody = document.createElement("div");
    const nextStyle = document.createElement("div");
    const data2 = bytes2.bytes.slice(0);
    renderAsync(new Blob([data2]), nextBody, nextStyle, {
      className: "hilo-docx",
      inWrapper: true,
      breakPages: true,
      ignoreWidth: false,
      ignoreHeight: false,
      experimental: false,
    })
      .then(() => {
        if (cancelled) return;
        body2.replaceChildren(...nextBody.childNodes);
        styleHost.replaceChildren(...nextStyle.childNodes);
      })
      .catch(() => {
        if (cancelled) return;
        body2.replaceChildren();
        styleHost.replaceChildren();
      });
    return () => {
      cancelled = true;
      body2.replaceChildren();
      styleHost.replaceChildren();
    };
  }, [bytes2.status, bytes2.bytes]);
  if (bytes2.status === "loading") return <ViewerLoading />;
  if (bytes2.status === "error") {
    if (bytes2.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".docx"
          displayName={displayName2 ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes2.errorKey} />;
  }
  return (
    <div
      className={`${interactive ? "nowheel " : ""}h-full w-full overflow-auto bg-muted px-4 py-3`}
    >
      <div ref={styleRef} aria-hidden="true" className="hidden" />
      <div ref={bodyRef} className="hilo-docx-body mx-auto bg-background shadow-sm" />
    </div>
  );
}
function ImageViewer({ filePath, displayName: displayName2 }) {
  const url2 = useFileUrl(filePath, {
    versionScope: "path",
  });
  const [result, setResult] = reactExports.useState(null);
  const status = result && result.url === url2 ? result.status : "loading";
  if (!url2) return <ViewerLoading />;
  if (status === "error") return <ViewerError />;
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted">
      {status === "loading" ? (
        <div className="absolute inset-0">
          <ViewerLoading />
        </div>
      ) : null}
      <img
        src={url2}
        alt={displayName2}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() =>
          setResult({
            url: url2,
            status: "ready",
          })
        }
        onError={() =>
          setResult({
            url: url2,
            status: "error",
          })
        }
        className={`max-h-full max-w-full select-none object-contain transition-opacity duration-150 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
var __webpack_exports__GlobalWorkerOptions = __webpack_exports__.GlobalWorkerOptions;
const pdfWorkerUrl = "" + new URL("pdf.worker.min-yatZIOMy.mjs", import.meta.url).href;
__webpack_exports__GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
function PdfViewer({ filePath, paneWidth, interactive, displayName: displayName2, sizeLabel }) {
  const { t: t2 } = useTranslation();
  const bytes2 = useFileBytes(filePath, VIEWER_SIZE_LIMITS.pdf, {
    revalidate: true,
  });
  const canvasRef = reactExports.useRef(null);
  const [doc2, setDoc] = reactExports.useState(null);
  const pageCount = doc2?.numPages ?? 0;
  const [pageIndex, setPageIndex] = reactExports.useState(0);
  const [renderError, setRenderError] = reactExports.useState(null);
  const pageFilePathRef = reactExports.useRef(filePath);
  reactExports.useEffect(() => {
    if (pageFilePathRef.current !== filePath) {
      pageFilePathRef.current = filePath;
      setPageIndex(0);
    }
  }, [filePath]);
  reactExports.useEffect(() => {
    setDoc(null);
    if (bytes2.status !== "success" || !bytes2.bytes) return;
    let cancelled = false;
    setRenderError(null);
    const data2 = bytes2.bytes.slice(0);
    const task = __webpack_exports__getDocument({
      data: data2,
    });
    task.promise
      .then((doc22) => {
        if (cancelled) {
          doc22.destroy();
          return;
        }
        setDoc(doc22);
        setPageIndex((index2) => Math.min(index2, Math.max(0, doc22.numPages - 1)));
      })
      .catch(() => {
        if (!cancelled) setRenderError("canvas.file.viewer.loadFailed");
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [bytes2.status, bytes2.bytes]);
  reactExports.useEffect(() => {
    if (bytes2.status !== "success" || !doc2 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let renderTask = null;
    doc2
      .getPage(pageIndex + 1)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({
          scale: 1,
        });
        const padding = 16;
        const targetWidth = Math.max(paneWidth - padding * 2, 100);
        const scale2 = targetWidth / viewport.width;
        const dpr = window.devicePixelRatio || 1;
        const scaled = page.getViewport({
          scale: scale2 * dpr,
        });
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        canvas.style.width = `${scaled.width / dpr}px`;
        canvas.style.height = `${scaled.height / dpr}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        renderTask = page.render({
          canvasContext: ctx,
          viewport: scaled,
        });
        return renderTask.promise;
      })
      .catch((err) => {
        if (cancelled) return;
        if (err && typeof err === "object" && err.name === "RenderingCancelledException") return;
        setRenderError("canvas.file.viewer.loadFailed");
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc2, bytes2.status, pageIndex, paneWidth]);
  if (bytes2.status === "loading") return <ViewerLoading />;
  if (bytes2.status === "error") {
    if (bytes2.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".pdf"
          displayName={displayName2 ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes2.errorKey} />;
  }
  if (renderError) return <ViewerError messageKey={renderError} />;
  const goPrev = () => setPageIndex((i2) => Math.max(0, i2 - 1));
  const goNext = () => setPageIndex((i2) => Math.min(pageCount - 1, i2 + 1));
  return (
    <div className="flex h-full w-full flex-col bg-muted">
      <div className={`${interactive ? "nowheel " : ""}flex-1 overflow-auto`}>
        <div className="flex w-full justify-center px-4 py-3">
          <canvas ref={canvasRef} className="bg-background shadow-sm" />
        </div>
      </div>
      {pageCount > 1 ? (
        <div className="flex h-9 shrink-0 items-center justify-center gap-3 border-border border-t bg-background px-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={goPrev}
            onMouseDown={(e2) => e2.stopPropagation()}
            disabled={pageIndex === 0}
            className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            aria-label={t2("canvas.file.viewer.prevPage", "上一页")}
            data-action-ui-id="canvas.file-node.pdf-prev-page"
          >
            {t2("canvas.file.viewer.prevPage", "上一页")}
          </button>
          <span>
            {pageIndex + 1}
            {" / "}
            {pageCount}
          </span>
          <button
            type="button"
            onClick={goNext}
            onMouseDown={(e2) => e2.stopPropagation()}
            disabled={pageIndex >= pageCount - 1}
            className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            aria-label={t2("canvas.file.viewer.nextPage", "下一页")}
            data-action-ui-id="canvas.file-node.pdf-next-page"
          >
            {t2("canvas.file.viewer.nextPage", "下一页")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
const SAVE_DEBOUNCE_MS = 500;
function SrtEditor({ filePath, interactive, displayName: displayName2, sizeLabel }) {
  const { t: t2 } = useTranslation();
  const { saveTextContent } = useCanvasBridge();
  const bytesState = useFileBytes(filePath, VIEWER_SIZE_LIMITS.code, {
    revalidate: true,
  });
  const [content2, setContent2] = reactExports.useState(null);
  const persistedRef = reactExports.useRef(null);
  const saveTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (bytesState.status !== "success" || !bytesState.bytes) return;
    const text2 = new TextDecoder("utf-8").decode(bytesState.bytes);
    setContent2(text2);
    persistedRef.current = text2;
  }, [bytesState.status, bytesState.bytes]);
  reactExports.useEffect(() => {
    setContent2(null);
    persistedRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [filePath]);
  const flushSave = reactExports.useCallback(
    (next2) => {
      if (!saveTextContent) return;
      if (next2 === persistedRef.current) return;
      saveTextContent(filePath, next2)
        .then(() => {
          persistedRef.current = next2;
        })
        .catch(() => {});
    },
    [filePath, saveTextContent],
  );
  reactExports.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        if (content2 !== null) flushSave(content2);
      }
    };
  }, []);
  const handleChange = reactExports.useCallback(
    (e2) => {
      const next2 = e2.target.value;
      setContent2(next2);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        flushSave(next2);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );
  if (bytesState.status === "loading" || (bytesState.status === "success" && content2 === null)) {
    return <ViewerLoading />;
  }
  if (bytesState.status === "error") {
    if (bytesState.errorKey === "canvas.file.viewer.tooLarge") {
      const ext = filePath.toLowerCase().endsWith(".ass") ? ".ass" : ".srt";
      return (
        <UnpreviewableViewer
          extension={ext}
          displayName={displayName2 ?? filePath}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytesState.errorKey} />;
  }
  return (
    <textarea
      className={interactive ? "nowheel h-full w-full resize-none" : "h-full w-full resize-none"}
      style={{
        background: "var(--canvas-node-bg, #fff)",
        color: "var(--canvas-node-text, currentColor)",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        lineHeight: 1.6,
        padding: "12px 16px",
        border: "none",
        outline: "none",
        whiteSpace: "pre",
      }}
      value={content2 ?? ""}
      onChange={handleChange}
      onPointerDown={(e2) => e2.stopPropagation()}
      onKeyDown={(e2) => e2.stopPropagation()}
      spellCheck={false}
      placeholder={t2("canvas.file.viewer.srt.placeholder", "字幕内容（SRT / ASS 格式）")}
    />
  );
}
function formatSize(bytes2) {
  if (!Number.isFinite(bytes2) || bytes2 < 0) return "";
  if (bytes2 < 1024) return `${bytes2} B`;
  const kb = bytes2 / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function buildTree$1(entries2) {
  const root2 = {
    children: [],
  };
  for (const entry of entries2) {
    const cleanPath2 = entry.isFolder ? entry.path.replace(/\/$/, "") : entry.path;
    if (!cleanPath2) continue;
    const parts = cleanPath2.split("/");
    let cursor = root2;
    for (let i2 = 0; i2 < parts.length; i2++) {
      const part = parts[i2];
      const isLast = i2 === parts.length - 1;
      const isLeafFolder = isLast && entry.isFolder;
      const isLeafFile = isLast && !entry.isFolder;
      let next2 = cursor.children.find((n2) => n2.name === part);
      if (!next2) {
        next2 = {
          name: part,
          path: parts.slice(0, i2 + 1).join("/"),
          isFolder: !isLeafFile,
          size: isLeafFile ? entry.size : 0,
          children: [],
        };
        cursor.children.push(next2);
      } else if (isLeafFolder) {
        next2.isFolder = true;
      } else if (isLeafFile) {
        next2.isFolder = false;
        next2.size = entry.size;
      }
      cursor = next2;
    }
  }
  const sortNodes = (nodes) => {
    nodes.sort((a2, b3) => {
      if (a2.isFolder !== b3.isFolder) return a2.isFolder ? -1 : 1;
      return a2.name.localeCompare(b3.name, void 0, {
        sensitivity: "base",
      });
    });
    for (const n2 of nodes) if (n2.isFolder) sortNodes(n2.children);
  };
  sortNodes(root2.children);
  return root2.children;
}
function FolderGlyph() {
  return (
    <CompositedSvg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted-foreground"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </CompositedSvg>
  );
}
function ChevronGlyph({ open }) {
  return (
    <CompositedSvg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 6 6 6-6 6" />
    </CompositedSvg>
  );
}
function EntryRow({ node: node2, depth: depth2, isOpen, onToggle }) {
  const sizeLabel = node2.isFolder ? "" : formatSize(node2.size);
  const handleClick2 = reactExports.useCallback(() => {
    if (node2.isFolder) onToggle(node2.path);
  }, [node2.isFolder, node2.path, onToggle]);
  const Wrapper2 = node2.isFolder ? "button" : "div";
  const wrapperProps = node2.isFolder
    ? {
        type: "button",
        onClick: handleClick2,
        onMouseDown: (e2) => e2.stopPropagation(),
        "data-action-ui-id": "canvas.file-node.zip-folder-toggle",
      }
    : {};
  return (
    <Wrapper2
      {...wrapperProps}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground"
      style={{
        paddingLeft: `${12 + depth2 * 16}px`,
      }}
    >
      {node2.isFolder ? <ChevronGlyph open={isOpen} /> : <span className="w-3 shrink-0" />}
      {node2.isFolder ? (
        <FolderGlyph />
      ) : (
        <FileTypeIcon
          {...classifyFileType({
            filename: node2.name,
          })}
          size={24}
          decorative={true}
        />
      )}
      <span className="flex-1 truncate" title={node2.name}>
        {node2.name}
      </span>
      {sizeLabel ? (
        <span className="shrink-0 text-muted-foreground tabular-nums">{sizeLabel}</span>
      ) : null}
    </Wrapper2>
  );
}
function TreeBranch({ nodes, depth: depth2, openSet, onToggle }) {
  return (
    <>
      {nodes.map((node2) => (
        <div key={node2.path}>
          <EntryRow
            node={node2}
            depth={depth2}
            isOpen={openSet.has(node2.path)}
            onToggle={onToggle}
          />
          {node2.isFolder && openSet.has(node2.path) && node2.children.length > 0 ? (
            <TreeBranch
              nodes={node2.children}
              depth={depth2 + 1}
              openSet={openSet}
              onToggle={onToggle}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}
function ZipViewer({ filePath, interactive, displayName: displayName2, sizeLabel }) {
  const { t: t2 } = useTranslation();
  const bytes2 = useFileBytes(filePath, VIEWER_SIZE_LIMITS.zip, {
    revalidate: true,
  });
  const [tree, setTree] = reactExports.useState(null);
  const [parseError, setParseError] = reactExports.useState(false);
  const [openSet, setOpenSet] = reactExports.useState(() => new Set());
  reactExports.useEffect(() => {
    if (bytes2.status !== "success" || !bytes2.bytes) return;
    let cancelled = false;
    setParseError(false);
    setTree(null);
    JSZip.loadAsync(bytes2.bytes)
      .then((zip) => {
        if (cancelled) return;
        const raw2 = [];
        zip.forEach((relPath, file) => {
          const internal2 = file;
          const size2 = internal2._data?.uncompressedSize ?? 0;
          raw2.push({
            path: relPath,
            isFolder: file.dir,
            size: size2,
          });
        });
        const built = buildTree$1(raw2);
        setTree(built);
        const initial = new Set();
        for (const node2 of built) if (node2.isFolder) initial.add(node2.path);
        setOpenSet(initial);
      })
      .catch(() => {
        if (!cancelled) setParseError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bytes2.status, bytes2.bytes]);
  const handleToggle = reactExports.useCallback((path2) => {
    setOpenSet((prev) => {
      const next2 = new Set(prev);
      if (next2.has(path2)) next2.delete(path2);
      else next2.add(path2);
      return next2;
    });
  }, []);
  if (bytes2.status === "loading") return <ViewerLoading />;
  if (bytes2.status === "error") {
    if (bytes2.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".zip"
          displayName={displayName2 ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes2.errorKey} />;
  }
  if (parseError) return <ViewerError messageKey="canvas.file.viewer.loadFailed" />;
  if (!tree) return <ViewerLoading />;
  const totalEntries = countLeaves(tree);
  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex h-8 shrink-0 items-center gap-2 border-border border-b bg-muted px-3 text-[11px] font-medium text-muted-foreground">
        <span className="flex-1">
          {t2("canvas.file.viewer.zipName", "名称")}
          <span className="ml-2 text-muted-foreground/70">
            (
            {t2("canvas.file.viewer.zipEntryCount", "{{count}} 项", {
              count: totalEntries,
            })}
            )
          </span>
        </span>
        <span className="shrink-0">{t2("canvas.file.viewer.zipSize", "大小")}</span>
      </div>
      <div className={`${interactive ? "nowheel " : ""}flex-1 overflow-auto`}>
        <TreeBranch nodes={tree} depth={0} openSet={openSet} onToggle={handleToggle} />
      </div>
    </div>
  );
}
function countLeaves(nodes) {
  let n2 = 0;
  for (const node2 of nodes) {
    if (node2.isFolder) n2 += countLeaves(node2.children);
    else n2 += 1;
  }
  return n2;
}
function FileViewerRouter({
  filePath,
  extension: extension2,
  displayName: displayName2,
  sizeLabel,
  paneWidth,
  interactive,
}) {
  const kind = pickViewerKind(extension2);
  const workspaceId2 = useWorkspaceContentBudgetScope();
  const [setHostEl, active2] = useViewerActive({
    unloadAfterMs: kind === "html" ? HTML_VIEWER_UNLOAD_AFTER_MS : void 0,
  });
  const activeGated = ACTIVE_GATED_VIEWER_KINDS.has(kind);
  const viewerActive = activeGated ? active2 : true;
  const admission = useWorkspaceFileViewerAdmission({
    kind,
    filePath,
    workspaceId: workspaceId2,
    active: viewerActive,
  });
  if (!filePath || kind === "none") {
    return (
      <UnpreviewableViewer
        extension={extension2}
        displayName={displayName2}
        sizeLabel={sizeLabel}
        reason="unsupported"
      />
    );
  }
  if (!viewerActive) {
    return (
      <div ref={setHostEl} className="h-full w-full">
        <ViewerLoading />
      </div>
    );
  }
  if (!admission.admitted) {
    return (
      <div ref={setHostEl} className="h-full w-full">
        <UnpreviewableViewer
          extension={extension2}
          displayName={displayName2}
          sizeLabel={sizeLabel}
          reason={admission.overLimit ? "resourceLimit" : "unsupported"}
        />
      </div>
    );
  }
  let viewer;
  if (kind === "image") {
    viewer = <ImageViewer filePath={filePath} displayName={displayName2} />;
  } else if (kind === "pdf") {
    viewer = (
      <PdfViewer
        filePath={filePath}
        paneWidth={paneWidth}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "docx") {
    viewer = (
      <DocxViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "zip") {
    viewer = (
      <ZipViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "html") {
    viewer = (
      <HtmlViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "srt") {
    viewer = (
      <SrtEditor
        filePath={filePath}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  } else {
    viewer = (
      <CodeViewer
        filePath={filePath}
        extension={extension2}
        interactive={interactive}
        displayName={displayName2}
        sizeLabel={sizeLabel}
      />
    );
  }
  if (!activeGated) return viewer;
  return (
    <div ref={setHostEl} className="h-full w-full">
      {viewer}
    </div>
  );
}
function PluginPreview({
  selected: selected2,
  interactive,
  filePath,
  pluginId,
  displayName: displayName2,
  extension: extension2,
  width,
  height,
}) {
  const paneWidth = width - 2;
  const { i18n } = useTranslation();
  const meta2 = usePluginMeta(pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh") ? "zh-CN" : rawLang.startsWith("en") ? "en-US" : rawLang;
  const localizedName = meta2 ? pickLocalized(meta2.name, locale) : "";
  const headerName = localizedName || displayName2;
  const iconUrl = meta2 ? pickLocalized(meta2.iconUrl, locale) : "";
  const [iconBroken, setIconBroken] = reactExports.useState(false);
  const showIcon = !!iconUrl && !iconBroken;
  return (
    <NodeBody width={width} height={height} selected={selected2} variant="media">
      <div
        className="flex h-full flex-col overflow-hidden rounded-lg"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
        }}
      >
        <div className="flex items-center justify-between gap-2 border-[var(--canvas-node-border)] border-b px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
              {showIcon ? (
                // Manifest-supplied icon. `referrerPolicy="no-referrer"`
                // keeps relative `/api/plugins/<id>/static/...` requests
                // out of the gateway log noise; `draggable=false` prevents
                // the iframe-host area from receiving an accidental
                // image-drag while the user pans the canvas.
                <img
                  src={iconUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  onError={() => setIconBroken(true)}
                />
              ) : (
                <PluginIcon$1 />
              )}
            </div>
            <div className="truncate text-xs text-foreground" title={headerName}>
              {headerName}
            </div>
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            <CompositedSvg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="19" cy="5" r="1" />
              <circle cx="5" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
              <circle cx="19" cy="19" r="1" />
              <circle cx="5" cy="19" r="1" />
            </CompositedSvg>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewerRouter
            filePath={filePath}
            extension={extension2}
            displayName={displayName2}
            paneWidth={paneWidth}
            interactive={interactive}
          />
        </div>
      </div>
    </NodeBody>
  );
}
function PluginNodeInner({ id: id2, data: data2, selected: selected2, width, height }) {
  const { i18n, t: t2 } = useTranslation();
  const meta2 = useAssetMeta(id2);
  const persisted = data2;
  const { onPluginAction } = useCanvasBridge();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0 ? height : FILE_PREVIEW_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setPreviewWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setPreviewHeight(height);
  }, [height]);
  const filePath = meta2?.path ?? persisted?.path;
  const displayName2 =
    meta2?.name ||
    persisted?.name ||
    filePath?.split("/").pop() ||
    t2("canvas.file.untitled", "Untitled");
  const extension2 = ".html";
  const pluginMeta = usePluginMeta(persisted?.pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh") ? "zh-CN" : rawLang.startsWith("en") ? "en-US" : rawLang;
  const savedName = meta2?.name || persisted?.name;
  const isCustomName =
    savedName && pluginMeta && !Object.values(pluginMeta.name).includes(savedName);
  const headerName = (!isCustomName && pickLocalized(pluginMeta?.name, locale)) || displayName2;
  const displayMode = pluginMeta?.displayMode ?? persisted?.pluginDisplayMode ?? "inline";
  const isLauncher = displayMode === "launcher";
  const isComfyUi = persisted?.pluginId === COMFYUI_PLUGIN_ID$1;
  const isEditorSurface = isLauncher && isPluginEditorSurface(pluginMeta?.agent);
  const runInfo = usePluginRunInfo(id2);
  const htmlViewerHandle = useHtmlViewerHandle(id2);
  const isHtmlFullscreen = useIsHtmlFullscreen(id2);
  const fullscreenApi = useHtmlFullscreenApi();
  const reportPluginAction = reactExports.useCallback(
    (action, state2, runPath) => {
      if (!persisted.pluginId) return;
      onPluginAction?.({
        pluginId: persisted.pluginId,
        pluginVersion: persisted.pluginVersion,
        pluginInstanceId: id2,
        action,
        ...(state2
          ? {
              state: state2,
            }
          : {}),
        ...(runPath
          ? {
              runPath,
            }
          : {}),
      });
    },
    [id2, onPluginAction, persisted.pluginId, persisted.pluginVersion],
  );
  const enterHtmlFullscreen = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    fullscreenApi.getState().enter(id2);
    reportPluginAction("fullscreen", "enter");
  }, [id2, fullscreenApi, htmlViewerHandle, reportPluginAction]);
  const exitHtmlFullscreen = reactExports.useCallback(() => {
    fullscreenApi.getState().exit(id2);
    reportPluginAction("fullscreen", "exit");
  }, [id2, fullscreenApi, reportPluginAction]);
  const refreshPlugin = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    htmlViewerHandle.reload();
    reportPluginAction("refresh");
  }, [htmlViewerHandle, reportPluginAction]);
  const runPlugin = reactExports.useCallback(() => {
    if (!runInfo?.hasMain) return;
    runInfo.invoke();
    reportPluginAction("run");
  }, [reportPluginAction, runInfo]);
  const toolbarItems = [
    // Launcher mode has no persistent inline iframe — refresh / fullscreen
    // toggles would act on a viewer that only exists while the overlay is
    // open, so they are omitted; the card owns its fullscreen/template
    // entry points. (htmlViewerHandle is normally absent here anyway; the
    // explicit gate covers the grace window where the hidden iframe is
    // still registered.)
    ...(htmlViewerHandle && !isLauncher
      ? [
          {
            id: "refresh",
            label: t2("canvas.file.refresh", "刷新"),
            icon: <RefreshIcon />,
            onClick: refreshPlugin,
            dataActionUiId: "canvas.plugin-node.refresh",
          },
          {
            id: "fullscreen",
            label: isHtmlFullscreen
              ? t2("canvas.file.exitFullscreen", "退出全屏")
              : t2("canvas.file.enterFullscreen", "全屏预览"),
            icon: isHtmlFullscreen ? <MinimizeIcon /> : <FullscreenIcon$1 />,
            onClick: isHtmlFullscreen ? exitHtmlFullscreen : enterHtmlFullscreen,
            active: isHtmlFullscreen,
            dataActionUiId: "canvas.plugin-node.fullscreen",
          },
        ]
      : []),
    ...(runInfo?.hasMain && !isLauncher
      ? [
          {
            id: "run",
            label: t2("canvas.file.run", "执行"),
            icon: <RunIcon />,
            onClick: runPlugin,
            dataActionUiId: "canvas.plugin-node.run",
          },
        ]
      : []),
  ];
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const isPreviewInteractive = !!selected2 && isInteractiveSelect;
  const handlePreviewResize = reactExports.useCallback((newW, newH) => {
    setPreviewWidth(newW);
    setPreviewHeight(newH);
  }, []);
  const handleDoubleClick2 = reactExports.useCallback(() => {
    if (isLauncher) {
      fullscreenApi.getState().enter(id2);
      reportPluginAction("fullscreen", "enter");
    }
  }, [isLauncher, fullscreenApi, id2, reportPluginAction]);
  return (
    <NodeShell width={previewWidth} onDoubleClick={isLauncher ? handleDoubleClick2 : void 0}>
      <NodeHeader
        nodeType="file"
        name={headerName}
        maxWidth={previewWidth}
        selected={selected2}
        icon={
          persisted.pluginId === DIRECTOR_STAGE_PLUGIN_ID ? (
            <DirectorStageHeaderIcon />
          ) : persisted.pluginId === CLIP_STUDIO_PLUGIN_ID ? (
            <VideoEditorHeaderIcon />
          ) : (
            void 0
          )
        }
      />
      {isLauncher ? (
        isComfyUi ? (
          <ComfyUiPluginLauncher
            nodeId={id2}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName2}
            width={previewWidth}
            height={previewHeight}
            selected={!!selected2}
            currentWorkflowId={persisted.currentWorkflowId}
            currentWorkflowName={persisted.currentWorkflowName}
            templateCopyOrdinal={persisted.comfyuiTemplateCopyOrdinal}
            workflowRevision={persisted.comfyuiWorkflowRevision}
            hasWorkflowContent={persisted.hasWorkflowContent}
            comfyuiBackendReady={persisted.comfyuiBackendReady}
            comfyuiWorkflowError={persisted.comfyuiWorkflowError}
            comfyuiWorkflowDeleted={persisted.comfyuiWorkflowDeleted}
            comfyuiDeletedWorkflowName={persisted.comfyuiDeletedWorkflowName}
            comfyuiRunSummary={persisted.comfyuiRunSummary}
            onReportAction={reportPluginAction}
          />
        ) : (
          <PluginLauncher
            nodeId={id2}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName2}
            width={previewWidth}
            height={previewHeight}
            selected={!!selected2}
            onReportAction={reportPluginAction}
            editorSurface={isEditorSurface}
          />
        )
      ) : (
        <PluginPreview
          selected={selected2}
          interactive={isPreviewInteractive}
          filePath={filePath}
          {...(persisted?.pluginId
            ? {
                pluginId: persisted.pluginId,
              }
            : {})}
          displayName={displayName2}
          extension={extension2}
          width={previewWidth}
          height={previewHeight}
        />
      )}
      {selected2 && isInteractiveSelect && toolbarItems.length > 0 && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          onResize={handlePreviewResize}
        />
      )}
      <NodeHandles
        nodeId={id2}
        selected={!!selected2}
        showSourceAffordance={shouldShowPluginNodeSourceAffordance(persisted?.pluginId)}
        sourcePosition={Position.Left}
      />
    </NodeShell>
  );
}
function FilePreview$1({
  selected: selected2,
  interactive,
  filePath,
  displayName: displayName2,
  tagIds,
  sizeLabel,
  extension: extension2,
  displayFileOnly,
  width,
  height,
  onShowCardView,
  onRename,
}) {
  const { t: t2 } = useTranslation();
  const paneWidth = width - 2;
  const rename = useInlineRename({
    currentValue: displayName2,
    onCommit: onRename,
    preserveExtension: true,
  });
  return (
    <NodeBody width={width} height={height} selected={selected2} tagIds={tagIds} variant="media">
      <div
        className="flex h-full flex-col"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
        }}
      >
        <div
          hidden={displayFileOnly}
          className="flex items-center justify-between gap-2 border-[var(--canvas-node-border)] border-b px-4 py-2"
        >
          <div className="flex min-w-0 flex-shrink items-center gap-2">
            <FileTypeIcon
              {...classifyFileType({
                filename: displayName2,
              })}
              size={24}
              decorative={true}
            />
            {rename.editing ? (
              <input
                ref={rename.inputRef}
                className="nodrag min-w-0 flex-1 truncate border-[var(--canvas-node-border)] [border-bottom-width:var(--control-border-width)] bg-transparent text-xs text-foreground outline-none focus:border-[var(--canvas-node-border-selected,#141414)]"
                value={rename.editValue}
                onChange={(e2) => rename.setEditValue(e2.target.value)}
                onBlur={rename.commit}
                onKeyDown={rename.onKeyDown}
                onMouseDown={(e2) => e2.stopPropagation()}
                onClick={(e2) => e2.stopPropagation()}
                onDoubleClick={(e2) => e2.stopPropagation()}
              />
            ) : (
              <div className="min-w-0 truncate text-xs text-foreground" title={rename.displayValue}>
                {rename.displayValue}
              </div>
            )}
            <TooltipProvider$1 delay={300} closeDelay={0}>
              {onRename && !rename.editing ? (
                <Tooltip$1 content={t2("canvas.file.rename", "重命名")}>
                  <button
                    type="button"
                    aria-label={t2("canvas.file.rename", "重命名")}
                    onClick={(e2) => {
                      e2.stopPropagation();
                      rename.beginEdit();
                    }}
                    onMouseDown={(e2) => e2.stopPropagation()}
                    onDoubleClick={(e2) => e2.stopPropagation()}
                    className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    data-action-ui-id="canvas.file-node.rename-from-preview"
                  >
                    <RenameIcon />
                  </button>
                </Tooltip$1>
              ) : null}
            </TooltipProvider$1>
          </div>
          <TooltipProvider$1 delay={300} closeDelay={0}>
            <div className="flex shrink-0 items-center">
              <Tooltip$1 content={t2("canvas.file.cardView", "卡片视图")}>
                <button
                  type="button"
                  aria-label={t2("canvas.file.cardView", "卡片视图")}
                  onClick={(e2) => {
                    e2.stopPropagation();
                    onShowCardView();
                  }}
                  onMouseDown={(e2) => e2.stopPropagation()}
                  onDoubleClick={(e2) => e2.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  data-action-ui-id="canvas.file-node.view-card-from-preview"
                >
                  <MinimizeIcon />
                </button>
              </Tooltip$1>
            </div>
          </TooltipProvider$1>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewerRouter
            filePath={filePath}
            extension={extension2}
            displayName={displayName2}
            sizeLabel={sizeLabel}
            paneWidth={paneWidth}
            interactive={interactive}
          />
        </div>
      </div>
    </NodeBody>
  );
}
function resolveDisplayFileOnly(data2) {
  return data2?.displayFileOnly === true;
}
function FileNodeImpl({ id: id2, data: data2, selected: selected2, width, height }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMeta(id2);
  const persisted = data2;
  const { onAddToChat } = useCanvasBridge();
  const { updateNodeDataAndResize } = useCanvasActions();
  const onRename = useNodeRename(id2, isCloneData(data2));
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const viewMode = persisted?.viewMode === "preview" ? "preview" : "card";
  const isPreview = viewMode === "preview";
  const displayFileOnly = resolveDisplayFileOnly(persisted);
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0 ? height : FILE_PREVIEW_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (!isPreview) return;
    if (typeof width === "number" && width > 0) setPreviewWidth(width);
  }, [width, isPreview]);
  reactExports.useEffect(() => {
    if (!isPreview) return;
    if (typeof height === "number" && height > 0) setPreviewHeight(height);
  }, [height, isPreview]);
  const filePath = meta2?.path ?? persisted?.path;
  const displayName2 =
    meta2?.name ||
    persisted?.name ||
    filePath?.split("/").pop() ||
    t2("canvas.file.untitled", "Untitled");
  const sizeLabel = formatFileSize(meta2?.fileSize ?? persisted?.fileSize);
  const extension2 = getFileExtension(filePath?.split("/").pop()) ?? getFileExtension(displayName2);
  const handleAddToChat = useAddToChat(id2, meta2, onAddToChat, filePath);
  const runInfo = usePluginRunInfo(id2);
  const htmlViewerHandle = useHtmlViewerHandle(id2);
  const isHtmlFullscreen = useIsHtmlFullscreen(id2);
  const fullscreenApi = useHtmlFullscreenApi();
  const enterHtmlFullscreen = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    fullscreenApi.getState().enter(id2);
  }, [id2, fullscreenApi, htmlViewerHandle]);
  const exitHtmlFullscreen = reactExports.useCallback(() => {
    fullscreenApi.getState().exit(id2);
  }, [id2, fullscreenApi]);
  const setViewMode = reactExports.useCallback(
    (next2) => {
      const nextSize = next2 === "preview" ? FILE_PREVIEW_SIZE : FILE_CARD_DEFAULT_SIZE;
      if (next2 === "preview") {
        setPreviewWidth(nextSize.width);
        setPreviewHeight(nextSize.height);
      }
      updateNodeDataAndResize(
        id2,
        {
          ...(persisted ?? {}),
          viewMode: next2,
        },
        nextSize.width,
        nextSize.height,
      );
    },
    [id2, persisted, updateNodeDataAndResize],
  );
  const showCardView = reactExports.useCallback(() => setViewMode("card"), [setViewMode]);
  const showPreviewView = reactExports.useCallback(() => setViewMode("preview"), [setViewMode]);
  const handlePreviewClick = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      showPreviewView();
    },
    [showPreviewView],
  );
  const toolbarItems = [
    {
      id: "add-to-chat",
      label: t2("canvas.addToChat"),
      icon: <AddToChatIcon />,
      onClick: handleAddToChat,
      dataActionUiId: "canvas.file-node.add-to-chat",
    },
    {
      id: "view-card",
      label: t2("canvas.file.cardView", "卡片视图"),
      icon: <CardViewIcon />,
      onClick: showCardView,
      active: !isPreview,
      dataActionUiId: "canvas.file-node.view-card",
    },
    {
      id: "view-preview",
      label: t2("canvas.file.previewView", "预览视图"),
      icon: <PreviewViewIcon />,
      onClick: showPreviewView,
      active: isPreview,
      dataActionUiId: "canvas.file-node.view-preview",
    },
    ...(isPreview && htmlViewerHandle
      ? [
          {
            id: "refresh",
            label: t2("canvas.file.refresh", "刷新"),
            icon: <RefreshIcon />,
            onClick: htmlViewerHandle.reload,
            dataActionUiId: "canvas.file-node.refresh",
          },
          {
            id: "fullscreen",
            label: isHtmlFullscreen
              ? t2("canvas.file.exitFullscreen", "退出全屏")
              : t2("canvas.file.enterFullscreen", "全屏预览"),
            icon: isHtmlFullscreen ? <MinimizeIcon /> : <FullscreenIcon$1 />,
            onClick: isHtmlFullscreen ? exitHtmlFullscreen : enterHtmlFullscreen,
            active: isHtmlFullscreen,
            dataActionUiId: "canvas.file-node.fullscreen",
          },
        ]
      : []),
    ...(runInfo?.hasMain
      ? [
          {
            id: "run",
            label: t2("canvas.file.run", "执行"),
            icon: <RunIcon />,
            onClick: runInfo.invoke,
            dataActionUiId: "canvas.file-node.run",
          },
        ]
      : []),
  ];
  const iconSourceName = meta2?.name || filePath?.split("/").pop() || persisted?.name;
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const isPreviewInteractive = !!selected2 && isInteractiveSelect;
  const shellWidth = isPreview ? previewWidth : FILE_CARD_DEFAULT_SIZE.width;
  const handlePreviewResize = reactExports.useCallback((newW, newH) => {
    setPreviewWidth(newW);
    setPreviewHeight(newH);
  }, []);
  return (
    <NodeShell tagIds={meta2?.tagIds} width={shellWidth}>
      {isPreview ? (
        <FilePreview$1
          selected={selected2}
          interactive={isPreviewInteractive}
          filePath={filePath}
          displayName={displayName2}
          tagIds={meta2?.tagIds}
          sizeLabel={sizeLabel}
          extension={extension2}
          displayFileOnly={displayFileOnly}
          width={previewWidth}
          height={previewHeight}
          onShowCardView={showCardView}
          {...(onRename
            ? {
                onRename,
              }
            : {})}
        />
      ) : (
        <NodeBody
          width={FILE_CARD_DEFAULT_SIZE.width}
          tagIds={meta2?.tagIds}
          height={FILE_CARD_DEFAULT_SIZE.height}
          selected={selected2}
          variant="panel"
        >
          <div className="flex h-full items-center gap-3">
            <FileTypeIcon
              {...classifyFileType({
                filename: iconSourceName,
              })}
              size={32}
              decorative={true}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <div className="truncate text-sm font-medium text-foreground" title={displayName2}>
                {displayName2}
              </div>
              {sizeLabel ? (
                <span className="text-xs text-muted-foreground">{sizeLabel}</span>
              ) : null}
            </div>
            <TooltipProvider$1 delay={300} closeDelay={0}>
              <Tooltip$1 content={t2("canvas.preview", "预览")}>
                <button
                  type="button"
                  aria-label={t2("canvas.preview", "预览")}
                  onClick={handlePreviewClick}
                  onMouseDown={(e2) => e2.stopPropagation()}
                  onDoubleClick={(e2) => e2.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  data-action-ui-id="canvas.file-node.preview-eye"
                >
                  <VisibleIcon />
                </button>
              </Tooltip$1>
            </TooltipProvider$1>
          </div>
        </NodeBody>
      )}
      {selected2 && isInteractiveSelect && !displayFileOnly && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      <NodeQuickTagTrigger
        visible={!!selected2 && isInteractiveSelect && !displayFileOnly}
        className="node-floating-ui absolute -top-7 left-full z-10 ml-1"
        counterScaleOrigin="left bottom"
      />
      {selected2 && isPreview && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          onResize={handlePreviewResize}
        />
      )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
    </NodeShell>
  );
}
function FileNodeDispatcher(props) {
  const data2 = props.data;
  if (data2?.pluginId === PANORAMA_VIEWER_PLUGIN_ID) return <PanoramaNode {...props} />;
  const isPlugin = typeof data2?.pluginId === "string";
  return isPlugin ? <PluginNodeInner {...props} /> : <FileNodeImpl {...props} />;
}
export const FileNode = reactExports.memo(FileNodeDispatcher, areNodePropsEqual);
export const GROUP_COLOR_PRESETS = {
  red: {
    swatch: "var(--canvas-group-swatch-red)",
    bg: "var(--canvas-group-fill-red)",
  },
  orange: {
    swatch: "var(--canvas-group-swatch-orange)",
    bg: "var(--canvas-group-fill-orange)",
  },
  yellow: {
    swatch: "var(--canvas-group-swatch-yellow)",
    bg: "var(--canvas-group-fill-yellow)",
  },
  green: {
    swatch: "var(--canvas-group-swatch-green)",
    bg: "var(--canvas-group-fill-green)",
  },
  cyan: {
    swatch: "var(--canvas-group-swatch-cyan)",
    bg: "var(--canvas-group-fill-cyan)",
  },
  blue: {
    swatch: "var(--canvas-group-swatch-blue)",
    bg: "var(--canvas-group-fill-blue)",
  },
  purple: {
    swatch: "var(--canvas-group-swatch-purple)",
    bg: "var(--canvas-group-fill-purple)",
  },
};
