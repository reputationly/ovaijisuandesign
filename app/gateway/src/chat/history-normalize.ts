/**
 * opencode 原始消息 → 渲染器认识的扁平帧（官方 `convertOpenCodeMessages` 的复刻）。
 *
 * 这是**历史面板能否显示**的关键：3.0.21 渲染器的 `backendMessagesToChat()` 按
 * `{type:"text"|"thinking"|"tool_call"|"tool_result"|"sub_agent_*"|"file_added"|"error"}`
 * 分派，逐条 switch。喂给它 `{info, parts}` 原始结构的话每条都落进 default，结果数组
 * 始终为空 —— 表现就是历史面板一片空白（`history-store-applied afterCount=0`）。
 *
 * 所以 gateway 必须在**网关上**把原始消息压平成这套帧。官方 bundle 对应函数：
 * `reference/3.0.21/gateway/dist/main.js` 的 `convertOpenCodeMessages`（~264710）。
 *
 * 与官方的差异（有意保留）：
 * - 不做 benchmark / connector / 文档编辑包装的解包（我们没有这些上游包装）；
 * - `parseLiveUserInputs` 只保留 `[User attached files: ...]` 前缀解析（我们的
 *   `chat.service.ts#composeText` 写出的正是这个格式）；
 * - 不做 content-policy 错误归一化（字段形状照抄，判定保持简单）。
 */

/** 子 agent 内容需要用到的 task 调用时间窗（同一个子会话被多次调用时要按时间切分）。 */
interface TaskWindow {
  repeatedChild: boolean;
  start?: number;
  nextStart?: number;
}

/** 渲染器解析出的扁平帧。 */
export interface NormalizedMessage {
  type: string;
  [k: string]: unknown;
}

export interface NormalizeContext {
  /** 工作区根目录：解析附件绝对路径 → serve URL 用。 */
  directory: string;
  /** 子会话 id → 原始消息（`task` 工具展开子 agent 内容用）。 */
  childMessages?: Map<string, RawMessage[]>;
}

export interface RawMessage {
  info: { id: string; role: string; [k: string]: unknown };
  parts: Record<string, any>[];
}

/** 附件 URL：渲染器拿到相对工作区的路径，经 serve 路由取文件。 */
function serveUrl(rel: string): string {
  return `/api/files/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

function detectFileType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext)) return "audio";
  return "file";
}

/** 用户消息开头的附件清单（`chat.service.ts#composeText` 写的格式）。 */
export function parseAttachmentPrefix(text: string, directory: string): { attachments: NormalizedAttachment[]; content: string } | null {
  const match = /^\[User attached files:\n([\s\S]*?)\]\n([\s\S]*)$/.exec(text);
  if (!match) return null;
  const fileLines = match[1] ?? "";
  const content = match[2] ?? "";
  const attachments: NormalizedAttachment[] = [];
  for (const line of fileLines.split("\n")) {
    if (line.trim() === "") break;
    if (!line.startsWith("- ")) continue;
    const absPath = line
      .slice(2)
      .replace(/^\[\d+\]\s*/, "")
      .replace(/^(?:image|video|audio|text|file):\s*/, "")
      .replace(/\s*\(canvas node [^)]*\)\s*$/, "")
      .trim();
    if (!absPath) continue;
    const rel = absPath.startsWith(directory) ? absPath.slice(directory.length).replace(/^\//, "") : "";
    if (!rel || rel.startsWith("..")) continue;
    attachments.push({ path: absPath, url: serveUrl(rel), type: detectFileType(absPath) });
  }
  return { attachments, content };
}

export interface NormalizedAttachment {
  path: string;
  url: string;
  type: string;
}

/** `[CONTEXT ...]` / `[HISTORY ...]` 之类的注入前缀不显示给用户。 */
const CONTEXT_PREFIX_RE =
  /^(?:\[IM chat_id: [^\]]*\]\n)?(?:\[IM message_id: [^\]]*\]\n)?(?:\[CONTEXT [^\]]*\]\s*)?(?:\[HISTORY[\s\S]*?\[END HISTORY\]\s*)?(?:\[USER_MSG\][\s\S]*?\[\/USER_MSG\]\s*)?/;

export function stripContextPrefix(text: string): string {
  return text.replace(CONTEXT_PREFIX_RE, "");
}

/** 是否是「内部压缩」消息：这类消息整体不显示。 */
function isInternalCompactionMessage(msg: RawMessage): boolean {
  const info = msg.info as Record<string, any>;
  if (info.type === "compaction") return true;
  return info.role === "assistant" && (info.summary === true || info.mode === "compaction" || info.agent === "compaction");
}

/** 是否是内部 part（合成 / 被忽略 / 压缩 / 续写标记）。 */
function isInternalCompactionPart(part: Record<string, any>): boolean {
  if (part.synthetic || part.ignored || part.type === "compaction") return true;
  return part.type === "text" && (part.metadata?.compaction_continue === true || part.metadata?.compactionContinue === true);
}

/** `task` 工具指向的子会话 id。 */
function childSessionIdOf(part: Record<string, any>): string | undefined {
  const id = part.state?.metadata?.sessionId;
  return typeof id === "string" && id ? id : undefined;
}

function toolArgsOf(part: Record<string, any>): string | undefined {
  const input = part.state?.input;
  if (input == null) return undefined;
  return typeof input === "string" ? input : JSON.stringify(input);
}

function extractSubagentType(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>).subagent_type;
  return typeof value === "string" && value ? value : undefined;
}

