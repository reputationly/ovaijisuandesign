// disabled-reason-label.js
import { ReferenceDisabledReason } from "./attachment-bar.jsx";

function finitePositive$1(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : void 0;
}

function formatSeconds$1(value, fallback) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatImageMinDimensionLimit$1(constraints2, t2) {
  const minWidth = finitePositive$1(constraints2?.imageMinWidth);
  const minHeight = finitePositive$1(constraints2?.imageMinHeight);
  if (minWidth !== void 0 && minHeight !== void 0)
    return `${minWidth}×${minHeight}`;
  if (minWidth !== void 0)
    return t2("canvas.reference.limitWidth", "{{value}}px wide", {
      value: minWidth,
    });
  if (minHeight !== void 0)
    return t2("canvas.reference.limitHeight", "{{value}}px high", {
      value: minHeight,
    });
  return t2("canvas.reference.requiredDimensions", "the required dimensions");
}

export function disabledReasonLabel$1(reason, constraints2, t2) {
  switch (reason) {
    case ReferenceDisabledReason.Unsupported:
      return t2(
        "canvas.reference.disabledUnsupported",
        "The current model does not support these attachment types.",
      );
    case ReferenceDisabledReason.Empty:
      return t2(
        "canvas.reference.disabledEmpty",
        "This subject has no available attachments.",
      );
    case ReferenceDisabledReason.Full:
      return t2(
        "canvas.reference.disabledFull",
        "Adding this reference would exceed the attachment count limit.",
      );
    case "image-size":
      return t2(
        "canvas.reference.disabledImageSize",
        "Image dimensions must be at least {{dimensions}}.",
        {
          dimensions: formatImageMinDimensionLimit$1(constraints2, t2),
        },
      );
    case "image-aspect":
      return t2(
        "canvas.reference.disabledImageAspect",
        "The image aspect ratio does not meet the requirements.",
      );
    case "audio-range":
      return t2(
        "canvas.reference.disabledAudioRange",
        "Each audio clip must be between {{min}} and {{max}} seconds.",
        {
          min: formatSeconds$1(constraints2?.audioPerClipMinSec, "1.8"),
          max: formatSeconds$1(constraints2?.audioPerClipMaxSec, "15.2"),
        },
      );
    case "audio-budget":
      return t2(
        "canvas.reference.disabledAudioBudget",
        "This audio exceeds the remaining allowance of {{seconds}} seconds.",
        {
          seconds: formatSeconds$1(
            constraints2?.remainingAudioTotalSec,
            "15.2",
          ),
        },
      );
    case "video-budget":
      return t2(
        "canvas.reference.disabledVideoBudget",
        "This video exceeds the remaining allowance of {{seconds}} seconds.",
        {
          seconds: formatSeconds$1(
            constraints2?.remainingVideoTotalSec,
            "15.2",
          ),
        },
      );
    case "video-range":
      return t2(
        "canvas.reference.disabledVideoRange",
        "Each video must be between {{min}} and {{max}} seconds.",
        {
          min: formatSeconds$1(constraints2?.videoPerClipMinSec, "2"),
          max: formatSeconds$1(constraints2?.videoPerClipMaxSec, "15"),
        },
      );
    default:
      return t2(
        "canvas.reference.disabledUnavailable",
        "This reference is unavailable.",
      );
  }
}
