// use-canvas-add-node.js
import { CanvasNodeType } from "./canvas-geometry.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
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
  addNode,
  getPosition,
  getLastUsedModelParams,
}) {
  const { t: translate } = useTranslation();
  return reactExports.useCallback(
    async (type, positionOverride, dataOverride) => {
      const position = positionOverride ?? getPosition();
      switch (type) {
        case CanvasNodeType.Text: {
          const nodeId = crypto.randomUUID();
          addNode({
            type: CanvasNodeType.Text,
            id: nodeId,
            data: dataOverride,
            position,
            size: TEXT_CARD_DEFAULT_SIZE,
            isEmpty: true,
          });
          return nodeId;
        }
        case CanvasNodeType.Image:
        case CanvasNodeType.Video:
        case CanvasNodeType.Audio: {
          const nodeId = crypto.randomUUID();
          const { size, aspectRatio } = emptyMediaNodeInit(
            type,
            getLastUsedModelParams,
            dataOverride?.aspectRatio,
          );
          const data = aspectRatio
            ? {
                ...(dataOverride ?? {}),
                aspectRatio,
              }
            : dataOverride;
          addNode({
            type,
            id: nodeId,
            position,
            data,
            size,
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
            translate("canvas.table.defaultColumn", "Text"),
          );
          const tableNodeId = crypto.randomUUID();
          try {
            await saveTableContent(tablePath, serializeTableDocument(emptyDoc));
            addNode({
              type: CanvasNodeType.Table,
              id: tableNodeId,
              data: {
                tablePath,
              },
              position,
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
    [saveTableContent, addNode, getPosition, getLastUsedModelParams, translate],
  );
}
