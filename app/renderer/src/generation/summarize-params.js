// summarize-params.js
import {
  MUSIC_LENGTH_PRESETS,
  musicLengthPresetLabel,
} from "../media-editing/get-reference-navigation-defaults.jsx";
import { translateOptionValue } from "./param-label-fallbacks.js";
import { formatSecondsOption } from "./expand-arrow-icon.jsx";
function formatMusicLengthSummary(translate, value) {
  if (!value || value === "auto") {
    return translate("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  }
  const preset = MUSIC_LENGTH_PRESETS.find((p3Value) => p3Value.value === value);
  if (preset) return musicLengthPresetLabel(translate, preset);
  return value;
}
export function summarizeParams(translate, model, modelParams) {
  if (!model) return "";
  const parts = [];
  let hasAuto = false;
  for (const [key, def] of Object.entries(model.params)) {
    if (key === "voice_id") continue;
    if (key === "is_instrumental") continue;
    if (def.type === "textarea") continue;
    const value = modelParams[key] ?? def.default;
    if (key === "music_length_ms") {
      if (!value || value === "auto") {
        hasAuto = true;
        continue;
      }
      parts.push(formatMusicLengthSummary(translate, value));
      continue;
    }
    if (!value || value === "auto") {
      if (value === "auto") hasAuto = true;
      continue;
    }
    if (key === "duration") {
      parts.push(formatSecondsOption(value));
      continue;
    }
    parts.push(translateOptionValue(translate, value));
  }
  if (parts.length === 0 && hasAuto)
    return translate("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  return parts.join(" · ");
}
