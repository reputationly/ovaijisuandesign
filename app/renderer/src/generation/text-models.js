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

function toRegistryMediaType(type2) {
  switch (type2) {
    case "image":
    case "video":
    case "audio":
      return type2;
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
      (m3) =>
        isVisibleInRegion(m3, region) &&
        m3.backend === backend &&
        matchesTextModel(m3, modelName),
    ) ??
    TEXT_MODELS.find(
      (m3) => isVisibleInRegion(m3, region) && matchesTextModel(m3, modelName),
    ) ??
    TEXT_MODELS.find((m3) => matchesTextModel(m3, modelName))
  )?.name;
}

function modelPoolForType(type2) {
  return (
    {
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
      audio: AUDIO_MODELS,
    }[type2] ?? []
  );
}

AUDIO_MODELS.filter(
  (m3) =>
    m3.backend === BACKEND_MINIMAX_TTS ||
    m3.backend === BACKEND_SEEDAUDIO ||
    (m3.backend === BACKEND_MINIMAX_V3 && !!m3.audioExtension),
);

AUDIO_MODELS.filter(
  (m3) =>
    m3.backend === BACKEND_MINIMAX_MUSIC ||
    m3.backend === BACKEND_ELEVENLABS_MUSIC,
);

export function resolveModelDisplayName(backend, modelIdRaw, region, type2) {
  if (!modelIdRaw) return backend;
  const modelId = normalizeLegacyModelId(modelIdRaw);
  if (type2 === "text")
    return resolveTextModelDisplayName(backend, modelId, region) ?? modelId;
  const registryType = toRegistryMediaType(type2);
  if (!registryType) return modelId;
  const pool = modelPoolForType(registryType);
  const matchesId = (m3) =>
    m3.model_name === modelId ||
    m3.id === modelId ||
    m3.publicToken === modelId ||
    m3.pricingId === modelId;
  const regionalMatch =
    pool.find(
      (m3) =>
        isVisibleInRegion(m3, region) &&
        m3.backend === backend &&
        matchesId(m3),
    ) ?? pool.find((m3) => isVisibleInRegion(m3, region) && matchesId(m3));
  const crossRegionMatch = regionalMatch ? void 0 : pool.find(matchesId);
  const currentRegionCounterpart = crossRegionMatch
    ? pool.find(
        (m3) =>
          isVisibleInRegion(m3, region) &&
          m3.backend === crossRegionMatch.backend &&
          ((crossRegionMatch.model_name !== void 0 &&
            m3.model_name === crossRegionMatch.model_name) ||
            (crossRegionMatch.pricingId !== void 0 &&
              m3.pricingId === crossRegionMatch.pricingId)),
      )
    : void 0;
  const match2 = regionalMatch ?? currentRegionCounterpart ?? crossRegionMatch;
  return match2?.name ?? LEGACY_MODEL_DISPLAY_NAMES.get(modelId) ?? modelId;
}
