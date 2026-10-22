/**
 * 回合范围登记表（4.0.3 的 `RequestGroupRegistry`）。
 *
 * 移植自参照 `gateway/dist/chat/request-group.service.js`（在 bundle 里约 8.6KB）。
 * 它维护三张映射，把「界面会话 / 运行时会话 / 当前回合」都指向同一个 scope：
 *
 *   byUiSession      uiSessionId      -> scope
 *   byRuntimeSession runtimeSessionId -> scope
 *   byChatTurn       chatTurnId       -> scope
 *
 * scope 里放的是**这一轮开始时的快照**：groupId（canonical/legacy）、
 * sourceType、sessionMode、selectedMediaModels、以及一个 turnSequence 栅栏。
 *
 * 为什么需要它：工具调用发生在「回合」里，但调用回来时 WebSocket 可能已经断了、
 * 或者用户已经换了模式。所以这些值必须在**接受用户消息的那一刻**快照下来，
 * 之后按 chatTurnId 查，而不是去读当时的 socket 状态。
 *
 * 栅栏（turnSequence）的作用：`closeTurn` 只在栅栏匹配时才删，
 * 否则「第 N 轮的迟到终止帧」会把第 N+1 轮的 scope 删掉 —— 又是一个静默丢 scope 的坑。
 */

import { createHash, randomUUID } from "node:crypto";

/** 三张映射各自最多保留多少条（参照值 4000）。 */
export const MAX_RETAINED_SCOPES = 4_000;

/** chatTurnId 的缓存上限（参照里同名常量，值同为 4000）。 */
const CHAT_TURN_ID_CACHE_LIMIT = 4_000;

export type RequestGroupMode = "canonical" | "legacy";

export interface RequestGroupScope {
  mode: RequestGroupMode;
  groupId?: string;
  uiSessionId: string;
  runtimeSessionId?: string;
  clientMessageId?: string;
  chatTurnId: string;
  sourceType?: string;
  sessionMode?: string;
  selectedMediaModels?: unknown;
  turnSequence: number;
  createdAt: number;
}

export interface OpenTurnArgs {
  uiSessionId: string;
  runtimeSessionId?: string;
  groupId?: string;
  clientMessageId?: string;
  sourceType?: string;
  sessionMode?: string;
  selectedMediaModels?: unknown;
}

export type RequestGroupResolution =
  | { mode: "unknown" }
  | { mode: "canonical"; groupId: string; scope: RequestGroupScope }
  | { mode: "legacy"; scope: RequestGroupScope };

export interface SessionLike {
  uiSessionId: string;
  runtimeSessionId?: string;
  mode?: string;
  selectedMediaModels?: unknown;
  currentTurnGroupId?: string;
  currentTurnSequence?: number;
}

/** clientMessageId -> chatTurnId 的缓存（同一个 clientMessageId 复用同一个 turnId）。 */
const chatTurnIdsByClientMessage = new Map<string, string>();

/**
 * 生成回合 id：`<秒级时间戳的 16 进制后 8 位><clientMessageId 的 sha256 前 24 位>`。
 * 同一个 clientMessageId 重复调用会拿到同一个 id（LRU 命中时刷新位置）。
 */
export function chatTurnId(clientMessageId: string, timestamp = Date.now()): string {
  const existing = chatTurnIdsByClientMessage.get(clientMessageId);
  if (existing) {
    chatTurnIdsByClientMessage.delete(clientMessageId);
    chatTurnIdsByClientMessage.set(clientMessageId, existing);
    return existing;
  }
  const timestampHex = Math.floor(timestamp / 1e3).toString(16).padStart(8, "0").slice(-8);
  const suffix = createHash("sha256").update(clientMessageId).digest("hex").slice(0, 24);
  const turnId = `${timestampHex}${suffix}`;
  chatTurnIdsByClientMessage.set(clientMessageId, turnId);
  while (chatTurnIdsByClientMessage.size > CHAT_TURN_ID_CACHE_LIMIT) {
    const oldest = chatTurnIdsByClientMessage.keys().next().value;
    if (typeof oldest !== "string") break;
    chatTurnIdsByClientMessage.delete(oldest);
  }
  return turnId;
}

