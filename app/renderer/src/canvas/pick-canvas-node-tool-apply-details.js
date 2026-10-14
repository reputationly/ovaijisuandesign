// pick-canvas-node-tool-apply-details.js
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { inferMediaKind } from "../infra/media-lineage.js";
import reactExports from "react";
import { useRouter } from "@tanstack/react-router";
import { getPluginMeta } from "../infra/use-plugin-metadata-store.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { GatewayNotReadyError } from "../infra/gateway-http-error.jsx";
import { computeNodeSize } from "./compute-group-bounds-from-children.js";
import { defaultNodeSizeForKind } from "./is-reexecutable-generation-node.js";
import { getAssetMetaByNodeIdFromStore } from "./fullscreen-icon.jsx";
import { blobToPng } from "../text-editor/use-placeholder-asset-source.jsx";

function trackPluginEditorOpen(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_EDITOR_OPEN, props);
}

export function useNodeContextMenuState(isActive) {
  const [contextMenu, setContextMenu] = reactExports.useState(null);
  const contextMenuRef = reactExports.useRef(null);
  contextMenuRef.current = contextMenu;
  const closeNodeContextMenu = reactExports.useCallback(() => {
    const current = contextMenuRef.current;
    contextMenuRef.current = null;
    current?.actions.dismissContextMenu();
    setContextMenu(null);
  }, []);
  reactExports.useEffect(() => {
    if (isActive === false) closeNodeContextMenu();
  }, [closeNodeContextMenu, isActive]);
  reactExports.useEffect(
    () => () => {
      contextMenuRef.current?.actions.dismissContextMenu();
      contextMenuRef.current = null;
    },
    [],
  );
  return {
    closeNodeContextMenu,
    contextMenu,
    setContextMenu,
  };
}

export function usePluginEditorActiveChangeTracking(
  workspaceId,
  closeNodeContextMenu,
) {
  const lastOpenRef = reactExports.useRef(new Map());
  return reactExports.useCallback(
    (session, active, agentName, pluginId, openContext) => {
      if (!workspaceId) return;
      if (active) closeNodeContextMenu();
      workspaceEvents.firePluginEditActive(
        workspaceId,
        session,
        active,
        agentName,
        pluginId,
      );
      if (!active || !pluginId) return;
      const now = Date.now();
      const previous = lastOpenRef.current.get(session.editSessionId);
      if (previous !== void 0 && now - previous < 1e3) return;
      lastOpenRef.current.set(session.editSessionId, now);
      const meta = getPluginMeta(pluginId);
      trackPluginEditorOpen({
        plugin_id: pluginId,
        plugin_version: meta?.version ?? "unknown",
        plugin_source: meta?.source ?? "installed",
        plugin_instance_id: session.nodeId,
        surface: "canvas",
        entry_source: openContext?.entrySource ?? "programmatic",
        edit_session_id: session.editSessionId,
        duration_ms: openContext?.durationMs ?? 0,
      });
    },
    [workspaceId, closeNodeContextMenu],
  );
}

const PLUGIN_NAVIGATE_LEGACY_REDIRECTS = {};

export function usePluginNavigate() {
  const router = useRouter();
  return reactExports.useCallback(
    async (args) => {
      const to = PLUGIN_NAVIGATE_LEGACY_REDIRECTS[args.to] ?? args.to;
      if (!to.startsWith("/")) return false;
      try {
        const routeLocation = router.buildLocation({
          to,
          params: args.params,
          search: args.search,
        });
        if (!router.getMatchedRoutes(routeLocation.pathname).foundRoute)
          return false;
        await router.navigate({
          to,
          params: args.params,
          search: args.search,
        });
        return true;
      } catch {
        return false;
      }
    },
    [router],
  );
}

export const GATEWAY_NOT_READY_HTTP_CLIENT = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then") return void 0;
      return () => {
        throw new GatewayNotReadyError();
      };
    },
  },
);

export function pickCanvasNodeToolApplyDetails(input) {
  if (!input) return {};
  const output = {};
  const numberKeys = [
    "stroke_count",
    "brush_size",
    "prompt_length",
    "fps",
    "output_bytes",
    "rotation_angle",
    "cell_count",
    "region_count",
  ];
  for (const key of numberKeys) {
    if (typeof input[key] === "number") output[key] = input[key];
  }
  const stringKeys = ["crop_ratio", "resolution", "magnification", "language"];
  for (const key of stringKeys) {
    if (typeof input[key] === "string") output[key] = input[key];
  }
  if (typeof input.flip_horizontal === "boolean")
    output.flip_horizontal = input.flip_horizontal;
  if (typeof input.flip_vertical === "boolean")
    output.flip_vertical = input.flip_vertical;
  if (input.output_mode === "enhance" || input.output_mode === "crop") {
    output.output_mode = input.output_mode;
  }
  if (input.mode === "auto" || input.mode === "manual")
    output.mode = input.mode;
  if (typeof input.pinnedCount === "number")
    output.pinned_count = input.pinnedCount;
  if (typeof input.showLabels === "boolean")
    output.show_labels = input.showLabels;
  return output;
}

