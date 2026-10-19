import { parseToolResult } from "./use-tool-confirm-settlement.js";
export function withToolPresentationFields(sub) {
  if (sub.type !== "tool") return sub;
  return Object.assign({}, sub, {
    toolArgs: sub.args,
    toolResult: parseToolResult(sub.content).result?.replace(/^:\s*/, ""),
  });
}