export class RequestGroupRegistry {
  private readonly byUiSession = new Map<string, RequestGroupScope>();
  private readonly byRuntimeSession = new Map<string, RequestGroupScope>();
  private readonly byChatTurn = new Map<string, RequestGroupScope>();
  private sequence = 0;

  /**
   * 为用户消息快照一个 scope。**发生在 gateway 接受消息的时刻**，
   * 那时运行时会话 id 可能还没有，之后由 bindRuntimeSession 补。
   * 返回栅栏值，交给 closeTurn 用。
   */
  openTurn(args: OpenTurnArgs): number {
    const turnSequence = ++this.sequence;
    const groupId = args.groupId?.trim() || undefined;
    const clientMessageId = args.clientMessageId?.trim() || undefined;
    const currentChatTurnId = chatTurnId(clientMessageId ?? randomUUID());
    const scope: RequestGroupScope = {
      mode: groupId ? "canonical" : "legacy",
      ...(groupId ? { groupId } : {}),
      uiSessionId: args.uiSessionId,
      ...(args.runtimeSessionId ? { runtimeSessionId: args.runtimeSessionId } : {}),
      ...(clientMessageId ? { clientMessageId } : {}),
      chatTurnId: currentChatTurnId,
      ...(args.sourceType ? { sourceType: args.sourceType } : {}),
      ...(args.sessionMode ? { sessionMode: args.sessionMode } : {}),
      ...(args.selectedMediaModels ? { selectedMediaModels: args.selectedMediaModels } : {}),
      turnSequence,
      createdAt: Date.now(),
    };
    this.byUiSession.set(args.uiSessionId, scope);
    if (args.runtimeSessionId) this.byRuntimeSession.set(args.runtimeSessionId, scope);
    this.byChatTurn.delete(currentChatTurnId);
    this.byChatTurn.set(currentChatTurnId, scope);
    this.evictIfNeeded();
    return turnSequence;
  }

  /**
   * 运行时会话 id 分配出来之后，把 scope 也挂到它下面。幂等 ——
   * `ensureSession` 每轮都会调用，包括绑定已存在的复用路径。
   */
  bindRuntimeSession(uiSessionId: string, runtimeSessionId: string): void {
    const scope = this.byUiSession.get(uiSessionId);
    if (!scope) return;
    const bound: RequestGroupScope =
      scope.runtimeSessionId === runtimeSessionId ? scope : { ...scope, runtimeSessionId };
    this.byUiSession.set(uiSessionId, bound);
    this.byRuntimeSession.set(runtimeSessionId, bound);
    this.byChatTurn.set(bound.chatTurnId, bound);
  }

  /**
   * 取会话最近的根回合。**运行时 session 是会话的身份**（插件按它查，
   * 恢复的会话换新 UI id 时 runtimeSessionId 不变），UI id 只在绑定之前才作数。
   */
  resolveConversation(conversation: {
    runtimeSessionId?: string;
    uiSessionId?: string;
  }): RequestGroupResolution {
    const { runtimeSessionId, uiSessionId } = conversation;
    return this.toResolution(
      (runtimeSessionId ? this.byRuntimeSession.get(runtimeSessionId) : undefined) ??
        (uiSessionId ? this.byUiSession.get(uiSessionId) : undefined),
    );
  }

  /** 计费工具请求所属回合的 sourceType（不可变）。 */
  resolveSourceTypeByChatTurnId(currentChatTurnId: string): string | undefined {
    return this.byChatTurn.get(currentChatTurnId)?.sourceType;
  }

  /** 计费工具请求所属回合的 agent 模式（不可变）。 */
  resolveSessionModeByChatTurnId(currentChatTurnId: string): string | undefined {
    return this.byChatTurn.get(currentChatTurnId)?.sessionMode;
  }

  /** 回合的选型（undefined 表示 Auto）。 */
  resolveSelectedMediaModelsByChatTurnId(currentChatTurnId: string): unknown {
    return this.byChatTurn.get(currentChatTurnId)?.selectedMediaModels;
  }

