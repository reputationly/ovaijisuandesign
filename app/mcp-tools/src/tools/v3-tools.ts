import { createHash } from "node:crypto";

import { z } from "zod";

import { errorMessage } from "../gateway-client.js";
import { errorReply, structuredReply } from "../replies.js";
import type { RegisterTools } from "./types.js";
import { V3_TOOL_SPECS, type V3Args } from "./v3-tool-specs.js";
import { currentCodeEnvironment } from "./code-environment.js";

/**
 * v3 工具（第 256 轮起）。
 *
 * 参照的 `mcp-tools-v3` 在 `HILO_PROJECT_ARCHITECTURE=resource_v3` 下注册 25 个工具
 * （实测 `tools/list`，清单见 `scripts/mcp-compare/reference-tools.json`）。
 * 这里按模块推进：本文件先覆盖只做 HTTP 代理、不依赖任务子系统的几只。
 *
 * 命名与 schema 尽量逐字对齐参照，便于 `scripts/mcp-compare/probe.mjs` 对比。
 */

/** v3 接口的响应先按宽松 schema 收，字段校验留到使用时（与参照的渐进式校验一致） */
const LOOSE = z.record(z.string(), z.unknown());

/** 把两套后端的返回统一成工具输出：行号、页码、修订、PDF 图。 */
function documentReadView(result: Record<string, unknown>): Record<string, unknown> {
  const lines = Array.isArray(result.lines) ? (result.lines as string[]) : String(result.text ?? "").split("\n");
  const startLine = typeof result.startLine === "number" ? result.startLine : typeof result.offset === "number" ? result.offset : 1;
  const lineCount = typeof result.lineCount === "number" ? result.lineCount : lines.length;
  const totalLines = typeof result.totalLines === "number" ? result.totalLines : startLine + lines.length - 1;
  const more = result.more === true;
  return {
    ...(typeof result.kind === "string" ? { kind: result.kind } : {}),
    ...(typeof result.versionId === "string" ? { versionId: result.versionId } : {}),
    ...(typeof result.contentRevision === "number" ? { contentRevision: result.contentRevision } : {}),
    text: lines.join("\n"),
    startLine,
    lineCount,
    totalLines,
    more,
    ...(more ? { nextOffset: startLine + lineCount } : {}),
    ...(result.truncated === true ? { truncated: true } : {}),
    ...(Array.isArray(result.images) && result.images.length > 0 ? { images: result.images } : {}),
    ...(typeof result.imagesOmitted === "number" && result.imagesOmitted > 0 ? { imagesOmitted: result.imagesOmitted } : {}),
  };
}

/** 后端把失败原因放在 `reason` 里，这里翻译成 agent 能照着改的句子。 */
function readFailure(target: string, result: Record<string, unknown>): string {
  const reason = typeof result.reason === "string" ? result.reason : "unsupported";
  const detail = typeof result.message === "string" ? ` ${result.message}` : "";
  const message =
    reason === "not-found"
      ? "file not found; check the path (expand <knowledgeDir>/<workflowsDir> to absolute paths)."
      : reason === "too-large"
        ? "file is too large to read."
        : reason === "invalid-offset"
          ? "offset is out of range; start from 1 or use the returned nextOffset."
          : reason === "parse-error"
            ? "file could not be parsed as text."
            : "read returns text files and directories only; inspect media with design_analyse_media or design_resource_preview.";
  return `${target}: ${message}${detail}`;
}
const TIMEOUT_MS = 30_000;

const TASK_STATUS = z.enum(["accepted", "running", "waiting_user", "unknown", "completed", "failed", "cancelled"]);

const TASK_QUERY_DESCRIPTION =
  "Read authorized project tasks: mode=get requires taskId and returns {task,input}; " +
  "mode=list returns {items,nextCursor,coverage} filtered by query.";

const TASK_RESOLVE_DESCRIPTION =
  "Apply task actions with the latest task.revision as expectedRevision; returns {task}. " +
  "On revision conflict the call fails and the task must be re-read.";

const CAPABILITY_LIST_DESCRIPTION =
  "List media production and native editor plugin capabilities.";

/** task_query：GET /api/v3/tasks/:id 或 GET /api/v3/tasks */
const taskQuerySchema = z.object({
  mode: z.enum(["get", "list"]).describe("get 需要 taskId；list 走 query 过滤"),
  taskId: z.string().min(1).max(512).optional().describe("mode=get 时必填"),
  query: z
    .object({
      status: z.array(TASK_STATUS).min(1).max(7).optional(),
      operation: z.string().optional(),
    })
    .optional()
    .describe("mode=list 时的过滤条件"),
});

