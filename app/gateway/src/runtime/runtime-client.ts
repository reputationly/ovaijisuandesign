import { Injectable } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { RuntimeConnection } from "./runtime-connection.js";

export class RuntimeUnavailableError extends Error {
  constructor(detail: string) {
    super(`opencode 不可用：${detail}`);
  }
}

export interface OcSession {
  id: string;
  title?: string;
  parentID?: string;
  directory?: string;
  time?: { created?: number; updated?: number };
}

export interface OcMessage {
  info: { id: string; role: "user" | "assistant"; sessionID: string; time?: { created?: number; completed?: number }; [k: string]: unknown };
  parts: Record<string, unknown>[];
}

/**
 * opencode HTTP API 的客户端（basic auth，地址来自 RuntimeConnection）。
 *
 * 请求都带 `directory`：opencode 按目录区分项目，不带的话会话落到它自己的 cwd，
 * 换工作区之后列表里就看不到了。
 */
@Injectable()
export class RuntimeClient {
  constructor(
    private readonly conn: RuntimeConnection,
    private readonly paths: WorkspacePathService,
  ) {}

  get ready(): boolean {
    return !!this.conn.endpoint;
  }

  async request<T>(method: string, path: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
    const ep = this.conn.endpoint;
    if (!ep) throw new RuntimeUnavailableError("还没有连上（主进程尚未推送地址）");
    const url = new URL(ep.url + path);
    url.searchParams.set("directory", this.paths.root);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { ...this.conn.headers(), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      throw new RuntimeUnavailableError((err as Error).message);
    }
    if (!res.ok) throw new Error(`opencode ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  createSession(body: { title?: string; agent?: string; parentID?: string }): Promise<OcSession> {
    return this.request("POST", "/session", body);
  }

  listSessions(): Promise<OcSession[]> {
    return this.request("GET", "/session", undefined, { roots: "true" });
  }

  getSession(id: string): Promise<OcSession> {
    return this.request("GET", `/session/${encodeURIComponent(id)}`);
  }

  children(id: string): Promise<OcSession[]> {
    return this.request("GET", `/session/${encodeURIComponent(id)}/children`);
  }

  messages(id: string): Promise<OcMessage[]> {
    return this.request("GET", `/session/${encodeURIComponent(id)}/message`);
  }

  promptAsync(id: string, body: Record<string, unknown>): Promise<void> {
    return this.request("POST", `/session/${encodeURIComponent(id)}/prompt_async`, body);
  }

  abort(id: string): Promise<unknown> {
    return this.request("POST", `/session/${encodeURIComponent(id)}/abort`);
  }

  rename(id: string, title: string): Promise<unknown> {
    return this.request("PATCH", `/session/${encodeURIComponent(id)}`, { title });
  }

  remove(id: string): Promise<unknown> {
    return this.request("DELETE", `/session/${encodeURIComponent(id)}`);
  }

  fork(id: string, messageID: string): Promise<OcSession> {
    return this.request("POST", `/session/${encodeURIComponent(id)}/fork`, { messageID });
  }

  replyQuestion(id: string, answers: string[][]): Promise<unknown> {
    return this.request("POST", `/question/${encodeURIComponent(id)}/reply`, { answers });
  }

  rejectQuestion(id: string): Promise<unknown> {
    return this.request("POST", `/question/${encodeURIComponent(id)}/reject`);
  }

  pendingQuestions(): Promise<Record<string, unknown>[]> {
    return this.request("GET", "/question");
  }

  /** 先递归停掉子会话再停根会话：子 agent 还在跑的话，停了根会话它照样在花 token。 */
  async abortTree(id: string): Promise<void> {
    const kids = await this.children(id).catch(() => [] as OcSession[]);
    for (const k of kids) await this.abortTree(k.id);
    await this.abort(id).catch(() => undefined);
  }
}
