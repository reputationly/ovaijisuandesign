// merge-browser-bookmarks.js
import { trackEvent } from "../infra/sanitize-track-props.js";
import { workflowSourceFromId } from "./unwrap-mcp-json-record.js";
import { TRACK_EVENTS } from "../infra/track-events.js";

export function trackComfyUiEvent(event, properties2) {
  try {
    trackEvent(event, properties2);
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

function bookmarkUrlIdentity(url2) {
  try {
    return new URL(url2).href;
  } catch {
    return url2;
  }
}

function bookmarkContentIdentity(bookmark) {
  return JSON.stringify([
    bookmarkUrlIdentity(bookmark.url),
    bookmark.folders,
    bookmark.title,
  ]);
}

export function mergeBrowserBookmarks(current2, incoming) {
  const bookmarks = [...current2];
  const ids2 = new Set(current2.map((bookmark) => bookmark.id));
  const identities = new Set(current2.map(bookmarkContentIdentity));
  const manualUrls = new Set(
    current2
      .filter((bookmark) => bookmark.id.startsWith("manual-"))
      .map((bookmark) => bookmarkUrlIdentity(bookmark.url)),
  );
  for (const bookmark of incoming) {
    const identity2 = bookmarkContentIdentity(bookmark);
    if (
      ids2.has(bookmark.id) ||
      identities.has(identity2) ||
      manualUrls.has(bookmarkUrlIdentity(bookmark.url))
    )
      continue;
    bookmarks.push(bookmark);
    ids2.add(bookmark.id);
    identities.add(identity2);
  }
  return {
    bookmarks,
    addedCount: bookmarks.length - current2.length,
  };
}
