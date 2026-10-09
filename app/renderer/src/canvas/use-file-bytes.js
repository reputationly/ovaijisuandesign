// use-file-bytes.js
import {
  reactExports,
  useStore$3,
  createStore$1,
  useStore$2,
  F$6,
  P$7,
  f$4,
  $$8,
  B$7,
  v$7,
  H$5,
  G$5,
  k$6,
  _$5,
  Y$4,
  z$7,
  N$4,
  Z$4,
  W$7,
  X$6,
  K$6,
  j$5,
  q$5,
  V$6,
  et$4,
  tt$4,
  st$3,
  at$3,
  nt$4,
  pt$2,
  mt$2,
  ct$3,
  L$7,
  rt$3,
  ut$2,
  ot$3,
  ht$2,
  Et$2,
  gt$2,
  it$3,
  yt$2,
  bt$3,
  ft$3,
  Tt$2,
  Nt$1,
  It$1,
  Rt$2,
  At$3,
  D$7,
  dt$4,
  Lt$1,
  Ot$2,
  St$2,
  xt$2,
  Dt$2,
  Ct$3,
  Ut$2,
  wt$3,
  Ft$2,
  Pt$2,
  $t$2,
  Mt$1,
  S$7,
  lt$3,
  Bt$1,
  vt$2,
  Ht$1,
  Gt$1,
  kt$2,
  _t$2,
  R$6,
  J$6,
  Yt$2,
  zt$2,
  useReactFlow,
} from "../vendor.js";
import {
  CANVAS_FILE_VERSION_QUERY_KEY,
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  useFileUrl,
} from "../infra/create-html-iframe-pool-store.jsx";
import { getDerivedNodePosition } from "../infra/create-recently-added-store.jsx";
var w$6 = (t2) => (e2) => {
  var p3 = t2[e2];
  if (p3) return p3();
  throw new Error("Module not found in bundle: " + e2);
};
export var Se$2 = w$6({
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
  "./languages/js_template_literals.js": () => Promise.resolve().then(() => (ut$2(), ot$3)),
  "./languages/jsdoc.js": () => Promise.resolve().then(() => (ht$2(), Et$2)),
  "./languages/json.js": () => Promise.resolve().then(() => (gt$2(), it$3)),
  "./languages/leanpub-md.js": () => Promise.resolve().then(() => (yt$2(), bt$3)),
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
    if (end2 < a2.length) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return true;
}
export function useFileBytes(filePath, maxBytes, options) {
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
        const declared = lenHeader ? Number.parseInt(lenHeader, 10) : Number.NaN;
        if (Number.isFinite(declared) && declared > maxBytes) {
          throw new Error("TOO_LARGE");
        }
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > maxBytes) {
          throw new Error("TOO_LARGE");
        }
        if (cancelled) return;
        if (cached && (await equalBytes(cached.bytes, buf, controller.signal))) return;
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
const ZIP_EXTS = new Set([".zip", ".jar", ".war", ".apk", ".ipa", ".xpi", ".epub"]);
export function pickViewerKind(extension2) {
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
export const HTML_VIEWER_UNLOAD_AFTER_MS = 6e3;
export const ACTIVE_GATED_VIEWER_KINDS = new Set(["image", "pdf", "code", "docx", "zip", "html"]);
export const GROUP_DERIVED_CHILD_COUNT_KEY = "__derivedChildCount";
export const GROUP_DERIVED_COLLAPSED_KEY = "__derivedCollapsed";
export function clamp$6(v2, min2, max2) {
  return Math.min(Math.max(v2, min2), max2);
}
const SAFE_AREA = {
  top: 80,
  bottom: 88,
  horizontal: 72,
};
const GEOMETRY_REFIT_THRESHOLD = 4;
const RESERVE_REFIT_THRESHOLD = 8;
function shouldRefitViewportFocusLayout(previous2, next2) {
  if (!previous2) return true;
  const geometryChanged =
    Math.abs(next2.canvasWidth - previous2.canvasWidth) >= GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.canvasHeight - previous2.canvasHeight) >= GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeFlowX - previous2.nodeFlowX) >= GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeFlowY - previous2.nodeFlowY) >= GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeWidth - previous2.nodeWidth) >= GEOMETRY_REFIT_THRESHOLD ||
    Math.abs(next2.nodeHeight - previous2.nodeHeight) >= GEOMETRY_REFIT_THRESHOLD;
  const reserveChanged =
    Math.abs(next2.topReserve - previous2.topReserve) >= RESERVE_REFIT_THRESHOLD ||
    Math.abs(next2.bottomReserve - previous2.bottomReserve) >= RESERVE_REFIT_THRESHOLD ||
    Math.abs(next2.rightReserve - previous2.rightReserve) >= RESERVE_REFIT_THRESHOLD;
  const zoomLimitChanged =
    (next2.maxZoom ?? CANVAS_MAX_ZOOM) !== (previous2.maxZoom ?? CANVAS_MAX_ZOOM);
  return geometryChanged || reserveChanged || zoomLimitChanged;
}
function computeViewportFocusLayout(input) {
  const {
    canvasWidth,
    canvasHeight,
    nodeFlowX,
    nodeFlowY,
    nodeWidth,
    nodeHeight,
    topReserve,
    bottomReserve,
    rightReserve,
    maxZoom = CANVAS_MAX_ZOOM,
  } = input;
  const effectiveTop = SAFE_AREA.top + Math.max(0, topReserve);
  const effectiveBottom = SAFE_AREA.bottom + Math.max(0, bottomReserve);
  const effectiveRight = SAFE_AREA.horizontal + Math.max(0, rightReserve);
  const rawAvailW = canvasWidth - SAFE_AREA.horizontal - effectiveRight;
  const rawAvailH = canvasHeight - effectiveTop - effectiveBottom;
  const availW = Math.max(1, rawAvailW);
  const availH = Math.max(1, rawAvailH);
  const zoom2 = clamp$6(
    Math.min(availW / Math.max(1, nodeWidth), availH / Math.max(1, nodeHeight)),
    CANVAS_MIN_ZOOM,
    clamp$6(maxZoom, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM),
  );
  const nodeCenterX = nodeFlowX + nodeWidth / 2;
  const nodeCenterY = nodeFlowY + nodeHeight / 2;
  const centerX = rawAvailW > 0 ? SAFE_AREA.horizontal + rawAvailW / 2 : canvasWidth / 2;
  const centerY = rawAvailH > 0 ? effectiveTop + rawAvailH / 2 : canvasHeight / 2;
  return {
    x: centerX - nodeCenterX * zoom2,
    y: centerY - nodeCenterY * zoom2,
    zoom: zoom2,
  };
}
export function useCropViewportZoom(
  target,
  bottomReserve = 0,
  rightReserve = 0,
  topReserve = 0,
  maxZoom = CANVAS_MAX_ZOOM,
) {
  const { setViewport, getViewport } = useReactFlow();
  const canvasWidth = useStore$3((s2) => s2.width);
  const canvasHeight = useStore$3((s2) => s2.height);
  const lastLayoutInput = reactExports.useRef(null);
  if (!target) {
    lastLayoutInput.current = null;
  }
  reactExports.useLayoutEffect(() => {
    if (!target) return;
    if (!canvasWidth || !canvasHeight) return;
    const layoutInput = {
      canvasWidth,
      canvasHeight,
      ...target,
      topReserve,
      bottomReserve,
      rightReserve,
      maxZoom,
    };
    if (!shouldRefitViewportFocusLayout(lastLayoutInput.current, layoutInput)) return;
    const isFirst = lastLayoutInput.current === null;
    lastLayoutInput.current = layoutInput;
    const { x: targetX, y: targetY, zoom: targetZoom } = computeViewportFocusLayout(layoutInput);
    let duration;
    if (isFirst) {
      const current2 = getViewport();
      const distance2 = Math.sqrt((targetX - current2.x) ** 2 + (targetY - current2.y) ** 2);
      const zoomDelta = Math.abs(targetZoom - current2.zoom);
      duration = clamp$6(
        200 +
          distance2 * 0.5 +
          zoomDelta * 600 +
          (1 / Math.max(current2.zoom, CANVAS_MIN_ZOOM)) * 200,
        200,
        1500,
      );
    } else {
      duration = 250;
    }
    setViewport(
      {
        x: targetX,
        y: targetY,
        zoom: targetZoom,
      },
      {
        duration,
      },
    );
  }, [
    target,
    canvasWidth,
    canvasHeight,
    topReserve,
    bottomReserve,
    rightReserve,
    maxZoom,
    setViewport,
    getViewport,
  ]);
}
export function createCanvasOverlayStore() {
  return createStore$1((set2) => ({
    active: null,
    startCrop: (nodeId, meta2) =>
      set2({
        active: {
          kind: "crop",
          nodeId,
          meta: meta2,
        },
      }),
    cancelCrop: () =>
      set2((s2) =>
        s2.active?.kind === "crop"
          ? {
              active: null,
            }
          : s2,
      ),
    startOutpaint: (nodeId, meta2) =>
      set2({
        active: {
          kind: "outpaint",
          nodeId,
          meta: meta2,
        },
      }),
    cancelOutpaint: () =>
      set2((s2) =>
        s2.active?.kind === "outpaint"
          ? {
              active: null,
            }
          : s2,
      ),
    startErase: (nodeId, meta2) =>
      set2({
        active: {
          kind: "erase",
          nodeId,
          meta: meta2,
        },
      }),
    cancelErase: () =>
      set2((s2) =>
        s2.active?.kind === "erase"
          ? {
              active: null,
            }
          : s2,
      ),
    startRedraw: (nodeId, meta2) =>
      set2({
        active: {
          kind: "redraw",
          nodeId,
          meta: meta2,
        },
      }),
    cancelRedraw: () =>
      set2((s2) =>
        s2.active?.kind === "redraw"
          ? {
              active: null,
            }
          : s2,
      ),
    startMoveObject: (nodeId, meta2) =>
      set2({
        active: {
          kind: "move-object",
          nodeId,
          meta: meta2,
        },
      }),
    cancelMoveObject: () =>
      set2((s2) =>
        s2.active?.kind === "move-object"
          ? {
              active: null,
            }
          : s2,
      ),
    reset: () =>
      set2({
        active: null,
      }),
  }));
}
const defaultCanvasOverlayStore = createCanvasOverlayStore();
export const CanvasOverlayStoreContext = reactExports.createContext(null);
export function useCanvasOverlayApi() {
  return reactExports.useContext(CanvasOverlayStoreContext) ?? defaultCanvasOverlayStore;
}
export const useCanvasOverlayStore = (selector2) => useStore$2(useCanvasOverlayApi(), selector2);
useCanvasOverlayStore.getState = defaultCanvasOverlayStore.getState;
useCanvasOverlayStore.setState = defaultCanvasOverlayStore.setState;
useCanvasOverlayStore.subscribe = defaultCanvasOverlayStore.subscribe;
export function useCropState() {
  const croppingNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "crop" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) => (s2.active?.kind === "crop" ? s2.active.meta : null));
  const startCrop = useCanvasOverlayStore((s2) => s2.startCrop);
  const cancelCrop = useCanvasOverlayStore((s2) => s2.cancelCrop);
  return {
    croppingNodeId,
    meta: meta2,
    startCrop,
    cancelCrop,
  };
}
export function useEmitDerivedFromBlob({ id: id2, meta: meta2, nodeWidth, reactFlow, cropImage }) {
  return reactExports.useCallback(
    async (blob, { suffix, ext, baseFallback = "image" }) => {
      if (!cropImage) return;
      const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? baseFallback;
      const position2 = getDerivedNodePosition(reactFlow, id2, reactFlow.getEdges(), nodeWidth);
      const uuid = crypto.randomUUID().slice(0, 4);
      const tail = suffix ? `${suffix}-${uuid}` : uuid;
      return cropImage(id2, blob, `${baseName}-${tail}.${ext}`, position2);
    },
    [id2, meta2?.name, cropImage, reactFlow, nodeWidth],
  );
}
export function getNodeFlowRect(reactFlow, id2, fallbackWidth, fallbackHeight) {
  const node2 = reactFlow.getInternalNode(id2);
  if (!node2) return null;
  const width = node2.measured?.width ?? fallbackWidth;
  const height = node2.measured?.height ?? fallbackHeight ?? fallbackWidth;
  return {
    x: node2.internals.positionAbsolute.x,
    y: node2.internals.positionAbsolute.y,
    width,
    height,
  };
}
function derivePanelDimensions(rect, meta2) {
  if (meta2.width > 0 && meta2.height > 0 && rect.width > 0) {
    return {
      width: rect.width,
      height: rect.width * (meta2.height / meta2.width),
    };
  }
  return {
    width: rect.width,
    height: rect.height,
  };
}
export function useStartCropFromNode({
  id: id2,
  meta: meta2,
  nodeWidth,
  nodeHeight,
  reactFlow,
  cropImage,
}) {
  const { startCrop } = useCropState();
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const handleCropConfirm = reactExports.useCallback(
    async (blob) => {
      const ext = meta2?.name?.split(".").pop() ?? "png";
      await emitDerived(blob, {
        suffix: "",
        ext,
        baseFallback: "cropped",
      });
    },
    [meta2?.name, emitDerived],
  );
  const handleCrop = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
    if (!rect) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((n2) =>
        n2.selected
          ? {
              ...n2,
              selected: false,
            }
          : n2,
      ),
    );
    const panel = derivePanelDimensions(rect, {
      width: meta2.width ?? 0,
      height: meta2.height ?? 0,
    });
    startCrop(id2, {
      src: meta2.url,
      originalWidth: meta2.width || 0,
      originalHeight: meta2.height || 0,
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: panel.width,
      nodeHeight: panel.height,
      onConfirm: handleCropConfirm,
    });
  }, [id2, meta2, reactFlow, nodeWidth, nodeHeight, startCrop, handleCropConfirm]);
  return {
    handleCrop,
  };
}
