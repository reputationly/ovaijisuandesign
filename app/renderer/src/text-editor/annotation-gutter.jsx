// annotation-gutter.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function selectPendingHunksForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId) return [];
  return state2.session.hunks.filter((hunk) => hunk.status === "pending");
}

export function selectHasPendingHunksForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId)
    return false;
  return state2.session.hunks.some((hunk) => hunk.status === "pending");
}

export function selectAgentWriteSignalForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId)
    return null;
  return state2.session.requestId;
}

const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function joinAndNormalize(base2, rel) {
  const normalizedBase = base2.replace(/\\/g, "/").replace(/\/+$/g, "");
  const normalizedRel = rel.replace(/\\/g, "/");
  const combined = normalizedBase
    ? `${normalizedBase}/${normalizedRel}`
    : normalizedRel;
  const segments = [];
  for (const segment of combined.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length > 0) segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

export function deriveMdDir(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}

export function resolveMarkdownAssetUrl(rawUrl, mdDir, resolveFileUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("#")) return rawUrl;
  if (ABSOLUTE_URL_RE.test(rawUrl)) return rawUrl;
  if (!resolveFileUrl) return rawUrl;
  const stripped = rawUrl.startsWith("/") ? rawUrl.replace(/^\/+/, "") : rawUrl;
  const isAbsoluteFromRoot = rawUrl.startsWith("/");
  const joined = isAbsoluteFromRoot
    ? joinAndNormalize("", stripped)
    : joinAndNormalize(mdDir, stripped);
  if (!joined) return rawUrl;
  const resolved = resolveFileUrl(joined);
  return resolved || rawUrl;
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;

const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|flac|opus|oga)$/i;

export function classifyMarkdownAsset(url2) {
  if (!url2) return "image";
  const cleaned = url2.split("#")[0]?.split("?")[0] ?? "";
  if (VIDEO_EXT_RE.test(cleaned)) return "video";
  if (AUDIO_EXT_RE.test(cleaned)) return "audio";
  return "image";
}

const RICH_MARKDOWN_MAX_CHARS = 5e5;

export function isTextEditorContentReady(loaded, currentPath, loadedPath) {
  return (
    loaded && (currentPath ? loadedPath === currentPath : loadedPath === null)
  );
}

export function resolveTextEditorMode(markdown2, plain) {
  if (plain) return "plain-text";
  return markdown2.length <= RICH_MARKDOWN_MAX_CHARS
    ? "rich-markdown"
    : "source-markdown";
}

export function AnnotationGutter({
  editor,
  markers,
  activeId,
  anchorEl,
  onActivate,
}) {
  const [positions, setPositions] = reactExports.useState({});
  reactExports.useLayoutEffect(() => {
    if (!anchorEl) return;
    let raf = 0;
    const compute = () => {
      const hostTop = anchorEl.getBoundingClientRect().top;
      const next2 = {};
      for (const m3 of markers) {
        if (m3.seq == null) continue;
        try {
          const coords = editor.view.coordsAtPos(m3.from);
          next2[m3.id] = coords.top - hostTop;
        } catch {}
      }
      setPositions(next2);
    };
    raf = requestAnimationFrame(compute);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [editor, anchorEl, markers]);
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-0">
      {markers.map((m3) => {
        if (m3.seq == null) return null;
        const top2 = positions[m3.id];
        if (top2 == null) return null;
        const active2 = m3.id === activeId;
        return (
          <button
            key={m3.id}
            type="button"
            data-annotation-badge={m3.id}
            onClick={() => onActivate(m3.id)}
            className="pointer-events-auto absolute flex h-[18px] w-[18px] -translate-y-0.5 items-center justify-center rounded-full text-xs font-medium transition-transform hover:scale-110"
            style={{
              top: top2,
              right: -25,
              background: active2
                ? "var(--canvas-text-accent)"
                : "var(--canvas-text-accent-soft)",
              color: active2
                ? "var(--canvas-text-accent-foreground)"
                : "var(--canvas-text-accent)",
              boxShadow: active2
                ? "0 0 0 2px var(--canvas-text-accent)"
                : "none",
            }}
            title={`#${m3.seq}`}
          >
            {m3.seq}
          </button>
        );
      })}
    </div>
  );
}