/** task_resolve：POST /api/v3/tasks/:id/resolve */
const taskResolveSchema = z.object({
  taskId: z.string().min(1).max(512),
  expectedRevision: z.number().int().min(1),
  action: z.enum([
    "pause", "resume", "stop", "adopt_version", "finish_as_candidate",
    "update_placement", "finish_without_placement", "retry",
  ]),
  expectedCurrentVersionId: z.string().min(1).max(512).optional(),
});

/** capability_list：GET /api/v3/capabilities */
const capabilityListSchema = z.object({
  operation: z
    .union([
      z.enum(["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media"]),
      z.array(z.enum(["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media"])).min(1).max(5),
    ])
    .optional()
    .describe("单个操作或数组；省略表示全部"),
  kind: z.enum(["media", "plugin"]).optional(),
});


// ---- 资源与合成（第 257 轮）----

const RESOURCE_KIND = z.enum(["text", "image", "video", "audio"]);
const LIFECYCLE = z.enum(["draft", "active", "archived", "deleted"]);
const PAGE = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().max(4096).optional(),
});

const resourceSearchSchema = PAGE.extend({
  text: z.string().max(2000).optional(),
  kinds: z.array(RESOURCE_KIND).min(1).max(4).optional(),
  lifecycle: z.array(LIFECYCLE).min(1).max(4).optional(),
});

const resourceGetSchema = z.object({
  view: z.enum(["current", "versions", "relations"]).optional(),
  resourceId: z.string().min(1).max(512).optional(),
  versionId: z.string().min(1).max(512).optional(),
  resourceIds: z.array(z.string().min(1).max(512)).min(1).max(20).optional(),
});

const compositionSearchSchema = PAGE.extend({
  text: z.string().max(2000).optional(),
  type: z.string().min(1).max(128).optional(),
});

const compositionTypeListSchema = z.object({ text: z.string().max(2000).optional() });

const compositionGetSchema = z.object({
  compositionId: z.string().min(1).max(512).optional(),
  compositionIds: z.array(z.string().min(1).max(512)).min(1).max(20).optional(),
});


const resourcePreviewSchema = z.object({
  versionId: z.string().min(1).max(512),
  mode: z.enum(["metadata", "content"]).optional(),
  maxEdge: z.number().int().min(256).max(2048).optional(),
  fromMs: z.number().int().min(0).optional(),
  toMs: z.number().int().min(0).optional(),
});

const capabilityGetSchema = z.object({
  capabilityIds: z.array(z.string().min(1).max(512)).min(1).max(50).optional(),
  operation: z.string().min(1).max(64).optional(),
});

const capabilitySearchSchema = z.object({
  queries: z.array(z.string().min(1).max(64)).min(1).max(5),
});


// ---- 规则 / 文档 / 编辑 / 检索（第 258 轮）----

const projectRulesSchema = z.object({
  action: z.enum(["read", "save"]),
  content: z.string().max(16 * 1024).optional().describe("action=save 时必填，完整 Markdown"),
  expectedRevision: z.number().int().min(0).optional(),
  requestId: z.string().min(1).max(512).optional(),
});

const taskWaitSchema = z.object({ taskId: z.string().min(1).max(512) });

const resourceEditSchema = z.object({
  action: z.enum(["adopt", "describe", "batch"]),
  resourceId: z.string().min(1).max(512).optional(),
  versionId: z.string().min(1).max(512).optional(),
  name: z.string().min(1).max(512).optional(),
  description: z.string().max(4096).optional(),
  expectedRevision: z.number().int().min(1).optional(),
  requestId: z.string().min(1).max(512).optional(),
});

const compositionEditSchema = z.object({
  action: z.enum(["ensure", "update", "rename", "set_attributes", "move", "duplicate", "batch"]),
  typeId: z.string().min(1).max(128).optional(),
  compositionId: z.string().min(1).max(512).optional(),
  name: z.string().min(1).max(512).optional(),
  expectedRevision: z.number().int().min(1).optional(),
  requestId: z.string().min(1).max(512).optional(),
});

const documentWriteSchema = z.object({
  requestId: z.string().min(1).max(512),
  resourceId: z.string().min(1).max(512).optional(),
  name: z.string().min(1).max(512).optional(),
  mode: z.enum(["create", "rewrite", "patch"]).optional(),
  content: z.string().max(1 << 20).optional(),
  expectedRevision: z.number().int().min(1).optional(),
});

const voiceSearchSchema = z.object({
  items: z.array(z.object({
    id: z.string().max(128).optional(),
    language: z.string().max(32).optional(),
    query: z.string().max(512).optional(),
    tags: z.array(z.string().max(64)).max(10).optional(),
  })).min(1).max(20),
});


