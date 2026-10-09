// resolve-chat-file-reference.js
import {
  cleanRaw,
  hasLocalFileLinkProtocol,
  isAbsoluteLocalPath$2,
  isHttpUrl,
  looksLikeFileReference,
} from "./replace-configured-model-names-for-current-region.js";

const INTERNAL_WORKSPACE_SEGMENTS = new Set([
  ".git",
  ".hilo",
  ".turbo",
  "node_modules",
  "dist",
  "logs",
  "client_logs",
]);

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

function stripLeadingSlash$2(value) {
  return value.replace(/^\/+/, "");
}

function normalizeWorkspacePath(value) {
  return stripLeadingSlash$2(
    safeDecode(stripQueryAndHash$1(value.trim())).replace(/\\/g, "/"),
  );
}

function localBasename(value) {
  const clean = value.replace(/\\/g, "/");
  return clean.split("/").filter(Boolean).pop() ?? clean;
}

function basename$5(value) {
  return localBasename(safeDecode(stripQueryAndHash$1(value)));
}

function hasUrlScheme(value) {
  if (/^[a-zA-Z]:(?![\\/])/.test(value)) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function fileUrlPath(value) {
  let raw2 = value;
  if (/^sandbox:/i.test(raw2)) {
    raw2 = raw2.replace(/^sandbox:/i, "");
    if (isAbsoluteLocalPath$2(raw2))
      return safeDecode(stripQueryAndHash$1(raw2));
  }
  if (!/^file:\/\//i.test(raw2)) return void 0;
  try {
    const url2 = new URL(raw2);
    const decoded = safeDecode(url2.pathname);
    if (/^\/[a-zA-Z]:\//.test(decoded))
      return decoded.slice(1).replace(/\//g, "\\");
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
    const clean = safeDecode(stripQueryAndHash$1(candidate)).replace(
      /\\/g,
      "/",
    );
    const filesIdx = clean.indexOf("/files/");
    if (filesIdx >= 0)
      return normalizeWorkspacePath(clean.slice(filesIdx + "/files/".length));
    const outputIdx = clean.indexOf("output_files/");
    if (outputIdx >= 0) {
      return normalizeWorkspacePath(clean.slice(outputIdx));
    }
  }
  return void 0;
}

function isWorkspaceInternal(relativePath) {
  const first2 = normalizeWorkspacePath(relativePath)
    .split("/")[0]
    ?.toLowerCase();
  return !!first2 && INTERNAL_WORKSPACE_SEGMENTS.has(first2);
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
  const candidate = safeDecode(stripQueryAndHash$1(absolutePath)).replace(
    /\\/g,
    "/",
  );
  const root2 = currentWorkspace.replace(/\\/g, "/").replace(/\/+$/, "");
  const caseInsensitive =
    /^[a-zA-Z]:\//.test(root2) || /^[a-zA-Z]:\//.test(candidate);
  const compareCandidate = caseInsensitive
    ? candidate.toLowerCase()
    : candidate;
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
  const localDisplayName =
    localBasename(decodedFilePath ?? safeDecode(rawPath)) || displayName2;
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
    const relativePath2 = workspaceRelativeFromAbsolute(
      localPath,
      context.currentWorkspace,
    );
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
