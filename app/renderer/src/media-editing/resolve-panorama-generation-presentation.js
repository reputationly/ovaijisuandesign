// resolve-panorama-generation-presentation.js
import { reactExports } from "../vendor.js";
import { CanvasRenderRuntimeContext } from "../infra/use-plugin-metadata-store.js";
import { isGenerationErrorStatus } from "../canvas/compute-group-bounds-from-children.js";
import { areNodePropsEqual } from "../canvas/fullscreen-icon.jsx";
import { AudioNodeInner } from "./audio-node-inner.jsx";
export const AudioNode = reactExports.memo(AudioNodeInner, areNodePropsEqual);
const PLUGIN_ADD_NODE_TYPE_PREFIX = "plugin:";
export const DIRECTOR_STAGE_PLUGIN_ID = "3d-director-stage";
export const COMFYUI_PLUGIN_ID = "comfyui";
export const PANORAMA_VIEWER_PLUGIN_ID = "panorama-viewer";
export function shouldShowPluginNodeSourceAffordance(pluginId) {
  return pluginId !== COMFYUI_PLUGIN_ID;
}
export function resolvePluginEditorPresentation(pluginId) {
  return "fullscreen";
}
export const CLIP_STUDIO_PLUGIN_ID = "clip-studio";
export function formatPluginAddNodeType(pluginId) {
  return `${PLUGIN_ADD_NODE_TYPE_PREFIX}${pluginId}`;
}
export function parsePluginAddNodeType(type) {
  if (!type.startsWith(PLUGIN_ADD_NODE_TYPE_PREFIX)) return null;
  const pluginId = type.slice(PLUGIN_ADD_NODE_TYPE_PREFIX.length);
  return pluginId.length > 0 ? pluginId : null;
}
export function isPluginEditorSurface(agent) {
  return agent?.editorSurface === true;
}
export function useCanvasSurfaceRecovery(registration, eligible) {
  const { registerSurface } = reactExports.useContext(
    CanvasRenderRuntimeContext,
  );
  const registrationRef = reactExports.useRef(registration);
  registrationRef.current = registration;
  const handleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handle = registerSurface({
      surfaceType: registrationRef.current.surfaceType,
      isEligible: () => registrationRef.current.isEligible(),
      recover: () => registrationRef.current.recover(),
    });
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
      handle.dispose();
    };
  }, [registerSurface]);
  reactExports.useEffect(() => {
    if (eligible) handleRef.current?.notifyEligibilityChanged();
  }, [eligible]);
}
export function resolvePanoramaGenerationPresentation(node) {
  const data = node?.data;
  if (node?.type !== "placeholder" || data?.mediaType !== "image") {
    return {
      status: "idle",
    };
  }
  if (!isGenerationErrorStatus(data.status)) {
    return {
      status: "loading",
    };
  }
  const retryPayload =
    data.retryPayload !== null && typeof data.retryPayload === "object"
      ? data.retryPayload
      : void 0;
  return {
    status: "error",
    errorStatus: data.status,
    errorMessage:
      typeof data.errorMessage === "string" ? data.errorMessage : "",
    errorReason:
      typeof data.errorReason === "string" ? data.errorReason : void 0,
    retryPayload,
  };
}
export function panoramaGenerationPresentationKey(node) {
  const presentation = resolvePanoramaGenerationPresentation(node);
  if (presentation.status !== "error") return presentation.status;
  return [
    presentation.status,
    presentation.errorStatus,
    presentation.errorMessage,
    presentation.errorReason ?? "",
    presentation.retryPayload ? JSON.stringify(presentation.retryPayload) : "",
  ].join("\0");
}
export const PANORAMA_EMPTY_NODE_SIZE = {
  width: 410,
  height: 231,
};
export const PANORAMA_VIEWER_NODE_SIZE = {
  width: 820,
  height: 410,
};
export function panoramaCleanPreviewUrl(sourceUrl) {
  if (!sourceUrl) return sourceUrl;
  const separator = sourceUrl.includes("?") ? "&" : "?";
  return `${sourceUrl}${separator}panorama_preview=clean`;
}
export function panoramaViewerNodeSize(
  sourceWidth,
  sourceHeight,
  preferredWidth = PANORAMA_VIEWER_NODE_SIZE.width,
) {
  const width =
    Number.isFinite(preferredWidth) && preferredWidth > 0
      ? Math.round(preferredWidth)
      : PANORAMA_VIEWER_NODE_SIZE.width;
  const aspectRatio =
    Number.isFinite(sourceWidth) &&
    Number.isFinite(sourceHeight) &&
    (sourceWidth ?? 0) > 0 &&
    (sourceHeight ?? 0) > 0
      ? sourceWidth / sourceHeight
      : PANORAMA_VIEWER_NODE_SIZE.width / PANORAMA_VIEWER_NODE_SIZE.height;
  return {
    width,
    height: Math.max(1, Math.round(width / aspectRatio)),
  };
}
