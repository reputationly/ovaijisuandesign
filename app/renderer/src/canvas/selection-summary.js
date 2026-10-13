// selection-summary.js

export function selectionSummary(options, count, allowedTypes, translate, counts) {
  const constraints = options?.constraints;
  const types = allowedTypes.length
    ? allowedTypes
    : ["image", "video", "audio", "text", "subtitle", "file"];
  const limits = types
    .map((type) => {
      const label = translate(`assetPicker.typeFilter.${type}`, type);
      if (
        constraints &&
        (type === "image" || type === "video" || type === "audio")
      ) {
        return translate("assetPicker.summary.limits", "最多 {{types}}", {
          types: `${Math.max(0, constraints.remainingByKind[type])} ${label}`,
        });
      }
      return label;
    })
    .join(" · ");
  let max = options?.multiple ? options.maxCount : 1;
  if (max !== void 0 && (!Number.isFinite(max) || max <= 0)) max = void 0;
  if (
    constraints &&
    types.every(
      (type) => type === "image" || type === "video" || type === "audio",
    )
  ) {
    const image = types.includes("image")
      ? Math.max(0, constraints.remainingByKind.image)
      : 0;
    const video = types.includes("video")
      ? Math.max(0, constraints.remainingByKind.video)
      : 0;
    const audio = types.includes("audio")
      ? Math.max(0, constraints.remainingByKind.audio)
      : 0;
    const capacity =
      image +
      Math.min(
        video + audio,
        Math.max(0, constraints.remainingVideoAudio ?? Infinity),
      );
    max =
      typeof max === "number" && max > 0
        ? Math.min(max, capacity)
        : capacity;
  }
  const selected =
    typeof max === "number" && max >= 0
      ? translate("assetPicker.summary.bounded", "已选：{{count}} / {{max}}", {
          count,
          max,
        })
      : translate("assetPicker.summary.unbounded", "已选 {{count}} 项", {
          count,
        });
  const detail = translate("assetPicker.summary.types", "可选：{{types}}", {
    types: limits,
  });
  const shared =
    constraints?.remainingVideoAudio !== void 0 &&
    types.includes("video") &&
    types.includes("audio")
      ? translate("assetPicker.summary.shared", "；视频与音频合计最多 {{max}} 项", {
          max: Math.max(0, constraints.remainingVideoAudio),
        })
      : "";
  const minimum =
    options?.minCount && options.minCount > 0
      ? translate("assetPicker.summary.minimum", "；至少选择 {{min}} 项", {
          min: options.minCount,
        })
      : "";
  const fullTypes =
    constraints && counts
      ? types
          .filter(
            (type) =>
              (type === "image" || type === "video" || type === "audio") &&
              counts[type] > 0 &&
              counts[type] >= constraints.remainingByKind[type],
          )
          .map((type) => translate(`assetPicker.typeFilter.${type}`, type))
          .join(" · ")
      : "";
  const full =
    typeof max === "number" && count >= max
      ? ` · ${translate("assetPicker.summary.full", "已达选择上限，请先取消部分已选素材。")}`
      : fullTypes
        ? ` · ${translate(
            "assetPicker.summary.typeFull",
            "{{types}}已达选择上限，请先取消部分已选素材。",
            {
              types: fullTypes,
            },
          )}`
        : "";
  return {
    selected,
    detail: `${detail}${shared}${minimum}`,
    full,
  };
}
