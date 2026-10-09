// pdf-viewer.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaUnpreviewableFallback } from "../generation/missing-asset-card.jsx";
import {
  __webpack_exports__getDocument,
  _$5,
  _t$2,
  $$8,
  $t$2,
  at$3,
  At$3,
  B$7,
  Bt$1,
  bt$3,
  classifyFileType,
  CompositedSvg,
  ct$3,
  Ct$3,
  D$7,
  Dt$2,
  dt$4,
  Et$2,
  et$4,
  f$4,
  F$6,
  Ft$2,
  ft$3,
  G$5,
  getDefaultExportFromCjs$1,
  Gt$1,
  gt$2,
  H$5,
  Ht$1,
  ht$2,
  It$1,
  it$3,
  j$5,
  J$6,
  jsxRuntimeExports,
  k$6,
  K$6,
  kt$2,
  L$7,
  Lt$1,
  lt$3,
  Mt$1,
  mt$2,
  N$4,
  Nt$1,
  nt$4,
  Ot$2,
  ot$3,
  P$7,
  pt$2,
  Pt$2,
  q$5,
  R$6,
  reactExports,
  requireJszip_min,
  Rt$2,
  rt$3,
  S$7,
  St$2,
  st$3,
  Tt$2,
  tt$4,
  useTranslation,
  ut$2,
  Ut$2,
  V$6,
  v$7,
  vt$2,
  W$7,
  wt$3,
  X$6,
  xt$2,
  Y$4,
  yt$2,
  Yt$2,
  Z$4,
  z$7,
  zt$2,
} from "../vendor.js";
import { ViewerLoading, ViewerStateShell } from "./input.jsx";
import {
  CANVAS_FILE_VERSION_QUERY_KEY,
  CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT,
  getOrCreateState,
  HEAVY_FILE_VIEWER_KINDS,
  touch,
  useFileUrl,
  useWorkspaceContentBudgetScope,
  workspaceScope$1,
} from "../infra/use-plugin-metadata-store.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useCanvasBridge } from "./package.jsx";
import { renderAsync } from "docx-preview";
import { useViewerActive } from "../infra/use-viewer-active.js";
import { HtmlViewer } from "../infra/create-html-iframe-pool-store.jsx";

function isWorkspaceFileViewerAdmissionAvailable(kind, state2) {
  if (!HEAVY_FILE_VIEWER_KINDS.has(kind)) return true;
  let heavyMountedCount = 0;
  for (const viewer of state2.fileViewers.values()) {
    if (!viewer.admitted) continue;
    if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) heavyMountedCount += 1;
  }
  return heavyMountedCount < CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT;
}

function registerWorkspaceFileViewerWithAdmission(input) {
  const state2 = getOrCreateState(input.workspaceId);
  const admitted = isWorkspaceFileViewerAdmissionAvailable(input.kind, state2);
  const id2 = state2.nextViewerRegistrationId++;
  if (!admitted) {
    state2.fileViewers.set(id2, {
      kind: input.kind,
      filePath: input.filePath,
      admitted: false,
    });
    touch(state2);
    return {
      admitted: false,
      unregister: () => {
        if (!state2.fileViewers.delete(id2)) return;
        touch(state2);
      },
    };
  }
  state2.fileViewers.set(id2, {
    kind: input.kind,
    filePath: input.filePath,
    admitted: true,
  });
  touch(state2);
  return {
    admitted: true,
    unregister: () => {
      if (!state2.fileViewers.delete(id2)) return;
      touch(state2);
    },
  };
}

