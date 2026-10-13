// diagnostic-history-tools.js
import { MEDIA_EXTENSIONS, Ungroup$1 as UngroupIcon, withIconCompositing } from "../vendor.js";
export const Ungroup = withIconCompositing(UngroupIcon);
export const TOOL_ABORTED_BY_USER_TEXT = "Tool execution aborted";
export function chatDiagnosticHash(value) {
  let first = 2166136261;
  let second = 2654435761;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 2246822507);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
export function chatToolIdentity(tool) {
  return chatDiagnosticHash(
    tool.callID ? `call:${tool.callID}` : `part:${tool.partId ?? ""}`,
  );
}
export function normalizeToolStatus(status) {
  if (status === "ok") return "completed";
  return ["pending", "running", "completed", "error"].includes(status ?? "")
    ? (status ?? "unknown")
    : "unknown";
}
export function diagnosticHistoryTools(messages) {
  return messages.flatMap((message) => {
    if (message.type === "tool_call")
      return [
        {
          tool: message.tool,
          partId: message.partId ?? message.taskPartId,
          callID: message.callID,
          status: message.status,
        },
      ];
    if (message.type === "sub_agent_tool_call")
      return [
        {
          tool: message.tool,
          callID: message.callID,
          scope: "child",
        },
      ];
    return [];
  });
}
const CONNECTOR_LABEL_RE = /^[\p{Script=Han}a-zA-Z0-9_. -]{1,80}$/u;
export function formatConnectorMention(serverName, displayName) {
  const label =
    displayName &&
    displayName !== serverName &&
    CONNECTOR_LABEL_RE.test(displayName)
      ? `[${displayName}]`
      : "";
  return `@connector:${serverName}${label}`;
}
export function detectFileType(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "file";
  const ext = filename.slice(dot).toLowerCase();
  return MEDIA_EXTENSIONS[ext] ?? "file";
}
