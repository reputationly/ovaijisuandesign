// pdf-viewer.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaUnpreviewableFallback } from "../generation/missing-asset-card.jsx";
import JSZip from "jszip";
import { getDocument as __webpack_exports__getDocument } from "pdfjs-dist";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import { CompositedSvg } from "./icon-compositing.js";
import { ViewerLoading, ViewerStateShell } from "./input.jsx";
import {
  CANVAS_FILE_VERSION_QUERY_KEY,
  CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT,
  getOrCreateState,
  HEAVY_FILE_VIEWER_KINDS,
  touch,
  useFileUrl,
  useWorkspaceContentBudgetScope,
  workspaceScope,
} from "../infra/use-plugin-metadata-store.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useCanvasBridge } from "./package.jsx";
import { renderAsync } from "docx-preview";
import { useViewerActive } from "../infra/use-viewer-active.js";
import { HtmlViewer } from "../infra/create-html-iframe-pool-store.jsx";
function isWorkspaceFileViewerAdmissionAvailable(kind, state) {
  if (!HEAVY_FILE_VIEWER_KINDS.has(kind)) return true;
  let heavyMountedCount = 0;
  for (const viewer of state.fileViewers.values()) {
    if (!viewer.admitted) continue;
    if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) heavyMountedCount += 1;
  }
  return heavyMountedCount < CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT;
}
function registerWorkspaceFileViewerWithAdmission(input) {
  const state = getOrCreateState(input.workspaceId);
  const admitted = isWorkspaceFileViewerAdmissionAvailable(input.kind, state);
  const registrationId = state.nextViewerRegistrationId++;
  if (!admitted) {
    state.fileViewers.set(registrationId, {
      kind: input.kind,
      filePath: input.filePath,
      admitted: false,
    });
    touch(state);
    return {
      admitted: false,
      unregister: () => {
        if (!state.fileViewers.delete(registrationId)) return;
        touch(state);
      },
    };
  }
  state.fileViewers.set(registrationId, {
    kind: input.kind,
    filePath: input.filePath,
    admitted: true,
  });
  touch(state);
  return {
    admitted: true,
    unregister: () => {
      if (!state.fileViewers.delete(registrationId)) return;
      touch(state);
    },
  };
}
function workspaceFileViewerAdmissionKey(input) {
  return `${workspaceScope(input.workspaceId)}\0${input.kind}\0${input.filePath ?? ""}\0${input.active === false ? "idle" : "active"}`;
}
function defaultWorkspaceFileViewerAdmission(input, admissionKey) {
  const requiresAdmission =
    input.active !== false &&
    !!input.filePath &&
    input.kind !== "none" &&
    HEAVY_FILE_VIEWER_KINDS.has(input.kind);
  return {
    admissionKey,
    admitted: !requiresAdmission,
    overLimit: false,
  };
}
function useWorkspaceFileViewerAdmission(input) {
  const admissionKey = workspaceFileViewerAdmissionKey(input);
  const [admission, setAdmission] = reactExports.useState(() =>
    defaultWorkspaceFileViewerAdmission(input, admissionKey),
  );
  reactExports.useLayoutEffect(() => {
    if (input.active === false || !input.filePath || input.kind === "none") {
      setAdmission({
        admissionKey,
        admitted: true,
        overLimit: false,
      });
      return;
    }
    const registration = registerWorkspaceFileViewerWithAdmission({
      kind: input.kind,
      filePath: input.filePath,
      workspaceId: input.workspaceId,
    });
    setAdmission({
      admissionKey,
      admitted: registration.admitted,
      overLimit: !registration.admitted,
    });
    return registration.unregister;
  }, [
    admissionKey,
    input.active,
    input.filePath,
    input.kind,
    input.workspaceId,
  ]);
  if (admission.admissionKey !== admissionKey) {
    return defaultWorkspaceFileViewerAdmission(input, admissionKey);
  }
  return {
    admitted: admission.admitted,
    overLimit: admission.overLimit,
  };
}
var createLanguageModuleLoader = (moduleFactories) => (modulePath) => {
  var moduleFactory = moduleFactories[modulePath];
  if (moduleFactory) return moduleFactory();
  throw new Error("Module not found in bundle: " + modulePath);
};
var loadCodeLanguageModule = createLanguageModuleLoader({
  "./languages/asm.js": () => import("@speed-highlight/core/languages/asm.js"),
  "./languages/bash.js": () => import("@speed-highlight/core/languages/bash.js"),
  "./languages/bf.js": () => import("@speed-highlight/core/languages/bf.js"),
  "./languages/c.js": () => import("@speed-highlight/core/languages/c.js"),
  "./languages/css.js": () => import("@speed-highlight/core/languages/css.js"),
  "./languages/csv.js": () => import("@speed-highlight/core/languages/csv.js"),
  "./languages/diff.js": () => import("@speed-highlight/core/languages/diff.js"),
  "./languages/docker.js": () => import("@speed-highlight/core/languages/docker.js"),
  "./languages/git.js": () => import("@speed-highlight/core/languages/git.js"),
  "./languages/go.js": () => import("@speed-highlight/core/languages/go.js"),
  "./languages/html.js": () => import("@speed-highlight/core/languages/html.js"),
  "./languages/http.js": () => import("@speed-highlight/core/languages/http.js"),
  "./languages/ini.js": () => import("@speed-highlight/core/languages/ini.js"),
  "./languages/java.js": () => import("@speed-highlight/core/languages/java.js"),
  "./languages/js.js": () => import("@speed-highlight/core/languages/js.js"),
  "./languages/js_template_literals.js": () => import("@speed-highlight/core/languages/js_template_literals.js"),
  "./languages/jsdoc.js": () => import("@speed-highlight/core/languages/jsdoc.js"),
  "./languages/json.js": () => import("@speed-highlight/core/languages/json.js"),
  "./languages/leanpub-md.js": () => import("@speed-highlight/core/languages/leanpub-md.js"),
  "./languages/log.js": () => import("@speed-highlight/core/languages/log.js"),
  "./languages/lua.js": () => import("@speed-highlight/core/languages/lua.js"),
  "./languages/make.js": () => import("@speed-highlight/core/languages/make.js"),
  "./languages/md.js": () => import("@speed-highlight/core/languages/md.js"),
  "./languages/pl.js": () => import("@speed-highlight/core/languages/pl.js"),
  "./languages/plain.js": () => import("@speed-highlight/core/languages/plain.js"),
  "./languages/py.js": () => import("@speed-highlight/core/languages/py.js"),
  "./languages/regex.js": () => import("@speed-highlight/core/languages/regex.js"),
  "./languages/rs.js": () => import("@speed-highlight/core/languages/rs.js"),
  "./languages/sql.js": () => import("@speed-highlight/core/languages/sql.js"),
  "./languages/todo.js": () => import("@speed-highlight/core/languages/todo.js"),
  "./languages/toml.js": () => import("@speed-highlight/core/languages/toml.js"),
  "./languages/ts.js": () => import("@speed-highlight/core/languages/ts.js"),
  "./languages/uri.js": () => import("@speed-highlight/core/languages/uri.js"),
  "./languages/xml.js": () => import("@speed-highlight/core/languages/xml.js"),
  "./languages/yaml.js": () => import("@speed-highlight/core/languages/yaml.js"),
});
const INITIAL = {
  status: "loading",
};
async function equalBytes(left, right, signal) {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  const chunkSize = 1024 * 1024;
  for (let start = 0; start < leftBytes.length; start += chunkSize) {
    if (signal.aborted) return false;
    const end = Math.min(start + chunkSize, leftBytes.length);
    for (let byteIndex = start; byteIndex < end; byteIndex++) {
      if (leftBytes[byteIndex] !== rightBytes[byteIndex]) return false;
    }
    if (end < leftBytes.length)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return true;
}
function useFileBytes(filePath, maxBytes, options) {
  const url = useFileUrl(filePath);
  const [state, setState] = reactExports.useState(INITIAL);
  const revalidate = options?.revalidate ?? false;
  const previous = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!filePath) {
      previous.current = null;
      setState({
        status: "error",
        errorKey: "canvas.file.viewer.loadFailed",
      });
      return;
    }
    if (!url) {
      previous.current = null;
      setState(INITIAL);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let requestUrl = url;
    if (revalidate) {
      const stable = new URL(url);
      stable.searchParams.delete(CANVAS_FILE_VERSION_QUERY_KEY);
      requestUrl = stable.href;
    }
    const cached =
      revalidate &&
      previous.current?.url === requestUrl &&
      previous.current.bytes.byteLength <= maxBytes
        ? previous.current
        : null;
    if (!cached) {
      previous.current = null;
      setState(INITIAL);
    }
    fetch(requestUrl, {
      signal: controller.signal,
      ...(revalidate
        ? {
            cache: "no-cache",
          }
        : {}),
    })
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const lenHeader = resp.headers.get("content-length");
        const declared = lenHeader
          ? Number.parseInt(lenHeader, 10)
          : Number.NaN;
        if (Number.isFinite(declared) && declared > maxBytes) {
          throw new Error("TOO_LARGE");
        }
        const fileBytes = await resp.arrayBuffer();
        if (fileBytes.byteLength > maxBytes) {
          throw new Error("TOO_LARGE");
        }
        if (cancelled) return;
        if (cached && (await equalBytes(cached.bytes, fileBytes, controller.signal)))
          return;
        if (cancelled) return;
        previous.current = revalidate
          ? {
              url: requestUrl,
              bytes: fileBytes,
            }
          : null;
        setState({
          status: "success",
          bytes: fileBytes,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (controller.signal.aborted) return;
        previous.current = null;
        const errorKey =
          err instanceof Error && err.message === "TOO_LARGE"
            ? "canvas.file.viewer.tooLarge"
            : "canvas.file.viewer.loadFailed";
        setState({
          status: "error",
          errorKey,
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filePath, url, maxBytes, revalidate]);
  return state;
}
const CODE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".json5",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".md",
  ".markdown",
  ".mdx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".swift",
  ".c",
  ".cc",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".php",
  ".lua",
  ".dart",
  ".scala",
  ".r",
  ".proto",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".sql",
  ".dockerfile",
  ".makefile",
  ".gitignore",
  ".gitattributes",
  ".env",
  ".txt",
  ".log",
]);
const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".svg",
  ".avif",
  ".ico",
]);
const ZIP_EXTS = new Set([
  ".zip",
  ".jar",
  ".war",
  ".apk",
  ".ipa",
  ".xpi",
  ".epub",
]);
function pickViewerKind(extension) {
  if (!extension) return "none";
  const normalizedExtension = extension.toLowerCase();
  if (IMAGE_EXTS.has(normalizedExtension)) return "image";
  if (normalizedExtension === ".pdf") return "pdf";
  if (normalizedExtension === ".docx") return "docx";
  if (normalizedExtension === ".srt" || normalizedExtension === ".ass") return "srt";
  if (normalizedExtension === ".html" || normalizedExtension === ".htm") return "html";
  if (ZIP_EXTS.has(normalizedExtension)) return "zip";
  if (CODE_EXTS.has(normalizedExtension)) return "code";
  return "none";
}
const HTML_VIEWER_UNLOAD_AFTER_MS = 6e3;
const ACTIVE_GATED_VIEWER_KINDS = new Set([
  "image",
  "pdf",
  "code",
  "docx",
  "zip",
  "html",
]);
function ViewerError({ messageKey }) {
  const { t } = useTranslation();
  return (
    <ViewerStateShell>
      <div className="text-sm font-medium text-foreground">
        {t(messageKey ?? "canvas.file.viewer.loadFailed", "预览加载失败")}
      </div>
    </ViewerStateShell>
  );
}
var expandedGrammarTokens = {
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
var languageGrammarCache = {};
var escapeHighlightText = (text = "") =>
  text
    .replaceAll("&", "&#38;")
    .replaceAll?.("<", "&lt;")
    .replaceAll?.(">", "&gt;");
var renderSyntaxHighlightSpan = (highlightedText, tokenType) => (tokenType ? `<span class="shj-syn-${tokenType}">${highlightedText}</span>` : highlightedText);
async function highlightCodeTokens(codeText, languageGrammar, renderSegment) {
  try {
    let ruleIndex,
      grammarRule,
      nextMatch = {},
      matchResult,
      cachedMatches = [],
      textOffset = 0,
      languageGrammarModule =
        typeof languageGrammar == "string"
          ? await (languageGrammarCache[languageGrammar] ?? (languageGrammarCache[languageGrammar] = loadCodeLanguageModule(`./languages/${languageGrammar}.js`)))
          : languageGrammar,
      grammarRules = [...(typeof languageGrammar == "string" ? languageGrammarModule.default : languageGrammar.sub)];
    for (; textOffset < codeText.length;) {
      for (nextMatch.index = null, ruleIndex = grammarRules.length; ruleIndex-- > 0;) {
        if (
          ((grammarRule = grammarRules[ruleIndex].expand ? expandedGrammarTokens[grammarRules[ruleIndex].expand] : grammarRules[ruleIndex]),
          cachedMatches[ruleIndex] === void 0 || cachedMatches[ruleIndex].match.index < textOffset)
        ) {
          if (
            ((grammarRule.match.lastIndex = textOffset), (matchResult = grammarRule.match.exec(codeText)), matchResult === null)
          ) {
            (grammarRules.splice(ruleIndex, 1), cachedMatches.splice(ruleIndex, 1));
            continue;
          }
          cachedMatches[ruleIndex] = {
            match: matchResult,
            lastIndex: grammarRule.match.lastIndex,
          };
        }
        cachedMatches[ruleIndex].match[0] &&
          (cachedMatches[ruleIndex].match.index <= nextMatch.index || nextMatch.index === null) &&
          (nextMatch = {
            part: grammarRule,
            index: cachedMatches[ruleIndex].match.index,
            match: cachedMatches[ruleIndex].match[0],
            end: cachedMatches[ruleIndex].lastIndex,
          });
      }
      if (nextMatch.index === null) break;
      (renderSegment(codeText.slice(textOffset, nextMatch.index), languageGrammarModule.type),
        (textOffset = nextMatch.end),
        nextMatch.part.sub
          ? await highlightCodeTokens(
              nextMatch.match,
              typeof nextMatch.part.sub == "string"
                ? nextMatch.part.sub
                : typeof nextMatch.part.sub == "function"
                  ? nextMatch.part.sub(nextMatch.match)
                  : nextMatch.part,
              renderSegment,
            )
          : renderSegment(nextMatch.match, nextMatch.part.type));
    }
    renderSegment(codeText.slice(textOffset, codeText.length), languageGrammarModule.type);
  } catch {
    renderSegment(codeText);
  }
}
async function renderHighlightedCodeHtml(codeText, languageGrammar, showLineNumbers = true, renderOptions = {}) {
  let highlightedHtml = "";
  return (
    await highlightCodeTokens(codeText, languageGrammar, (textSegment, tokenType) => (highlightedHtml += renderSyntaxHighlightSpan(escapeHighlightText(textSegment), tokenType))),
    showLineNumbers
      ? `<div><div class="shj-numbers">${"<div></div>".repeat(
          !renderOptions.hideLineNumbers &&
            codeText.split(`
`).length,
        )}</div><div>${highlightedHtml}</div></div>`
      : highlightedHtml
  );
}
function UnpreviewableViewer({
  extension,
  displayName,
  sizeLabel,
  reason = "unsupported",
}) {
  return (
    <MediaUnpreviewableFallback
      extension={extension}
      displayName={displayName}
      sizeLabel={sizeLabel}
      reason={reason}
    />
  );
}
const VIEWER_SIZE_LIMITS = {
  // 128 MB — rendered by the browser from a URL, not buffered by JS; cap kept for budget/admission symmetry
  pdf: 50 * 1024 * 1024,
  // 50 MB — pdf.js streams pages so this is generous
  code: 512 * 1024,
  // 512 KB — speed-highlight tokenises in-process on the main thread; tens-of-ms range at this cap
  docx: 20 * 1024 * 1024,
  // 20 MB — docx-preview unzips fully into memory
  zip: 256 * 1024 * 1024,
  // 256 MB — JSZip parses the central directory only, but useFileBytes still buffers the whole file into a renderer-process ArrayBuffer; raising this risks Electron OOM
  html: 10 * 1024 * 1024,
};
function pickLanguage(extension) {
  switch (extension) {
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
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function plainTextHtml(text) {
  const lineCount = text.split("\n").length;
  const numbers = "<div></div>".repeat(lineCount);
  return `<div><div class="shj-numbers">${numbers}</div><div>${escapeHtml(text)}</div></div>`;
}
async function yieldToMain() {
  const schedulerApi = globalThis.scheduler;
  if (schedulerApi?.yield) return schedulerApi.yield();
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
function CodeViewer({
  filePath,
  extension,
  interactive,
  displayName,
  sizeLabel,
}) {
  const bytes = useFileBytes(filePath, VIEWER_SIZE_LIMITS.code, {
    revalidate: true,
  });
  const [html, setHtml] = reactExports.useState(null);
  const innerHtml = reactExports.useMemo(
    () => ({
      __html: html ?? "",
    }),
    [html],
  );
  const [lang, setLang] = reactExports.useState(() => pickLanguage(extension));
  const errorKey = bytes.status === "error" ? bytes.errorKey : null;
  reactExports.useEffect(() => {
    if (bytes.status !== "success" || !bytes.bytes) return;
    let cancelled = false;
    setHtml(null);
    const chosen = pickLanguage(extension);
    setLang(chosen);
    const text = new TextDecoder().decode(bytes.bytes);
    void (async () => {
      await yieldToMain();
      if (cancelled) return;
      let rendered;
      try {
        rendered = await renderHighlightedCodeHtml(text, chosen /* multiline */, true);
      } catch {
        rendered = plainTextHtml(text);
      }
      if (cancelled) return;
      const final =
        rendered.length > MAX_HIGHLIGHTED_HTML_CHARS
          ? plainTextHtml(text)
          : rendered;
      if (!cancelled) setHtml(final);
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes.status, bytes.bytes, extension]);
  if (errorKey === "canvas.file.viewer.tooLarge")
    return (
      <UnpreviewableViewer
        reason="tooLarge"
        extension={extension}
        displayName={displayName ?? ""}
        sizeLabel={sizeLabel}
      />
    );
  if (errorKey) return <ViewerError messageKey={errorKey} />;
  if (bytes.status === "loading" || !html) return <ViewerLoading />;
  return (
    <div
      className={`${interactive ? "nowheel " : ""}hilo-code-viewer shj-lang-${lang} h-full w-full overflow-auto bg-background px-4 py-3 text-xs leading-relaxed`}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}
function DocxViewer({
  filePath,
  interactive,
  displayName,
  sizeLabel,
}) {
  const bytes = useFileBytes(filePath, VIEWER_SIZE_LIMITS.docx, {
    revalidate: true,
  });
  const bodyRef = reactExports.useRef(null);
  const styleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (bytes.status !== "success" || !bytes.bytes) return;
    if (!bodyRef.current || !styleRef.current) return;
    let cancelled = false;
    const body = bodyRef.current;
    const styleHost = styleRef.current;
    const nextBody = document.createElement("div");
    const nextStyle = document.createElement("div");
    const data = bytes.bytes.slice(0);
    renderAsync(new Blob([data]), nextBody, nextStyle, {
      className: "hilo-docx",
      inWrapper: true,
      breakPages: true,
      ignoreWidth: false,
      ignoreHeight: false,
      experimental: false,
    })
      .then(() => {
        if (cancelled) return;
        body.replaceChildren(...nextBody.childNodes);
        styleHost.replaceChildren(...nextStyle.childNodes);
      })
      .catch(() => {
        if (cancelled) return;
        body.replaceChildren();
        styleHost.replaceChildren();
      });
    return () => {
      cancelled = true;
      body.replaceChildren();
      styleHost.replaceChildren();
    };
  }, [bytes.status, bytes.bytes]);
  if (bytes.status === "loading") return <ViewerLoading />;
  if (bytes.status === "error") {
    if (bytes.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".docx"
          displayName={displayName ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes.errorKey} />;
  }
  return (
    <div
      className={`${interactive ? "nowheel " : ""}h-full w-full overflow-auto bg-muted px-4 py-3`}
    >
      <div ref={styleRef} aria-hidden="true" className="hidden" />
      <div
        ref={bodyRef}
        className="hilo-docx-body mx-auto bg-background shadow-sm"
      />
    </div>
  );
}
function ImageViewer({ filePath, displayName }) {
  const url = useFileUrl(filePath, {
    versionScope: "path",
  });
  const [result, setResult] = reactExports.useState(null);
  const status = result && result.url === url ? result.status : "loading";
  if (!url) return <ViewerLoading />;
  if (status === "error") return <ViewerError />;
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted">
      {status === "loading" ? (
        <div className="absolute inset-0">
          <ViewerLoading />
        </div>
      ) : null}
      <img
        src={url}
        alt={displayName}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() =>
          setResult({
            url,
            status: "ready",
          })
        }
        onError={() =>
          setResult({
            url,
            status: "error",
          })
        }
        className={`max-h-full max-w-full select-none object-contain transition-opacity duration-150 ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
function PdfViewer({
  filePath,
  paneWidth,
  interactive,
  displayName,
  sizeLabel,
}) {
  const { t } = useTranslation();
  const bytes = useFileBytes(filePath, VIEWER_SIZE_LIMITS.pdf, {
    revalidate: true,
  });
  const canvasRef = reactExports.useRef(null);
  const [doc, setDoc] = reactExports.useState(null);
  const pageCount = doc?.numPages ?? 0;
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
    if (bytes.status !== "success" || !bytes.bytes) return;
    let cancelled = false;
    setRenderError(null);
    const data = bytes.bytes.slice(0);
    const task = __webpack_exports__getDocument({
      data,
    });
    task.promise
      .then((loadedDocument) => {
        if (cancelled) {
          loadedDocument.destroy();
          return;
        }
        setDoc(loadedDocument);
        setPageIndex((index) =>
          Math.min(index, Math.max(0, loadedDocument.numPages - 1)),
        );
      })
      .catch(() => {
        if (!cancelled) setRenderError("canvas.file.viewer.loadFailed");
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [bytes.status, bytes.bytes]);
  reactExports.useEffect(() => {
    if (bytes.status !== "success" || !doc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let renderTask = null;
    doc
      .getPage(pageIndex + 1)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({
          scale: 1,
        });
        const padding = 16;
        const targetWidth = Math.max(paneWidth - padding * 2, 100);
        const scale = targetWidth / viewport.width;
        const pixelRatio = window.devicePixelRatio || 1;
        const scaled = page.getViewport({
          scale: scale * pixelRatio,
        });
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        canvas.style.width = `${scaled.width / pixelRatio}px`;
        canvas.style.height = `${scaled.height / pixelRatio}px`;
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) return;
        renderTask = page.render({
          canvasContext,
          viewport: scaled,
        });
        return renderTask.promise;
      })
      .catch((err) => {
        if (cancelled) return;
        if (
          err &&
          typeof err === "object" &&
          err.name === "RenderingCancelledException"
        )
          return;
        setRenderError("canvas.file.viewer.loadFailed");
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, bytes.status, pageIndex, paneWidth]);
  if (bytes.status === "loading") return <ViewerLoading />;
  if (bytes.status === "error") {
    if (bytes.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".pdf"
          displayName={displayName ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes.errorKey} />;
  }
  if (renderError) return <ViewerError messageKey={renderError} />;
  const goPrev = () => setPageIndex((currentIndex) => Math.max(0, currentIndex - 1));
  const goNext = () => setPageIndex((currentIndex) => Math.min(pageCount - 1, currentIndex + 1));
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
            onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
            disabled={pageIndex === 0}
            className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            aria-label={t("canvas.file.viewer.prevPage", "上一页")}
            data-action-ui-id="canvas.file-node.pdf-prev-page"
          >
            {t("canvas.file.viewer.prevPage", "上一页")}
          </button>
          <span>
            {pageIndex + 1}
            {" / "}
            {pageCount}
          </span>
          <button
            type="button"
            onClick={goNext}
            onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
            disabled={pageIndex >= pageCount - 1}
            className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            aria-label={t("canvas.file.viewer.nextPage", "下一页")}
            data-action-ui-id="canvas.file-node.pdf-next-page"
          >
            {t("canvas.file.viewer.nextPage", "下一页")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
const SAVE_DEBOUNCE_MS = 500;
function SrtEditor({
  filePath,
  interactive,
  displayName,
  sizeLabel,
}) {
  const { t } = useTranslation();
  const { saveTextContent } = useCanvasBridge();
  const bytesState = useFileBytes(filePath, VIEWER_SIZE_LIMITS.code, {
    revalidate: true,
  });
  const [content, setContent] = reactExports.useState(null);
  const persistedRef = reactExports.useRef(null);
  const saveTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (bytesState.status !== "success" || !bytesState.bytes) return;
    const text = new TextDecoder("utf-8").decode(bytesState.bytes);
    setContent(text);
    persistedRef.current = text;
  }, [bytesState.status, bytesState.bytes]);
  reactExports.useEffect(() => {
    setContent(null);
    persistedRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [filePath]);
  const flushSave = reactExports.useCallback(
    (next) => {
      if (!saveTextContent) return;
      if (next === persistedRef.current) return;
      saveTextContent(filePath, next)
        .then(() => {
          persistedRef.current = next;
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
        if (content !== null) flushSave(content);
      }
    };
  }, []);
  const handleChange = reactExports.useCallback(
    (changeEvent) => {
      const next = changeEvent.target.value;
      setContent(next);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        flushSave(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );
  if (
    bytesState.status === "loading" ||
    (bytesState.status === "success" && content === null)
  ) {
    return <ViewerLoading />;
  }
  if (bytesState.status === "error") {
    if (bytesState.errorKey === "canvas.file.viewer.tooLarge") {
      const extension = filePath.toLowerCase().endsWith(".ass") ? ".ass" : ".srt";
      return (
        <UnpreviewableViewer
          extension={extension}
          displayName={displayName ?? filePath}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytesState.errorKey} />;
  }
  return (
    <textarea
      className={
        interactive
          ? "nowheel h-full w-full resize-none"
          : "h-full w-full resize-none"
      }
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
      value={content ?? ""}
      onChange={handleChange}
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
      spellCheck={false}
      placeholder={t(
        "canvas.file.viewer.srt.placeholder",
        "字幕内容（SRT / ASS 格式）",
      )}
    />
  );
}
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(2)} KB`;
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(2)} MB`;
  return `${(megabytes / 1024).toFixed(2)} GB`;
}
function buildTree(entries) {
  const root = {
    children: [],
  };
  for (const entry of entries) {
    const cleanPath = entry.isFolder
      ? entry.path.replace(/\/$/, "")
      : entry.path;
    if (!cleanPath) continue;
    const parts = cleanPath.split("/");
    let cursor = root;
    for (let pathSegmentIndex = 0; pathSegmentIndex < parts.length; pathSegmentIndex++) {
      const part = parts[pathSegmentIndex];
      const isLast = pathSegmentIndex === parts.length - 1;
      const isLeafFolder = isLast && entry.isFolder;
      const isLeafFile = isLast && !entry.isFolder;
      let next = cursor.children.find((childNode) => childNode.name === part);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, pathSegmentIndex + 1).join("/"),
          isFolder: !isLeafFile,
          size: isLeafFile ? entry.size : 0,
          children: [],
        };
        cursor.children.push(next);
      } else if (isLeafFolder) {
        next.isFolder = true;
      } else if (isLeafFile) {
        next.isFolder = false;
        next.size = entry.size;
      }
      cursor = next;
    }
  }
  const sortNodes = (nodes) => {
    nodes.sort((leftNode, rightNode) => {
      if (leftNode.isFolder !== rightNode.isFolder) return leftNode.isFolder ? -1 : 1;
      return leftNode.name.localeCompare(rightNode.name, void 0, {
        sensitivity: "base",
      });
    });
    for (const node of nodes) if (node.isFolder) sortNodes(node.children);
  };
  sortNodes(root.children);
  return root.children;
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
function EntryRow({ node, depth, isOpen, onToggle }) {
  const sizeLabel = node.isFolder ? "" : formatSize(node.size);
  const handleClick = reactExports.useCallback(() => {
    if (node.isFolder) onToggle(node.path);
  }, [node.isFolder, node.path, onToggle]);
  const Wrapper = node.isFolder ? "button" : "div";
  const wrapperProps = node.isFolder
    ? {
        type: "button",
        onClick: handleClick,
        onMouseDown: (mouseEvent) => mouseEvent.stopPropagation(),
        "data-action-ui-id": "canvas.file-node.zip-folder-toggle",
      }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground"
      style={{
        paddingLeft: `${12 + depth * 16}px`,
      }}
    >
      {node.isFolder ? (
        <ChevronGlyph open={isOpen} />
      ) : (
        <span className="w-3 shrink-0" />
      )}
      {node.isFolder ? (
        <FolderGlyph />
      ) : (
        <FileTypeIcon
          {...classifyFileType({
            filename: node.name,
          })}
          size={24}
          decorative={true}
        />
      )}
      <span className="flex-1 truncate" title={node.name}>
        {node.name}
      </span>
      {sizeLabel ? (
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {sizeLabel}
        </span>
      ) : null}
    </Wrapper>
  );
}
function TreeBranch({ nodes, depth, openSet, onToggle }) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <EntryRow
            node={node}
            depth={depth}
            isOpen={openSet.has(node.path)}
            onToggle={onToggle}
          />
          {node.isFolder &&
          openSet.has(node.path) &&
          node.children.length > 0 ? (
            <TreeBranch
              nodes={node.children}
              depth={depth + 1}
              openSet={openSet}
              onToggle={onToggle}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}
function countLeaves(nodes) {
  let leafCount = 0;
  for (const node of nodes) {
    if (node.isFolder) leafCount += countLeaves(node.children);
    else leafCount += 1;
  }
  return leafCount;
}
function ZipViewer({
  filePath,
  interactive,
  displayName,
  sizeLabel,
}) {
  const { t } = useTranslation();
  const bytes = useFileBytes(filePath, VIEWER_SIZE_LIMITS.zip, {
    revalidate: true,
  });
  const [tree, setTree] = reactExports.useState(null);
  const [parseError, setParseError] = reactExports.useState(false);
  const [openSet, setOpenSet] = reactExports.useState(() => new Set());
  reactExports.useEffect(() => {
    if (bytes.status !== "success" || !bytes.bytes) return;
    let cancelled = false;
    setParseError(false);
    setTree(null);
    JSZip.loadAsync(bytes.bytes)
      .then((zipArchive) => {
        if (cancelled) return;
        const raw = [];
        zipArchive.forEach((relPath, file) => {
          const internal = file;
          const size = internal._data?.uncompressedSize ?? 0;
          raw.push({
            path: relPath,
            isFolder: file.dir,
            size,
          });
        });
        const built = buildTree(raw);
        setTree(built);
        const initial = new Set();
        for (const node of built) if (node.isFolder) initial.add(node.path);
        setOpenSet(initial);
      })
      .catch(() => {
        if (!cancelled) setParseError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bytes.status, bytes.bytes]);
  const handleToggle = reactExports.useCallback((path) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);
  if (bytes.status === "loading") return <ViewerLoading />;
  if (bytes.status === "error") {
    if (bytes.errorKey === "canvas.file.viewer.tooLarge") {
      return (
        <UnpreviewableViewer
          reason="tooLarge"
          extension=".zip"
          displayName={displayName ?? ""}
          sizeLabel={sizeLabel}
        />
      );
    }
    return <ViewerError messageKey={bytes.errorKey} />;
  }
  if (parseError)
    return <ViewerError messageKey="canvas.file.viewer.loadFailed" />;
  if (!tree) return <ViewerLoading />;
  const totalEntries = countLeaves(tree);
  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex h-8 shrink-0 items-center gap-2 border-border border-b bg-muted px-3 text-[11px] font-medium text-muted-foreground">
        <span className="flex-1">
          {t("canvas.file.viewer.zipName", "名称")}
          <span className="ml-2 text-muted-foreground/70">
            (
            {t("canvas.file.viewer.zipEntryCount", "{{count}} 项", {
              count: totalEntries,
            })}
            )
          </span>
        </span>
        <span className="shrink-0">
          {t("canvas.file.viewer.zipSize", "大小")}
        </span>
      </div>
      <div className={`${interactive ? "nowheel " : ""}flex-1 overflow-auto`}>
        <TreeBranch
          nodes={tree}
          depth={0}
          openSet={openSet}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
export function FileViewerRouter({
  filePath,
  extension,
  displayName,
  sizeLabel,
  paneWidth,
  interactive,
}) {
  const kind = pickViewerKind(extension);
  const workspaceId = useWorkspaceContentBudgetScope();
  const [setHostEl, active] = useViewerActive({
    unloadAfterMs: kind === "html" ? HTML_VIEWER_UNLOAD_AFTER_MS : void 0,
  });
  const activeGated = ACTIVE_GATED_VIEWER_KINDS.has(kind);
  const viewerActive = activeGated ? active : true;
  const admission = useWorkspaceFileViewerAdmission({
    kind,
    filePath,
    workspaceId,
    active: viewerActive,
  });
  if (!filePath || kind === "none") {
    return (
      <UnpreviewableViewer
        extension={extension}
        displayName={displayName}
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
          extension={extension}
          displayName={displayName}
          sizeLabel={sizeLabel}
          reason={admission.overLimit ? "resourceLimit" : "unsupported"}
        />
      </div>
    );
  }
  let viewer;
  if (kind === "image") {
    viewer = <ImageViewer filePath={filePath} displayName={displayName} />;
  } else if (kind === "pdf") {
    viewer = (
      <PdfViewer
        filePath={filePath}
        paneWidth={paneWidth}
        interactive={interactive}
        displayName={displayName}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "docx") {
    viewer = (
      <DocxViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "zip") {
    viewer = (
      <ZipViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "html") {
    viewer = (
      <HtmlViewer
        filePath={filePath}
        interactive={interactive}
        displayName={displayName}
        sizeLabel={sizeLabel}
      />
    );
  } else if (kind === "srt") {
    viewer = (
      <SrtEditor
        filePath={filePath}
        interactive={interactive}
        displayName={displayName}
        sizeLabel={sizeLabel}
      />
    );
  } else {
    viewer = (
      <CodeViewer
        filePath={filePath}
        extension={extension}
        interactive={interactive}
        displayName={displayName}
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
