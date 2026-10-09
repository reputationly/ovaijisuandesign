// use-canvas-image-annotation-host.jsx
import {
  useTranslation,
  reactExports,
  useGatewayFetch,
  API_PATHS,
  useCurrentWorkspace,
  useWorkspaceProject,
  useGatewayUrl,
  withThumbnail,
  PreviewCardRoot,
  PreviewCardPortal,
  PreviewCardPositioner,
  PreviewCardPopup,
  useAssetMetadataApi,
  detectFileType,
  gatewayFetch,
  PreviewCardTrigger$1,
  createAssetMutator,
  probeMediaDurationSec,
  inferMediaKind,
} from "../vendor.js";
import { cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { useProjectAssetsService } from "../m10/use-move-dnd.jsx";
import { useProjectActions } from "../m10/custom-provider-form.jsx";
import {
  EntityHoverCardBody,
  CLOUD_ASSET_TABLE_EXTENSION,
} from "../m10/asset-center-relocation-coach-mark.jsx";
import {
  isCanvasReferenceUri,
  CANVAS_REFERENCE_API,
  mapCanvasReferenceCandidates,
  mapCanvasReferenceResolutions,
  tableDocumentToLlmContent,
  parseTableDocument,
} from "../m01/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageAnnotationDialog } from "./image-annotation-dialog.jsx";
export function useCanvasImageAnnotationHost(active2) {
  const [session, setSession] = reactExports.useState(null);
  const sessionRef = reactExports.useRef(null);
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const close2 = reactExports.useCallback(() => {
    const current2 = sessionRef.current;
    if (!current2) return;
    sessionRef.current = null;
    current2.controller.abort();
    current2.finish();
    setSession(null);
  }, []);
  reactExports.useEffect(() => {
    if (!active2) close2();
  }, [active2, close2]);
  reactExports.useEffect(
    () => () => {
      const current2 = sessionRef.current;
      sessionRef.current = null;
      current2?.controller.abort();
      current2?.finish();
    },
    [],
  );
  const openImageAnnotation = reactExports.useCallback(
    (request) => {
      if (!activeRef.current || request.signal.aborted || sessionRef.current)
        return Promise.resolve();
      return new Promise((resolve) => {
        const controller = new AbortController();
        const abort = () => close2();
        const current2 = {
          request,
          controller,
          attachment: {
            id: `canvas-annotation-${crypto.randomUUID()}`,
            filename: request.name,
            relativePath: request.path,
            previewUrl: request.url,
            fileType: "image",
            status: "done",
          },
          finish: () => {
            request.signal.removeEventListener("abort", abort);
            resolve();
          },
        };
        request.signal.addEventListener("abort", abort, {
          once: true,
        });
        sessionRef.current = current2;
        setSession(current2);
      });
    },
    [close2],
  );
  const annotationDialog = session ? (
    <ImageAnnotationDialog
      key={session.attachment.id}
      attachment={session.attachment}
      canAppend={session.request.canAppend}
      applyDisabled={!active2}
      onClose={close2}
      onApply={async (_attachment, file, mode2, signal) => {
        const isCurrent = () =>
          activeRef.current &&
          sessionRef.current === session &&
          !session.controller.signal.aborted &&
          !session.request.signal.aborted &&
          !signal.aborted;
        if (!isCurrent() || (mode2 === "append" && !session.request.canAppend)) return false;
        const combined = new AbortController();
        const abort = () => combined.abort();
        for (const source of [signal, session.controller.signal, session.request.signal]) {
          source.addEventListener("abort", abort, {
            once: true,
          });
        }
        try {
          return await session.request.onApply(file, mode2, combined.signal);
        } finally {
          for (const source of [signal, session.controller.signal, session.request.signal]) {
            source.removeEventListener("abort", abort);
          }
        }
      }}
    />
  ) : null;
  return {
    openImageAnnotation,
    annotationDialog,
  };
}
function useProjectAssetReferences(workspace) {
  const projectId = useWorkspaceProject(workspace || void 0)?.id;
  const { ensureProjectFolderName } = useProjectActions();
  const assets = useProjectAssetsService();
  const searchProjectAssets = reactExports.useCallback(
    async (query, limit = 50, signal) => {
      const empty2 = {
        items: [],
        truncated: false,
      };
      if (!projectId || signal?.aborted) return empty2;
      const scope = await ensureProjectFolderName(projectId);
      if (!scope || signal?.aborted) return empty2;
      const rows = await assets.listAssets(scope);
      if (signal?.aborted) return empty2;
      const normalized = query.trim().toLocaleLowerCase();
      const matches2 = rows.filter(
        (row) => !normalized || row.name.toLocaleLowerCase().includes(normalized),
      );
      return {
        items: matches2.slice(0, limit).map((row) => {
          const type2 = detectFileType(row.name);
          const kind =
            type2 === "image" || type2 === "video" || type2 === "audio" || type2 === "text"
              ? type2
              : "other";
          const reference = {
            source: "project",
            scope,
            id: row.id,
            name: row.name,
            kind,
          };
          return {
            reference,
            updatedAt: row.updatedAt,
          };
        }),
        truncated: matches2.length > limit,
      };
    },
    [assets, ensureProjectFolderName, projectId],
  );
  return {
    searchProjectAssets,
  };
}
export function PreviewCard$1(props) {
  return <PreviewCardRoot data-slot="preview-card" {...props} />;
}
export function PreviewCardTrigger({ delay = 300, closeDelay = 150, ...props }) {
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
        className={cn$2("isolate z-50", positionerClassName)}
      >
        <PreviewCardPopup
          data-slot="preview-card-content"
          className={cn$2(
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
function CanvasReferencePreview({ reference, trigger, status }) {
  const { t: t2 } = useTranslation();
  const missing = status === "deleted" || status === "missing";
  return (
    <PreviewCard$1>
      <PreviewCardTrigger render={trigger} />
      <PreviewCardContent side="top" sideOffset={8}>
        {missing ? (
          <p className="p-3 text-sm text-muted-foreground">
            {reference.source === "subject"
              ? t2("canvas.reference.subjectNotFound", "Subject not found")
              : t2("canvas.reference.assetNotFound", "Asset not found")}
          </p>
        ) : reference.target === "entity" ? (
          <EntityHoverCardBody entityId={reference.id} />
        ) : null}
      </PreviewCardContent>
    </PreviewCard$1>
  );
}
const renderPreview = (props) => reactExports.createElement(CanvasReferencePreview, props);
export function useCanvasReferenceBridge() {
  const workspace = useCurrentWorkspace();
  const { searchProjectAssets } = useProjectAssetReferences(workspace);
  const fetcher = useGatewayFetch();
  return reactExports.useMemo(
    () => ({
      renderPreview,
      async searchCandidates(query) {
        const response = await fetcher(
          `${CANVAS_REFERENCE_API.search}?q=${encodeURIComponent(query)}`,
        );
        if (!response.ok) throw new Error("Reference search unavailable");
        const subjects = mapCanvasReferenceCandidates(await response.json());
        const projects = await searchProjectAssets(query);
        return [
          ...projects.items.map(({ reference }) => ({
            id: `${reference.scope}/${reference.id}`,
            name: reference.name,
            source: reference.source,
            references: [reference],
          })),
          ...subjects,
        ];
      },
      async checkAvailability(references, options) {
        const endpoint = options?.include_metadata
          ? `${CANVAS_REFERENCE_API.resolve}?include_metadata=true`
          : CANVAS_REFERENCE_API.resolve;
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(references),
        });
        if (!response.ok) throw new Error("Reference resolution unavailable");
        return mapCanvasReferenceResolutions(await response.json(), references);
      },
    }),
    [fetcher, searchProjectAssets],
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
          throw new Error(t2("canvas.reference.unavailable", "Reference unavailable"));
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
          gatewayUrl2(`${CANVAS_REFERENCE_API.content}?ref=${encodeURIComponent(path2)}`),
          displayWidth,
        );
      const base2 =
        kind === "image"
          ? gatewayUrl2(API_PATHS.serveFile(path2))
          : gatewayUrl2(`/api/thumbnail/${path2.split("/").map(encodeURIComponent).join("/")}`);
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
        generation === epoch.current && requests.current.get(nodeId) === request && targetValid();
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
        if (valid2() && resource?.assetId && resource.type === kind) fill(nodeId, resource);
      } catch (error) {
        if (valid2()) onError(error);
      } finally {
        if (requests.current.get(nodeId) === request) requests.current.delete(nodeId);
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
    (typeof res.durationMs === "number" && res.durationMs > 0 ? res.durationMs / 1e3 : void 0);
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
    return await new Promise((resolve) => canvas.toBlob((result) => resolve(result), "image/png"));
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
  return isHtableFileName(base2) ? base2.slice(0, base2.length - HTABLE_SUFFIX.length) : base2;
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
    throw new Error(`Create table node failed: ${writeRes.status} ${detail}`.trimEnd());
  }
  return await writeRes.json();
}