// ---- 执行 / 交付 / 检索 / 连接器（第 259 轮）----

const executeSchema = z.object({
  capabilityId: z.string().min(1).max(512),
  prompt: z.string().max(64000).optional(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1).max(512).optional(),
});

const deliverSchema = z.object({
  requestId: z.string().min(1).max(512),
  sources: z.array(z.object({
    resourceId: z.string().max(512).optional(),
    versionId: z.string().max(512).optional(),
    path: z.string().max(4096).optional(),
  })).min(1).max(50),
  placement: z.record(z.string(), z.unknown()).optional(),
});

const imageSearchSchema = z.object({
  queries: z.array(z.object({
    query: z.string().min(1).max(512),
    count: z.number().int().min(1).max(20).optional(),
  })).min(1).max(5),
});

const connectorCallSchema = z.object({
  capabilityId: z.string().min(1).max(300),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

/** 尚未实现的 v3 工具：名字对齐、调用时明确失败（与 workspace/unavailable-workbench.js 同一原则） */
const NOT_IMPLEMENTED = "NOT_IMPLEMENTED";
function notImplemented(tool: string, because: string) {
  const error = new Error(`${NOT_IMPLEMENTED}: ${tool} 尚未实现（${because}）`);
  (error as { code?: string }).code = NOT_IMPLEMENTED;
  return errorReply(error.message);
}


// ---- v3 的通用工具（第 259 轮，原本由 v2 模块提供，v3 面需自带）----

const readSchema = z.object({
  versionId: z.string().min(1).max(512).optional(),
  file_path: z.string().min(1).max(4096).optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  contentRevision: z.number().int().min(1).optional(),
});

const analyseMediaSchema = z.object({
  references: z.array(z.object({
    resourceId: z.string().max(512).optional(),
    versionId: z.string().max(512).optional(),
    question: z.string().max(2000).optional(),
  })).min(1).max(20),
  mode: z.enum(["metadata", "describe"]).optional(),
});

const searchKnowledgeSchema = z.object({
  query: z.string().max(512).optional(),
  topic: z.string().max(128).optional(),
  category: z.string().max(64).optional(),
});

const reportOutcomeSchema = z.object({
  outcomes: z.array(z.object({
    phase: z.enum(["triage", "plan", "execute", "deliver"]),
    status: z.string().max(32),
    summary: z.string().max(4000).optional(),
  })).min(1).max(20),
});

/**
 * `composition_edit` 的 MCP 参数 → 网关命令信封。
 *
 * 网关只认 `composition.create` / `.rename` / `.set_lifecycle` / `.restore` / `.move` /
 * `.duplicate` / `.apply` 这几种命令，且外层必须有 `commandId` + `actor`。
 * 工具参数是 `action` 风格，这里做映射；映射不了的动作直接给出可执行的话。
 */
function compositionCommandEnvelope(args: Record<string, unknown>):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string } {
  // 工具 schema 里没有 requestId（与参照一致），所以这里用参数摘要造一个**稳定**的命令 id：
  // 同样的参数重试会命中网关的幂等记录，改参数就换新 id。
  const requestId = typeof args.requestId === "string" && args.requestId.trim() !== ""
    ? args.requestId
    : `auto-${createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 32)}`;
  const action = String(args.action ?? "");
  const envelope = (command: Record<string, unknown>) => ({
    ok: true as const,
    body: {
      commandId: requestId,
      actor: "agent",
      ...(typeof args.expectedRevision === "number" ? { expectedRevision: args.expectedRevision } : {}),
      command,
    },
  });
  if (action === "ensure") {
    const attributes = args.attributes && typeof args.attributes === "object"
      ? Object.entries(args.attributes as Record<string, string>).map(([name, value]) => ({ name, value }))
      : undefined;
    return envelope({
      type: "composition.create",
      compositionType: typeof args.typeId === "string" ? args.typeId : null,
      name: args.name,
      ...(attributes === undefined ? {} : { attributes }),
    });
  }
  if (action === "rename") {
    return envelope({ type: "composition.rename", compositionId: args.compositionId, name: args.name });
  }
  return {
    ok: false,
    error: `composition_edit 的 action=${action} 在当前网关还没有对应命令；目前支持 ensure（新建对象）与 rename。`,
  };
}

/** `resource_edit` 的 MCP 参数 → 网关资源命令信封。 */
function resourceCommandEnvelope(args: Record<string, unknown>):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string } {
  const requestId = typeof args.requestId === "string" && args.requestId.trim() !== ""
    ? args.requestId
    : `auto-${createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 32)}`;
  const action = String(args.action ?? "");
  const resourceId = typeof args.resourceId === "string" ? args.resourceId : undefined;
  if (!resourceId) return { ok: false, error: "resource_edit 需要 resourceId" };
  if (action === "describe") {
    const changes: Record<string, unknown> = {};
    if (typeof args.name === "string") changes.name = args.name;
    if (typeof args.description === "string") changes.description = args.description;
    return {
      ok: true,
      body: {
        commandId: requestId,
        actor: "agent",
        command: {
          type: "resource.update",
          resourceId,
          payload: {
            kind: "metadata",
            expectedMetadataRevision: typeof args.expectedMetadataRevision === "number" ? args.expectedMetadataRevision : 0,
            changes,
          },
        },
      },
    };
  }
  if (action === "adopt") {
    return {
      ok: true,
      body: {
        commandId: requestId,
        actor: "agent",
        command: {
          type: "resource.update",
          resourceId,
          payload: {
            kind: "current_version",
            versionId: args.versionId,
            expectedCurrentVersionId: args.expectedCurrentVersionId,
          },
        },
      },
    };
  }
  return { ok: false, error: `resource_edit 的 action=${action} 在当前网关还没有对应命令；目前支持 describe（改名/描述）与 adopt（切当前版本）。` };
}