/** 根会话里所有被 `task` 调用过的子会话 id。 */
export function collectTaskChildSessionIds(messages: RawMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type === "tool" && part.tool === "task") {
        const childId = childSessionIdOf(part);
        if (childId) ids.add(childId);
      }
    }
  }
  return ids;
}

function taskStartTime(msg: RawMessage, part: Record<string, any>): number | undefined {
  return part.state?.time?.start ?? (msg.info as Record<string, any>).time?.created;
}

/**
 * 同一个子会话被多次 `task` 调用时，要把子会话消息按调用时间切成窗口 —— 否则第二轮
 * 调用会把第一轮的内容也展开一遍。
 */
function buildTaskInvocationWindows(messages: RawMessage[]): WeakMap<Record<string, any>, TaskWindow> {
  const byChild = new Map<string, { part: Record<string, any>; start?: number }[]>();
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type !== "tool" || part.tool !== "task") continue;
      const childId = childSessionIdOf(part);
      if (!childId) continue;
      const list = byChild.get(childId) ?? [];
      list.push({ part, start: taskStartTime(msg, part) });
      byChild.set(childId, list);
    }
  }
  const windows = new WeakMap<Record<string, any>, TaskWindow>();
  for (const list of byChild.values()) {
    const repeatedChild = list.length > 1;
    list.forEach((entry, index) => {
      windows.set(entry.part, { repeatedChild, start: entry.start, nextStart: list[index + 1]?.start });
    });
  }
  return windows;
}

function selectChildMessagesForTask(childMessages: RawMessage[], window: TaskWindow | undefined): RawMessage[] {
  if (!window?.repeatedChild) return [...childMessages];
  return childMessages.filter((message) => {
    const created = (message.info as Record<string, any>).time?.created;
    if (typeof created !== "number") return true;
    if (window.start != null && created < window.start) return false;
    if (window.nextStart != null && created >= window.nextStart) return false;
    return true;
  });
}

/** 子会话消息 → `sub_agent_*` 帧（挂在父级 task 消息下面）。 */
function expandChildMessages(
  result: NormalizedMessage[],
  childMsgs: NormalizedMessage[],
  agent: string,
  childSessionId: string,
  taskPartId: string,
): void {
  let lastToolName = "tool";
  for (const cm of childMsgs) {
    switch (cm.type) {
      case "text":
        result.push({ type: "sub_agent_text", agent, content: cm.content, childSessionId, taskPartId });
        break;
      case "thinking":
        result.push({ type: "sub_agent_thinking", agent, content: cm.content, childSessionId, taskPartId });
        break;
      case "tool_call":
        lastToolName = String(cm.tool ?? "tool");
        result.push({ type: "sub_agent_tool_call", agent, tool: cm.tool, args: cm.args, callID: cm.callID, childSessionId, taskPartId });
        break;
      case "tool_result":
        result.push({ type: "sub_agent_tool_result", agent, tool: lastToolName, content: cm.content, childSessionId, taskPartId });
        break;
      case "file_added":
        result.push({ ...cm, agent });
        break;
      // 更深层子 agent 的帧原样透传
      case "sub_agent_start":
      case "sub_agent_end":
      case "sub_agent_text":
      case "sub_agent_thinking":
      case "sub_agent_tool_call":
      case "sub_agent_tool_result":
        result.push(cm);
        break;
      default:
        break;
    }
  }
}

/**
 * opencode 原始消息 → 渲染器扁平帧。这是官方 `convertOpenCodeMessages` 的复刻。
 */