export function resolveNodeSize(file, intrinsic) {
  const kind = inferMediaKind(file.type, file.name);
  if ((kind === "image" || kind === "video") && intrinsic) {
    const computed = computeNodeSize(intrinsic.width, intrinsic.height);
    if (computed) return computed;
  }
  return defaultNodeSizeForKind(kind);
}

function measureImageFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const mediaWidth = img.naturalWidth;
      const mediaHeight = img.naturalHeight;
      resolve(
        mediaWidth > 0 && mediaHeight > 0
          ? {
              width: mediaWidth,
              height: mediaHeight,
            }
          : void 0,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(void 0);
    };
    img.src = url;
  });
}

function measureVideoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = "";
    };
    video.onloadedmetadata = () => {
      const mediaWidth = video.videoWidth;
      const mediaHeight = video.videoHeight;
      cleanup();
      resolve(
        mediaWidth > 0 && mediaHeight > 0
          ? {
              width: mediaWidth,
              height: mediaHeight,
            }
          : void 0,
      );
    };
    video.onerror = () => {
      cleanup();
      resolve(void 0);
    };
    video.src = url;
  });
}

export async function measureMediaSize(file) {
  const kind = inferMediaKind(file.type, file.name);
  if (kind === "image") return measureImageFile(file);
  if (kind === "video") return measureVideoFile(file);
  return void 0;
}

const ENHANCE_INPUT_SHORT_MIN = 256;

const ENHANCE_OUTPUT_EDGE_MAX = 10240;

export async function resizeImageBlob(blob, targetWidth, targetHeight) {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();
    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png"),
    );
  } catch {
    return null;
  }
}

export function computeEnhanceGridTarget(srcWidth, srcHeight, multiplier) {
  if (srcWidth <= 0 || srcHeight <= 0 || multiplier <= 0) return null;
  const shortEdge = Math.min(srcWidth, srcHeight);
  const prepScale =
    shortEdge < ENHANCE_INPUT_SHORT_MIN
      ? ENHANCE_INPUT_SHORT_MIN / shortEdge
      : 1;
  const prepWidth = Math.max(1, Math.round(srcWidth * prepScale));
  const prepHeight = Math.max(1, Math.round(srcHeight * prepScale));
  let targetWidth = Math.round(srcWidth * multiplier);
  let targetHeight = Math.round(srcHeight * multiplier);
  const longTarget = Math.max(targetWidth, targetHeight);
  if (longTarget > ENHANCE_OUTPUT_EDGE_MAX) {
    const clampScale = ENHANCE_OUTPUT_EDGE_MAX / longTarget;
    targetWidth = Math.round(targetWidth * clampScale);
    targetHeight = Math.round(targetHeight * clampScale);
  }
  targetWidth = Math.max(1, targetWidth);
  targetHeight = Math.max(1, targetHeight);
  return {
    prepWidth,
    prepHeight,
    targetWidth,
    targetHeight,
  };
}

export async function buildImageCopyPayload(node, assetMetadataStore) {
  const meta = getAssetMetaByNodeIdFromStore(assetMetadataStore, node.id);
  if (!meta?.url) return null;
  try {
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    const png = await blobToPng(await res.blob());
    return png
      ? {
          "image/png": png,
        }
      : null;
  } catch (err) {
    console.warn("[canvas] image copy payload failed:", err);
    return null;
  }
}

export function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("blobToDataUri: FileReader returned non-string"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("blobToDataUri: read failed"));
    reader.readAsDataURL(blob);
  });
}

export function mapPluginDataReadResult(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("plugin: readPluginData returned a non-object response");
  }
  const record = raw;
  if (typeof record.nodeId !== "string" || !record.nodeId) {
    throw new Error("plugin: readPluginData response is missing nodeId");
  }
  if (
    !Array.isArray(record.keys) ||
    !record.keys.every((key) => typeof key === "string")
  ) {
    throw new Error("plugin: readPluginData response has invalid keys");
  }
  return {
    nodeId: record.nodeId,
    keys: record.keys,
    ...(Object.hasOwn(record, "value")
      ? {
          value: record.value,
        }
      : {}),
  };
}

export function pluginStorageHttpError(action, status, detail) {
  return Object.assign(
    new Error(`plugin: ${action} failed (${status}) ${detail}`),
    {
      // DTO / node / quota failures are caller-correctable. Preserve that
      // distinction across the host RPC boundary instead of flattening every
      // gateway 4xx into `internal_error` inside use-plugin-host.handleRpc.
      code: status >= 400 && status < 500 ? "invalid_args" : "internal_error",
      // The host dispatcher uses an initial 404 as a readiness signal for a
      // freshly pasted/undo-restored node: flush the local graph durably, then
      // retry once. Keep the transport status out of the public HubError shape.
      status,
    },
  );
}
