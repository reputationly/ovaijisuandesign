// diagnostic-history-tools.js
import { MEDIA_EXTENSIONS, Ungroup$1, withIconCompositing } from "../vendor.js";

export const Ungroup = withIconCompositing(Ungroup$1);

export const TOOL_ABORTED_BY_USER_TEXT = "Tool execution aborted";

export function chatDiagnosticHash(value) {
  let first2 = 2166136261;
  let second = 2654435761;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    const code2 = value.charCodeAt(index2);
    first2 = Math.imul(first2 ^ code2, 16777619);
    second = Math.imul(second ^ code2, 2246822507);
  }
  return `${(first2 >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function chatToolIdentity(tool2) {
  return chatDiagnosticHash(
    tool2.callID ? `call:${tool2.callID}` : `part:${tool2.partId ?? ""}`,
  );
}

export function normalizeToolStatus$1(status) {
  if (status === "ok") return "completed";
  return ["pending", "running", "completed", "error"].includes(status ?? "")
    ? (status ?? "unknown")
    : "unknown";
}

export function diagnosticHistoryTools(messages2) {
  return messages2.flatMap((message2) => {
    if (message2.type === "tool_call")
      return [
        {
          tool: message2.tool,
          partId: message2.partId ?? message2.taskPartId,
          callID: message2.callID,
          status: message2.status,
        },
      ];
    if (message2.type === "sub_agent_tool_call")
      return [
        {
          tool: message2.tool,
          callID: message2.callID,
          scope: "child",
        },
      ];
    return [];
  });
}

const CONNECTOR_LABEL_RE = /^[\p{Script=Han}a-zA-Z0-9_. -]{1,80}$/u;

export function formatConnectorMention(serverName, displayName2) {
  const label =
    displayName2 &&
    displayName2 !== serverName &&
    CONNECTOR_LABEL_RE.test(displayName2)
      ? `[${displayName2}]`
      : "";
  return `@connector:${serverName}${label}`;
}

export function detectFileType(filename) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 < 0) return "file";
  const ext = filename.slice(dot2).toLowerCase();
  return MEDIA_EXTENSIONS[ext] ?? "file";
}