export const registerV3Tools: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "task_query",
    { description: V3_TOOL_SPECS["task_query"].description, inputSchema: V3_TOOL_SPECS["task_query"].shape, annotations: V3_TOOL_SPECS["task_query"].annotations },
    async (args: V3Args<"task_query">) => {
      try {
        if (args.mode === "get") {
          if (!args.taskId) return errorReply("task_query: mode=get 需要 taskId");
          const task = await gw.get(`/api/v3/tasks/${encodeURIComponent(args.taskId)}`, TIMEOUT_MS, z.unknown());
          return structuredReply({ task });
        }
        const params = new URLSearchParams();
        const status = args.query?.status ?? [];
        const op = args.query?.operation;
        if (op) params.set("operation", Array.isArray(op) ? op.join(",") : op);
        const suffix = params.size ? `?${params.toString()}` : "";
        const list = (await gw.get(`/api/v3/tasks${suffix}`, TIMEOUT_MS, LOOSE)) as { items?: { status?: string }[] };
        const items = status.length
          ? (list.items ?? []).filter((it) => it.status && status.includes(it.status as never))
          : (list.items ?? []);
        return structuredReply({ ...list, items });
      } catch (error) {
        return errorReply(`task_query 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "task_resolve",
    { description: V3_TOOL_SPECS["task_resolve"].description, inputSchema: V3_TOOL_SPECS["task_resolve"].shape, annotations: V3_TOOL_SPECS["task_resolve"].annotations },
    async (args: V3Args<"task_resolve">) => {
      try {
        const task = await gw.post(
          `/api/v3/tasks/${encodeURIComponent(args.taskId)}/resolve`,
          {
            requestId: `mcp-${args.taskId}-${args.expectedRevision}`,
            action: args.action,
            expectedRevision: args.expectedRevision,
            ...(args.expectedCurrentVersionId ? { expectedCurrentVersionId: args.expectedCurrentVersionId } : {}),
          },
          TIMEOUT_MS,
          z.unknown(),
        );
        return structuredReply({ task });
      } catch (error) {
        return errorReply(`task_resolve 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "capability_list",
    { description: V3_TOOL_SPECS["capability_list"].description, inputSchema: V3_TOOL_SPECS["capability_list"].shape, annotations: V3_TOOL_SPECS["capability_list"].annotations },
    async (args: V3Args<"capability_list">) => {
      try {
        const params = new URLSearchParams();
        const operations = args.operation === undefined ? [] : Array.isArray(args.operation) ? args.operation : [args.operation];
        // **必须用重复参数**（`?operation=a&operation=b`）：网关按数组逐项校验，
        // 逗号拼成一个值会被判 `Invalid operation`（400）。这条以前让 agent 每次多失败两次。
        for (const operation of operations) params.append("operation", operation);
        if (args.kind) params.set("kind", args.kind);
        const suffix = params.size ? `?${params.toString()}` : "";
        const result = await gw.get(`/api/v3/capabilities${suffix}`, TIMEOUT_MS, LOOSE);
        return structuredReply(result as Record<string, unknown>);
      } catch (error) {
        return errorReply(`capability_list 失败：${errorMessage(error)}`);
      }
    },
  );
  registrar.registerTool(
    "resource_search",
    { description: V3_TOOL_SPECS["resource_search"].description, inputSchema: V3_TOOL_SPECS["resource_search"].shape, annotations: V3_TOOL_SPECS["resource_search"].annotations },
    async (args: V3Args<"resource_search">) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/search", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_search 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "resource_get",
    { description: V3_TOOL_SPECS["resource_get"].description, inputSchema: V3_TOOL_SPECS["resource_get"].shape, annotations: V3_TOOL_SPECS["resource_get"].annotations },
    async (args: V3Args<"resource_get">) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/get", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_get 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_search",
    { description: V3_TOOL_SPECS["composition_search"].description, inputSchema: V3_TOOL_SPECS["composition_search"].shape, annotations: V3_TOOL_SPECS["composition_search"].annotations },
    async (args: V3Args<"composition_search">) => {
      try {
        return structuredReply((await gw.post("/api/project/compositions/search", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_search 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_type_list",
    { description: V3_TOOL_SPECS["composition_type_list"].description, inputSchema: V3_TOOL_SPECS["composition_type_list"].shape, annotations: V3_TOOL_SPECS["composition_type_list"].annotations },
    async (args: V3Args<"composition_type_list">) => {
      try {
        // 网关这条返回的是**裸数组**；`structuredReply` 要求对象，直接透传会被
        // zod 拒掉（`Expected object, received array`）。这里统一包一层 `types`。
        // 注意用 `z.unknown()`：LOOSE 是 record，裸数组会被它拒掉。
        const result = await gw.post("/api/project/compositions/types/list", args, TIMEOUT_MS, z.unknown());
        return structuredReply(Array.isArray(result) ? { types: result } : (result as Record<string, unknown>));
      } catch (error) {
        return errorReply(`composition_type_list 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_get",
    { description: V3_TOOL_SPECS["composition_get"].description, inputSchema: V3_TOOL_SPECS["composition_get"].shape, annotations: V3_TOOL_SPECS["composition_get"].annotations },
    async (args: V3Args<"composition_get">) => {
      try {
        return structuredReply((await gw.post("/api/project/compositions/get", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_get 失败：${errorMessage(error)}`);
      }
    },
  );
  registrar.registerTool(
    "resource_preview",
    { description: V3_TOOL_SPECS["resource_preview"].description, inputSchema: V3_TOOL_SPECS["resource_preview"].shape, annotations: V3_TOOL_SPECS["resource_preview"].annotations },
    async (args: V3Args<"resource_preview">) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/preview", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_preview 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "capability_get",
    { description: V3_TOOL_SPECS["capability_get"].description, inputSchema: V3_TOOL_SPECS["capability_get"].shape, annotations: V3_TOOL_SPECS["capability_get"].annotations },
    async (args: V3Args<"capability_get">) => {
      try {
        if (args.ids?.length) {
          const params = new URLSearchParams({ ids: args.ids.join(",") });
          return structuredReply((await gw.get(`/api/v3/capabilities?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
        }
        const params = new URLSearchParams();
        if (args.plugin) params.set("plugin", JSON.stringify(args.plugin));
        return structuredReply((await gw.get(`/api/v3/capabilities${params.size ? `?${params}` : ""}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`capability_get 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "capability_search",
    { description: V3_TOOL_SPECS["capability_search"].description, inputSchema: V3_TOOL_SPECS["capability_search"].shape, annotations: V3_TOOL_SPECS["capability_search"].annotations },
    async (args: V3Args<"capability_search">) => {
      try {
        const params = new URLSearchParams({ q: args.queries.join(",") });
        return structuredReply((await gw.get(`/api/connectors/search?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`capability_search 失败：${errorMessage(error)}`);
      }
    },
  );
  registrar.registerTool(
    "memory",
    { description: V3_TOOL_SPECS["memory"].description, inputSchema: V3_TOOL_SPECS["memory"].shape, annotations: V3_TOOL_SPECS["memory"].annotations },
    async (args: V3Args<"memory">) => {
      try {
        if (args.target === "project_rules") {
          if (args.action === "read") {
            return structuredReply((await gw.get("/api/project-rules", TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
          }
          if (args.action !== "save") return errorReply("memory: target=project_rules 只支持 read / save");
          if (typeof args.content !== "string") return errorReply("memory: project_rules 的 save 需要 content");
          if (args.expectedRevision === undefined) {
            return errorReply("memory: project_rules 的 save 需要 expectedRevision（首次保存传 null）");
          }
          const saved = await gw.put("/api/project-rules", {
            content: args.content,
            expectedRevision: args.expectedRevision,
          }, TIMEOUT_MS, LOOSE);
          return structuredReply(saved as Record<string, unknown>);
        }

        const name = args.name;
        switch (args.action) {
          case "list":
            return structuredReply((await gw.get("/api/memory?scope=user", TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
          case "read": {
            if (!name) return errorReply("memory: global 的 read 需要 name");
            return structuredReply((await gw.get(
              `/api/memory/user/${encodeURIComponent(name)}`,
              TIMEOUT_MS,
              LOOSE,
            )) as Record<string, unknown>);
          }
          case "search": {
            if (!args.query) return errorReply("memory: global 的 search 需要 query");
            const params = new URLSearchParams({ q: args.query, scope: "user" });
            if (args.type) params.set("type", args.type);
            return structuredReply((await gw.get(`/api/memory/search?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
          }
          case "write": {
            if (!name || !args.type || !args.description || typeof args.body !== "string") {
              return errorReply("memory: global 的 write 需要 name / type / description / body");
            }
            const written = await gw.post("/api/memory", {
              scope: "user",
              name,
              type: args.type,
              description: args.description,
              body: args.body,
            }, TIMEOUT_MS, LOOSE);
            return structuredReply(written as Record<string, unknown>);
          }
          case "delete": {
            if (!name) return errorReply("memory: global 的 delete 需要 name");
            return structuredReply((await gw.delete(
              `/api/memory/user/${encodeURIComponent(name)}`,
              TIMEOUT_MS,
              LOOSE,
            )) as Record<string, unknown>);
          }
          default:
            return errorReply(`memory: global 不支持 action=${args.action}`);
        }
      } catch (error) {
        return errorReply(`memory 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "code_project_open",
    { description: V3_TOOL_SPECS["code_project_open"].description, inputSchema: V3_TOOL_SPECS["code_project_open"].shape, annotations: V3_TOOL_SPECS["code_project_open"].annotations },
    async (args: V3Args<"code_project_open">) => {
      try {
        const [opened, environment] = await Promise.all([
          gw.post("/api/v3/code-projects/open", { inputs: args.inputs }, TIMEOUT_MS, LOOSE),
          currentCodeEnvironment(),
        ]);
        return structuredReply({ ...opened, environment });
      } catch (error) {
        return errorReply(`code_project_open 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "code_checkpoint",
    { description: V3_TOOL_SPECS["code_checkpoint"].description, inputSchema: V3_TOOL_SPECS["code_checkpoint"].shape, annotations: V3_TOOL_SPECS["code_checkpoint"].annotations },
    async (args: V3Args<"code_checkpoint">) => {
      try {
        return structuredReply((await gw.post(
          "/api/v3/code-projects/checkpoint",
          { message: args.message },
          TIMEOUT_MS,
          LOOSE,
        )) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`code_checkpoint 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "code_status",
    { description: V3_TOOL_SPECS["code_status"].description, inputSchema: V3_TOOL_SPECS["code_status"].shape, annotations: V3_TOOL_SPECS["code_status"].annotations },
    async () => {
      try {
        return structuredReply((await gw.post("/api/v3/code-projects/status", {}, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`code_status 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "code_publish",
    { description: V3_TOOL_SPECS["code_publish"].description, inputSchema: V3_TOOL_SPECS["code_publish"].shape, annotations: V3_TOOL_SPECS["code_publish"].annotations },
    async (args: V3Args<"code_publish">) => {
      try {
        return structuredReply((await gw.post("/api/v3/code-projects/publish", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`code_publish 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "task_wait",
    { description: V3_TOOL_SPECS["task_wait"].description, inputSchema: V3_TOOL_SPECS["task_wait"].shape, annotations: V3_TOOL_SPECS["task_wait"].annotations },
    async (args: V3Args<"task_wait">) => {
      try {
        // 我们还没有长轮询端点；先返回当前快照并标注未阻塞，避免假装等待。
        const task = await gw.get(`/api/v3/tasks/${encodeURIComponent(args.taskId)}`, TIMEOUT_MS, z.unknown());
        return structuredReply({ task, waited: false, reason: "long-poll endpoint not implemented" });
      } catch (error) {
        return errorReply(`task_wait 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "resource_edit",
    { description: V3_TOOL_SPECS["resource_edit"].description, inputSchema: V3_TOOL_SPECS["resource_edit"].shape, annotations: V3_TOOL_SPECS["resource_edit"].annotations },
    async (args: V3Args<"resource_edit">) => {
      try {
        // 同 composition_edit：网关要 `{commandId, actor, command:{type, resourceId, payload}}`，
        // 以前只发了 `{command:{...args}}`，每条都 `PROJECT_INVALID_COMMAND`。
        const envelope = resourceCommandEnvelope(args as Record<string, unknown>);
        if (!envelope.ok) return errorReply(envelope.error);
        return structuredReply((await gw.post("/api/project/resources/commands", envelope.body, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_edit 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_edit",
    { description: V3_TOOL_SPECS["composition_edit"].description, inputSchema: V3_TOOL_SPECS["composition_edit"].shape, annotations: V3_TOOL_SPECS["composition_edit"].annotations },
    async (args: V3Args<"composition_edit">) => {
      try {
        // 网关要的是 `{commandId, actor, command:{type, ...}}`（`CompositionService.envelope`）。
        // 以前只发 `{command:{...args}}`，于是每条都 400 `PROJECT_INVALID_COMMAND`
        // —— 真机上对象一直建不出来，画布自然空着。
        const envelope = compositionCommandEnvelope(args as Record<string, unknown>);
        if (!envelope.ok) return errorReply(envelope.error);
        return structuredReply((await gw.post("/api/project/compositions/commands", envelope.body, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_edit 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "document_write",
    { description: V3_TOOL_SPECS["document_write"].description, inputSchema: V3_TOOL_SPECS["document_write"].shape, annotations: V3_TOOL_SPECS["document_write"].annotations },
    async (args: V3Args<"document_write">) => {
      try {
        // **`POST /api/v3/document`**，不是 resource commands 那一套：
        // 参照的 `documentWrite` 走的就是这条（同步落库、requestId 幂等）。
        // 以前我们发 `{commandId, command:{type:"write_document"}}`，网关只认
        // `resource.create|delete|update`，于是每次都被当成非法命令 —— 它和
        // `design_read` 是同一类接线错误。
        return structuredReply((await gw.post("/api/v3/document", { ...args }, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`document_write 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "voice_search",
    { description: V3_TOOL_SPECS["voice_search"].description, inputSchema: V3_TOOL_SPECS["voice_search"].shape, annotations: V3_TOOL_SPECS["voice_search"].annotations,
      outputSchema: V3_TOOL_SPECS["voice_search"].outputShape },
    async (args: V3Args<"voice_search">) => {
      try {
        const params = new URLSearchParams({ q: args.items.map((i) => i.id ?? "").filter(Boolean).join(",") });
        return structuredReply((await gw.get(`/api/v3/voices?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`voice_search 失败：${errorMessage(error)}`);
      }
    },
  );
  registrar.registerTool(
    "execute",
    { description: V3_TOOL_SPECS["execute"].description, inputSchema: V3_TOOL_SPECS["execute"].shape, annotations: V3_TOOL_SPECS["execute"].annotations },
    async (args: V3Args<"execute">) => {
      try {
        // 4.0.4 的任务契约：/api/v3/execute 接收完整能力入参并返回 {task}。
        // 旧实现按 capabilityId 猜 operation、只传 prompt，既丢参数也拿不到任务快照。
        // 网关对 submit 体做**白名单**校验（agent 只允许 capabilityId/prompt/params/references/
        // count/output）。模型会顺手带 `_tool_call_index` / `description`，于是 422
        // `UNSUPPORTED_FIELD` —— 界面上就是"生成图片失败"。这里只放行白名单字段，
        // 并把字符串化的 params/output 解析开。
        const submit: Record<string, unknown> = {};
        for (const key of ["capabilityId", "prompt", "params", "references", "count", "output"]) {
          if ((args as Record<string, unknown>)[key] !== undefined) submit[key] = (args as Record<string, unknown>)[key];
        }
        for (const key of ["params", "output"]) {
          if (typeof submit[key] === "string") {
            try {
              submit[key] = JSON.parse(submit[key] as string);
            } catch {
              // 解析不了就原样交给网关，让它给出准确报错。
            }
          }
        }
        const result = await gw.post("/api/v3/execute", submit, 600_000, z.unknown());
        return structuredReply(result as Record<string, unknown>);
      } catch (error) {
        return errorReply(`execute 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "deliver",
    { description: V3_TOOL_SPECS["deliver"].description, inputSchema: V3_TOOL_SPECS["deliver"].shape, annotations: V3_TOOL_SPECS["deliver"].annotations },
    async (args: V3Args<"deliver">) => {
      try {
        // **`POST /api/v3/deliveries`**：网关只暴露这一条（`ProjectDeliveryController`）。
        // 以前这里写的是 `/api/project/resources/deliver` —— 那条路由不存在，于是
        // agent 交付成片永远 404（真机上"成片只落到工作区、进不了画布"就是这个）。
        const result = await gw.post("/api/v3/deliveries", args, 300_000, LOOSE);
        const delivery = (result as { delivery?: unknown })?.delivery ?? result;
        return structuredReply(delivery as Record<string, unknown>);
      } catch (error) {
        return errorReply(`deliver 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "image_search",
    { description: V3_TOOL_SPECS["image_search"].description, inputSchema: V3_TOOL_SPECS["image_search"].shape, annotations: V3_TOOL_SPECS["image_search"].annotations,
      outputSchema: V3_TOOL_SPECS["image_search"].outputShape },
    async () => notImplemented("image_search", "需要联网检索与下载，本项目自托管模式未接搜索供应商"),
  );

  registrar.registerTool(
    "connector_call",
    { description: V3_TOOL_SPECS["connector_call"].description, inputSchema: V3_TOOL_SPECS["connector_call"].shape, annotations: V3_TOOL_SPECS["connector_call"].annotations },
    async () => notImplemented("connector_call", "本网关未实现 /api/connectors 子系统"),
  );
  registrar.registerTool(
    "read",
    { description: V3_TOOL_SPECS["read"].description, inputSchema: V3_TOOL_SPECS["read"].shape, annotations: V3_TOOL_SPECS["read"].annotations },
    async (args: V3Args<"read">) => {
      // 两种来源二选一：项目里的 Resource 版本，或磁盘文件/目录。走的是两套既有接口 ——
      // 以前这里把两者都写成 `GET /api/project/resources/read`，那条路由从来没存在过，
      // 于是每一次 read 都 404，agent 只能退回 bash 去 cat/ls。
      const hasVersion = typeof args.versionId === "string" && args.versionId !== "";
      const hasPath = typeof args.file_path === "string" && args.file_path !== "";
      if (hasVersion === hasPath) return errorReply("Pass exactly one of versionId or file_path.");
      try {
        if (hasVersion) {
          // Resource 版本正文：POST /api/v3/query/document_read（分页 + contentRevision + PDF 页图）。
          const result = (await gw.post(
            "/api/v3/query/document_read",
            {
              versionId: args.versionId,
              ...(args.offset !== undefined ? { startLine: args.offset } : {}),
              ...(args.limit !== undefined ? { lineCount: args.limit } : {}),
              ...(args.contentRevision !== undefined ? { contentRevision: args.contentRevision } : {}),
              ...(args.pdf_page !== undefined ? { imagePage: args.pdf_page } : {}),
            },
            TIMEOUT_MS,
            LOOSE,
          )) as Record<string, unknown>;
          return structuredReply(documentReadView(result));
        }
        // 磁盘文件 / 目录：GET /api/internal/document/read（同一套分页规则，另外支持目录与 PDF 页图）。
        const params = new URLSearchParams({ path: args.file_path as string });
        if (args.offset !== undefined) params.set("offset", String(args.offset));
        if (args.limit !== undefined) params.set("limit", String(args.limit));
        if (args.pdf_page !== undefined) params.set("image_page", String(args.pdf_page));
        const result = (await gw.get(`/api/internal/document/read?${params.toString()}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>;
        if (result.ok === false) return errorReply(readFailure(args.file_path as string, result));
        return structuredReply(documentReadView(result));
      } catch (error) {
        return errorReply(`read 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "analyse_media",
    { description: V3_TOOL_SPECS["analyse_media"].description, inputSchema: V3_TOOL_SPECS["analyse_media"].shape, annotations: V3_TOOL_SPECS["analyse_media"].annotations,
      outputSchema: V3_TOOL_SPECS["analyse_media"].outputShape },
    async (args: V3Args<"analyse_media">) => {
      try {
        // **`POST /api/v3/analyse`**（`ProjectAnalyseController`）：网关按 references 里
        // 的 versionId / resourceId 查出工作区路径，再走对话模型看盘。
        // 以前打的是 `/api/project/resources/analyse` —— 那条路由不存在。
        return structuredReply((await gw.post("/api/v3/analyse", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`analyse_media 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "search_knowledge",
    { description: V3_TOOL_SPECS["search_knowledge"].description, inputSchema: V3_TOOL_SPECS["search_knowledge"].shape, annotations: V3_TOOL_SPECS["search_knowledge"].annotations,
      outputSchema: V3_TOOL_SPECS["search_knowledge"].outputShape },
    async (args: V3Args<"search_knowledge">) => {
      try {
        const params = new URLSearchParams();
        if (args.query) params.set("query", args.query);
        if (args.topic) params.set("topic", args.topic);
        if (args.category) params.set("category", args.category);
        return structuredReply((await gw.get(`/api/v3/knowledge?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`search_knowledge 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "report_outcome",
    { description: V3_TOOL_SPECS["report_outcome"].description, inputSchema: V3_TOOL_SPECS["report_outcome"].shape, annotations: V3_TOOL_SPECS["report_outcome"].annotations },
    async (args: V3Args<"report_outcome">) => {
      try {
        return structuredReply((await gw.post("/api/v3/outcomes", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`report_outcome 失败：${errorMessage(error)}`);
      }
    },
  );
};
