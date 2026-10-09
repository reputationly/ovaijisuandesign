// resolve-chat-file-reference.js
import { getRuntimeConfig } from "../vendor.js";
import { redactModelAliasesForDisplay, resolveModelDisplayName } from "./text-models.js";
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
  if ((region !== "domestic" && region !== "overseas") || !text2 || models.length === 0)
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
        (alias) => alias && normalizedModelToken(alias) === normalizedModelToken(legacyName),
      )
    ) {
      rawAliases.push(legacyName);
    }
    for (const alias of rawAliases) {
      if (!alias || alias === displayName2 || !isSafeConfiguredAlias(alias)) continue;
      if (!replacements.has(alias)) replacements.set(alias, displayName2);
    }
  }
  let result = text2;
  const aliases = [...replacements.keys()].sort((left, right) => right.length - left.length);
  for (const alias of aliases) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_-])${escapeRegExp$2(alias)}(?![A-Za-z0-9_-])`,
      "giu",
    );
    result = result.replace(pattern, replacements.get(alias) ?? alias);
  }
  return result;
}
const CANVAS_NODE_ID_PATTERN = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const CANVAS_NODE_REFERENCE_PATTERN =
  /(?:画布节点|canvas\s+node)\s*ID\s*[：:]\s*`([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})`/gi;
const TITLED_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `(?:\\*\\*)?(《[^\\r\\n\`]+》)(?:\\*\\*)?[\\t ]*(?:\\r?\\n|<br\\s*\\/?>)+[\\t ]*(?:画布节点|canvas\\s+node)\\s*ID\\s*[：:]\\s*\`(${CANVAS_NODE_ID_PATTERN})\``,
  "gi",
);
const LIST_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `^([\\t ]*(?:[-+*]|\\d+[.)])[\\t ]+)(?:\\*\\*)?([^\\r\\n\`]+?)[：:](?:\\*\\*)?[\\t ]*(?:\\r?\\n[\\t ]+)?\`(${CANVAS_NODE_ID_PATTERN})\`[\\t ]*$`,
  "gim",
);
const LIST_NAMED_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `^([\\t ]*(?:[-+*]|\\d+[.)])[\\t ]+)((?:\\*\\*)?[^\\r\\n\`]{0,40}?(?:节点|node)(?:\\*\\*)?[\\t ]*[：:][\\t ]*)\`([^\\r\\n\`]+)\`[\\t ]*[（(][\\t ]*node[\\t ]*id[\\t ]*[：:][\\t ]*\`(${CANVAS_NODE_ID_PATTERN})\`[\\t ]*[）)][\\t ]*$`,
  "gimu",
);
const NAMED_INLINE_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `(?:\\*\\*)?([^，。；;：:\\r\\n\`]{1,40}?(?:节点|node))(?:\\*\\*)?[\\t ]*[：:][\\t ]*\`(${CANVAS_NODE_ID_PATTERN})\``,
  "giu",
);
const MARKDOWN_LINE_PATTERN = /.*(?:\r\n|\n|\r|$)/g;
const FENCE_OPEN_PATTERN = /^[\t ]{0,3}(`{3,}|~{3,})/;
const INDENTED_CODE_LINE_PATTERN = /^(?: {4}|\t)/;
const NON_ARTIFACT_IDENTIFIER_LABEL_PATTERN =
  /(?:(?:^|[\s_：:-])(?:id|uuid|identifier)|(?:ID|UUID|Id)|(?:标识|标识符))$/u;
const INTERNAL_TOKEN_PREFIX = "canvas-node-reference:";
const INTERNAL_TOKEN_SUFFIX = "";
const TECHNICAL_CANVAS_NODE_LABELS = new Set([
  "canvasnode",
  "canvasnodeid",
  "node",
  "nodeid",
  "画布节点",
  "画布节点id",
  "节点",
  "节点id",
]);
export const EMPTY_CANVAS_NODE_REFERENCES = new Map();
function withoutLineEnding(line) {
  return line.replace(/(?:\r\n|\n|\r)$/, "");
}
function openingFence(line) {
  const marker = withoutLineEnding(line).match(FENCE_OPEN_PATTERN)?.[1];
  if (!marker) return void 0;
  const character = marker[0];
  if (character !== "`" && character !== "~") return void 0;
  return {
    character,
    length: marker.length,
  };
}
function closesFence(line, fence) {
  const content2 = withoutLineEnding(line);
  const indentLength = content2.match(/^[\t ]{0,3}/)?.[0].length ?? 0;
  const marker = content2.slice(indentLength).trimEnd();
  return (
    marker.length >= fence.length && [...marker].every((character) => character === fence.character)
  );
}
function isIndentedCodeLine(line) {
  return INDENTED_CODE_LINE_PATTERN.test(withoutLineEnding(line));
}
function isBlankLine(line) {
  return withoutLineEnding(line).trim().length === 0;
}
function canvasNodeDisplayName(candidate) {
  const displayName2 = candidate?.trim();
  if (!displayName2) return void 0;
  const plainDisplayName = displayName2.replace(/^\*\*|\*\*$/g, "").trim();
  const normalized = plainDisplayName.replace(/[\s_：:-]+/g, "").toLocaleLowerCase();
  if (TECHNICAL_CANVAS_NODE_LABELS.has(normalized)) return void 0;
  if (NON_ARTIFACT_IDENTIFIER_LABEL_PATTERN.test(plainDisplayName)) return void 0;
  if (new RegExp(`^${CANVAS_NODE_ID_PATTERN}$`, "i").test(plainDisplayName)) return void 0;
  return plainDisplayName;
}
function isStandaloneMatch(source, offset2, matchLength) {
  const lineStart = source.lastIndexOf("\n", offset2 - 1) + 1;
  const nextLineBreak = source.indexOf("\n", offset2 + matchLength);
  const lineEnd2 = nextLineBreak === -1 ? source.length : nextLineBreak;
  return (
    source.slice(lineStart, offset2).trim().length === 0 &&
    source.slice(offset2 + matchLength, lineEnd2).trim().length === 0
  );
}
function escapeRegExp$1(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function internalTokenPrefix(content2) {
  let prefix = INTERNAL_TOKEN_PREFIX;
  while (content2.includes(prefix)) prefix += ":";
  return prefix;
}
function registerCanvasNodeReference(references, nodeId, candidateDisplayName) {
  const fallbackDisplayName = canvasNodeDisplayName(candidateDisplayName);
  const current2 = references.get(nodeId);
  if (current2?.fallbackDisplayName || (current2 && !fallbackDisplayName)) return;
  references.set(
    nodeId,
    fallbackDisplayName
      ? {
          fallbackDisplayName,
        }
      : {},
  );
}
function transformOutsideCodeBlocks(content2, transform2) {
  const lines = content2.match(MARKDOWN_LINE_PATTERN) ?? [];
  if (lines.at(-1) === "") lines.pop();
  let output = "";
  let textSegment = "";
  let fence;
  let inIndentedCode = false;
  for (const line of lines) {
    if (fence) {
      output += line;
      if (closesFence(line, fence)) fence = void 0;
      continue;
    }
    if (inIndentedCode) {
      if (isIndentedCodeLine(line) || isBlankLine(line)) {
        output += line;
        continue;
      }
      inIndentedCode = false;
    }
    if (isIndentedCodeLine(line)) {
      output += transform2(textSegment);
      textSegment = "";
      output += line;
      inIndentedCode = true;
      continue;
    }
    const nextFence = openingFence(line);
    if (nextFence) {
      output += transform2(textSegment);
      textSegment = "";
      output += line;
      fence = nextFence;
      continue;
    }
    textSegment += line;
  }
  return output + transform2(textSegment);
}
export function prepareCanvasNodeReferences(content2) {
  const references = new Map();
  const tokens2 = [];
  const renderedStandaloneNodeIds = new Set();
  const tokenPrefix = internalTokenPrefix(content2);
  const tokenPattern = new RegExp(
    `${escapeRegExp$1(tokenPrefix)}(\\d+)${escapeRegExp$1(INTERNAL_TOKEN_SUFFIX)}`,
    "gu",
  );
  const createToken = (nodeId, replacement, fallbackDisplayName, deduplicateStandalone = false) => {
    const tokenIndex =
      tokens2.push({
        nodeId,
        replacement,
        fallbackDisplayName,
        deduplicateStandalone,
      }) - 1;
    return `${tokenPrefix}${tokenIndex}${INTERNAL_TOKEN_SUFFIX}`;
  };
  const preparedContent = transformOutsideCodeBlocks(content2, (segment) => {
    const titledSegment = segment.replace(
      TITLED_CANVAS_NODE_REFERENCE_PATTERN,
      (_match, documentName, nodeId) => {
        return createToken(nodeId, `\`${nodeId}\``, documentName, true);
      },
    );
    const listSegment = titledSegment.replace(
      LIST_CANVAS_NODE_REFERENCE_PATTERN,
      (match2, listMarker, nodeName, nodeId) => {
        const fallbackDisplayName = canvasNodeDisplayName(nodeName);
        if (!fallbackDisplayName) return match2;
        return createToken(nodeId, `${listMarker}\`${nodeId}\``, fallbackDisplayName, true);
      },
    );
    const inlineSegment = listSegment.replace(
      NAMED_INLINE_CANVAS_NODE_REFERENCE_PATTERN,
      (match2, nodeName, nodeId, offset2, source) => {
        const standalone = isStandaloneMatch(source, offset2, match2.length);
        return createToken(nodeId, standalone ? `\`${nodeId}\`` : match2, nodeName, standalone);
      },
    );
    const transformedSegment = inlineSegment.replace(
      LIST_NAMED_CANVAS_NODE_REFERENCE_PATTERN,
      (_match, listMarker, nodeLabel, nodeName, nodeId) => {
        return createToken(nodeId, `${listMarker}${nodeLabel}\`${nodeId}\``, nodeName, true);
      },
    );
    const tokenizedSegment = transformedSegment.replace(
      CANVAS_NODE_REFERENCE_PATTERN,
      (match2, nodeId, offset2, source) =>
        createToken(
          nodeId,
          `\`${nodeId}\``,
          void 0,
          isStandaloneMatch(source, offset2, match2.length),
        ),
    );
    return tokenizedSegment.replace(tokenPattern, (_match, rawIndex) => {
      const token2 = tokens2[Number(rawIndex)];
      if (!token2) return "";
      registerCanvasNodeReference(references, token2.nodeId, token2.fallbackDisplayName);
      if (!token2.deduplicateStandalone) return token2.replacement;
      if (renderedStandaloneNodeIds.has(token2.nodeId)) return "";
      renderedStandaloneNodeIds.add(token2.nodeId);
      return token2.replacement;
    });
  });
  return {
    content: preparedContent,
    references: references.size > 0 ? references : EMPTY_CANVAS_NODE_REFERENCES,
  };
}
export const LOCAL_FILE_LINK_PROTOCOLS = ["file", "sandbox"];
const MAX_ASSET_REFERENCE_LENGTH = 260;
export function hasLocalFileLinkProtocol(raw2) {
  const value = raw2.toLowerCase();
  return LOCAL_FILE_LINK_PROTOCOLS.some((protocol) => value.startsWith(`${protocol}:`));
}
export function shouldResolveAssetList(raw2) {
  const text2 = raw2.trim();
  if (!text2 || text2.length > MAX_ASSET_REFERENCE_LENGTH) return false;
  if (/^https?:/i.test(text2)) return false;
  return true;
}
const INTERNAL_WORKSPACE_SEGMENTS = new Set([
  ".git",
  ".hilo",
  ".turbo",
  "node_modules",
  "dist",
  "logs",
  "client_logs",
]);
function cleanRaw(raw2) {
  return raw2.trim().replace(/^[`'"]+|[`'"]+$/g, "");
}
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function stripQueryAndHash$1(value) {
  return value.split("?")[0]?.split("#")[0] ?? value;
}
function normalizeWorkspacePath(value) {
  return stripLeadingSlash$2(safeDecode(stripQueryAndHash$1(value.trim())).replace(/\\/g, "/"));
}
function stripLeadingSlash$2(value) {
  return value.replace(/^\/+/, "");
}
function basename$5(value) {
  return localBasename(safeDecode(stripQueryAndHash$1(value)));
}
function localBasename(value) {
  const clean = value.replace(/\\/g, "/");
  return clean.split("/").filter(Boolean).pop() ?? clean;
}
function hasUrlScheme(value) {
  if (/^[a-zA-Z]:(?![\\/])/.test(value)) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}
function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}
function isFileUrl(value) {
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
function isAbsoluteLocalPath$2(value) {
  return value.startsWith("/") || isWindowsAbsolutePath(value);
}
function fileUrlPath(value) {
  let raw2 = value;
  if (/^sandbox:/i.test(raw2)) {
    raw2 = raw2.replace(/^sandbox:/i, "");
    if (isAbsoluteLocalPath$2(raw2)) return safeDecode(stripQueryAndHash$1(raw2));
  }
  if (!/^file:\/\//i.test(raw2)) return void 0;
  try {
    const url2 = new URL(raw2);
    const decoded = safeDecode(url2.pathname);
    if (/^\/[a-zA-Z]:\//.test(decoded)) return decoded.slice(1).replace(/\//g, "\\");
    if (url2.hostname && url2.hostname !== "localhost") {
      return `\\\\${url2.hostname}${decoded.replace(/\//g, "\\")}`;
    }
    return decoded;
  } catch {
    return void 0;
  }
}
function maybeWorkspaceRelativeFromRoute(raw2) {
  const candidates2 = [raw2];
  try {
    const url2 = new URL(raw2);
    candidates2.unshift(url2.pathname);
  } catch {}
  for (const candidate of candidates2) {
    const clean = safeDecode(stripQueryAndHash$1(candidate)).replace(/\\/g, "/");
    const filesIdx = clean.indexOf("/files/");
    if (filesIdx >= 0) return normalizeWorkspacePath(clean.slice(filesIdx + "/files/".length));
    const outputIdx = clean.indexOf("output_files/");
    if (outputIdx >= 0) {
      return normalizeWorkspacePath(clean.slice(outputIdx));
    }
  }
  return void 0;
}
function isWorkspaceInternal(relativePath) {
  const first2 = normalizeWorkspacePath(relativePath).split("/")[0]?.toLowerCase();
  return !!first2 && INTERNAL_WORKSPACE_SEGMENTS.has(first2);
}
function looksLikeFileReference(value) {
  if (!value) return false;
  if (isHttpUrl(value) || isFileUrl(value) || isAbsoluteLocalPath$2(value)) return true;
  if (value.startsWith("/files/") || value.includes("output_files/")) return true;
  if (value.includes("/") || value.includes("\\")) return true;
  return /\.[a-z0-9]{1,12}$/i.test(value);
}
const CODE_FRAGMENT_PATTERN = /[`"={}<>;|]/;
const CODE_KEYWORD_PATTERN =
  /^(?:const|let|var|import|export|return|if|for|while|function|class|type|interface|enum|await|async)\b/;
export function isStandaloneChatFileReferenceText(raw2) {
  const value = cleanRaw(raw2);
  if (!looksLikeFileReference(value)) return false;
  if (isHttpUrl(value) || isFileUrl(value) || isAbsoluteLocalPath$2(value)) return true;
  if (value.startsWith("/files/") || value.includes("output_files/")) return true;
  if (CODE_KEYWORD_PATTERN.test(value)) return false;
  if (CODE_FRAGMENT_PATTERN.test(value)) return false;
  return true;
}
function findExactAsset(assets, relativePath) {
  if (!relativePath) return void 0;
  const target = normalizeWorkspacePath(relativePath);
  return assets.find((asset) => normalizeWorkspacePath(asset.path) === target);
}
function findUniqueBasenameAsset(assets, name2) {
  const target = basename$5(name2);
  if (!target || target !== name2) return void 0;
  const matches2 = assets.filter(
    (asset) => basename$5(asset.path) === target || asset.name === target,
  );
  return matches2.length === 1 ? matches2[0] : void 0;
}
function workspaceRelativeFromAbsolute(absolutePath, currentWorkspace) {
  if (!currentWorkspace) return void 0;
  const candidate = safeDecode(stripQueryAndHash$1(absolutePath)).replace(/\\/g, "/");
  const root2 = currentWorkspace.replace(/\\/g, "/").replace(/\/+$/, "");
  const caseInsensitive = /^[a-zA-Z]:\//.test(root2) || /^[a-zA-Z]:\//.test(candidate);
  const compareCandidate = caseInsensitive ? candidate.toLowerCase() : candidate;
  const compareRoot = caseInsensitive ? root2.toLowerCase() : root2;
  if (compareCandidate === compareRoot) return "";
  if (!compareCandidate.startsWith(`${compareRoot}/`)) return void 0;
  return normalizeWorkspacePath(candidate.slice(root2.length + 1));
}
function isUnsafeRelativePath(value) {
  return (
    value.startsWith("..") ||
    value.includes("/../") ||
    value.includes("\\..\\") ||
    value.startsWith("~") ||
    value.startsWith("$") ||
    value.startsWith("%") ||
    /^[a-zA-Z]:(?![\\/])/.test(value)
  );
}
function joinWorkspacePath(workspace, relativePath) {
  const sep = workspace.includes("\\") && !workspace.includes("/") ? "\\" : "/";
  const child = sep === "\\" ? relativePath.replace(/\//g, "\\") : relativePath;
  return workspace.endsWith("/") || workspace.endsWith("\\")
    ? `${workspace}${child}`
    : `${workspace}${sep}${child}`;
}
export function resolveChatFileReference(raw2, context) {
  const rawPath = cleanRaw(raw2);
  const displayName2 = basename$5(rawPath) || rawPath;
  if (!looksLikeFileReference(rawPath))
    return {
      kind: "none",
      rawPath,
      displayName: displayName2,
    };
  const decodedFilePath = fileUrlPath(rawPath);
  const localPath = decodedFilePath ?? rawPath;
  const localDisplayName = localBasename(decodedFilePath ?? safeDecode(rawPath)) || displayName2;
  if (hasLocalFileLinkProtocol(rawPath) && !isAbsoluteLocalPath$2(localPath)) {
    return {
      kind: "none",
      rawPath,
      displayName: displayName2,
    };
  }
  const routeRelativePath =
    isAbsoluteLocalPath$2(localPath) && !rawPath.startsWith("/files/")
      ? void 0
      : maybeWorkspaceRelativeFromRoute(rawPath);
  if (routeRelativePath) {
    const asset = findExactAsset(context.assets, routeRelativePath);
    if (asset) {
      return {
        kind: "workspace-file",
        rawPath,
        displayName: asset.name || basename$5(asset.path),
        workspaceRelativePath: asset.path,
        absolutePath: context.currentWorkspace
          ? joinWorkspacePath(context.currentWorkspace, asset.path)
          : void 0,
        assetId: asset.id,
      };
    }
    return {
      kind: rawPath.includes("output_files/") ? "app-artifact" : "candidate",
      rawPath,
      displayName: displayName2,
      workspaceRelativePath: routeRelativePath,
    };
  }
  if (isHttpUrl(rawPath))
    return {
      kind: "remote",
      rawPath,
      displayName: displayName2,
      url: rawPath,
    };
  if (isAbsoluteLocalPath$2(localPath)) {
    const relativePath2 = workspaceRelativeFromAbsolute(localPath, context.currentWorkspace);
    if (relativePath2 !== void 0) {
      if (isWorkspaceInternal(relativePath2)) {
        return {
          kind: "workspace-internal",
          rawPath,
          displayName: localDisplayName,
          workspaceRelativePath: relativePath2,
          absolutePath: localPath,
        };
      }
      const asset = findExactAsset(context.assets, relativePath2);
      if (asset) {
        return {
          kind: "workspace-file",
          rawPath,
          displayName: asset.name || basename$5(asset.path),
          workspaceRelativePath: asset.path,
          absolutePath: localPath,
          assetId: asset.id,
        };
      }
      return {
        kind: "candidate",
        rawPath,
        displayName: displayName2,
        workspaceRelativePath: relativePath2,
      };
    }
    return {
      kind: "external-local",
      rawPath,
      displayName: localDisplayName,
      absolutePath: localPath,
    };
  }
  if (hasUrlScheme(rawPath))
    return {
      kind: "none",
      rawPath,
      displayName: displayName2,
    };
  if (isUnsafeRelativePath(rawPath))
    return {
      kind: "candidate",
      rawPath,
      displayName: displayName2,
    };
  const relativePath = normalizeWorkspacePath(rawPath.replace(/^\.\//, ""));
  if (isWorkspaceInternal(relativePath) && context.currentWorkspace) {
    return {
      kind: "workspace-internal",
      rawPath,
      displayName: localDisplayName,
      workspaceRelativePath: relativePath,
      absolutePath: joinWorkspacePath(context.currentWorkspace, relativePath),
    };
  }
  const exactAsset = findExactAsset(context.assets, relativePath);
  if (exactAsset) {
    return {
      kind: "workspace-file",
      rawPath,
      displayName: exactAsset.name || basename$5(exactAsset.path),
      workspaceRelativePath: exactAsset.path,
      absolutePath: context.currentWorkspace
        ? joinWorkspacePath(context.currentWorkspace, exactAsset.path)
        : void 0,
      assetId: exactAsset.id,
    };
  }
  const basenameAsset = findUniqueBasenameAsset(context.assets, rawPath);
  if (basenameAsset) {
    return {
      kind: "workspace-file",
      rawPath,
      displayName: basenameAsset.name || basename$5(basenameAsset.path),
      workspaceRelativePath: basenameAsset.path,
      absolutePath: context.currentWorkspace
        ? joinWorkspacePath(context.currentWorkspace, basenameAsset.path)
        : void 0,
      assetId: basenameAsset.id,
    };
  }
  return {
    kind: "candidate",
    rawPath,
    displayName: displayName2,
  };
}
