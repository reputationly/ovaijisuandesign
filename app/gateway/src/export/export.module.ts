import { BadRequestException, Controller, Get, Injectable, Logger, Module, NotFoundException, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { ChatService } from "../chat/chat.service.js";
import { type OcMessage, type OcSession, RuntimeClient } from "../runtime/runtime-client.js";
import { buildZip } from "./zip.js";

const FORMAT_VERSION = "1.0.0";
/** 导出清单里的 gateway 版本号：导出格式的读方按它判断字段含义，和接口版本一起演进，不跟应用版本走。 */
const GATEWAY_VERSION = "0.1.0";
/** 子 agent 嵌套再深也只展开这么多层：一条自己派自己的链不能把导出拖死。 */
const MAX_CHILD_DEPTH = 10;
const BENCHMARK_SYNTHETIC_TAIL_RE = /\n\n<benchmark_delivery source="benchmark_supervisor" id="[a-f0-9]{32}" \/>$/;

type RawPart = Record<string, any>;
type ExportPart = Record<string, unknown>;

interface ExportMessage {
  id: string;
  role: string;
  agent: string;
  timestamp?: number;
  completedAt?: number;
  parts: ExportPart[];
}

function toolSpanAttribution(part: RawPart) {
  const startedAt = part.state?.time?.start;
  const completedAt = part.state?.time?.end;
  return {
    spanId: part.callID ?? part.id,
    partId: part.id,
    messageId: part.messageID,
    sessionId: part.sessionID,
    callID: part.callID,
    status: part.state?.status,
    startedAt,
    completedAt,
    durationMs: typeof startedAt === "number" && typeof completedAt === "number" ? Math.max(0, completedAt - startedAt) : undefined,
  };
}

/**
 * 会话导出：把一个 opencode 会话（连同它派出的子 agent 会话，递归展开）转成 `conversation.json`，
 * 加一份 `manifest.json`，打成 zip。只读 opencode 本地的消息记录。
 */
@Injectable()
export class ExportService {
  private readonly log = new Logger("Export");

  constructor(private readonly runtime: RuntimeClient) {}

  private query(directory?: string): Record<string, string> {
    return directory ? { directory } : {};
  }

  async exportSession(sessionId: string, directory?: string): Promise<{ zip: Buffer; filename: string }> {
    let info: OcSession;
    try {
      info = await this.runtime.request<OcSession>("GET", `/session/${encodeURIComponent(sessionId)}`, undefined, this.query(directory));
    } catch {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const raw = await this.messages(sessionId, directory);
    const childMap = await this.collectChildMessages(raw, directory);
    const messages = this.convertMessages(raw, childMap);
    const manifest = {
      formatVersion: FORMAT_VERSION,
      sessionId,
      sessionName: info.title || "Untitled",
      createdAt: new Date(info.time?.created ?? Date.now()).toISOString(),
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      agents: [...new Set(messages.map((m) => m.agent))],
      assetUrls: this.extractAssetUrls(messages),
      app: { version: GATEWAY_VERSION, platform: process.platform },
    };
    const zip = buildZip([
      { name: "manifest.json", data: JSON.stringify(manifest, null, 2) },
      { name: "conversation.json", data: JSON.stringify(messages, null, 2) },
    ]);
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    return { zip, filename: `chat-${sessionId}-${ts}.zip` };
  }

  private messages(sessionId: string, directory?: string): Promise<OcMessage[]> {
    return this.runtime.request<OcMessage[]>("GET", `/session/${encodeURIComponent(sessionId)}/message`, undefined, this.query(directory));
  }

  /** 子会话 id 记在 task 工具的 metadata 上；取不到的子会话跳过，不让一个坏子会话毁掉整份导出。 */
  private async collectChildMessages(messages: OcMessage[], directory: string | undefined, depth = 0, visited = new Set<string>()): Promise<Map<string, OcMessage[]>> {
    const result = new Map<string, OcMessage[]>();
    if (depth >= MAX_CHILD_DEPTH) return result;
    const childIds = new Set<string>();
    for (const m of messages) {
      for (const p of m.parts as RawPart[]) {
        if (p.type === "tool" && p.tool === "task" && p.state?.metadata?.sessionId) childIds.add(p.state.metadata.sessionId);
      }
    }
    await Promise.all(
      [...childIds].map(async (childId) => {
        if (visited.has(childId)) return;
        visited.add(childId);
        try {
          const msgs = await this.messages(childId, directory);
          result.set(childId, msgs);
          for (const [k, v] of await this.collectChildMessages(msgs, directory, depth + 1, visited)) result.set(k, v);
        } catch (err) {
          this.log.warn(`Failed to fetch child session ${childId}: ${(err as Error).message}`);
        }
      }),
    );
    return result;
  }

  private convertMessages(raw: OcMessage[], childMap: Map<string, OcMessage[]>): ExportMessage[] {
    const out: ExportMessage[] = [];
    for (const msg of raw) {
      const parts = this.convertParts(msg.parts as RawPart[], childMap, msg.info.role);
      if (parts.length === 0) continue;
      out.push({
        id: msg.info.id,
        role: msg.info.role,
        agent: (msg.info.agent as string | undefined) ?? "main",
        timestamp: msg.info.time?.created,
        completedAt: msg.info.time?.completed,
        parts,
      });
    }
    return out;
  }

  private convertParts(parts: RawPart[], childMap: Map<string, OcMessage[]>, role: string): ExportPart[] {
    const out: ExportPart[] = [];
    for (const part of parts) {
      if (part.synthetic || part.ignored) continue;
      switch (part.type) {
        case "text": {
          if (!part.text) break;
          const text = role === "user" ? String(part.text).replace(BENCHMARK_SYNTHETIC_TAIL_RE, "") : part.text;
          if (text) out.push({ type: "text", content: text });
          break;
        }
        case "reasoning":
          if (part.text) out.push({ type: "thinking", content: part.text });
          break;
        case "tool": {
          const toolName = part.tool ?? "unknown";
          const childId = part.state?.metadata?.sessionId;
          if (toolName === "task" && childId && childMap.has(childId)) {
            out.push({
              type: "sub_agent",
              ...toolSpanAttribution(part),
              agent: part.agent ?? part.state?.input?.subagent_type ?? "agent",
              childSessionId: childId,
              messages: this.convertMessages(childMap.get(childId)!, childMap),
            });
            break;
          }
          const input = part.state?.input;
          const exportPart: ExportPart = {
            type: "tool_call",
            ...toolSpanAttribution(part),
            tool: toolName,
            args: input != null ? (typeof input === "string" ? input : JSON.stringify(input)) : "",
          };
          if (part.state?.status === "completed" && part.state.output != null) exportPart.result = part.state.output;
          else if (part.state?.status === "error" && part.state.error != null) exportPart.result = part.state.error;
          out.push(exportPart);
          break;
        }
        case "file":
          if (part.url || part.filename) out.push({ type: "file", path: part.filename ?? part.url ?? "", url: part.url, fileType: part.mime?.split("/")[0] });
          break;
        case "subtask":
          if (part.agent || part.description) out.push({ type: "text", content: `[Sub-agent: ${part.agent ?? "unknown"}] ${part.description ?? ""}`.trim() });
          break;
        default:
      }
    }
    return out;
  }

  private extractAssetUrls(messages: ExportMessage[]): string[] {
    const urls: string[] = [];
    for (const m of messages) {
      for (const p of m.parts) {
        if (p.type === "file" && typeof p.url === "string" && p.url) urls.push(p.url);
        if (p.type === "sub_agent") urls.push(...this.extractAssetUrls(p.messages as ExportMessage[]));
      }
    }
    return urls;
  }
}

@Controller("api/sessions")
export class ExportController {
  constructor(
    private readonly exporter: ExportService,
    private readonly chat: ChatService,
  ) {}

  /**
   * 界面传的是 UI 会话 id：新建的会话在发出第一条消息之前没有 opencode 会话，没东西可导出（400）；
   * 列表里点开的历史会话 UI id 就是 opencode 的 `ses_` id。
   */
  @Get(":id/export")
  async exportSession(@Param("id") id: string, @Query("directory") directory: string | undefined, @Res() res: Response) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new BadRequestException("Invalid session ID format");
    const runtimeId = this.chat.runtimeIdOf(id);
    if (!runtimeId) throw new BadRequestException("Session has no messages yet — nothing to export");
    const { zip, filename } = await this.exporter.exportSession(runtimeId, typeof directory === "string" && directory ? directory : undefined);
    res.set({ "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(zip);
  }
}

@Module({ controllers: [ExportController], providers: [ExportService] })
export class ExportModule {}
