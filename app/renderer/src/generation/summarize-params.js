// summarize-params.js
import {
  MUSIC_LENGTH_PRESETS,
  musicLengthPresetLabel,
} from "../media-editing/get-reference-navigation-defaults.jsx";
import { translateOptionValue } from "./param-label-fallbacks.js";
import { formatSecondsOption } from "./expand-arrow-icon.jsx";
function formatMusicLengthSummary(t2, value) {
  if (!value || value === "auto") {
    return t2("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  }
  const preset2 = MUSIC_LENGTH_PRESETS.find((p3) => p3.value === value);
  if (preset2) return musicLengthPresetLabel(t2, preset2);
  return value;
}
export function summarizeParams(t2, model, modelParams) {
  if (!model) return "";
  const parts = [];
  let hasAuto = false;
  for (const [key2, def] of Object.entries(model.params)) {
    if (key2 === "voice_id") continue;
    if (key2 === "is_instrumental") continue;
    if (def.type === "textarea") continue;
    const value = modelParams[key2] ?? def.default;
    if (key2 === "music_length_ms") {
      if (!value || value === "auto") {
        hasAuto = true;
        continue;
      }
      parts.push(formatMusicLengthSummary(t2, value));
      continue;
    }
    if (!value || value === "auto") {
      if (value === "auto") hasAuto = true;
      continue;
    }
    if (key2 === "duration") {
      parts.push(formatSecondsOption(value));
      continue;
    }
    parts.push(translateOptionValue(t2, value));
  }
  if (parts.length === 0 && hasAuto)
    return t2("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  return parts.join(" · ");
}
