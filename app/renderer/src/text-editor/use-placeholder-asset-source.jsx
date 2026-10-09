// use-placeholder-asset-source.jsx
import {
  API_PATHS,
  createAssetMutator,
  inferMediaKind,
  PreviewCardPopup,
  PreviewCardPortal,
  PreviewCardPositioner,
  PreviewCardRoot,
  PreviewCardTrigger$1,
  probeMediaDurationSec,
  reactExports,
  useAssetMetadataApi,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  CANVAS_REFERENCE_API,
  isCanvasReferenceUri,
  tableDocumentToLlmContent,
} from "./table-document-to-llm-content.js";
import { parseTableDocument } from "./parse-table-document.js";
import { CLOUD_ASSET_TABLE_EXTENSION } from "../assets/read-entity-drag-data.js";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import {
  useGatewayFetch,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
export function PreviewCard(props) {
  return <PreviewCardRoot data-slot="preview-card" {...props} />;
}
export function PreviewCardTrigger({
  delay = 300,
  closeDelay = 150,
  ...props
}) {
  return (
    <PreviewCardTrigger$1
      data-slot="preview-card-trigger"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  );
}
export function PreviewCardContent({
  className,
  side = "right",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  collisionPadding,
  positionerClassName,
  portalContainer,
  children: children2,
  ...props
}) {
  return (
    <PreviewCardPortal container={portalContainer ?? void 0}>
      <PreviewCardPositioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className={cn("isolate z-50", positionerClassName)}
      >
        <PreviewCardPopup
          data-slot="preview-card-content"
          className={cn(
            // Layout: fixed-width card. Height is content-driven and
            // uncapped — asset previews already constrain media to
            // 320×320 max, and metadata tables are short, so a hard
            // max-height + scroll just gets in the way (the scroll
            // bar visibly intersects the card border on tall image
            // previews). If a future preview type needs scrolling,
            // gate it locally within that preview's body.
            "elevated-surface-border z-50 w-[260px] origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-lg outline-none",
            // Animation (mirrors tooltip / dialog convention used in
            // shadcn-style wrappers across this codebase).
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children2}
        </PreviewCardPopup>
      </PreviewCardPositioner>
    </PreviewCardPortal>
  );
}
export function useCanvasResourceResolvers(httpClient) {
  const gatewayFetch2 = useGatewayFetch();
  const gatewayUrl2 = useGatewayUrl();
  const { t: t2 } = useTranslation();
  const handleLoadTextContent = reactExports.useCallback(
    async (filePath) => {
      if (isCanvasReferenceUri(filePath)) {
        const response = await gatewayFetch2(
          `${CANVAS_REFERENCE_API.content}?ref=${encodeURIComponent(filePath)}`,
        );
        if (!response.ok)
          throw new Error(
            t2("canvas.reference.unavailable", "Reference unavailable"),
          );
        return response.text();
      }
      try {
        return await httpClient.readContent(filePath);
      } catch {
        return "";
      }
    },
    [httpClient, gatewayFetch2, t2],
  );
  const handleResolveFileUrl = reactExports.useCallback(
    (path2) =>
      gatewayUrl2(
        isCanvasReferenceUri(path2)
          ? `${CANVAS_REFERENCE_API.content}?ref=${encodeURIComponent(path2)}`
          : API_PATHS.serveFile(path2),
      ) ?? "",
    [gatewayUrl2],
  );
  const handleResolveThumbUrl = reactExports.useCallback(
    (path2, displayWidth, kind) => {
      if (isCanvasReferenceUri(path2))
        return withThumbnail(
          gatewayUrl2(
            `${CANVAS_REFERENCE_API.content}?ref=${encodeURIComponent(path2)}`,
          ),
          displayWidth,
        );
      const base2 =
        kind === "image"
          ? gatewayUrl2(API_PATHS.serveFile(path2))
          : gatewayUrl2(
              `/api/thumbnail/${path2.split("/").map(encodeURIComponent).join("/")}`,
            );
      return withThumbnail(base2, displayWidth);
    },
    [gatewayUrl2],
  );
  return {
    handleLoadTextContent,
    handleResolveFileUrl,
    handleResolveThumbUrl,
  };
}
export function usePlaceholderAssetSource({
  active: active2,
  scope,
  pick,
  fill,
  captureTarget,
  onError,
}) {
  const epoch = reactExports.useRef(0);
  const current2 = reactExports.useRef({
    active: active2,
    scope,
  });
  if (current2.current.active !== active2 || current2.current.scope !== scope) {
    current2.current = {
      active: active2,
      scope,
    };
    epoch.current++;
  }
  const requests = reactExports.useRef(new Map());
  reactExports.useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  return reactExports.useCallback(
    async (nodeId, kind, anchor) => {
      if (!active2 || !anchor || requests.current.has(nodeId)) return;
      const targetValid = captureTarget(nodeId);
      if (!targetValid()) return;
      const generation = epoch.current;
      const request = {};
      requests.current.set(nodeId, request);
      const valid2 = () =>
        generation === epoch.current &&
        requests.current.get(nodeId) === request &&
        targetValid();
      try {
        const resources = await pick(
          {
            type: kind,
            multiple: false,
            maxCount: 1,
            tabs: ["canvas", "upload"],
            uploadMode: "attach",
          },
          {
            anchor,
          },
        );
        const resource = resources?.[0];
        if (valid2() && resource?.assetId && resource.type === kind)
          fill(nodeId, resource);
      } catch (error) {
        if (valid2()) onError(error);
      } finally {
        if (requests.current.get(nodeId) === request)
          requests.current.delete(nodeId);
      }
    },
    [active2, captureTarget, fill, onError, pick],
  );
}
export function uploadResponseMediaResourceFields(res, meta2) {
  const width = meta2?.width ?? res.width;
  const height = meta2?.height ?? res.height;
  const durationSec =
    meta2?.durationSec ??
    (typeof res.durationMs === "number" && res.durationMs > 0
      ? res.durationMs / 1e3
      : void 0);
  return {
    ...(typeof width === "number"
      ? {
          width,
        }
      : {}),
    ...(typeof height === "number"
      ? {
          height,
        }
      : {}),
    ...(typeof durationSec === "number" && durationSec > 0
      ? {
          durationSec,
        }
      : {}),
  };
}
export function useAssetMutator(httpClient) {
  const assetMetadataStore = useAssetMetadataApi();
  return reactExports.useMemo(
    () =>
      createAssetMutator({
        httpClient,
        assetMetadataStore,
        probeDurationSec: probeMediaDurationSec,
        inferKind: (file) => {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          return inferMediaKind(file.type ?? "", ext);
        },
      }),
    [httpClient, assetMetadataStore],
  );
}
export async function blobToPng(blob) {
  if (blob.type === "image/png") return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/png"),
    );
  } catch {
    return null;
  }
}
async function importExternalFiles(absolutePaths, fetcher = gatewayFetch) {
  if (absolutePaths.length === 0) return [];
  const res = await fetcher(API_PATHS.importExternal, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: absolutePaths,
    }),
  });
  if (!res.ok) throw new Error(`Import failed: ${res.status}`);
  const data2 = await res.json();
  return (data2.imported ?? []).filter((row) => Boolean(row?.id && row?.path));
}
export function useImportExternalFiles() {
  const scopedFetch = useGatewayFetch();
  return reactExports.useCallback(
    (absolutePaths) => importExternalFiles(absolutePaths, scopedFetch),
    [scopedFetch],
  );
}
const HTABLE_SUFFIX = `.${CLOUD_ASSET_TABLE_EXTENSION}`;
export function isHtableFileName(name2) {
  return name2.toLowerCase().endsWith(HTABLE_SUFFIX);
}
function htableTitleFromFileName(fileName) {
  const base2 = fileName.split(/[\\/]/).pop() ?? fileName;
  return isHtableFileName(base2)
    ? base2.slice(0, base2.length - HTABLE_SUFFIX.length)
    : base2;
}
export class HtableParseError extends Error {
  constructor(cause) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "HtableParseError";
  }
}
function htableContentToWriteRequest(raw2, opts = {}) {
  let llm;
  try {
    llm = tableDocumentToLlmContent(parseTableDocument(raw2));
  } catch (err) {
    throw new HtableParseError(err);
  }
  const title = opts.title?.trim();
  const position2 = opts.position
    ? {
        x: Math.round(opts.position.x),
        y: Math.round(opts.position.y),
      }
    : void 0;
  return {
    columns: llm.columns,
    rows: llm.rows,
    ...(llm.filter
      ? {
          filter: llm.filter,
        }
      : {}),
    ...(llm.rowHeight
      ? {
          rowHeight: llm.rowHeight,
        }
      : {}),
    ...(title
      ? {
          title,
        }
      : {}),
    ...(position2
      ? {
          position: position2,
        }
      : {}),
  };
}
export async function importHtableToCanvas(file, fetcher, position2) {
  const readRes = await fetcher(API_PATHS.serveLocal(file.absolutePath));
  if (!readRes.ok) throw new Error(`Read .htable failed: ${readRes.status}`);
  const body2 = htableContentToWriteRequest(await readRes.text(), {
    title: htableTitleFromFileName(file.name),
    position: position2,
  });
  const writeRes = await fetcher("/api/canvas/table-node", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  if (!writeRes.ok) {
    const detail = await writeRes.text().catch(() => "");
    throw new Error(
      `Create table node failed: ${writeRes.status} ${detail}`.trimEnd(),
    );
  }
  return await writeRes.json();
}
