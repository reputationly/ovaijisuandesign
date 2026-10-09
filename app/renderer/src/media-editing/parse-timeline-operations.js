// parse-timeline-operations.js
import { parseJsonRecord } from "./unwrap-mcp-json-record.js";

const TIMELINE_OPERATION_TOOL_ALIASES = {
  hub_canvas_apply_text_edits: "canvas_apply_text_edits",
  hub_canvas_group_nodes: "canvas_group_nodes",
  hub_canvas_group_recent_outputs: "canvas_group_recent_outputs",
  hub_canvas_write_node: "canvas_write_node",
  hub_plan_write: "plan_write",
  hub_plan_replan: "plan_replan",
};

function normaliseTimelineOperationToolName(toolName2) {
  if (!toolName2) return void 0;
  return TIMELINE_OPERATION_TOOL_ALIASES[toolName2] ?? toolName2;
}

function stringField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (typeof value === "string" && value.trim().length > 0)
      return value.trim();
  }
  return void 0;
}

function recordField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (value && typeof value === "object" && !Array.isArray(value))
      return value;
  }
  return void 0;
}

function booleanField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (typeof value === "boolean") return value;
  }
  return void 0;
}

function recordArrayField(record2, keys2) {
  if (!record2) return [];
  for (const key2 of keys2) {
    const value = record2[key2];
    if (!Array.isArray(value)) continue;
    return value.filter(
      (item) => !!item && typeof item === "object" && !Array.isArray(item),
    );
  }
  return [];
}

