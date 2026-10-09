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

function cloneSelectedMediaModels$1(selectedMediaModels) {
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
  capture(workspaceId2, payload) {
    if (!workspaceId2 || !hasPayload(payload)) return;
    const next2 = {
      initialPayloadId: payload.initialPayloadId,
      initialMessage: payload.initialMessage,
      initialAttachments: payload.initialAttachments
        ? [...payload.initialAttachments]
        : void 0,
      initialEntityRefs: payload.initialEntityRefs
        ? [...payload.initialEntityRefs]
        : void 0,
      initialModelId: payload.initialModelId,
      initialSelectedMediaModels: cloneSelectedMediaModels$1(
        payload.initialSelectedMediaModels,
      ),
    };
    const payloadKey = workspaceInitialPayloadKey(next2);
    if (this.consumedPayloadKeys.get(workspaceId2) === payloadKey) return;
    this.payloads.set(workspaceId2, next2);
  }
  get(workspaceId2) {
    return this.payloads.get(workspaceId2);
  }
  consume(workspaceId2) {
    const payload = this.payloads.get(workspaceId2);
    if (payload) {
      this.consumedPayloadKeys.set(
        workspaceId2,
        workspaceInitialPayloadKey(payload),
      );
    }
    this.payloads.delete(workspaceId2);
  }
  /**
   * Drop cached payloads for workspaces that have been closed.
   *
   * A workspace is considered "closed" when it was previously seen in the live
   * set but is no longer present — and is not the currently active workspace
   * (which may not yet have appeared in entries).
   */
  cleanupClosed(liveIds, seenIds, currentId) {
    for (const id2 of liveIds) {
      seenIds.add(id2);
    }
    for (const id2 of this.payloads.keys()) {
      if (seenIds.has(id2) && !liveIds.has(id2) && id2 !== currentId) {
        this.payloads.delete(id2);
        this.consumedPayloadKeys.delete(id2);
      }
    }
  }
}
