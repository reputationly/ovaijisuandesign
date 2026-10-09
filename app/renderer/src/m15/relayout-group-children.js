// relayout-group-children.js
import {
  CanvasNodeType,
  withIconCompositing,
  Ungroup$1,
  isRecord$g,
  MEDIA_EXTENSIONS,
} from "../vendor.js";
import { GROUP_NODE_PADDING, readGroupSize } from "./group-nodes-in-canvas.js";
import {
  placeGridClustered,
  placeVerticalLayered,
  resolveChildSize,
  sortedByRowBand,
} from "./place-vertical-layered.js";
import {
  GROUP_RELAYOUT_GAP,
  GROUP_RELAYOUT_VERTICAL_COL_GAP,
  GROUP_RELAYOUT_VERTICAL_ROW_GAP,
} from "./resolve-derived-collision.js";
export function relayoutGroupChildren(canvas, groupId2, layout) {
  const mode2 = canvas.mode;
  const groupNode = canvas.nodes.find((n2) => n2.id === groupId2);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const rawChildren = canvas.nodes
    .filter((n2) => n2.parentId === groupId2)
    .map((n2) => ({
      node: n2,
      size: resolveChildSize(n2, mode2),
    }));
  if (rawChildren.length === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const cellW = rawChildren.reduce((m3, c3) => Math.max(m3, c3.size.width), 0);
  const cellH = rawChildren.reduce((m3, c3) => Math.max(m3, c3.size.height), 0);
  const cell = {
    width: cellW,
  };
  const rowBand = Math.max(1, cellH * 0.5);
  const children2 = sortedByRowBand(rawChildren, mode2, rowBand);
  const inputs = children2.map(({ node: node2, size: size2 }) => ({
    id: node2.id,
    size: size2,
  }));
  let placed;
  let contentSize;
  if (layout === "vertical" || layout === "horizontal") {
    const out = placeVerticalLayered(
      inputs,
      canvas.edges,
      GROUP_RELAYOUT_VERTICAL_COL_GAP,
      GROUP_RELAYOUT_VERTICAL_ROW_GAP,
      layout === "horizontal",
    );
    placed = out.children;
    contentSize = out.contentSize;
  } else {
    const out = placeGridClustered(inputs, canvas.edges, cell, GROUP_RELAYOUT_GAP);
    placed = out.children;
    contentSize = out.contentSize;
  }
  const newGroupSize = {
    width: contentSize.width + GROUP_NODE_PADDING.x * 2,
    height: contentSize.height + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
  };
  const prevGroupSize = readGroupSize(groupNode, mode2);
  const newChildPositions = new Map();
  for (const p3 of placed) {
    newChildPositions.set(p3.id, {
      x: GROUP_NODE_PADDING.x + p3.relX,
      y: GROUP_NODE_PADDING.top + p3.relY,
    });
  }
  let anyChanged =
    !prevGroupSize ||
    prevGroupSize.width !== newGroupSize.width ||
    prevGroupSize.height !== newGroupSize.height;
  if (!anyChanged) {
    for (const { node: node2 } of children2) {
      const want = newChildPositions.get(node2.id);
      const cur = node2.positions?.[mode2];
      if (!want || !cur || cur.x !== want.x || cur.y !== want.y) {
        anyChanged = true;
        break;
      }
    }
  }
  const prevFrameMode = groupNode.data?.frameMode;
  if (!anyChanged && prevFrameMode === "manual") anyChanged = true;
  if (!anyChanged) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const updatedChildren = [];
  const nextNodes = canvas.nodes.map((node2) => {
    if (node2.id === groupId2) {
      const existingData = node2.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      return {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
        },
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
        size: newGroupSize,
        data: nextData,
      };
    }
    const next2 = newChildPositions.get(node2.id);
    if (!next2) return node2;
    const updated = {
      ...node2,
      positions: {
        ...(node2.positions ?? {}),
        [mode2]: next2,
      },
    };
    updatedChildren.push(updated);
    return updated;
  });
  const groupOut = nextNodes.find((n2) => n2.id === groupId2);
  const updatedNodes = groupOut ? [groupOut, ...updatedChildren] : updatedChildren;
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
      edges: canvas.edges,
    },
    updatedNodes,
    changed: true,
  };
}
export const Ungroup = withIconCompositing(Ungroup$1);
export const TOOL_ABORTED_BY_USER_TEXT = "Tool execution aborted";
const MAX_ANOMALY_DETAILS = 8;
function chatDiagnosticHash(value) {
  let first2 = 2166136261;
  let second = 2654435761;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    const code2 = value.charCodeAt(index2);
    first2 = Math.imul(first2 ^ code2, 16777619);
    second = Math.imul(second ^ code2, 2246822507);
  }
  return `${(first2 >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
function safeToken(value) {
  return /^[\w.:/-]{1,128}$/.test(value) ? value : `hash:${chatDiagnosticHash(value)}`;
}
export function chatToolIdentity(tool2) {
  return chatDiagnosticHash(tool2.callID ? `call:${tool2.callID}` : `part:${tool2.partId ?? ""}`);
}
export function normalizeToolStatus$1(status) {
  if (status === "ok") return "completed";
  return ["pending", "running", "completed", "error"].includes(status ?? "")
    ? (status ?? "unknown")
    : "unknown";
}
function chatDiagnosticError(error) {
  const value = error && typeof error === "object" ? error : {};
  const cause = value.cause && typeof value.cause === "object" ? value.cause : {};
  const code2 = value.code ?? cause.code;
  const codes = [
    "SQLITE_BUSY",
    "SQLITE_LOCKED",
    "SQLITE_CANTOPEN",
    "SQLITE_NOTADB",
    "SQLITE_CORRUPT",
    "SQLITE_IOERR",
    "SQLITE_SCHEMA",
    "SQLITE_ERROR",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EACCES",
    "ENOENT",
    "EPIPE",
    "ABORT_ERR",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
  ];
  const errorCode = typeof code2 === "string" && codes.includes(code2) ? code2 : void 0;
  const names = [
    "Error",
    "TypeError",
    "SyntaxError",
    "TimeoutError",
    "AbortError",
    "SqliteError",
    "HistoryHttpError",
  ];
  const errorType =
    typeof value.name === "string" && names.includes(value.name) ? value.name : "UnknownError";
  const httpStatus =
    typeof value.status === "number" && value.status >= 100 && value.status <= 599
      ? value.status
      : void 0;
  const errorKind = httpStatus
    ? "http"
    : errorType === "TimeoutError" || errorCode?.includes("TIMEOUT") || errorCode === "ETIMEDOUT"
      ? "timeout"
      : errorType === "AbortError"
        ? "aborted"
        : errorType === "SyntaxError"
          ? "invalid-json"
          : errorCode?.startsWith("SQLITE_")
            ? "sqlite"
            : errorCode
              ? "transport-or-filesystem"
              : "unknown";
  return {
    errorKind,
    errorType,
    errorCode,
    httpStatus,
  };
}
function describe(tool2) {
  const status = normalizeToolStatus$1(tool2.status);
  return {
    identity: chatToolIdentity(tool2),
    part: tool2.partId ? chatDiagnosticHash(`part:${tool2.partId}`) : void 0,
    call: tool2.callID ? chatDiagnosticHash(`call:${tool2.callID}`) : void 0,
    tool: safeToken(tool2.tool),
    status,
    scope: tool2.scope ?? "root",
    reason: tool2.reason ? safeToken(tool2.reason) : void 0,
  };
}
function traceChatTools(write, stage, context, tools = [], includeDetails = false) {
  try {
    const root2 = tools
      .filter((tool2) => tool2.scope !== "child")
      .map(chatToolIdentity)
      .sort();
    const child = tools
      .filter((tool2) => tool2.scope === "child")
      .map(chatToolIdentity)
      .sort();
    const safeContext = Object.fromEntries(
      Object.entries(context).map(([key2, value]) => [
        key2,
        typeof value === "string" ? safeToken(value) : value,
      ]),
    );
    write(
      `[chat-diag] ${JSON.stringify({
        version: 1,
        stage,
        ...safeContext,
        count: tools.length,
        rootCount: root2.length,
        rootFingerprint: chatDiagnosticHash(root2.join(",")),
        childCount: child.length,
        childFingerprint: chatDiagnosticHash(child.join(",")),
        stateFingerprint: chatDiagnosticHash(
          tools
            .map((tool2) => `${chatToolIdentity(tool2)}:${normalizeToolStatus$1(tool2.status)}`)
            .sort()
            .join(","),
        ),
        ...(includeDetails
          ? {
              tools: tools.slice(0, MAX_ANOMALY_DETAILS).map(describe),
              omittedCount: Math.max(0, tools.length - MAX_ANOMALY_DETAILS),
            }
          : {}),
      })}`,
    );
  } catch {}
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
function traceChatServerMessage(write, stage, message2, context = {}) {
  if (
    !["session_switched", "session_cancelled", "question_request", "question_resolved"].includes(
      message2.type,
    )
  )
    return;
  const base2 = {
    ...context,
    sessionId: "session_id" in message2 ? message2.session_id : void 0,
  };
  if (message2.type === "session_switched") {
    traceChatTools(
      write,
      stage,
      {
        ...base2,
        historySyncId: message2.history_sync_id,
        runtimeSessionId: message2.runtime_session_id,
        requestId: message2.request_id,
        trigger: message2.type,
        outcome:
          context.outcome ?? (message2.history_load_failed ? "history-load-failed" : "received"),
      },
      diagnosticHistoryTools(message2.messages ?? []),
    );
  } else if (
    message2.type === "session_cancelled" ||
    message2.type === "question_resolved" ||
    message2.type === "question_request"
  ) {
    traceChatTools(
      write,
      stage,
      {
        ...base2,
        trigger: message2.type,
        requestId:
          message2.type === "question_resolved"
            ? message2.request_id
            : message2.type === "question_request"
              ? message2.id
              : void 0,
      },
      message2.type === "question_request"
        ? [
            {
              tool: "question",
              callID: message2.tool?.callID,
              status: "running",
            },
          ]
        : [],
    );
  }
}
function traceChatClientOperation(write, stage, message2, outcome) {
  if (
    ![
      "cancel",
      "send_queued_user_message_now",
      "switch_session",
      "restore_session",
      "question_reply",
      "question_reject",
    ].includes(message2.type)
  )
    return;
  traceChatTools(write, stage, {
    sessionId: "session_id" in message2 ? message2.session_id : void 0,
    trigger: message2.type,
    outcome,
    requestId:
      "request_id" in message2 && typeof message2.request_id === "string"
        ? message2.request_id
        : "id" in message2 && typeof message2.id === "string"
          ? message2.id
          : void 0,
  });
}
export class ChatDiagnostics {
  constructor(write) {
    this.write = write;
  }
  record(stage, context, tools = [], details = false) {
    traceChatTools(this.write, stage, context, tools, details);
  }
  operation(message2, direction, outcome = "received") {
    traceChatClientOperation(
      this.write,
      direction === "sent" ? "operation-ws-send" : "operation",
      message2,
      outcome,
    );
  }
  received(message2) {
    traceChatServerMessage(this.write, "renderer-ws-received", message2);
  }
  sent(message2, outcome, connectionId) {
    traceChatServerMessage(
      this.write,
      message2.type === "session_switched" ? "history-ws-send" : "control-ws-send",
      message2,
      {
        outcome,
        connectionId,
      },
    );
  }
  historyFailure(context, error) {
    this.record("history-load-failed", {
      ...context,
      outcome: "previous-history-retained",
      ...chatDiagnosticError(error),
    });
  }
  historyRetry(context, repairedParts) {
    this.record("history-retry", {
      ...context,
      repairedParts,
      outcome: "retry-after-repair",
    });
  }
}
export const CHAT_MODEL_TRACES_PATH = "/api/chat/model-traces";
const CHAT_MODEL_TRACE_LOOKUP_LIMIT = 100;
const AUXILIARY_AGENTS = new Set(["title", "summary", "compaction"]);
function selectChatModelTraceForFeedback(traces) {
  return traces.find((trace) => !AUXILIARY_AGENTS.has(trace.agent));
}
function isChatModelTraceId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}
function isLabel(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 256 &&
    Array.from(value).every((character) => {
      const code2 = character.charCodeAt(0);
      return code2 >= 32 && code2 !== 127;
    })
  );
}
function mapChatModelTrace(value) {
  if (
    !isRecord$g(value) ||
    !isChatModelTraceId(value.call_id) ||
    !isChatModelTraceId(value.session_id) ||
    !isChatModelTraceId(value.request_id) ||
    !isChatModelTraceId(value.trace_id) ||
    !isLabel(value.agent) ||
    !isLabel(value.model_id) ||
    typeof value.started_at !== "number" ||
    !Number.isSafeInteger(value.started_at) ||
    value.started_at <= 0 ||
    typeof value.status_code !== "number" ||
    !Number.isInteger(value.status_code) ||
    value.status_code < 100 ||
    value.status_code > 599
  ) {
    return void 0;
  }
  return {
    call_id: value.call_id,
    session_id: value.session_id,
    request_id: value.request_id,
    trace_id: value.trace_id,
    agent: value.agent,
    model_id: value.model_id,
    started_at: value.started_at,
    status_code: value.status_code,
  };
}
export function mapChatModelTraceLookup(value) {
  if (
    !isRecord$g(value) ||
    !Array.isArray(value.traces) ||
    value.traces.length > CHAT_MODEL_TRACE_LOOKUP_LIMIT ||
    (value.trace_id !== null && !isChatModelTraceId(value.trace_id))
  )
    return void 0;
  const traces = [];
  for (const item of value.traces) {
    const trace = mapChatModelTrace(item);
    if (!trace) return void 0;
    traces.push(trace);
  }
  if ((selectChatModelTraceForFeedback(traces)?.trace_id ?? null) !== value.trace_id) return void 0;
  return {
    trace_id: value.trace_id,
    traces,
  };
}
const STRICT_SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
function parseStrictSemver(version2) {
  const match2 = version2.trim().replace(/^v/i, "").match(STRICT_SEMVER_PATTERN);
  if (!match2) return null;
  const prerelease = match2[4]?.split(".") ?? [];
  if (prerelease.some((part) => /^0\d+$/.test(part))) return null;
  return {
    core: match2.slice(1, 4),
    prerelease,
  };
}
function compareNumericIdentifiers(a2, b3) {
  if (a2.length !== b3.length) return a2.length - b3.length;
  return a2 === b3 ? 0 : a2 < b3 ? -1 : 1;
}
export function compareSemverStrict(a2, b3) {
  const pa = parseStrictSemver(a2);
  const pb = parseStrictSemver(b3);
  if (!pa || !pb) return null;
  for (let index2 = 0; index2 < pa.core.length; index2 += 1) {
    const comparison = compareNumericIdentifiers(pa.core[index2], pb.core[index2]);
    if (comparison !== 0) return comparison;
  }
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  for (let index2 = 0; index2 < Math.max(pa.prerelease.length, pb.prerelease.length); index2 += 1) {
    const left = pa.prerelease[index2];
    const right = pb.prerelease[index2];
    if (left === void 0) return -1;
    if (right === void 0) return 1;
    if (left === right) continue;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) return compareNumericIdentifiers(left, right);
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return left < right ? -1 : 1;
  }
  return 0;
}
const CONNECTOR_LABEL_RE = /^[\p{Script=Han}a-zA-Z0-9_. -]{1,80}$/u;
export function formatConnectorMention(serverName, displayName2) {
  const label =
    displayName2 && displayName2 !== serverName && CONNECTOR_LABEL_RE.test(displayName2)
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
export const FENCE_RE = /^(\s*)(```|~~~)/;
export const TABLE_DELIM_RE = /^\s*\|?[\s:|-]+\|?\s*$/;
export const BLOCK_PREFIX_RE =
  /^(\s*)((?:>\s*)*)((?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?|#{1,6}\s+)?/;
export function pushChar(b3, ch, rawOffset, isSynthetic) {
  if (ch === " ") {
    const last2 = b3.normalized.length - 1;
    if (last2 < 0 || b3.normalized[last2] === " ") {
      if (last2 >= 0 || isSynthetic) return;
    }
  }
  b3.normalized.push(ch);
  b3.normToRaw.push(rawOffset);
  b3.synthetic.push(isSynthetic);
}
export function findStrippableDelimiters(line) {
  const strip = new Array(line.length).fill(false);
  const openByToken = new Map();
  for (let i2 = 0; i2 < line.length; i2++) {
    const ch = line[i2];
    if (ch === "\\") {
      i2 += 1;
      continue;
    }
    if (ch !== "*" && ch !== "_" && ch !== "~" && ch !== "`") continue;
    const two = line.slice(i2, i2 + 2);
    let token2;
    if (two === "**" || two === "__" || two === "~~") {
      token2 = two;
    } else if (ch === "*" || ch === "`") {
      token2 = ch;
    } else {
      continue;
    }
    const open = openByToken.get(token2);
    if (open === void 0) {
      openByToken.set(token2, i2);
    } else {
      for (let k2 = 0; k2 < token2.length; k2++) {
        strip[open + k2] = true;
        strip[i2 + k2] = true;
      }
      openByToken.delete(token2);
    }
    i2 += token2.length - 1;
  }
  return strip;
}
