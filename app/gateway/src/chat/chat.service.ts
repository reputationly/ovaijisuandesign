import { randomBytes } from "node:crypto";
import path from "node:path";

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { ActivityService } from "../health/activity.service.js";
import { EventPump, type OcEvent } from "../runtime/event-pump.js";
import { RuntimeClient } from "../runtime/runtime-client.js";
import { type AgentMode, ConfirmService } from "./confirm.service.js";

/**
 * 忙碌标记多久没有任何事件就当作过期。opencode 崩了或事件流断了收不到 idle，不设过期的话这个 gateway
 * 永远不能挂起；长时间的工具调用（生成视频）有账本兜着，不靠这里。
 */
const BUSY_STALE_MS = 30 * 60_000;

/** 新会话默认交给哪个 agent。 */
const DEFAULT_AGENT = "media-agent";

/**
 * 每轮都带给 agent 的背景说明：工作区在哪、素材怎么引用。放在 `system` 而不是
 * 拼进用户消息 —— 拼进去的话它会出现在聊天记录里，而且每轮重复占上下文。
 */
function assetPrimer(workspace: string): string {
  return [
    "<workspace>",
    `The user's project workspace is ${workspace}. Media files live under it (images/, videos/, audios/, texts/, files/).`,
    "Refer to workspace files by their workspace-relative path when calling hub_* tools.",
    "Attached files and canvas nodes the user references are listed at the top of their message.",
    "</workspace>",
  ].join("\n");
}

interface UiSession {
  id: string;
  runtimeId?: string;
  title?: string;
  /** `providerID/modelID`。只有用户明确选过才带给 opencode。 */
  modelId?: string;
  mode: AgentMode;
  /** 用户在选择器里勾的媒体模型（按类别）。没有 = Auto，生成工具不做过滤。 */
  selectedMediaModels?: SelectedMediaModels;
}

export type SelectedMediaModels = Partial<Record<"image" | "video" | "audio", string[]>>;

