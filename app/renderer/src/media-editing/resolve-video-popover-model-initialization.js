// resolve-video-popover-model-initialization.js

const DEFAULT_EMPTY_VIDEO_MODEL_ID = "MiniMax-H3";

export function resolveVideoPopoverModelInitialization(sources) {
  const contextualModelId =
    sources.draftModelId ??
    sources.assetModelId ??
    sources.assetMetadataModelId ??
    sources.assetParamsModelName ??
    sources.generatingModelId ??
    sources.upstreamModelId;
  return {
    defaultModelId:
      contextualModelId ??
      (sources.isUserEmpty && !sources.lastUsedModelId
        ? DEFAULT_EMPTY_VIDEO_MODEL_ID
        : void 0),
  };
}

function nonEmptyString$1(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}

export function resolveVideoPopoverProviderTaskId(metadata, nodeData) {
  return (
    nonEmptyString$1(metadata?.providerTaskId) ??
    nonEmptyString$1(
      nodeData && typeof nodeData === "object"
        ? nodeData.providerTaskId
        : void 0,
    )
  );
}

export const PORTAL_POPOVER_Z = 9998;

export const PORTAL_TOOLBAR_Z = 9999;

export const TOOLBAR_HEIGHT = 40;

export const TOOLBAR_GAP = 6;

export const VIEWPORT_MARGIN = 8;

export const I2V_POPOVER_WIDTH = 580;

export const I2V_POPOVER_HEIGHT_COMPACT = 254;

export const I2V_POPOVER_HEIGHT_EXPANDED = 500;

export const ENHANCE_POPOVER_WIDTH = 256;

export const ENHANCE_POPOVER_HEIGHT = 240;
