// plugin-launcher.jsx
import { useTranslation, reactExports, Layers, requireJszip_min, getDefaultExportFromCjs$1 } from "../vendor.js";
import { useHtmlFullscreenApi, usePluginMeta, useIsHtmlFullscreen } from "../m15/create-html-iframe-pool-store.jsx";
import { useCanvasBridge, useCanvasActions, MEDIA_NODE_RADIUS } from "../m15/parse-item.jsx";
import { pickLocalized } from "../m15/push-inline.js";
import { Se$2, useFileBytes } from "../m15/use-file-bytes.js";
import { CLIP_STUDIO_PLUGIN_ID, DIRECTOR_STAGE_PLUGIN_ID } from "../m02/canvas-image.jsx";
import { NodeBody, Button$2 } from "../m01/use-media-node-actions.jsx";
import { MediaUnpreviewableFallback } from "../m01/create-tracker.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DirectorStageHeaderIcon,
  PluginEditorSurface,
  VideoEditorHeaderIcon,
} from "./comfy-ui-plugin-launcher.jsx";
import {
  HtmlViewer,
  ViewerError,
  ViewerLoading,
  getPluginAgentEditSession,
  setPluginAgentEditSession,
} from "./use-plugin-host.jsx";
const LAUNCHER_UNMOUNT_GRACE_MS = 1500;
export function PluginLauncher({
  nodeId,
  pluginId,
  filePath,
  displayName: displayName2,
  width,
  height,
  selected: selected2,
  onReportAction,
  editorSurface,
}) {
  const { i18n, t: t2 } = useTranslation();
  const meta2 = usePluginMeta(pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh") ? "zh-CN" : rawLang.startsWith("en") ? "en-US" : rawLang;
  const name2 = (meta2 ? pickLocalized(meta2.name, locale) : "") || displayName2;
  const description = meta2 ? pickLocalized(meta2.description ?? {}, locale) : "";
  const openLabel =
    pluginId === CLIP_STUDIO_PLUGIN_ID
      ? t2("canvas.plugin.openVideoEditor", {
          defaultValue: "Open Video Editor",
        })
      : t2("canvas.plugin.openLauncher", {
          name: name2,
          defaultValue: "Open {{name}}",
        });
  const agentSessionName =
    (meta2?.agent?.sessionName ? pickLocalized(meta2.agent.sessionName, locale) : "") || name2;
  const [open, setOpen] = reactExports.useState(false);
  const fullscreenApi = useHtmlFullscreenApi();
  const isFullscreen = useIsHtmlFullscreen(nodeId);
  const { isWorkspaceActive, onPluginEditActiveChange } = useCanvasBridge();
  const { closeContextMenus } = useCanvasActions();
  const editSessionRef = reactExports.useRef(null);
  const editOpenContextRef = reactExports.useRef(null);
  const ensureEditSession = reactExports.useCallback(() => {
    if (!editorSurface || editSessionRef.current) return;
    editSessionRef.current = {
      nodeId,
      editSessionId: globalThis.crypto?.randomUUID?.() ?? `plugin-edit-${Date.now().toString(36)}`,
    };
  }, [editorSurface, nodeId]);
  const onPluginEditActiveChangeRef = reactExports.useRef(onPluginEditActiveChange);
  onPluginEditActiveChangeRef.current = onPluginEditActiveChange;
  const closeContextMenusRef = reactExports.useRef(closeContextMenus);
  closeContextMenusRef.current = closeContextMenus;
  const activeEditSessionIdRef = reactExports.useRef(null);
  const detachEditSession = reactExports.useCallback(
    (session) => {
      if (activeEditSessionIdRef.current !== session.editSessionId) return;
      activeEditSessionIdRef.current = null;
      if (getPluginAgentEditSession(session.nodeId) === session.editSessionId) {
        setPluginAgentEditSession(session.nodeId, null);
      }
      onPluginEditActiveChangeRef.current?.(session, false, agentSessionName, pluginId);
    },
    [agentSessionName, pluginId],
  );
  const requestExitFullscreen = reactExports.useCallback(() => {
    const state2 = fullscreenApi.getState();
    if (state2.nodeId !== nodeId || state2.presentation !== "fullscreen") return false;
    const session = editSessionRef.current;
    try {
      if (editorSurface && session) detachEditSession(session);
    } finally {
      state2.exit(nodeId);
    }
    return true;
  }, [detachEditSession, editorSurface, fullscreenApi, nodeId]);
  reactExports.useEffect(() => {
    if (isWorkspaceActive !== false || !isFullscreen) return;
    requestExitFullscreen();
  }, [isFullscreen, isWorkspaceActive, requestExitFullscreen]);
  const openStage = reactExports.useCallback(() => {
    editOpenContextRef.current = {
      entrySource: "node_launcher",
      startedAt: Date.now(),
    };
    ensureEditSession();
    setOpen(true);
    fullscreenApi.getState().enter(nodeId);
    onReportAction?.("fullscreen", "enter");
  }, [ensureEditSession, fullscreenApi, nodeId, onReportAction]);
  reactExports.useEffect(() => {
    if (!editorSurface || !isFullscreen || open) return;
    editOpenContextRef.current = {
      entrySource: "programmatic",
      startedAt: Date.now(),
    };
    ensureEditSession();
    setOpen(true);
  }, [editorSurface, ensureEditSession, isFullscreen, open]);
  reactExports.useEffect(() => {
    if (!editorSurface || !isFullscreen) return;
    const session = editSessionRef.current;
    if (!session) return;
    closeContextMenusRef.current();
    activeEditSessionIdRef.current = session.editSessionId;
    setPluginAgentEditSession(session.nodeId, session.editSessionId);
    const openContext = editOpenContextRef.current;
    onPluginEditActiveChangeRef.current?.(session, true, agentSessionName, pluginId, {
      entrySource: openContext?.entrySource ?? "programmatic",
      durationMs: openContext ? Date.now() - openContext.startedAt : 0,
    });
    return () => {
      detachEditSession(session);
    };
  }, [agentSessionName, detachEditSession, editorSurface, isFullscreen, pluginId]);
  const wasFullscreenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (isFullscreen) {
      wasFullscreenRef.current = true;
      return;
    }
    if (!wasFullscreenRef.current) return;
    wasFullscreenRef.current = false;
    onReportAction?.("fullscreen", "exit");
    const timer2 = setTimeout(() => setOpen(false), LAUNCHER_UNMOUNT_GRACE_MS);
    return () => clearTimeout(timer2);
  }, [isFullscreen, onReportAction]);
  return (
    <NodeBody width={width} height={height} selected={selected2} variant="media">
      <div
        className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
          borderRadius: MEDIA_NODE_RADIUS,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center">
          {pluginId === DIRECTOR_STAGE_PLUGIN_ID ? (
            <DirectorStageHeaderIcon
              size={42}
              className="text-[var(--canvas-empty-placeholder-fg)]"
            />
          ) : pluginId === CLIP_STUDIO_PLUGIN_ID ? (
            <VideoEditorHeaderIcon
              size={42}
              className="text-[var(--canvas-empty-placeholder-fg)]"
            />
          ) : (
            <Layers
              className="h-14 w-14 text-[var(--canvas-controls-text)] opacity-50"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="mt-4 flex h-16 max-w-full flex-col items-center gap-1">
          <div
            className="max-w-full truncate text-sm font-medium text-[var(--canvas-controls-text)]"
            title={name2}
          >
            {name2}
          </div>
          <div
            className="line-clamp-2 h-10 max-w-full whitespace-pre-line text-[13px] leading-5 text-[var(--canvas-controls-text-muted)]"
            title={description || name2}
          >
            {description}
          </div>
        </div>
        <Button$2
          type="button"
          variant="secondary"
          onClick={(e2) => {
            e2.stopPropagation();
            openStage();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          data-action-ui-id="canvas.plugin-node.open-launcher"
          data-plugin-id={pluginId}
          className="nodrag mt-4 h-9 cursor-pointer rounded-lg border-0 bg-[var(--button-subtle-bg)] px-4 text-[14px] font-normal tracking-wide text-[var(--canvas-controls-text)] hover:bg-[var(--button-subtle-bg-hover)]"
        >
          {openLabel}
        </Button$2>
        {open &&
          (editorSurface ? (
            // Canvas-pane editing surface. The container is pinned for the
            // whole `open` window (including the post-exit grace period), so
            // the iframe is never re-parented and the plugin keeps its
            // handshake and unsaved timeline state across visibility flips.
            <PluginEditorSurface visible={isFullscreen}>
              <HtmlViewer
                filePath={filePath ?? ""}
                interactive={true}
                displayName={name2}
                eagerActivate={true}
                surface="inline"
                requestExitFullscreen={requestExitFullscreen}
              />
            </PluginEditorSurface>
          ) : (
            <div className="absolute h-0 w-0 overflow-hidden" aria-hidden={!isFullscreen}>
              <HtmlViewer
                filePath={filePath ?? ""}
                interactive={true}
                displayName={name2}
                eagerActivate={true}
              />
            </div>
          ))}
      </div>
    </NodeBody>
  );
}
var U$6 = {
  num: {
    type: "num",
    match: /(\.e?|\b)\d(e-|[\d.oxa-fA-F_])*(\.|\b)/g,
  },
  str: {
    type: "str",
    match: /(["'])(\\[^]|(?!\1)[^\r\n\\])*\1?/g,
  },
  strDouble: {
    type: "str",
    match: /"((?!")[^\r\n\\]|\\[^])*"?/g,
  },
};
var b$6 = {};
var Ce$2 = (t2 = "") =>
  t2.replaceAll("&", "&#38;").replaceAll?.("<", "&lt;").replaceAll?.(">", "&gt;");
var De$3 = (t2, e2) => (e2 ? `<span class="shj-syn-${e2}">${t2}</span>` : t2);
async function Zt$2(t2, e2, p3) {
  try {
    let n2,
      m3,
      c3 = {},
      i2,
      r2 = [],
      h2 = 0,
      y4 = typeof e2 == "string" ? await (b$6[e2] ?? (b$6[e2] = Se$2(`./languages/${e2}.js`))) : e2,
      g2 = [...(typeof e2 == "string" ? y4.default : e2.sub)];
    for (; h2 < t2.length;) {
      for (c3.index = null, n2 = g2.length; n2-- > 0;) {
        if (
          ((m3 = g2[n2].expand ? U$6[g2[n2].expand] : g2[n2]),
          r2[n2] === void 0 || r2[n2].match.index < h2)
        ) {
          if (((m3.match.lastIndex = h2), (i2 = m3.match.exec(t2)), i2 === null)) {
            (g2.splice(n2, 1), r2.splice(n2, 1));
            continue;
          }
          r2[n2] = {
            match: i2,
            lastIndex: m3.match.lastIndex,
          };
        }
        r2[n2].match[0] &&
          (r2[n2].match.index <= c3.index || c3.index === null) &&
          (c3 = {
            part: m3,
            index: r2[n2].match.index,
            match: r2[n2].match[0],
            end: r2[n2].lastIndex,
          });
      }
      if (c3.index === null) break;
      (p3(t2.slice(h2, c3.index), y4.type),
        (h2 = c3.end),
        c3.part.sub
          ? await Zt$2(
              c3.match,
              typeof c3.part.sub == "string"
                ? c3.part.sub
                : typeof c3.part.sub == "function"
                  ? c3.part.sub(c3.match)
                  : c3.part,
              p3,
            )
          : p3(c3.match, c3.part.type));
    }
    p3(t2.slice(h2, t2.length), y4.type);
  } catch {
    p3(t2);
  }
}
async function we$3(t2, e2, p3 = true, n2 = {}) {
  let m3 = "";
  return (
    await Zt$2(t2, e2, (c3, i2) => (m3 += De$3(Ce$2(c3), i2))),
    p3
      ? `<div><div class="shj-numbers">${"<div></div>".repeat(
          !n2.hideLineNumbers &&
            t2.split(`
`).length,
        )}</div><div>${m3}</div></div>`
      : m3
  );
}
export function UnpreviewableViewer({
  extension: extension2,
  displayName: displayName2,
  sizeLabel,
  reason = "unsupported",
}) {
  return (
    <MediaUnpreviewableFallback
      extension={extension2}
      displayName={displayName2}
      sizeLabel={sizeLabel}
      reason={reason}
    />
  );
}
export const VIEWER_SIZE_LIMITS = {
  // 128 MB — rendered by the browser from a URL, not buffered by JS; cap kept for budget/admission symmetry
  pdf: 50 * 1024 * 1024,
  // 50 MB — pdf.js streams pages so this is generous
  code: 512 * 1024,
  // 512 KB — speed-highlight tokenises in-process on the main thread; tens-of-ms range at this cap
  docx: 20 * 1024 * 1024,
  // 20 MB — docx-preview unzips fully into memory
  zip: 256 * 1024 * 1024,
};
function pickLanguage(ext) {
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "ts";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "js";
    case ".json":
    case ".json5":
      return "json";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".toml":
      return "toml";
    case ".xml":
    case ".vue":
    case ".svelte":
      return "xml";
    case ".html":
    case ".htm":
      return "html";
    case ".css":
    case ".scss":
    case ".sass":
    case ".less":
      return "css";
    case ".md":
    case ".markdown":
    case ".mdx":
      return "md";
    case ".py":
      return "py";
    case ".go":
      return "go";
    case ".rs":
      return "rs";
    case ".java":
    case ".kt":
    case ".kts":
      return "java";
    case ".c":
    case ".h":
    case ".cc":
    case ".cpp":
    case ".hpp":
      return "c";
    case ".lua":
      return "lua";
    case ".pl":
      return "pl";
    case ".sh":
    case ".bash":
    case ".zsh":
    case ".fish":
      return "bash";
    case ".sql":
      return "sql";
    case ".dockerfile":
      return "docker";
    case ".makefile":
      return "make";
    case ".ini":
    case ".env":
      return "ini";
    case ".log":
      return "log";
    default:
      return "plain";
  }
}
const MAX_HIGHLIGHTED_HTML_CHARS = 4 * 1024 * 1024;
function escapeHtml$1(s2) {
  return s2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function plainTextHtml(text2) {
  const lineCount = text2.split("\n").length;
  const numbers = "<div></div>".repeat(lineCount);
  return `<div><div class="shj-numbers">${numbers}</div><div>${escapeHtml$1(text2)}</div></div>`;
}
async function yieldToMain() {
  const scheduler2 = globalThis.scheduler;
  if (scheduler2?.yield) return scheduler2.yield();
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
export function CodeViewer({
  filePath,
  extension: extension2,
  interactive,
  displayName: displayName2,
  sizeLabel,
}) {
  const bytes2 = useFileBytes(filePath, VIEWER_SIZE_LIMITS.code, {
    revalidate: true,
  });
  const [html2, setHtml] = reactExports.useState(null);
  const innerHtml = reactExports.useMemo(
    () => ({
      __html: html2 ?? "",
    }),
    [html2],
  );
  const [lang, setLang] = reactExports.useState(() => pickLanguage(extension2));
  const errorKey = bytes2.status === "error" ? bytes2.errorKey : null;
  reactExports.useEffect(() => {
    if (bytes2.status !== "success" || !bytes2.bytes) return;
    let cancelled = false;
    setHtml(null);
    const chosen = pickLanguage(extension2);
    setLang(chosen);
    const text2 = new TextDecoder().decode(bytes2.bytes);
    void (async () => {
      await yieldToMain();
      if (cancelled) return;
      let rendered;
      try {
        rendered = await we$3(text2, chosen /* multiline */, true);
      } catch {
        rendered = plainTextHtml(text2);
      }
      if (cancelled) return;
      const final = rendered.length > MAX_HIGHLIGHTED_HTML_CHARS ? plainTextHtml(text2) : rendered;
      if (!cancelled) setHtml(final);
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes2.status, bytes2.bytes, extension2]);
  if (errorKey === "canvas.file.viewer.tooLarge")
    return (
      <UnpreviewableViewer
        reason="tooLarge"
        extension={extension2}
        displayName={displayName2 ?? ""}
        sizeLabel={sizeLabel}
      />
    );
  if (errorKey) return <ViewerError messageKey={errorKey} />;
  if (bytes2.status === "loading" || !html2) return <ViewerLoading />;
  return (
    <div
      className={`${interactive ? "nowheel " : ""}hilo-code-viewer shj-lang-${lang} h-full w-full overflow-auto bg-background px-4 py-3 text-xs leading-relaxed`}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}
var jszip_minExports = requireJszip_min();
export const JSZip = getDefaultExportFromCjs$1(jszip_minExports);
var RelationshipTypes;
(function (RelationshipTypes2) {
  RelationshipTypes2["OfficeDocument"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
  RelationshipTypes2["FontTable"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
  RelationshipTypes2["Image"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
  RelationshipTypes2["Numbering"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
  RelationshipTypes2["Styles"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
  RelationshipTypes2["StylesWithEffects"] =
    "http://schemas.microsoft.com/office/2007/relationships/stylesWithEffects";
  RelationshipTypes2["Theme"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
  RelationshipTypes2["Settings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
  RelationshipTypes2["WebSettings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings";
  RelationshipTypes2["Hyperlink"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
  RelationshipTypes2["Footnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes";
  RelationshipTypes2["Endnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes";
  RelationshipTypes2["Footer"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
  RelationshipTypes2["Header"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
  RelationshipTypes2["ExtendedProperties"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
  RelationshipTypes2["CoreProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
  RelationshipTypes2["CustomProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties";
  RelationshipTypes2["Comments"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
  RelationshipTypes2["CommentsExtended"] =
    "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";
  RelationshipTypes2["AltChunk"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
})(RelationshipTypes || (RelationshipTypes = {}));
var SectionType;
(function (SectionType2) {
  SectionType2["Continuous"] = "continuous";
  SectionType2["NextPage"] = "nextPage";
  SectionType2["NextColumn"] = "nextColumn";
  SectionType2["EvenPage"] = "evenPage";
  SectionType2["OddPage"] = "oddPage";
})(SectionType || (SectionType = {}));
var DomType;
(function (DomType2) {
  DomType2["Document"] = "document";
  DomType2["Paragraph"] = "paragraph";
  DomType2["Run"] = "run";
  DomType2["Break"] = "break";
  DomType2["NoBreakHyphen"] = "noBreakHyphen";
  DomType2["Table"] = "table";
  DomType2["Row"] = "row";
  DomType2["Cell"] = "cell";
  DomType2["Hyperlink"] = "hyperlink";
  DomType2["SmartTag"] = "smartTag";
  DomType2["Drawing"] = "drawing";
  DomType2["Image"] = "image";
  DomType2["Text"] = "text";
  DomType2["Tab"] = "tab";
  DomType2["Symbol"] = "symbol";
  DomType2["BookmarkStart"] = "bookmarkStart";
  DomType2["BookmarkEnd"] = "bookmarkEnd";
  DomType2["Footer"] = "footer";
  DomType2["Header"] = "header";
  DomType2["FootnoteReference"] = "footnoteReference";
  DomType2["EndnoteReference"] = "endnoteReference";
  DomType2["Footnote"] = "footnote";
  DomType2["Endnote"] = "endnote";
  DomType2["SimpleField"] = "simpleField";
  DomType2["ComplexField"] = "complexField";
  DomType2["Instruction"] = "instruction";
  DomType2["VmlPicture"] = "vmlPicture";
  DomType2["MmlMath"] = "mmlMath";
  DomType2["MmlMathParagraph"] = "mmlMathParagraph";
  DomType2["MmlFraction"] = "mmlFraction";
  DomType2["MmlFunction"] = "mmlFunction";
  DomType2["MmlFunctionName"] = "mmlFunctionName";
  DomType2["MmlNumerator"] = "mmlNumerator";
  DomType2["MmlDenominator"] = "mmlDenominator";
  DomType2["MmlRadical"] = "mmlRadical";
  DomType2["MmlBase"] = "mmlBase";
  DomType2["MmlDegree"] = "mmlDegree";
  DomType2["MmlSuperscript"] = "mmlSuperscript";
  DomType2["MmlSubscript"] = "mmlSubscript";
  DomType2["MmlPreSubSuper"] = "mmlPreSubSuper";
  DomType2["MmlSubArgument"] = "mmlSubArgument";
  DomType2["MmlSuperArgument"] = "mmlSuperArgument";
  DomType2["MmlNary"] = "mmlNary";
  DomType2["MmlDelimiter"] = "mmlDelimiter";
  DomType2["MmlRun"] = "mmlRun";
  DomType2["MmlEquationArray"] = "mmlEquationArray";
  DomType2["MmlLimit"] = "mmlLimit";
  DomType2["MmlLimitLower"] = "mmlLimitLower";
  DomType2["MmlMatrix"] = "mmlMatrix";
  DomType2["MmlMatrixRow"] = "mmlMatrixRow";
  DomType2["MmlBox"] = "mmlBox";
  DomType2["MmlBar"] = "mmlBar";
  DomType2["MmlGroupChar"] = "mmlGroupChar";
  DomType2["VmlElement"] = "vmlElement";
  DomType2["Inserted"] = "inserted";
  DomType2["Deleted"] = "deleted";
  DomType2["DeletedText"] = "deletedText";
  DomType2["Comment"] = "comment";
  DomType2["CommentReference"] = "commentReference";
  DomType2["CommentRangeStart"] = "commentRangeStart";
  DomType2["CommentRangeEnd"] = "commentRangeEnd";
  DomType2["AltChunk"] = "altChunk";
})(DomType || (DomType = {}));
