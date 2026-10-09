// replace-configured-model-names-for-current-region.js
import { getRuntimeConfig } from "../vendor.js";
import { redactModelAliasesForDisplay } from "./domestic-model-display-aliases.js";
import { resolveModelDisplayName } from "./text-models.js";

export function redactForCurrentRegion(text2) {
  return redactModelAliasesForDisplay(text2, getRuntimeConfig().region);
}

export function resolveModelNameForCurrentRegion(modelName, preferType) {
  const region = getRuntimeConfig().region || "domestic";
  const baseTypes = ["image", "video", "audio"];
  const lookupTypes =
    preferType === "text"
      ? ["text"]
      : preferType
        ? [preferType, ...baseTypes.filter((type2) => type2 !== preferType)]
        : baseTypes;
  let resolved = modelName;
  for (const type2 of lookupTypes) {
    resolved = resolveModelDisplayName("", modelName, region, type2);
    if (resolved !== modelName) break;
  }
  return redactModelAliasesForDisplay(resolved, region);
}

function normalizedModelToken(value) {
  return value.toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

function isSafeConfiguredAlias(value) {
  return /[\d_.-]/u.test(value);
}

function escapeRegExp$2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionModelMediaType(type2) {
  if (type2 === "image" || type2 === "video" || type2 === "audio") return type2;
  return type2 === "music" ? "audio" : void 0;
}

export function replaceConfiguredModelNamesForCurrentRegion(text2, models) {
  const region = getRuntimeConfig().region;
  if (
    (region !== "domestic" && region !== "overseas") ||
    !text2 ||
    models.length === 0
  )
    return text2;
  const replacements = new Map();
  for (const model of models) {
    const displayName2 = model.display_name.trim();
    if (!displayName2) continue;
    const rawAliases = [model.id, model.model_name, model.mention_name];
    const mediaType = mentionModelMediaType(model.type);
    const legacyName = resolveModelNameForCurrentRegion(
      model.model_name || model.id,
      mediaType ?? void 0,
    );
    if (
      rawAliases.some(
        (alias) =>
          alias &&
          normalizedModelToken(alias) === normalizedModelToken(legacyName),
      )
    ) {
      rawAliases.push(legacyName);
    }
    for (const alias of rawAliases) {
      if (!alias || alias === displayName2 || !isSafeConfiguredAlias(alias))
        continue;
      if (!replacements.has(alias)) replacements.set(alias, displayName2);
    }
  }
  let result = text2;
  const aliases = [...replacements.keys()].sort(
    (left, right) => right.length - left.length,
  );
  for (const alias of aliases) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_-])${escapeRegExp$2(alias)}(?![A-Za-z0-9_-])`,
      "giu",
    );
    result = result.replace(pattern, replacements.get(alias) ?? alias);
  }
  return result;
}

export const LOCAL_FILE_LINK_PROTOCOLS = ["file", "sandbox"];

export function hasLocalFileLinkProtocol(raw2) {
  const value = raw2.toLowerCase();
  return LOCAL_FILE_LINK_PROTOCOLS.some((protocol) =>
    value.startsWith(`${protocol}:`),
  );
}

export function cleanRaw(raw2) {
  return raw2.trim().replace(/^[`'"]+|[`'"]+$/g, "");
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

export function isFileUrl(value) {
  return /^(sandbox:)?file:\/\//i.test(value);
}

function isWindowsAbsolutePath(value) {
  return (
    /^[a-zA-Z]:[\\/]/.test(value) ||
    /^\\\\[^\\/?]/.test(value) ||
    /^\\\\\?\\[a-zA-Z]:[\\/]/.test(value) ||
    /^\\\\\?\\UNC\\/i.test(value)
  );
}

export function isAbsoluteLocalPath$2(value) {
  return value.startsWith("/") || isWindowsAbsolutePath(value);
}

export function looksLikeFileReference(value) {
  if (!value) return false;
  if (isHttpUrl(value) || isFileUrl(value) || isAbsoluteLocalPath$2(value))
    return true;
  if (value.startsWith("/files/") || value.includes("output_files/"))
    return true;
  if (value.includes("/") || value.includes("\\")) return true;
  return /\.[a-z0-9]{1,12}$/i.test(value);
}
