import { z } from "zod";

import { errorMessage } from "../gateway-client.js";
import { errorReply, structuredReply } from "../replies.js";
import type { RegisterTools } from "./types.js";

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

export const registerV3Tools: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "task_query",
    { description: TASK_QUERY_DESCRIPTION, inputSchema: taskQuerySchema.shape },
    async (args: z.infer<typeof taskQuerySchema>) => {
      try {
        if (args.mode === "get") {
          if (!args.taskId) return errorReply("task_query: mode=get 需要 taskId");
          const task = await gw.get(`/api/v3/tasks/${encodeURIComponent(args.taskId)}`, TIMEOUT_MS, z.unknown());
          return structuredReply({ task });
        }
        const params = new URLSearchParams();
        const status = args.query?.status ?? [];
        if (args.query?.operation) params.set("operation", args.query.operation);
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
    { description: TASK_RESOLVE_DESCRIPTION, inputSchema: taskResolveSchema.shape },
    async (args: z.infer<typeof taskResolveSchema>) => {
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
    { description: CAPABILITY_LIST_DESCRIPTION, inputSchema: capabilityListSchema.shape },
    async (args: z.infer<typeof capabilityListSchema>) => {
      try {
        const params = new URLSearchParams();
        const operations = args.operation === undefined ? [] : Array.isArray(args.operation) ? args.operation : [args.operation];
        if (operations.length) params.set("operation", operations.join(","));
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
    { description: "Search project resources by text, kind and lifecycle.", inputSchema: resourceSearchSchema.shape },
    async (args: z.infer<typeof resourceSearchSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/search", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_search 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "resource_get",
    { description: "Read a resource's current version, versions or relations.", inputSchema: resourceGetSchema.shape },
    async (args: z.infer<typeof resourceGetSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/get", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_get 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_search",
    { description: "Search compositions by name, attribute or member resource.", inputSchema: compositionSearchSchema.shape },
    async (args: z.infer<typeof compositionSearchSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/compositions/search", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_search 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_type_list",
    { description: "List composition type definitions.", inputSchema: compositionTypeListSchema.shape },
    async (args: z.infer<typeof compositionTypeListSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/compositions/types/list", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_type_list 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "composition_get",
    { description: "Read one or many compositions.", inputSchema: compositionGetSchema.shape },
    async (args: z.infer<typeof compositionGetSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/compositions/get", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`composition_get 失败：${errorMessage(error)}`);
      }
    },
  );
  registrar.registerTool(
    "resource_preview",
    { description: "Inspect a fixed version as metadata or bounded model-readable content.", inputSchema: resourcePreviewSchema.shape },
    async (args: z.infer<typeof resourcePreviewSchema>) => {
      try {
        return structuredReply((await gw.post("/api/project/resources/preview", args, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`resource_preview 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "capability_get",
    { description: "Read media, native editor or connector contracts in one batch.", inputSchema: capabilityGetSchema.shape },
    async (args: z.infer<typeof capabilityGetSchema>) => {
      try {
        if (args.capabilityIds?.length) {
          const params = new URLSearchParams({ ids: args.capabilityIds.join(",") });
          return structuredReply((await gw.get(`/api/v3/capabilities?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
        }
        const params = new URLSearchParams();
        if (args.operation) params.set("operation", args.operation);
        return structuredReply((await gw.get(`/api/v3/capabilities${params.size ? `?${params}` : ""}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`capability_get 失败：${errorMessage(error)}`);
      }
    },
  );

  registrar.registerTool(
    "capability_search",
    { description: "Find an external connector by name, alias or task terms.", inputSchema: capabilitySearchSchema.shape },
    async (args: z.infer<typeof capabilitySearchSchema>) => {
      try {
        const params = new URLSearchParams({ q: args.queries.join(",") });
        return structuredReply((await gw.get(`/api/connectors/search?${params}`, TIMEOUT_MS, LOOSE)) as Record<string, unknown>);
      } catch (error) {
        return errorReply(`capability_search 失败：${errorMessage(error)}`);
      }
    },
  );
};
