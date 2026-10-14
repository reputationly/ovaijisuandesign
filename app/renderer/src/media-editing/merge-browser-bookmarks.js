// merge-browser-bookmarks.js
import { trackEvent } from "../infra/sanitize-track-props.js";
import { workflowSourceFromId } from "./unwrap-mcp-json-record.js";
import { TRACK_EVENTS } from "../infra/track-events.js";

export function trackComfyUiEvent(event, properties) {
  try {
    trackEvent(event, properties);
  } catch {}
}

export function trackComfyUiWorkflowCatalogAction(surface, action, workflowId) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_CATALOG_ACTION, {
    surface,
    action,
    ...(workflowId
      ? {
          workflow_source: workflowSourceFromId(workflowId),
        }
      : {}),
  });
}

export function trackComfyUiWorkflowInstall(surface, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_INSTALL, {
    surface,
    workflow_source: "template",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}

export function trackComfyUiWorkflowInstallFailed(surface, startedAt, stage) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_INSTALL_FAILED, {
    surface,
    workflow_source: "template",
    stage,
    error_type: "business",
    error_code: stage,
    error_message: "ComfyUI workflow installation failed",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}

function bookmarkUrlIdentity(url) {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

function bookmarkContentIdentity(bookmark) {
  return JSON.stringify([
    bookmarkUrlIdentity(bookmark.url),
    bookmark.folders,
    bookmark.title,
  ]);
}

export function mergeBrowserBookmarks(current, incoming) {
  const bookmarks = [...current];
  const ids = new Set(current.map((bookmark) => bookmark.id));
  const identities = new Set(current.map(bookmarkContentIdentity));
  const manualUrls = new Set(
    current
      .filter((bookmark) => bookmark.id.startsWith("manual-"))
      .map((bookmark) => bookmarkUrlIdentity(bookmark.url)),
  );
  for (const bookmark of incoming) {
    const identity = bookmarkContentIdentity(bookmark);
    if (
      ids.has(bookmark.id) ||
      identities.has(identity) ||
      manualUrls.has(bookmarkUrlIdentity(bookmark.url))
    )
      continue;
    bookmarks.push(bookmark);
    ids.add(bookmark.id);
    identities.add(identity);
  }
  return {
    bookmarks,
    addedCount: bookmarks.length - current.length,
  };
}