function basename$1(path2) {
  const trimmed = path2.trim();
  const withoutSlash = trimmed.replace(/[\\/]+$/, "");
  const parts = withoutSlash.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

function firstDefined(...values3) {
  return values3.find((value) => value && value.trim().length > 0);
}

function nodeIdFrom(args, result) {
  return firstDefined(
    stringField(result, ["nodeId", "node_id"]),
    stringField(args, ["nodeId", "node_id"]),
  );
}

function groupIdFrom(result) {
  return firstDefined(
    stringField(result, [
      "groupId",
      "group_id",
      "addedGroupId",
      "added_group_id",
    ]),
    stringField(result, ["nodeId", "node_id"]),
  );
}

function assetIdFrom(args, result) {
  return firstDefined(
    stringField(result, ["assetId", "asset_id"]),
    stringField(args, ["assetId", "asset_id"]),
  );
}

function assetPathFrom(args, result) {
  return firstDefined(
    stringField(result, ["assetPath", "asset_path"]),
    stringField(args, ["assetPath", "asset_path"]),
  );
}

function canvasMediaLabelKey(assetType) {
  switch (assetType) {
    case "image":
      return "chat.canvasOperation.addImage";
    case "video":
      return "chat.canvasOperation.addVideo";
    case "audio":
      return "chat.canvasOperation.addAudio";
    default:
      return "chat.canvasOperation.addMedia";
  }
}

function parseUnifiedCanvasWrite(args, result) {
  if (booleanField(result, ["ok"]) === false) return void 0;
  const kind = firstDefined(
    stringField(result, ["kind"]),
    stringField(args, ["kind"]),
  );
  const nodeId = nodeIdFrom(args, result);
  const targetNodeIds = nodeId ? [nodeId] : [];
  switch (kind) {
    case "text": {
      const created =
        booleanField(result, ["created"]) ?? !stringField(args, ["nodeId"]);
      if (!created) return void 0;
      const path2 = stringField(result, ["path"]);
      const name2 = firstDefined(
        stringField(args, ["name"]),
        path2 ? basename$1(path2) : void 0,
      );
      return {
        kind: "text-create",
        labelKey: "chat.canvasOperation.addText",
        activeLabelKey: "chat.canvasOperation.addText.running",
        inputSummary: name2 ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: "chat.canvasOperation.status.created",
        targetNodeIds,
        count: 1,
      };
    }
    case "table": {
      const created =
        booleanField(result, ["created"]) ?? !stringField(args, ["nodeId"]);
      const tablePath = stringField(result, ["tablePath", "table_path"]);
      const name2 = firstDefined(
        stringField(args, ["title", "name"]),
        tablePath ? basename$1(tablePath) : void 0,
      );
      return {
        kind: "table-node",
        labelKey: created
          ? "chat.canvasOperation.addTable"
          : "chat.canvasOperation.updateTable",
        inputSummary: name2 ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: created
          ? "chat.canvasOperation.status.created"
          : "chat.canvasOperation.status.updated",
        targetNodeIds,
        count: 1,
      };
    }
    case "media": {
      const assetPath = assetPathFrom(args, result);
      const assetType = stringField(result, ["assetType", "asset_type"]);
      const reused = booleanField(result, ["reused"]);
      if (reused) return void 0;
      const name2 = assetPath ? basename$1(assetPath) : void 0;
      return {
        kind: "media-node",
        labelKey: canvasMediaLabelKey(assetType),
        inputSummary: name2 ?? assetType ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: "chat.canvasOperation.status.created",
        targetNodeIds,
        targetAssetId: assetIdFrom(args, result),
        targetAssetPath: assetPath,
        count: 1,
      };
    }
    default:
      return void 0;
  }
}

export function parseTimelineOperations(
  toolName2,
  toolArgs,
  toolResult,
  toolStatus,
) {
  const normalizedToolName = normaliseTimelineOperationToolName(toolName2);
  if (!normalizedToolName) return [];
  if (
    toolStatus === "error" &&
    (normalizedToolName === "plan_write" ||
      normalizedToolName === "plan_replan")
  ) {
    return [];
  }
  const args = parseJsonRecord(toolArgs);
  const result = parseJsonRecord(toolResult);
  switch (normalizedToolName) {
    case "canvas_write_node": {
      const items = recordArrayField(args, ["items"]);
      if (items.length === 0) {
        const operation = parseUnifiedCanvasWrite(args, result);
        return operation ? [operation] : [];
      }
      const results = recordArrayField(result, ["results"]);
      const resultsByIndex = new Map();
      results.forEach((item, index2) => {
        const explicitIndex = item.index;
        resultsByIndex.set(
          typeof explicitIndex === "number" ? explicitIndex : index2,
          item,
        );
      });
      return items.flatMap((item, index2) => {
        const operation = parseUnifiedCanvasWrite(
          item,
          resultsByIndex.get(index2),
        );
        return operation ? [operation] : [];
      });
    }
    case "canvas_group_nodes": {
      const label = stringField(args, ["label"]);
      const groupId2 = groupIdFrom(result);
      if (!groupId2) return [];
      return [
        {
          kind: "group-nodes",
          labelKey: "chat.canvasOperation.organizeCanvas",
          inputSummary: label ?? groupId2 ?? "",
          displayNameKnown: !!label,
          outputSummary: "chat.canvasOperation.status.grouped",
          targetNodeIds: [groupId2],
          targetGroupId: groupId2,
          count: 1,
        },
      ];
    }
    case "canvas_group_recent_outputs": {
      const groupId2 = groupIdFrom(result);
      if (!groupId2) return [];
      const label = stringField(args, ["label"]);
      return [
        {
          kind: "group-nodes",
          labelKey: "chat.canvasOperation.organizeCanvas",
          inputSummary: label ?? groupId2 ?? "",
          displayNameKnown: !!label,
          outputSummary: "chat.canvasOperation.status.grouped",
          targetNodeIds: [groupId2],
          targetGroupId: groupId2,
          count: 1,
        },
      ];
    }
    case "plan_write": {
      if (booleanField(result, ["ok"]) === false) return [];
      const planId = firstDefined(
        stringField(result, ["plan_id"]),
        stringField(args, ["plan_id"]),
      );
      const plan = recordField(args, ["plan"]);
      const name2 = firstDefined(
        stringField(plan, ["title"]),
        stringField(args, ["name"]),
      );
      const created = !stringField(args, ["plan_id"]);
      return [
        {
          kind: "production-plan",
          labelKey: created
            ? "chat.productionPlanOperation.create"
            : "chat.productionPlanOperation.update",
          activeLabelKey: created
            ? "chat.productionPlanOperation.create.running"
            : "chat.productionPlanOperation.update.running",
          inputSummary: name2 ?? "",
          displayNameKnown: !!name2,
          outputSummary: created
            ? "chat.canvasOperation.status.created"
            : "chat.canvasOperation.status.updated",
          targetNodeIds: [],
          targetPlanId: planId,
          count: 1,
        },
      ];
    }
    case "plan_replan": {
      if (booleanField(result, ["ok"]) === false) return [];
      const planId = firstDefined(
        stringField(result, ["plan_id"]),
        stringField(args, ["plan_id"]),
      );
      const reason = stringField(args, ["reason"]);
      return [
        {
          kind: "production-plan",
          labelKey: "chat.productionPlanOperation.update",
          activeLabelKey: "chat.productionPlanOperation.update.running",
          inputSummary: reason ?? "",
          displayNameKnown: !!reason,
          outputSummary: "chat.canvasOperation.status.updated",
          targetNodeIds: [],
          targetPlanId: planId,
          count: 1,
        },
      ];
    }
    default:
      return [];
  }
}
