import { Body, Controller, Get, Header, HttpCode, HttpException, Injectable, Post, Query } from "@nestjs/common";
import path from "node:path";

import { EditorSourceFiles } from "../editor-v3/source-files.js";
import { executeCanvasV3Command } from "./commands.js";
import { CanvasV3ContentService } from "./content.service.js";
import { CanvasCommandJournal } from "./command-journal.js";
import { canvasV3Error, invalidCanvasV3Command } from "./errors.js";
import { type CanvasV3CommandRequest as ParsedCommandRequest, type CanvasV3Patch, applyCanvasV3Patch, parseCanvasV3CommandRequest } from "./protocol.js";
import { CanvasV3Store, type CanvasV3CommandRequest } from "./store.js";
import { WorkspaceProjectArchitectureService } from "./workspace-project-architecture.service.js";

@Injectable()
export class CanvasV3Service {
  /** 启动时绑住的工作区。之后改环境变量不能把请求指到另一份目录。 */
  private readonly workspace = process.env.HILO_GATEWAY_ROLE === "workspace" && process.env.WORKSPACE_DIR ? path.resolve(process.env.WORKSPACE_DIR) : undefined;
  private readonly writes = new Map<string, Promise<void>>();

  constructor(
    private readonly architecture: WorkspaceProjectArchitectureService,
    private readonly store: CanvasV3Store,
    private readonly content: CanvasV3ContentService,
    private readonly sources: EditorSourceFiles,
  ) {}

  getArchitecture(): { projectArchitecture: string } {
    let projectArchitecture: string;
    try {
      projectArchitecture = this.architecture.current();
    } catch {
      throw canvasV3Error(403, "PROJECT_ARCHITECTURE_UNSUPPORTED", "Project architecture is not supported.");
    }
    if (!this.workspace || process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR || path.resolve(process.env.WORKSPACE_DIR) !== this.workspace) {
      throw canvasV3Error(403, "CANVAS_V3_WORKSPACE_REQUIRED", "A bound workspace gateway is required.");
    }
    return { projectArchitecture };
  }

  /** 只有 resource_v3 的工作区网关能读写这份画布。 */
  admit(): string {
    if (this.getArchitecture().projectArchitecture !== "resource_v3") {
      throw canvasV3Error(403, "CANVAS_V3_DISABLED", "Canvas V3 is not available for this project.");
    }
    return this.workspace as string;
  }

  getDocument() {
    const workspace = this.admit();
    if (!this.writes.has(workspace) && CanvasCommandJournal.exists(workspace)) {
      const journal = new CanvasCommandJournal(workspace);
      try {
        journal.recover((request, result) => {
          this.store.execute(workspace, request, result.patch as CanvasV3Patch, result.effects);
        });
      } finally {
        journal.close();
      }
    }
    return this.store.read(workspace);
  }

  execute(input: unknown) {
    const workspace = this.admit();
    let request: ParsedCommandRequest;
    try {
      request = parseCanvasV3CommandRequest(input);
    } catch {
      throw invalidCanvasV3Command();
    }
    const previous = this.writes.get(workspace) ?? Promise.resolve();
    const write = previous.then(async () => {
      this.admit();
      this.store.read(workspace);
      const journal = new CanvasCommandJournal(workspace);
      try {
        journal.recover((pending, result) => {
          this.store.execute(workspace, pending, result.patch as CanvasV3Patch, result.effects);
        });
        const replay = this.store.prepare(workspace, request);
        if (replay) return replay;
        const document = this.store.read(workspace);
        return await journal.execute(request, async () => {
          const result = await executeCanvasV3Command(document, request.command, this.content, this.sources);
          applyCanvasV3Patch(document, result.patch, true);
          return result;
        }, ({ patch, effects }) => {
          this.admit();
          return this.store.execute(workspace, request, patch, effects);
        });
      } catch (error) {
        if (error instanceof HttpException) throw error;
        throw invalidCanvasV3Command();
      } finally {
        journal.close();
      }
    });
    const settled = write.then(() => undefined, () => undefined);
    this.writes.set(workspace, settled);
    void settled.then(() => {
      if (this.writes.get(workspace) === settled) this.writes.delete(workspace);
    });
    return write;
  }

  async listAgentCompositions(input: unknown) {
    const workspace = this.admit();
    let query: { since: number; limit: number };
    try {
      query = parseAgentCompositionQuery(input);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw invalidCanvasV3Command();
    }
    await (this.writes.get(workspace) ?? Promise.resolve());
    return this.content.agentCompositions(query);
  }

  /** 和画布命令共用一把写锁，避免一边改文档一边把插件状态写到已经删掉的节点上。 */
  enqueue<T>(work: () => T | Promise<T>): Promise<T> {
    const workspace = this.admit();
    const previous = this.writes.get(workspace) ?? Promise.resolve();
    const run = previous.then(() => work());
    const settled = run.then(() => undefined, () => undefined);
    this.writes.set(workspace, settled);
    void settled.then(() => {
      if (this.writes.get(workspace) === settled) this.writes.delete(workspace);
    });
    return run;
  }

  readContent(body: unknown) {
    this.admit();
    this.store.read(this.workspace as string);
    return this.content.read(body).catch((error: unknown) => {
      if (error instanceof HttpException) throw error;
      throw invalidCanvasV3Command();
    });
  }
}

@Controller()
export class CanvasV3Controller {
  constructor(private readonly canvas: CanvasV3Service) {}

  @Get("api/project/architecture")
  @Header("Cache-Control", "no-store")
  getArchitecture() {
    return this.canvas.getArchitecture();
  }

  @Get("api/v3/canvas")
  @Header("Cache-Control", "no-store")
  getDocument() {
    return this.canvas.getDocument();
  }

  @Get("api/v3/canvas/agent-compositions")
  @Header("Cache-Control", "no-store")
  listAgentCompositions(@Query() query: unknown) {
    return this.canvas.listAgentCompositions(query);
  }

  @Post("api/v3/canvas/content")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  readContent(@Body() body: unknown) {
    return this.canvas.readContent(body);
  }

  @Post("api/v3/canvas/commands")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  execute(@Body() body: unknown) {
    return this.canvas.execute(body);
  }
}

export type { CanvasV3CommandRequest };

function parseAgentCompositionQuery(value: unknown): { since: number; limit: number } {
  const raw = value === null || typeof value !== "object" ? {} : (value as { since?: unknown; limit?: unknown });
  const since = raw.since === undefined ? 0 : Number(raw.since);
  const limit = raw.limit === undefined ? 200 : Number(raw.limit);
  if (!Number.isSafeInteger(since) || since < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("Invalid Canvas V3: agent composition query");
  }
  return { since, limit };
}

