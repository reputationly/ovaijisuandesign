// workspace-initial-payload-cache.js
import { workspaceInitialPayloadSignature } from "./use-asset-lineage.js";
function hasPayload(payload) {
  return Boolean(
    payload.initialMessage ||
    (payload.initialAttachments?.length ?? 0) > 0 ||
    (payload.initialEntityRefs?.length ?? 0) > 0 ||
    payload.initialModelId ||
    payload.initialSelectedMediaModels,
  );
}
function workspaceInitialPayloadKey(payload) {
  return payload.initialPayloadId
    ? `operation:${payload.initialPayloadId}`
    : `legacy:${workspaceInitialPayloadSignature(payload)}`;
}
function cloneSelectedMediaModels(selectedMediaModels) {
  if (!selectedMediaModels) return void 0;
  return {
    ...(selectedMediaModels.image
      ? {
          image: [...selectedMediaModels.image],
        }
      : {}),
    ...(selectedMediaModels.video
      ? {
          video: [...selectedMediaModels.video],
        }
      : {}),
    ...(selectedMediaModels.audio
      ? {
          audio: [...selectedMediaModels.audio],
        }
      : {}),
  };
}
export class WorkspaceInitialPayloadCache {
  payloads = new Map();
  consumedPayloadKeys = new Map();
  capture(workspaceId, payload) {
    if (!workspaceId || !hasPayload(payload)) return;
    const next = {
      initialPayloadId: payload.initialPayloadId,
      initialMessage: payload.initialMessage,
      initialAttachments: payload.initialAttachments
        ? [...payload.initialAttachments]
        : void 0,
      initialEntityRefs: payload.initialEntityRefs
        ? [...payload.initialEntityRefs]
        : void 0,
      initialModelId: payload.initialModelId,
      initialSelectedMediaModels: cloneSelectedMediaModels(
        payload.initialSelectedMediaModels,
      ),
    };
    const payloadKey = workspaceInitialPayloadKey(next);
    if (this.consumedPayloadKeys.get(workspaceId) === payloadKey) return;
    this.payloads.set(workspaceId, next);
  }
  get(workspaceId) {
    return this.payloads.get(workspaceId);
  }
  consume(workspaceId) {
    const payload = this.payloads.get(workspaceId);
    if (payload) {
      this.consumedPayloadKeys.set(
        workspaceId,
        workspaceInitialPayloadKey(payload),
      );
    }
    this.payloads.delete(workspaceId);
  }
  /**
   * Drop cached payloads for workspaces that have been closed.
   *
   * A workspace is considered "closed" when it was previously seen in the live
   * set but is no longer present — and is not the currently active workspace
   * (which may not yet have appeared in entries).
   */
  cleanupClosed(liveIds, seenIds, currentId) {
    for (const id of liveIds) {
      seenIds.add(id);
    }
    for (const id of this.payloads.keys()) {
      if (seenIds.has(id) && !liveIds.has(id) && id !== currentId) {
        this.payloads.delete(id);
        this.consumedPayloadKeys.delete(id);
      }
    }
  }
}
