// collect-video-rows.js

const MINIMAX_H3_MODEL_ID$1 = "MiniMax-H3";

const H3_VIDEO_UPSCALE_MODEL_ID = "h3_video_super_resolution";

const DEFAULT_H3_FREE_IMAGE_COUNT = 5;

const DISPLAY_RESOLUTIONS = new Set(["1k", "2k", "4k"]);

const IMAGE_MODEL_BY_NODE = {
  Banana2Node: "nano_banana_2_flash",
  BananaProNode: "nano_banana_2",
  GImage2Node: "gpt-image-2",
};

function equalModelId(left, right) {
  return (
    left.localeCompare(right, void 0, {
      sensitivity: "accent",
    }) === 0
  );
}

function displayResolution(value) {
  return value.toUpperCase();
}

function displayQuality(value) {
  return value.length === 0
    ? value
    : `${value[0]?.toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(value);
}

function withQualifier(label, resolution, quality, mode2) {
  const qualifier = [
    resolution && displayResolution(resolution),
    quality && displayQuality(quality),
    mode2,
  ]
    .filter(Boolean)
    .join(" · ");
  return qualifier ? `${label} (${qualifier})` : label;
}

function render(rows, copy2, locale) {
  if (rows.length === 0) return null;
  const separator = locale.toLowerCase().startsWith("zh") ? "：" : ": ";
  return `### ${copy2.heading}

${rows.map((row) => `- ${row.label}${separator}${row.value}`).join("\n")}`;
}

function uniqueReferenceRules(costs) {
  const seen2 = new Set();
  const rules = [];
  for (const cost of costs) {
    if (typeof cost.refCountPrice !== "number") continue;
    const freeCount = cost.refCountFree ?? 0;
    const key2 = `${cost.refCountPrice}|${freeCount}`;
    if (seen2.has(key2)) continue;
    seen2.add(key2);
    rules.push({
      rate: cost.refCountPrice,
      freeCount,
    });
  }
  return rules;
}

function collectImageRows(pricing, modelId, copy2, locale) {
  const model = pricing.image.find((item) =>
    equalModelId(item.modelID, modelId),
  );
  if (!model) return [];
  const rows = [];
  const seenOutput = new Set();
  for (const cost of model.imageCosts) {
    const resolutions = cost.resolutions.filter((value) =>
      DISPLAY_RESOLUTIONS.has(value.toLowerCase()),
    );
    const qualities = cost.qualities?.length ? cost.qualities : [""];
    for (const resolution of resolutions) {
      for (const quality of qualities) {
        const key2 = `${resolution.toLowerCase()}|${quality.toLowerCase()}|${cost.realCost}`;
        if (seenOutput.has(key2)) continue;
        seenOutput.add(key2);
        rows.push({
          label: withQualifier(copy2.generatedImage, resolution, quality),
          value:
            cost.realCost === 0
              ? copy2.free
              : copy2.creditsPerImage(formatNumber(cost.realCost, locale)),
        });
      }
    }
  }
  if (seenOutput.size === 0 && model.defaultCost > 0) {
    rows.push({
      label: copy2.generatedImage,
      value: copy2.creditsPerImage(formatNumber(model.defaultCost, locale)),
    });
  }
  const referenceRules = uniqueReferenceRules(model.imageCosts);
  for (const rule of referenceRules) {
    const rate = formatNumber(rule.rate, locale);
    rows.push({
      label: copy2.inputImages,
      value:
        rule.rate === 0
          ? copy2.free
          : rule.freeCount > 0
            ? copy2.imagePricing(rule.freeCount, rule.freeCount + 1, rate)
            : copy2.creditsPerImage(rate),
    });
  }
  return rows;
}

function matchesReferenceMode(cost, hasReferenceVideo) {
  return (
    cost.hasReferenceVideo == null ||
    cost.hasReferenceVideo === hasReferenceVideo
  );
}

function collectVideoRates(pricing, hasReferenceVideo) {
  const model = pricing.video.find((item) =>
    equalModelId(item.modelID, MINIMAX_H3_MODEL_ID$1),
  );
  if (!model) return [];
  return model.videoCosts.filter(
    (cost) =>
      typeof cost.costPerSecond === "number" &&
      (hasReferenceVideo == null ||
        matchesReferenceMode(cost, hasReferenceVideo)) &&
      (cost.hasSound == null || cost.hasSound),
  );
}

function referenceModeLabel(cost, copy2) {
  if (cost.hasReferenceVideo === true) return copy2.withReferenceVideo;
  if (cost.hasReferenceVideo === false) return copy2.withoutReferenceVideo;
  return void 0;
}

function collectVideoImageRules(costs, copy2, distinguishReferenceMode) {
  const grouped = new Map();
  for (const cost of costs) {
    if (typeof cost.costPerImage !== "number") continue;
    const freeCount = cost.costPerImageFree ?? DEFAULT_H3_FREE_IMAGE_COUNT;
    const key2 = `${cost.costPerImage}|${freeCount}`;
    const existing = grouped.get(key2);
    if (existing) {
      existing.modes.add(cost.hasReferenceVideo);
    } else {
      grouped.set(key2, {
        rate: cost.costPerImage,
        freeCount,
        modes: new Set([cost.hasReferenceVideo]),
      });
    }
  }
  const rules = [];
  for (const rule of grouped.values()) {
    if (
      !distinguishReferenceMode ||
      rule.modes.has(void 0) ||
      (rule.modes.has(false) && rule.modes.has(true))
    ) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
      });
      continue;
    }
    if (rule.modes.has(false)) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
        mode: copy2.withoutReferenceVideo,
      });
    }
    if (rule.modes.has(true)) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
        mode: copy2.withReferenceVideo,
      });
    }
  }
  return rules;
}

function collectVideoRows(pricing, nodeType, copy2, locale) {
  const isReference = nodeType === "MinimaxHailuo03ReferenceNode";
  const isFirstLast = nodeType === "MinimaxHailuo03FirstLastFrameNode";
  const costs = collectVideoRates(pricing, isReference ? void 0 : false);
  const rows = [];
  const seenRates = new Set();
  for (const cost of costs) {
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const rate = cost.costPerSecond;
      const mode2 = isReference ? referenceModeLabel(cost, copy2) : void 0;
      const key2 = `${resolution.toLowerCase()}|${rate}|${mode2 ?? ""}`;
      if (seenRates.has(key2)) continue;
      seenRates.add(key2);
      const formatted =
        rate === 0
          ? copy2.free
          : copy2.creditsPerSecond(formatNumber(rate, locale));
      rows.push({
        label: withQualifier(copy2.generatedVideo, resolution, void 0, mode2),
        value: formatted,
      });
    }
  }
  const seenInputVideoRates = new Set();
  for (const cost of isReference ? collectVideoRates(pricing, true) : []) {
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const rate = cost.costPerSecond;
      const key2 = `${resolution.toLowerCase()}|${rate}`;
      if (seenInputVideoRates.has(key2)) continue;
      seenInputVideoRates.add(key2);
      rows.push({
        label: withQualifier(copy2.inputVideo, resolution),
        value:
          rate === 0
            ? copy2.free
            : copy2.creditsPerSecond(formatNumber(rate, locale)),
      });
    }
  }
  if (isReference)
    rows.push({
      label: copy2.inputAudio,
      value: copy2.free,
    });
  if (isReference || isFirstLast) {
    for (const imageRule of collectVideoImageRules(costs, copy2, isReference)) {
      rows.push({
        label: withQualifier(copy2.inputImages, void 0, void 0, imageRule.mode),
        value:
          imageRule.rate === 0
            ? copy2.free
            : copy2.imagePricing(
                imageRule.freeCount,
                imageRule.freeCount + 1,
                formatNumber(imageRule.rate, locale),
              ),
      });
    }
  }
  return rows;
}

function collectContextIrRows(pricing, copy2, locale) {
  const contextIr = pricing.h3ContextIr;
  if (!contextIr) return [];
  const makeValue = (rate) =>
    rate === 0
      ? copy2.free
      : copy2.creditsPerMillionTokens(formatNumber(rate, locale));
  return [
    {
      label: copy2.inputTokens,
      value: makeValue(contextIr.inputCreditPerMillionTokens),
    },
    {
      label: copy2.outputTokens,
      value: makeValue(contextIr.outputCreditPerMillionTokens),
    },
  ];
}

function collectUpscaleRows(pricing, copy2, locale) {
  const model = pricing.tool?.find((item) =>
    equalModelId(item.modelID, H3_VIDEO_UPSCALE_MODEL_ID),
  );
  if (!model) return [];
  const seen2 = new Set();
  const rows = [];
  for (const cost of model.costs) {
    if (typeof cost.costPerSecond !== "number") continue;
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const key2 = `${resolution.toLowerCase()}|${cost.costPerSecond}`;
      if (seen2.has(key2)) continue;
      seen2.add(key2);
      rows.push({
        label: withQualifier(copy2.videoUpscale, resolution),
        value:
          cost.costPerSecond === 0
            ? copy2.free
            : copy2.creditsPerSecond(formatNumber(cost.costPerSecond, locale)),
      });
    }
  }
  return rows;
}

export function buildComfyUiNodePriceDescription(
  pricing,
  nodeType,
  copy2,
  locale,
) {
  if (!pricing) return null;
  if (pricing.enabled === false) {
    return `### ${copy2.heading}

${copy2.free}`;
  }
  const imageModelId = IMAGE_MODEL_BY_NODE[nodeType];
  const rows = imageModelId
    ? collectImageRows(pricing, imageModelId, copy2, locale)
    : nodeType === "MinimaxH3PromptExpandNode"
      ? collectContextIrRows(pricing, copy2, locale)
      : nodeType === "MinimaxH3VideoEnhancementNode"
        ? collectUpscaleRows(pricing, copy2, locale)
        : collectVideoRows(pricing, nodeType, copy2, locale);
  return render(rows, copy2, locale);
}
