// text-models.js
import { IMAGE_MODELS } from "./image-models.js";
import { VIDEO_MODELS } from "./video-models.js";
import { AUDIO_MODELS } from "./audio-models.js";
import {
  BACKEND_ELEVENLABS_MUSIC,
  BACKEND_MINIMAX_MUSIC,
  BACKEND_MINIMAX_TTS,
  BACKEND_MINIMAX_V3,
  BACKEND_SEEDAUDIO,
  LEGACY_HAILUO_MODEL_ALIASES,
  normalizeLegacyModelId,
} from "./normalize-skill-detail-metadata.js";

const BACKEND_TEXT_ANTHROPIC = "text_anthropic";

const BACKEND_TEXT_OPENAI = "text_openai";

const BACKEND_TEXT_GEMINI = "text_gemini";

function toRegistryMediaType(type) {
  switch (type) {
    case "image":
    case "video":
    case "audio":
      return type;
    case "music":
      return "audio";
    default:
      return null;
  }
}

const LEGACY_MODEL_DISPLAY_NAMES = new Map(
  LEGACY_HAILUO_MODEL_ALIASES.flatMap((alias) =>
    [...alias.publicModels, alias.pricingModel].map((model) => [
      model,
      alias.displayName,
    ]),
  ),
);

function isVisibleInRegion(entry, region) {
  return !entry.region || entry.region === region;
}

const TEXT_MODELS = [
  // MiniMax M3 — 国内外同名
  {
    id: "minimaxHub/MiniMax-M3",
    name: "MiniMax M3",
    model_name: "MiniMax-M3",
    provider: "minimaxHub",
    backend: BACKEND_TEXT_ANTHROPIC,
    subtitle: {
      label: "lowCost",
      latency: "3-8s",
    },
  },
  // Alpha 系列区分国内外：国内不再提供 alpha；海外仅提供 alpha_high。
  {
    id: "alpha/alpha_high",
    name: "Claude Opus 4.6",
    model_name: "alpha_high",
    provider: "alpha",
    region: "overseas",
    backend: BACKEND_TEXT_ANTHROPIC,
    subtitle: {
      label: "polishedWriting",
      latency: "5-10s",
    },
  },
  // Domestic entries stay first so regionless fallbacks do not leak overseas names.
  // GPT 5.5 overseas / Gamma-5.5 domestic.
  {
    id: "gamma/gamma",
    name: "OAI 5.5",
    model_name: "gamma",
    provider: "gamma",
    region: "domestic",
    backend: BACKEND_TEXT_OPENAI,
    subtitle: {
      label: "accurate",
      latency: "8-15s",
    },
  },
  {
    id: "gamma/gamma",
    name: "GPT 5.5",
    model_name: "gamma",
    provider: "gamma",
    region: "overseas",
    backend: BACKEND_TEXT_OPENAI,
    subtitle: {
      label: "accurate",
      latency: "8-15s",
    },
  },
  // Gemini 3.1 Pro Preview overseas / Omega-3.1-pro domestic.
  {
    id: "omega/omega-3.1-pro",
    name: "Gemi 3.1 Pro",
    model_name: "omega-3.1-pro",
    provider: "omega",
    region: "domestic",
    backend: BACKEND_TEXT_GEMINI,
    subtitle: {
      label: "creative",
      latency: "5-10s",
    },
  },
  {
    id: "omega/omega-3.1-pro",
    name: "Gemini 3.1 Pro Preview",
    model_name: "omega-3.1-pro",
    provider: "omega",
    region: "overseas",
    backend: BACKEND_TEXT_GEMINI,
    subtitle: {
      label: "creative",
      latency: "5-10s",
    },
  },
];

function matchesTextModel(entry, modelName) {
  return entry.model_name === modelName || entry.id === modelName;
}

function resolveTextModelDisplayName(backend, modelName, region) {
  return (
    TEXT_MODELS.find(
      (modelEntry) =>
        isVisibleInRegion(modelEntry, region) &&
        modelEntry.backend === backend &&
        matchesTextModel(modelEntry, modelName),
    ) ??
    TEXT_MODELS.find(
      (modelEntry) => isVisibleInRegion(modelEntry, region) && matchesTextModel(modelEntry, modelName),
    ) ??
    TEXT_MODELS.find((modelEntry) => matchesTextModel(modelEntry, modelName))
  )?.name;
}

function modelPoolForType(type) {
  return (
    {
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
      audio: AUDIO_MODELS,
    }[type] ?? []
  );
}

AUDIO_MODELS.filter(
  (modelEntry) =>
    modelEntry.backend === BACKEND_MINIMAX_TTS ||
    modelEntry.backend === BACKEND_SEEDAUDIO ||
    (modelEntry.backend === BACKEND_MINIMAX_V3 && !!modelEntry.audioExtension),
);

AUDIO_MODELS.filter(
  (modelEntry) =>
    modelEntry.backend === BACKEND_MINIMAX_MUSIC ||
    modelEntry.backend === BACKEND_ELEVENLABS_MUSIC,
);

export function resolveModelDisplayName(backend, modelIdRaw, region, type) {
  if (!modelIdRaw) return backend;
  const modelId = normalizeLegacyModelId(modelIdRaw);
  if (type === "text")
    return resolveTextModelDisplayName(backend, modelId, region) ?? modelId;
  const registryType = toRegistryMediaType(type);
  if (!registryType) return modelId;
  const pool = modelPoolForType(registryType);
  const matchesId = (modelEntry) =>
    modelEntry.model_name === modelId ||
    modelEntry.id === modelId ||
    modelEntry.publicToken === modelId ||
    modelEntry.pricingId === modelId;
  const regionalMatch =
    pool.find(
      (modelEntry) =>
        isVisibleInRegion(modelEntry, region) &&
        modelEntry.backend === backend &&
        matchesId(modelEntry),
    ) ?? pool.find((modelEntry) => isVisibleInRegion(modelEntry, region) && matchesId(modelEntry));
  const crossRegionMatch = regionalMatch ? void 0 : pool.find(matchesId);
  const currentRegionCounterpart = crossRegionMatch
    ? pool.find(
        (modelEntry) =>
          isVisibleInRegion(modelEntry, region) &&
          modelEntry.backend === crossRegionMatch.backend &&
          ((crossRegionMatch.model_name !== void 0 &&
            modelEntry.model_name === crossRegionMatch.model_name) ||
            (crossRegionMatch.pricingId !== void 0 &&
              modelEntry.pricingId === crossRegionMatch.pricingId)),
      )
    : void 0;
  const match = regionalMatch ?? currentRegionCounterpart ?? crossRegionMatch;
  return match?.name ?? LEGACY_MODEL_DISPLAY_NAMES.get(modelId) ?? modelId;
}