function workspaceFileViewerAdmissionKey(input) {
  return `${workspaceScope$1(input.workspaceId)}\0${input.kind}\0${input.filePath ?? ""}\0${input.active === false ? "idle" : "active"}`;
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

var w$6 = (t2) => (e2) => {
  var p3 = t2[e2];
  if (p3) return p3();
  throw new Error("Module not found in bundle: " + e2);
};

var Se$2 = w$6({
  "./languages/asm.js": () => Promise.resolve().then(() => (F$6(), P$7)),
  "./languages/bash.js": () => Promise.resolve().then(() => (f$4(), $$8)),
  "./languages/bf.js": () => Promise.resolve().then(() => (B$7(), v$7)),
  "./languages/c.js": () => Promise.resolve().then(() => (H$5(), G$5)),
  "./languages/css.js": () => Promise.resolve().then(() => (k$6(), _$5)),
  "./languages/csv.js": () => Promise.resolve().then(() => (Y$4(), z$7)),
  "./languages/diff.js": () => Promise.resolve().then(() => (N$4(), Z$4)),
  "./languages/docker.js": () => Promise.resolve().then(() => (W$7(), X$6)),
  "./languages/git.js": () => Promise.resolve().then(() => (K$6(), j$5)),
  "./languages/go.js": () => Promise.resolve().then(() => (q$5(), V$6)),
  "./languages/html.js": () => Promise.resolve().then(() => (et$4(), tt$4)),
  "./languages/http.js": () => Promise.resolve().then(() => (st$3(), at$3)),
  "./languages/ini.js": () => Promise.resolve().then(() => (nt$4(), pt$2)),
  "./languages/java.js": () => Promise.resolve().then(() => (mt$2(), ct$3)),
  "./languages/js.js": () => Promise.resolve().then(() => (L$7(), rt$3)),
  "./languages/js_template_literals.js": () =>
    Promise.resolve().then(() => (ut$2(), ot$3)),
  "./languages/jsdoc.js": () => Promise.resolve().then(() => (ht$2(), Et$2)),
  "./languages/json.js": () => Promise.resolve().then(() => (gt$2(), it$3)),
  "./languages/leanpub-md.js": () =>
    Promise.resolve().then(() => (yt$2(), bt$3)),
  "./languages/log.js": () => Promise.resolve().then(() => (ft$3(), Tt$2)),
  "./languages/lua.js": () => Promise.resolve().then(() => (Nt$1(), It$1)),
  "./languages/make.js": () => Promise.resolve().then(() => (Rt$2(), At$3)),
  "./languages/md.js": () => Promise.resolve().then(() => (D$7(), dt$4)),
  "./languages/pl.js": () => Promise.resolve().then(() => (Lt$1(), Ot$2)),
  "./languages/plain.js": () => Promise.resolve().then(() => (St$2(), xt$2)),
  "./languages/py.js": () => Promise.resolve().then(() => (Dt$2(), Ct$3)),
  "./languages/regex.js": () => Promise.resolve().then(() => (Ut$2(), wt$3)),
  "./languages/rs.js": () => Promise.resolve().then(() => (Ft$2(), Pt$2)),
  "./languages/sql.js": () => Promise.resolve().then(() => ($t$2(), Mt$1)),
  "./languages/todo.js": () => Promise.resolve().then(() => (S$7(), lt$3)),
  "./languages/toml.js": () => Promise.resolve().then(() => (Bt$1(), vt$2)),
  "./languages/ts.js": () => Promise.resolve().then(() => (Ht$1(), Gt$1)),
  "./languages/uri.js": () => Promise.resolve().then(() => (kt$2(), _t$2)),
  "./languages/xml.js": () => Promise.resolve().then(() => (R$6(), J$6)),
  "./languages/yaml.js": () => Promise.resolve().then(() => (Yt$2(), zt$2)),
});

const INITIAL$1 = {
  status: "loading",
};

async function equalBytes(left, right, signal) {
  if (left.byteLength !== right.byteLength) return false;
  const a2 = new Uint8Array(left);
  const b3 = new Uint8Array(right);
  const chunkSize = 1024 * 1024;
  for (let start2 = 0; start2 < a2.length; start2 += chunkSize) {
    if (signal.aborted) return false;
    const end2 = Math.min(start2 + chunkSize, a2.length);
    for (let i2 = start2; i2 < end2; i2++) {
      if (a2[i2] !== b3[i2]) return false;
    }
    if (end2 < a2.length)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return true;
}

function useFileBytes(filePath, maxBytes, options) {
  const url2 = useFileUrl(filePath);
  const [state2, setState] = reactExports.useState(INITIAL$1);
  const revalidate = options?.revalidate ?? false;
  const previous2 = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!filePath) {
      previous2.current = null;
      setState({
        status: "error",
        errorKey: "canvas.file.viewer.loadFailed",
      });
      return;
    }
    if (!url2) {
      previous2.current = null;
      setState(INITIAL$1);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let requestUrl = url2;
    if (revalidate) {
      const stable = new URL(url2);
      stable.searchParams.delete(CANVAS_FILE_VERSION_QUERY_KEY);
      requestUrl = stable.href;
    }
    const cached =
      revalidate &&
      previous2.current?.url === requestUrl &&
      previous2.current.bytes.byteLength <= maxBytes
        ? previous2.current
        : null;
    if (!cached) {
      previous2.current = null;
      setState(INITIAL$1);
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
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > maxBytes) {
          throw new Error("TOO_LARGE");
        }
        if (cancelled) return;
        if (cached && (await equalBytes(cached.bytes, buf, controller.signal)))
          return;
        if (cancelled) return;
        previous2.current = revalidate
          ? {
              url: requestUrl,
              bytes: buf,
            }
          : null;
        setState({
          status: "success",
          bytes: buf,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (controller.signal.aborted) return;
        previous2.current = null;
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
  }, [filePath, url2, maxBytes, revalidate]);
  return state2;
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

const IMAGE_EXTS$1 = new Set([
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

function pickViewerKind(extension2) {
  if (!extension2) return "none";
  const ext = extension2.toLowerCase();
  if (IMAGE_EXTS$1.has(ext)) return "image";
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".srt" || ext === ".ass") return "srt";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ZIP_EXTS.has(ext)) return "zip";
  if (CODE_EXTS.has(ext)) return "code";
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
  const { t: t2 } = useTranslation();
  return (
    <ViewerStateShell>
      <div className="text-sm font-medium text-foreground">
        {t2(messageKey ?? "canvas.file.viewer.loadFailed", "预览加载失败")}
      </div>
    </ViewerStateShell>
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
  t2
    .replaceAll("&", "&#38;")
    .replaceAll?.("<", "&lt;")
    .replaceAll?.(">", "&gt;");

var De$3 = (t2, e2) => (e2 ? `<span class="shj-syn-${e2}">${t2}</span>` : t2);

async function Zt$2(t2, e2, p3) {
  try {
    let n2,
      m3,
      c3 = {},
      i2,
      r2 = [],
      h2 = 0,
      y4 =
        typeof e2 == "string"
          ? await (b$6[e2] ?? (b$6[e2] = Se$2(`./languages/${e2}.js`)))
          : e2,
      g2 = [...(typeof e2 == "string" ? y4.default : e2.sub)];
    for (; h2 < t2.length;) {
      for (c3.index = null, n2 = g2.length; n2-- > 0;) {
        if (
          ((m3 = g2[n2].expand ? U$6[g2[n2].expand] : g2[n2]),
          r2[n2] === void 0 || r2[n2].match.index < h2)
        ) {
          if (
            ((m3.match.lastIndex = h2), (i2 = m3.match.exec(t2)), i2 === null)
          ) {
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

function UnpreviewableViewer({
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

const VIEWER_SIZE_LIMITS = {
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

function CodeViewer({
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
      const final =
        rendered.length > MAX_HIGHLIGHTED_HTML_CHARS
          ? plainTextHtml(text2)
          : rendered;
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

const JSZip = getDefaultExportFromCjs$1(jszip_minExports);

function DocxViewer({
  filePath,
  interactive,
  displayName: displayName2,
  sizeLabel,
}) {
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
      <div
        ref={bodyRef}
        className="hilo-docx-body mx-auto bg-background shadow-sm"
      />
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

function PdfViewer({
  filePath,
  paneWidth,
  interactive,
  displayName: displayName2,
  sizeLabel,
}) {
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
        setPageIndex((index2) =>
          Math.min(index2, Math.max(0, doc22.numPages - 1)),
        );
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

function SrtEditor({
  filePath,
  interactive,
  displayName: displayName2,
  sizeLabel,
}) {
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
  if (
    bytesState.status === "loading" ||
    (bytesState.status === "success" && content2 === null)
  ) {
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
      value={content2 ?? ""}
      onChange={handleChange}
      onPointerDown={(e2) => e2.stopPropagation()}
      onKeyDown={(e2) => e2.stopPropagation()}
      spellCheck={false}
      placeholder={t2(
        "canvas.file.viewer.srt.placeholder",
        "字幕内容（SRT / ASS 格式）",
      )}
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
    const cleanPath2 = entry.isFolder
      ? entry.path.replace(/\/$/, "")
      : entry.path;
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
      {node2.isFolder ? (
        <ChevronGlyph open={isOpen} />
      ) : (
        <span className="w-3 shrink-0" />
      )}
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
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {sizeLabel}
        </span>
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
          {node2.isFolder &&
          openSet.has(node2.path) &&
          node2.children.length > 0 ? (
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

function countLeaves(nodes) {
  let n2 = 0;
  for (const node2 of nodes) {
    if (node2.isFolder) n2 += countLeaves(node2.children);
    else n2 += 1;
  }
  return n2;
}

function ZipViewer({
  filePath,
  interactive,
  displayName: displayName2,
  sizeLabel,
}) {
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
  if (parseError)
    return <ViewerError messageKey="canvas.file.viewer.loadFailed" />;
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
        <span className="shrink-0">
          {t2("canvas.file.viewer.zipSize", "大小")}
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
