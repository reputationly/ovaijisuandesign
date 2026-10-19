import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Inject, Injectable, NotFoundException, Post, Query } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";

const LOOKUP_LIMIT = 100;
const AUXILIARY = new Set(["title", "summary", "compaction"]);

type Trace = {
  call_id: string;
  session_id: string;
  request_id: string;
  trace_id: string;
  agent: string;
  model_id: string;
  started_at: number;
  status_code: number;
};

/**
 * 对话评分要能找回这次回复用过的模型调用。记录放在资产库里，和这次工作区绑在一起。
 */
@Injectable()
export class ChatModelTraceService {
  constructor(
    @Inject(AssetsService) private readonly assets: AssetsService,
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
  ) {}

  record(body: unknown) {
    this.assertWorkspace();
    const trace = mapTrace(body);
    if (!trace) throw new BadRequestException("Invalid model response trace");
    const db = this.database();
    const previous = db.prepare("SELECT call_id, session_id, request_id, trace_id, agent, model_id, started_at, status_code FROM chat_model_traces WHERE call_id=?").get(trace.call_id) as Trace | undefined;
    if (previous) {
      if (JSON.stringify(mapTrace(previous)) !== JSON.stringify(trace)) throw new ConflictException("Model trace call_id is already bound to another response");
      return { call_id: trace.call_id };
    }
    db.prepare("INSERT INTO chat_model_traces(call_id, session_id, request_id, trace_id, agent, model_id, started_at, status_code) VALUES(?,?,?,?,?,?,?,?)").run(
      trace.call_id, trace.session_id, trace.request_id, trace.trace_id, trace.agent, trace.model_id, trace.started_at, trace.status_code,
    );
    return { call_id: trace.call_id };
  }

  lookup(sessionId?: string, requestId?: string) {
    this.assertWorkspace();
    if (!isId(sessionId) || !isId(requestId)) throw new BadRequestException("A session_id and request_id are required");
    const rows = this.database().prepare(`SELECT call_id, session_id, request_id, trace_id, agent, model_id, started_at, status_code
      FROM chat_model_traces WHERE session_id=? AND request_id=? ORDER BY started_at DESC, call_id DESC LIMIT ?`).all(sessionId, requestId, LOOKUP_LIMIT) as Trace[];
    const traces = rows.map((row) => {
      const trace = mapTrace(row);
      if (!trace) throw new Error("Invalid persisted model response trace");
      return trace;
    });
    return { trace_id: traces.find((trace) => !AUXILIARY.has(trace.agent))?.trace_id ?? null, traces };
  }

  private assertWorkspace() {
    if (!this.paths.isWorkspaceLocked) throw new NotFoundException("Model traces require the owning workspace gateway");
  }

  private database() {
    const db = this.assets.vault.db;
    db.exec(`CREATE TABLE IF NOT EXISTS chat_model_traces (
      call_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      model_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      status_code INTEGER NOT NULL
    )`);
    db.exec("CREATE INDEX IF NOT EXISTS idx_chat_model_traces_lookup ON chat_model_traces(session_id, request_id, started_at, call_id)");
    return db;
  }
}

@Controller("api/chat/model-traces")
export class ChatModelTraceController {
  constructor(@Inject(ChatModelTraceService) private readonly traces: ChatModelTraceService) {}

  @Post()
  @HttpCode(200)
  record(@Body() body: unknown) {
    return this.traces.record(body);
  }

  @Get()
  lookup(@Query("session_id") sessionId?: string, @Query("request_id") requestId?: string) {
    return this.traces.lookup(sessionId, requestId);
  }
}

function mapTrace(value: unknown): Trace | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (!isId(raw.call_id) || !isId(raw.session_id) || !isId(raw.request_id) || !isId(raw.trace_id)) return undefined;
  if (!isLabel(raw.agent) || !isLabel(raw.model_id)) return undefined;
  if (typeof raw.started_at !== "number" || !Number.isSafeInteger(raw.started_at) || raw.started_at <= 0) return undefined;
  if (typeof raw.status_code !== "number" || !Number.isInteger(raw.status_code) || raw.status_code < 100 || raw.status_code > 599) return undefined;
  return {
    call_id: raw.call_id,
    session_id: raw.session_id,
    request_id: raw.request_id,
    trace_id: raw.trace_id,
    agent: raw.agent,
    model_id: raw.model_id,
    started_at: raw.started_at,
    status_code: raw.status_code,
  };
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}

function isLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 256 && [...value].every((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127;
  });
}
