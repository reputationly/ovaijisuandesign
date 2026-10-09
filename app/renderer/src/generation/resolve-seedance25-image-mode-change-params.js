// resolve-seedance25-image-mode-change-params.js
import {
  isSeedance25InheritedVideoMode,
  isSeedance25Model,
  LEGACY_SEEDANCE_25_TASK_TYPE_PARAM,
  resolveHailuo03TrialClaimResolution,
  SEEDANCE_25_INHERITED_VIDEO_MODES,
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
} from "./model-param-select.jsx";
export function shouldSwitchHailuo03TrialClaimResolution({
  model,
  selectedModelId,
  modelParams,
  eligibility,
}) {
  return (
    resolveHailuo03TrialClaimResolution({
      model,
      selectedModelId,
      modelParams,
      eligibility,
    }) != null
  );
}
const SEEDANCE_25_VIDEO_EXTEND_OFFSET_SEC = 5;
const SEEDANCE_25_MAX_DURATION_SEC = 30;
export function resolveSeedance25ImageModeOptions(
  model,
  options,
  hasVideoInput,
) {
  if (!isSeedance25Model(model) || hasVideoInput) return [...options];
  return options.filter(
    (option2) => !SEEDANCE_25_INHERITED_VIDEO_MODES.has(option2),
  );
}
export function resolveSeedance25AvailableImageMode(
  model,
  imageMode,
  hasVideoInput,
) {
  return !hasVideoInput && isSeedance25InheritedVideoMode(model, imageMode)
    ? "reference"
    : imageMode;
}
export function resolveSeedance25VideoExtendDefaultDuration(
  sourceVideoDurationSec,
) {
  if (
    typeof sourceVideoDurationSec !== "number" ||
    !Number.isFinite(sourceVideoDurationSec) ||
    sourceVideoDurationSec <= 0
  ) {
    return void 0;
  }
  return String(
    Math.min(
      Math.ceil(sourceVideoDurationSec + SEEDANCE_25_VIDEO_EXTEND_OFFSET_SEC),
      SEEDANCE_25_MAX_DURATION_SEC,
    ),
  );
}
export function resolveSeedance25ImageModeChangeParams(
  model,
  currentParams,
  nextImageMode,
  sourceVideoDurationSec,
) {
  const nextParams = {
    ...currentParams,
    image_mode: nextImageMode,
  };
  if (!isSeedance25Model(model) || currentParams.image_mode === nextImageMode)
    return nextParams;
  const defaultDuration =
    nextImageMode === SEEDANCE_25_VIDEO_EXTEND_MODE
      ? (resolveSeedance25VideoExtendDefaultDuration(sourceVideoDurationSec) ??
        model?.params?.duration?.default)
      : model?.params?.duration?.default;
  if (defaultDuration !== void 0) nextParams.duration = defaultDuration;
  return nextParams;
}
export function migrateLegacySeedance25GenerationModeParams(model, params) {
  const next2 = {
    ...(params ?? {}),
  };
  const legacyTaskType = next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM];
  delete next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM];
  if (!isSeedance25Model(model) || !legacyTaskType) return next2;
  const imageMode = next2.image_mode;
  if (imageMode && imageMode !== "reference") return next2;
  if (legacyTaskType === "edit") next2.image_mode = SEEDANCE_25_VIDEO_EDIT_MODE;
  else if (legacyTaskType === "extend")
    next2.image_mode = SEEDANCE_25_VIDEO_EXTEND_MODE;
  else next2.image_mode = "reference";
  return next2;
}