/** 空类别去掉；一个都不剩就是 Auto。 */
export function normalizeSelected(v: unknown): SelectedMediaModels | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out: SelectedMediaModels = {};
  for (const cat of ["image", "video", "audio"] as const) {
    const list = (v as Record<string, unknown>)[cat];
    if (Array.isArray(list)) {
      const ids = list.filter((x): x is string => typeof x === "string" && x.trim() !== "");
      if (ids.length) out[cat] = ids;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export interface ChatFrame {
  type: string;
  [k: string]: unknown;
}

type Reply = (frame: ChatFrame) => void;

/**
 * `/ws` 上的聊天帧 ↔ opencode。
 *
 * - **会话懒创建**：`create_session` 只在内存里建一个 UI 会话；第一条消息到来时才在
 *   opencode 里建真会话，然后发 `session_bound` 把两个 id 对上。开了不用的空会话
 *   不会在 opencode 里留一堆垃圾。
 * - **子会话归到根会话**：agent 派活给子 agent 时 opencode 建子会话，它的事件带
 *   `childSessionId` 转发给根会话所在的界面。
 * - question 是 opencode 原生工具：`question.asked` → `question_request`，用户回答后
 *   转成 `POST /question/:id/reply`。
 */
@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Chat");
  private readonly sessions = new Map<string, UiSession>();
  private readonly runtimeToUi = new Map<string, string>();
  private readonly childToRoot = new Map<string, string>();
  private readonly messageRoles = new Map<string, "user" | "assistant">();
  /** 正在跑的 opencode 会话（含子会话）→ 最近一次事件的时间。 */
  private readonly busy = new Map<string, number>();
  private off?: () => void;

  constructor(
    private readonly runtime: RuntimeClient,
    private readonly pump: EventPump,
    private readonly bus: GatewayEventBus,
    private readonly confirm: ConfirmService,
    private readonly paths: WorkspacePathService,
    private readonly activity: ActivityService,
  ) {}

  onModuleInit(): void {
    this.off = this.pump.subscribe((e) => this.onRuntimeEvent(e));
    // agent 在想、在调工具时没有 HTTP 写请求在飞，只看请求的话主进程会把正在干活的工作区挂起，把 opencode 杀在半路。
    this.activity.setAgentProbe(() => this.runningSessions());
  }

  /** 还在跑的会话数（过期的顺手清掉）。 */
  runningSessions(): number {
    const cutoff = Date.now() - BUSY_STALE_MS;
    for (const [id, at] of this.busy) if (at < cutoff) this.busy.delete(id);
    return this.busy.size;
  }

  onModuleDestroy(): void {
    this.off?.();
  }

  private broadcast(frame: ChatFrame): void {
    this.bus.emit("chat", frame);
  }

  /** 根会话 id（子会话沿父链上溯）。 */
  rootOf(runtimeId: string): string {
    let id = runtimeId;
    const seen = new Set<string>();
    while (this.childToRoot.has(id) && !seen.has(id)) {
      seen.add(id);
      id = this.childToRoot.get(id)!;
    }
    return id;
  }

  uiIdOf(runtimeId: string): string {
    const root = this.rootOf(runtimeId);
    return this.runtimeToUi.get(root) ?? root;
  }

  /** 按 opencode 会话 id（子会话归到根）找用户勾选的媒体模型。 */
  selectedMediaModelsOf(runtimeId: string): SelectedMediaModels | null {
    const ui = this.sessions.get(this.uiIdOf(runtimeId));
    return ui?.selectedMediaModels ?? null;
  }

  runtimeIdOf(uiId: string): string | undefined {
    return this.sessions.get(uiId)?.runtimeId ?? (uiId.startsWith("ses") ? uiId : undefined);
  }

  private session(uiId: string): UiSession {
    let s = this.sessions.get(uiId);
    if (!s) {
      // 列表里点开的是 opencode 已有的会话：UI id 就用它的真 id。
      s = { id: uiId, mode: "auto", ...(uiId.startsWith("ses") ? { runtimeId: uiId } : {}) };
      this.sessions.set(uiId, s);
      if (s.runtimeId) this.runtimeToUi.set(s.runtimeId, uiId);
    }
    return s;
  }

  // -------------------------------------------------------------------------
  // 客户端帧
  // -------------------------------------------------------------------------

  async handle(msg: ChatFrame, reply: Reply): Promise<boolean> {
    switch (msg.type) {
      case "create_session": {
        const id = randomBytes(4).toString("hex");
        const selected = normalizeSelected(msg.selected_media_models);
        const s: UiSession = {
          id,
          mode: (msg.mode as AgentMode) ?? "auto",
          ...(msg.model_id ? { modelId: String(msg.model_id) } : {}),
          ...(msg.name ? { title: String(msg.name) } : {}),
          ...(selected ? { selectedMediaModels: selected } : {}),
        };
        this.sessions.set(id, s);
        reply({ type: "session_created", session_id: id, request_id: msg.request_id, mode: s.mode });
        return true;
      }
      case "list_sessions": {
        try {
          const list = await this.runtime.listSessions();
          reply({
            type: "session_list",
            request_id: msg.request_id,
            sessions: list
              .filter((x) => !x.parentID)
              .map((x) => ({ id: this.runtimeToUi.get(x.id) ?? x.id, runtime_session_id: x.id, title: x.title, updated: x.time?.updated ?? x.time?.created })),
          });
        } catch (err) {
          reply({ type: "session_list_unavailable", request_id: msg.request_id, error: String(err) });
        }
        return true;
      }
      case "switch_session": {
        const s = this.session(String(msg.session_id));
        if (msg.mode) s.mode = msg.mode as AgentMode;
        const messages = s.runtimeId ? await this.history(s.runtimeId).catch(() => []) : [];
        reply({ type: "session_switched", session_id: s.id, runtime_session_id: s.runtimeId ?? null, request_id: msg.request_id, messages });
        return true;
      }
      case "message":
        await this.sendMessage(msg, reply);
        return true;
      case "cancel": {
        const rid = this.runtimeIdOf(String(msg.session_id));
        if (rid) await this.runtime.abortTree(rid).catch((e) => this.log.warn(`停止失败: ${e}`));
        return true;
      }
      case "update_model": {
        const s = this.session(String(msg.session_id));
        s.modelId = msg.model_id ? String(msg.model_id) : undefined;
        return true;
      }
      case "update_selected_media_models": {
        const s = this.session(String(msg.session_id));
        s.selectedMediaModels = normalizeSelected(msg.selected_media_models);
        reply({ type: "selected_media_models_updated", session_id: s.id, selected_media_models: s.selectedMediaModels ?? {} });
        return true;
      }
      case "set_mode": {
        const s = this.session(String(msg.session_id));
        s.mode = (msg.mode as AgentMode) ?? "auto";
        if (s.runtimeId) this.confirm.setMode(s.runtimeId, s.mode);
        reply({ type: "mode_changed", session_id: s.id, mode: s.mode });
        return true;
      }
      case "rename_session": {
        const s = this.session(String(msg.session_id));
        s.title = String(msg.name ?? msg.title ?? "");
        if (s.runtimeId) await this.runtime.rename(s.runtimeId, s.title).catch(() => undefined);
        return true;
      }
      case "delete_session": {
        const rid = this.runtimeIdOf(String(msg.session_id));
        if (rid) await this.runtime.remove(rid).catch(() => undefined);
        this.sessions.delete(String(msg.session_id));
        return true;
      }
      case "question_reply":
        await this.runtime.replyQuestion(String(msg.id), (msg.answers as string[][]) ?? []);
        return true;
      case "question_reject":
        await this.runtime.rejectQuestion(String(msg.id));
        return true;
      case "tool_confirm_reply":
        this.confirm.replyTool(String(msg.id), msg.decision === "confirm" ? "confirm" : "reject", msg.modified_args as Record<string, unknown> | undefined);
        return true;
      case "loop_guard_reply":
        this.confirm.replyLoopGuard(String(msg.id), msg.decision as "allow_once" | "allow_session" | "reject");
        return true;
      default:
        return false;
    }
  }

  private async sendMessage(msg: ChatFrame, reply: Reply): Promise<void> {
    const uiId = String(msg.session_id ?? "");
    const clientMessageId = msg.client_message_id;
    const s = this.session(uiId || randomBytes(4).toString("hex"));
    const content = String(msg.content ?? "");
    try {
      if (!s.runtimeId) {
        const created = await this.runtime.createSession({ title: s.title ?? content.slice(0, 40), agent: DEFAULT_AGENT });
        s.runtimeId = created.id;
        this.runtimeToUi.set(created.id, s.id);
        this.confirm.setMode(created.id, s.mode);
        this.broadcast({ type: "session_bound", ui_session_id: s.id, runtime_session_id: created.id });
      }
      const [providerID, ...rest] = (s.modelId ?? "").split("/");
      // 提交到第一个 status 事件之间也算忙，否则这一小段里探测会说空闲。
      this.busy.set(s.runtimeId, Date.now());
      await this.runtime.promptAsync(s.runtimeId, {
        agent: DEFAULT_AGENT,
        system: assetPrimer(this.paths.root),
        ...(s.modelId && rest.length ? { model: { providerID, modelID: rest.join("/") } } : {}),
        parts: [
          {
            type: "text",
            text: this.composeText(content, msg),
            metadata: { source_type: "Hub", hilo_working_language: { locale: "zh-CN", source: "ui-preference" } },
          },
        ],
      });
      reply({ type: "message_accepted", session_id: s.id, runtime_session_id: s.runtimeId, client_message_id: clientMessageId });
    } catch (err) {
      if (s.runtimeId) this.busy.delete(s.runtimeId);
      reply({ type: "message_failed", session_id: s.id, client_message_id: clientMessageId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  /** 附件和画布节点引用写成消息开头的清单（绝对路径），agent 调工具时直接用。 */
  private composeText(content: string, msg: ChatFrame): string {
    const lines: string[] = [];
    const add = (rel: string, nodeId?: string) => {
      const abs = this.paths.resolve(rel) ?? rel;
      const kind = path.extname(rel).slice(1) || "file";
      lines.push(`- [${lines.length + 1}] ${kind}: ${abs}${nodeId ? ` (canvas node ${nodeId})` : ""}`);
    };
    for (const a of (msg.attachments as string[] | undefined) ?? []) add(a);
    for (const n of (msg.canvas_node_attachments as { path: string; nodeId: string }[] | undefined) ?? []) add(n.path, n.nodeId);
    return lines.length ? `[User attached files:\n${lines.join("\n")}\n]\n${content}` : content;
  }

  /** 会话历史：子会话展开，去掉合成的 / 被忽略的 part。 */
  async history(runtimeId: string) {
    const msgs = await this.runtime.messages(runtimeId);
    return msgs.map((m) => ({ info: m.info, parts: m.parts.filter((p) => !p.synthetic && !p.ignored && p.type !== "compaction") }));
  }

  // -------------------------------------------------------------------------
  // opencode 事件
  // -------------------------------------------------------------------------

  onRuntimeEvent(e: OcEvent): void {
    const p = e.properties ?? {};
    this.trackBusy(e.type, p);
    switch (e.type) {
      case "session.created":
      case "session.updated": {
        const info = p.info as { id: string; parentID?: string } | undefined;
        if (info?.parentID) this.childToRoot.set(info.id, info.parentID);
        return;
      }
      case "message.updated": {
        const info = p.info as { id: string; role: "user" | "assistant"; sessionID: string; error?: { name?: string; data?: { message?: string } } };
        if (!info) return;
        this.messageRoles.set(info.id, info.role);
        if (info.error && info.error.name !== "MessageAbortedError") {
          this.broadcast(this.withSession(info.sessionID, { type: "session_error", content: info.error.data?.message ?? info.error.name ?? "error", error: info.error }));
        }
        return;
      }
      case "message.part.updated": {
        const part = p.part as Record<string, any>;
        if (!part || part.synthetic || part.ignored || part.type === "compaction") return;
        // 用户自己那条消息的回显不转发：界面发送时已经乐观地显示了。
        if (part.type === "text" && this.messageRoles.get(part.messageID) === "user") {
          this.broadcast(this.withSession(part.sessionID, { type: "user_message_id", message_id: part.messageID }));
          return;
        }
        this.broadcast(this.withSession(part.sessionID, { type: "part_updated", part }));
        return;
      }
      case "message.part.delta":
        this.broadcast(this.withSession(p.sessionID, { type: "part_delta", messageId: p.messageID, partId: p.partID, field: p.field, delta: p.delta }));
        return;
      case "session.idle":
        this.broadcast(this.withSession(p.sessionID, { type: "session_idle" }));
        return;
      case "session.status":
        if (p.status?.type === "idle") this.broadcast(this.withSession(p.sessionID, { type: "session_idle" }));
        else this.broadcast(this.withSession(p.sessionID, { type: "status", status: p.status }));
        return;
      case "session.error":
        if (p.error?.name === "MessageAbortedError") return;
        this.broadcast(this.withSession(p.sessionID, { type: "session_error", content: p.error?.data?.message ?? p.error?.name ?? "error", error: p.error }));
        return;
      case "question.asked":
        this.broadcast(this.withSession(p.sessionID, { type: "question_request", id: p.id, questions: p.questions, tool: p.tool }));
        return;
      case "question.replied":
      case "question.rejected":
        this.broadcast(this.withSession(p.sessionID, { type: "question_resolved", id: p.requestID ?? p.id, rejected: e.type === "question.rejected" }));
        return;
      default:
    }
  }

  private trackBusy(type: string, p: Record<string, any>): void {
    const sid: string | undefined = p.sessionID ?? p.part?.sessionID ?? p.info?.sessionID;
    if (!sid) return;
    if (type === "session.idle" || (type === "session.status" && p.status?.type === "idle")) this.busy.delete(sid);
    else if (type === "session.status" || this.busy.has(sid)) this.busy.set(sid, Date.now());
  }

  /** 给帧补上 session_id（UI 会话）和子会话标记。 */
  private withSession(runtimeSessionId: string, frame: ChatFrame): ChatFrame {
    const root = this.rootOf(runtimeSessionId);
    return {
      ...frame,
      session_id: this.runtimeToUi.get(root) ?? root,
      runtime_session_id: root,
      ...(root !== runtimeSessionId ? { childSessionId: runtimeSessionId } : {}),
    };
  }
}
