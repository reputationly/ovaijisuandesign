// summarize-params-2.js
import {
  imageModeOptionLabel,
  LEGACY_SEEDANCE_25_TASK_TYPE_PARAM,
  VIDEO_EXTENSION_MODE,
} from "./i2-v-aspect-ratio-field.jsx";
import {
  ASPECT_RATIO_PARAM_KEYS,
  IMAGE_MODE_KEY,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  isSeedance25Model,
  isSeedance25VideoEditMode,
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
} from "./model-param-select.jsx";
import { translateOptionValue } from "./param-label-fallbacks.js";

function resolveI2VImageMode(params, model) {
  const fromParams = params[IMAGE_MODE_KEY];
  if (
    fromParams === "first-last-frame" ||
    fromParams === "reference" ||
    fromParams === VIDEO_EXTENSION_MODE
  ) {
    return fromParams;
  }
  if (model?.imageMode) return model.imageMode;
  if ((model?.max_refs ?? 0) > 2) return "reference";
  if (!model) return "reference";
  return "first-last-frame";
}

function resolveCanvasImageMode(params, model) {
  if (params[IMAGE_MODE_KEY] === "text-to-video") return "text-to-video";
  return resolveI2VImageMode(params, model);
}

const SEEDANCE_25_IMAGE_MODES = [
  "reference",
  "first-last-frame",
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
];

export function ensureSeedance25DirectImageModes(model) {
  if (!isSeedance25Model(model)) return model;
  const params = {
    ...model.params,
  };
  const imageModeDefinition = params.image_mode;
  delete params[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM];
  params.image_mode = {
    type: "select",
    label: imageModeDefinition?.label ?? "生成方式",
    options: [...SEEDANCE_25_IMAGE_MODES],
    default: "reference",
  };
  return {
    ...model,
    params,
  };
}

export const STANDARD_PARAMS = [
  {
    id: "image_mode",
    i18nKey: "canvas.param.std.imageMode",
    fallbackLabel: "Generation Mode",
    aliases: ["image_mode"],
  },
  {
    id: "aspect_ratio",
    i18nKey: "canvas.param.std.aspectRatio",
    fallbackLabel: "Aspect Ratio",
    aliases: ASPECT_RATIO_PARAM_KEYS,
  },
  {
    id: "resolution",
    i18nKey: "canvas.param.std.resolution",
    fallbackLabel: "Resolution",
    aliases: ["resolution"],
  },
  {
    id: "duration",
    i18nKey: "canvas.param.std.duration",
    fallbackLabel: "Duration",
    aliases: ["duration"],
  },
];

export function resolveImageMode(params, model) {
  const fromParams = params[IMAGE_MODE_KEY];
  if (
    fromParams === SEEDANCE_25_VIDEO_EDIT_MODE ||
    fromParams === SEEDANCE_25_VIDEO_EXTEND_MODE
  ) {
    return fromParams;
  }
  return resolveCanvasImageMode(params, model);
}

export function summarizeParams(t2, model, modelParams) {
  if (!model) return "";
  const parts = [];
  let hasAuto = false;
  const imageMode = resolveImageMode(modelParams, model);
  const isSeedance25VideoEdit = isSeedance25VideoEditMode(model, imageMode);
  const hiddenParams = new Set(
    model.hiddenParamsByImageMode?.[imageMode] ?? [],
  );
  for (const std of STANDARD_PARAMS) {
    const matchedKey = std.aliases.find((a2) => model.params[a2]);
    if (!matchedKey) continue;
    if (hiddenParams.has(matchedKey)) continue;
    if (isSeedance25VideoEdit && std.id === "duration") continue;
    if (
      modelParams[IMAGE_MODE_KEY] === VIDEO_EXTENSION_MODE &&
      std.id === "aspect_ratio"
    ) {
      continue;
    }
    const value = modelParams[matchedKey] ?? model.params[matchedKey].default;
    if (!value || value === "auto") {
      if (value === "auto") hasAuto = true;
      continue;
    }
    if (std.id === "image_mode") {
      parts.push(imageModeOptionLabel(t2, value));
    } else if (std.id === "duration") {
      parts.push(`${value}s`);
    } else {
      parts.push(translateOptionValue(t2, value));
    }
  }
  if (parts.length === 0 && hasAuto)
    return t2("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  return parts.join(" · ");
}
