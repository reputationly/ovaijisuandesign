// read-entity-drag-data.js
import { ENTITY_DRAG_MIME } from "../infra/use-online.jsx";
import {
  cloudAssetsChangedListeners,
  mapCloudNode,
  requestJson,
} from "./list-all-cloud-folders.js";
import { CloudProjectRequestError } from "../workspace/asset-lineage-query-key.js";

export function readEntityDragData(e2) {
  const raw2 = e2.dataTransfer?.getData(ENTITY_DRAG_MIME);
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (
      parsed &&
      typeof parsed.entityId === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.type === "string" &&
      (parsed.thumbnailUrl === void 0 ||
        typeof parsed.thumbnailUrl === "string")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export const CLOUD_ASSET_TABLE_EXTENSION = "htable";

function notifyCloudAssetsChanged(projectId) {
  for (const listener of cloudAssetsChangedListeners)
    listener({
      projectId,
    });
}

export async function createCloudFolder(projectId, parentId, name2) {
  const data2 = await requestJson("/api/v1/cloud-folder/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: projectId,
      parent_id: parentId,
      name: name2,
    }),
  });
  const node2 = mapCloudNode(data2.node);
  if (!node2) throw new CloudProjectRequestError(200, void 0);
  notifyCloudAssetsChanged(projectId);
  return node2;
}
