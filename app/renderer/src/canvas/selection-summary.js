// selection-summary.js

export function selectionSummary(options, count2, allowedTypes, t2, counts) {
  const constraints2 = options?.constraints;
  const types2 = allowedTypes.length
    ? allowedTypes
    : ["image", "video", "audio", "text", "subtitle", "file"];
  const limits = types2
    .map((type2) => {
      const label = t2(`assetPicker.typeFilter.${type2}`, type2);
      if (
        constraints2 &&
        (type2 === "image" || type2 === "video" || type2 === "audio")
      ) {
        return t2("assetPicker.summary.limits", "最多 {{types}}", {
          types: `${Math.max(0, constraints2.remainingByKind[type2])} ${label}`,
        });
      }
      return label;
    })
    .join(" · ");
  let max2 = options?.multiple ? options.maxCount : 1;
  if (max2 !== void 0 && (!Number.isFinite(max2) || max2 <= 0)) max2 = void 0;
  if (
    constraints2 &&
    types2.every(
      (type2) => type2 === "image" || type2 === "video" || type2 === "audio",
    )
  ) {
    const image2 = types2.includes("image")
      ? Math.max(0, constraints2.remainingByKind.image)
      : 0;
    const video = types2.includes("video")
      ? Math.max(0, constraints2.remainingByKind.video)
      : 0;
    const audio = types2.includes("audio")
      ? Math.max(0, constraints2.remainingByKind.audio)
      : 0;
    const capacity =
      image2 +
      Math.min(
        video + audio,
        Math.max(0, constraints2.remainingVideoAudio ?? Infinity),
      );
    max2 =
      typeof max2 === "number" && max2 > 0
        ? Math.min(max2, capacity)
        : capacity;
  }
  const selected2 =
    typeof max2 === "number" && max2 >= 0
      ? t2("assetPicker.summary.bounded", "已选：{{count}} / {{max}}", {
          count: count2,
          max: max2,
        })
      : t2("assetPicker.summary.unbounded", "已选 {{count}} 项", {
          count: count2,
        });
  const detail = t2("assetPicker.summary.types", "可选：{{types}}", {
    types: limits,
  });
  const shared =
    constraints2?.remainingVideoAudio !== void 0 &&
    types2.includes("video") &&
    types2.includes("audio")
      ? t2("assetPicker.summary.shared", "；视频与音频合计最多 {{max}} 项", {
          max: Math.max(0, constraints2.remainingVideoAudio),
        })
      : "";
  const minimum =
    options?.minCount && options.minCount > 0
      ? t2("assetPicker.summary.minimum", "；至少选择 {{min}} 项", {
          min: options.minCount,
        })
      : "";
  const fullTypes =
    constraints2 && counts
      ? types2
          .filter(
            (type2) =>
              (type2 === "image" || type2 === "video" || type2 === "audio") &&
              counts[type2] > 0 &&
              counts[type2] >= constraints2.remainingByKind[type2],
          )
          .map((type2) => t2(`assetPicker.typeFilter.${type2}`, type2))
          .join(" · ")
      : "";
  const full =
    typeof max2 === "number" && count2 >= max2
      ? ` · ${t2("assetPicker.summary.full", "已达选择上限，请先取消部分已选素材。")}`
      : fullTypes
        ? ` · ${t2(
            "assetPicker.summary.typeFull",
            "{{types}}已达选择上限，请先取消部分已选素材。",
            {
              types: fullTypes,
            },
          )}`
        : "";
  return {
    selected: selected2,
    detail: `${detail}${shared}${minimum}`,
    full,
  };
}
