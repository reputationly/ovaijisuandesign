// 工具回包里的媒体记录和失败判断。
import { tryParseJson$1 } from "../infra/shared-runtime.js";

export function isRecord$2(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const FILE_ACTIVITY_KIND_BY_TOOL = {
  hub_read: "read",
  hub_analyse_media: "analyseMedia"
};
export function getFileActivityKind(toolName2) {
  return FILE_ACTIVITY_KIND_BY_TOOL[toolName2];
}
export function collectMediaResultRecords(payload) {
  if (Array.isArray(payload)) return payload.filter(isRecord$2);
  if (!isRecord$2(payload)) return [];
  if (Array.isArray(payload.results)) return payload.results.filter(isRecord$2);
  return [payload];
}
export function hasMediaAnalysisFailure(toolResult) {
  if (!toolResult) return false;
  return collectMediaResultRecords(tryParseJson$1(toolResult)).some(record2 => isRecord$2(record2.semantic) && record2.semantic.source === "error" || isRecord$2(record2.metadata) && record2.metadata.ok === false);
}