  /**
   * 把模式变更跟进到会话正在跑的那个回合。回合比它的 WebSocket 活得久，
   * 所以用户离开后发生的工具调用，要读用户最后选的模式，而不是 socket 的。
   */
  setSessionMode(uiSessionId: string, runtimeSessionId: string | undefined, mode: string): void {
    const scopes = new Set(
      [
        this.byUiSession.get(uiSessionId),
        runtimeSessionId ? this.byRuntimeSession.get(runtimeSessionId) : undefined,
      ].filter((s): s is RequestGroupScope => s !== undefined),
    );
    for (const scope of scopes) {
      if (scope.sessionMode === mode) continue;
      const next: RequestGroupScope = { ...scope, sessionMode: mode };
      if (this.byUiSession.get(scope.uiSessionId) === scope) {
        this.byUiSession.set(scope.uiSessionId, next);
      }
      if (scope.runtimeSessionId && this.byRuntimeSession.get(scope.runtimeSessionId) === scope) {
        this.byRuntimeSession.set(scope.runtimeSessionId, next);
      }
      if (this.byChatTurn.get(scope.chatTurnId) === scope) this.byChatTurn.set(scope.chatTurnId, next);
    }
  }

  /**
   * 回合结束，**只在栅栏匹配时**删。返回是否删掉了。
   * 没有栅栏的话，第 N 轮的迟到终止帧会删掉第 N+1 轮的 scope。
   */
  closeTurn(uiSessionId: string, turnSequence: number): boolean {
    const scope = this.byUiSession.get(uiSessionId);
    if (!scope || scope.turnSequence !== turnSequence) return false;
    this.byUiSession.delete(uiSessionId);
    if (scope.runtimeSessionId) {
      const indexed = this.byRuntimeSession.get(scope.runtimeSessionId);
      if (indexed?.turnSequence === turnSequence) {
        this.byRuntimeSession.delete(scope.runtimeSessionId);
      }
    }
    return true;
  }

  /**
   * 为「会话携带的回合」开 scope，并刷新它上面的镜像字段。
   * 镜像只用于本地比较（例如排队输入的合并），**不能用来回答插件**。
   */
  openTurnForSession(
    session: SessionLike,
    groupId?: string,
    clientMessageId?: string,
    sourceType?: string,
  ): void {
    session.currentTurnGroupId = groupId;
    session.currentTurnSequence = this.openTurn({
      uiSessionId: session.uiSessionId,
      ...(groupId ? { groupId } : {}),
      ...(session.runtimeSessionId ? { runtimeSessionId: session.runtimeSessionId } : {}),
      ...(clientMessageId ? { clientMessageId } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(session.mode ? { sessionMode: session.mode } : {}),
      ...(session.selectedMediaModels ? { selectedMediaModels: session.selectedMediaModels } : {}),
    });
  }

  openQueuedTurnForSession(
    session: SessionLike,
    input: { groupId?: string; sourceType?: string },
  ): void {
    this.openTurnForSession(session, input.groupId, undefined, input.sourceType ?? "Hub");
  }

  /** 仅用于诊断。 */
  size(): { uiSessions: number; runtimeSessions: number } {
    return { uiSessions: this.byUiSession.size, runtimeSessions: this.byRuntimeSession.size };
  }

  private toResolution(scope: RequestGroupScope | undefined): RequestGroupResolution {
    if (!scope) return { mode: "unknown" };
    if (scope.mode === "canonical" && scope.groupId) {
      return { mode: "canonical", groupId: scope.groupId, scope };
    }
    return { mode: "legacy", scope };
  }

  private evictIfNeeded(): void {
    while (this.byChatTurn.size > MAX_RETAINED_SCOPES) {
      const oldestChatTurnId = this.byChatTurn.keys().next().value;
      if (typeof oldestChatTurnId !== "string") break;
      this.byChatTurn.delete(oldestChatTurnId);
    }
    if (this.byUiSession.size <= MAX_RETAINED_SCOPES) return;
    const oldestKey = this.byUiSession.keys().next().value;
    if (typeof oldestKey !== "string") return;
    const evicted = this.byUiSession.get(oldestKey);
    this.byUiSession.delete(oldestKey);
    if (evicted?.runtimeSessionId) this.byRuntimeSession.delete(evicted.runtimeSessionId);
  }
}