export function convertOpenCodeMessages(messages: RawMessage[], ctx: NormalizeContext): NormalizedMessage[] {
  const result: NormalizedMessage[] = [];
  const taskWindows = buildTaskInvocationWindows(messages);
  let pendingSubtask: { agent: string; task?: string } | undefined;

  for (const msg of messages) {
    if (isInternalCompactionMessage(msg)) continue;
    const role = msg.info.role;

    // 内容审核拦截：整条消息以 withdrawn 呈现（渲染器按 error_code 认）。
    const infoErr = (msg.info as Record<string, any>).error;
    if (role === "assistant" && infoErr && (infoErr.name === "ContentPolicyViolationError" || infoErr.data?.error_code === "CONTENT_POLICY_VIOLATION")) {
      result.push({ type: "error", error_code: "CONTENT_POLICY_VIOLATION", content: "", runtimeMessageId: msg.info.id });
      continue;
    }

    const messageStart = result.length;
    for (const part of msg.parts) {
      if (isInternalCompactionPart(part)) continue;
      switch (part.type) {
        case "text": {
          if (!part.text) break;
          const runtimeMessageId = role === "user" ? msg.info.id : undefined;
          const visibleText: string = part.text;
          let fallbackText = visibleText;
          if (role === "user") {
            const stripped = stripContextPrefix(visibleText);
            const parsed = parseAttachmentPrefix(stripped, ctx.directory);
            if (parsed) {
              result.push({
                type: "text",
                role,
                content: parsed.content,
                ...(parsed.attachments.length > 0 ? { attachments: parsed.attachments } : {}),
                ...(runtimeMessageId ? { runtimeMessageId } : {}),
              });
              break;
            }
            if (!stripped.trim()) break; // 全是注入前缀，没内容可显示
            fallbackText = stripped;
          }
          result.push({ type: "text", role, content: fallbackText, ...(runtimeMessageId ? { runtimeMessageId } : {}) });
          break;
        }
        case "reasoning":
          if (part.text) result.push({ type: "thinking", content: part.text });
          break;
        case "tool": {
          const toolName: string = part.tool ?? "unknown";
          if (toolName === "task") {
            const FOUR_HOURS_MS = 4 * 60 * 60 * 1_000;
            let taskStatus = part.state?.status;
            const startTime = part.state?.time?.start;
            if (taskStatus !== "completed" && taskStatus !== "error" && startTime && Date.now() - startTime > FOUR_HOURS_MS) {
              taskStatus = "error";
            }
            const childId = childSessionIdOf(part);
            const toolArgs = toolArgsOf(part);
            if (childId) {
              result.push({ type: "tool_call", tool: "task", args: toolArgs, status: taskStatus, callID: part.callID, childSessionId: childId, taskPartId: part.id });
              if (part.state?.status === "completed" && part.state.output != null) {
                result.push({ type: "tool_result", content: String(part.state.output) });
              }
              const input = part.state?.input;
              const agent = extractSubagentType(input) ?? pendingSubtask?.agent ?? "agent";
              const task = pendingSubtask?.task;
              result.push({ type: "sub_agent_start", agent, childSessionId: childId, taskPartId: part.id, ...(task ? { task } : {}) });
              const childRaw = ctx.childMessages?.get(childId);
              if (childRaw) {
                const scoped = selectChildMessagesForTask(childRaw, taskWindows.get(part));
                expandChildMessages(result, convertOpenCodeMessages(scoped, ctx), agent, childId, part.id);
              }
              result.push({ type: "sub_agent_end", agent, childSessionId: childId, taskPartId: part.id });
              pendingSubtask = undefined;
              break;
            }
            result.push({ type: "tool_call", tool: "task", args: toolArgs, status: taskStatus, callID: part.callID, childSessionId: childId, taskPartId: part.id });
            pendingSubtask = undefined;
            break;
          }
          result.push({ type: "tool_call", tool: toolName, args: toolArgsOf(part), status: part.state?.status, partId: part.id, callID: part.callID });
          if (part.state?.status === "completed" && part.state.output != null) {
            result.push({ type: "tool_result", content: String(part.state.output) });
          } else if (part.state?.status === "error" && part.state.error != null) {
            result.push({ type: "tool_result", content: String(part.state.error) });
          }
          break;
        }
        case "subtask":
          if (part.agent) pendingSubtask = { agent: part.agent, task: part.description };
          break;
        case "file":
          if (part.url) {
            result.push({ type: "file_added", path: part.filename ?? part.url, url: part.url, file_type: part.mime ? String(part.mime).split("/")[0] : "" });
          }
          break;
        // step-start / step-finish / snapshot / patch / compaction / agent / retry 等内部 part 不显示
        default:
          break;
      }
    }

    // 同一条消息产出的所有帧都带上 runtimeMessageId（渲染器用它做消息级去重/撤回）。
    // 用户消息的 text 帧已显式带过，这里对缺的补齐；工具帧不覆盖（官方只给根帧补）。
    const tailId = (msg.info as Record<string, any>).id as string;
    for (let i = messageStart; i < result.length; i++) {
      const frame = result[i];
      if (!frame) continue;
      result[i] = { ...frame, runtimeMessageId: frame.runtimeMessageId ?? tailId };
    }
  }
  return result;
}
