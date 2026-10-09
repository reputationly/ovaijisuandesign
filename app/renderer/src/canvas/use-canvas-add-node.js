// use-canvas-add-node.js
import { CanvasNodeType, reactExports, useTranslation } from "../vendor.js";
import {
  TABLE_CARD_DEFAULT_SIZE,
  TEXT_CARD_DEFAULT_SIZE,
} from "./compute-group-bounds-from-children.js";
import { emptyMediaNodeInit } from "../media-editing/base-backend.jsx";
import {
  createEmptyDocument,
  newTablePath,
} from "./is-reexecutable-generation-node.js";
import { serializeTableDocument } from "../text-editor/table-document-to-llm-content.js";

export function useCanvasAddNode({
  saveTableContent,
  addNode: addNode2,
  getPosition,
  getLastUsedModelParams,
}) {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    async (type2, positionOverride, dataOverride) => {
      const position2 = positionOverride ?? getPosition();
      switch (type2) {
        case CanvasNodeType.Text: {
          const nodeId = crypto.randomUUID();
          addNode2({
            type: CanvasNodeType.Text,
            id: nodeId,
            data: dataOverride,
            position: position2,
            size: TEXT_CARD_DEFAULT_SIZE,
            isEmpty: true,
          });
          return nodeId;
        }
        case CanvasNodeType.Image:
        case CanvasNodeType.Video:
        case CanvasNodeType.Audio: {
          const nodeId = crypto.randomUUID();
          const { size: size2, aspectRatio } = emptyMediaNodeInit(
            type2,
            getLastUsedModelParams,
            dataOverride?.aspectRatio,
          );
          const data2 = aspectRatio
            ? {
                ...(dataOverride ?? {}),
                aspectRatio,
              }
            : dataOverride;
          addNode2({
            type: type2,
            id: nodeId,
            position: position2,
            data: data2,
            size: size2,
            isEmpty: true,
          });
          return nodeId;
        }
        case CanvasNodeType.Table: {
          if (!saveTableContent) {
            console.warn("[canvas] saveTableContent bridge not provided");
            return null;
          }
          const tablePath = newTablePath();
          const emptyDoc = createEmptyDocument(
            t2("canvas.table.defaultColumn", "Text"),
          );
          const tableNodeId = crypto.randomUUID();
          try {
            await saveTableContent(tablePath, serializeTableDocument(emptyDoc));
            addNode2({
              type: CanvasNodeType.Table,
              id: tableNodeId,
              data: {
                tablePath,
              },
              position: position2,
              size: TABLE_CARD_DEFAULT_SIZE,
            });
            return tableNodeId;
          } catch (err) {
            console.error("[canvas] Failed to create table node:", err);
            return null;
          }
        }
        default:
          return null;
      }
    },
    [saveTableContent, addNode2, getPosition, getLastUsedModelParams, t2],
  );
}
