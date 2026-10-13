// disabled-reason-label.js
import { ReferenceDisabledReason } from "./attachment-bar.jsx";
function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : void 0;
}
function formatSeconds(value, fallback) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  return Number.isInteger(value) ? String(value) : String(value);
}
function formatImageMinDimensionLimit(constraints2, translate) {
  const minWidth = finitePositive(constraints2?.imageMinWidth);
  const minHeight = finitePositive(constraints2?.imageMinHeight);
  if (minWidth !== void 0 && minHeight !== void 0)
    return `${minWidth}×${minHeight}`;
  if (minWidth !== void 0)
    return translate("canvas.reference.limitWidth", "{{value}}px wide", {
      value: minWidth,
    });
  if (minHeight !== void 0)
    return translate("canvas.reference.limitHeight", "{{value}}px high", {
      value: minHeight,
    });
  return translate("canvas.reference.requiredDimensions", "the required dimensions");
}
export function disabledReasonLabel(reason, constraints2, translate) {
  switch (reason) {
    case ReferenceDisabledReason.Unsupported:
      return translate(
        "canvas.reference.disabledUnsupported",
        "The current model does not support these attachment types.",
      );
    case ReferenceDisabledReason.Empty:
      return translate(
        "canvas.reference.disabledEmpty",
        "This subject has no available attachments.",
      );
    case ReferenceDisabledReason.Full:
      return translate(
        "canvas.reference.disabledFull",
        "Adding this reference would exceed the attachment count limit.",
      );
    case "image-size":
      return translate(
        "canvas.reference.disabledImageSize",
        "Image dimensions must be at least {{dimensions}}.",
        {
          dimensions: formatImageMinDimensionLimit(constraints2, translate),
        },
      );
    case "image-aspect":
      return translate(
        "canvas.reference.disabledImageAspect",
        "The image aspect ratio does not meet the requirements.",
      );
    case "audio-range":
      return translate(
        "canvas.reference.disabledAudioRange",
        "Each audio clip must be between {{min}} and {{max}} seconds.",
        {
          min: formatSeconds(constraints2?.audioPerClipMinSec, "1.8"),
          max: formatSeconds(constraints2?.audioPerClipMaxSec, "15.2"),
        },
      );
    case "audio-budget":
      return translate(
        "canvas.reference.disabledAudioBudget",
        "This audio exceeds the remaining allowance of {{seconds}} seconds.",
        {
          seconds: formatSeconds(constraints2?.remainingAudioTotalSec, "15.2"),
        },
      );
    case "video-budget":
      return translate(
        "canvas.reference.disabledVideoBudget",
        "This video exceeds the remaining allowance of {{seconds}} seconds.",
        {
          seconds: formatSeconds(constraints2?.remainingVideoTotalSec, "15.2"),
        },
      );
    case "video-range":
      return translate(
        "canvas.reference.disabledVideoRange",
        "Each video must be between {{min}} and {{max}} seconds.",
        {
          min: formatSeconds(constraints2?.videoPerClipMinSec, "2"),
          max: formatSeconds(constraints2?.videoPerClipMaxSec, "15"),
        },
      );
    default:
      return translate(
        "canvas.reference.disabledUnavailable",
        "This reference is unavailable.",
      );
  }
}
