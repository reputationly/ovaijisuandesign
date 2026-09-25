import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { currentSessionId } from "../context.js";
import { errorReply, structuredReply } from "../replies.js";
import {
  ASSET_MODALITIES,
  MAX_MEMORY_BODY_BYTES,
  MAX_MEMORY_DESCRIPTION_LENGTH,
  MEMORY_TYPES,
  MemoryError,
  memoryDelete,
  memoryList,
  memoryRead,
  memorySearch,
  memoryWrite,
  type MemoryScope,
} from "./memory-store.js";
import type { RegisterTools } from "./types.js";

/**
 * `memory`：一个工具、按 action 分派（list / read / write / delete / search），
 * 项目级在 `<projectRoot>/.hilo/memory`，用户级在 userMemoryDir()。
 */

const ACTIONS = ["list", "read", "write", "delete", "search"] as const;

/** 工作区可以关掉用户级记忆：`.hilo/storage.json` 的 preferences.loadUserMemory 优先，其次环境变量。 */
function workspaceLoadUserMemory(projectRoot: string | undefined): boolean | undefined {
  if (!projectRoot) return undefined;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(projectRoot, ".hilo", "storage.json"), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const prefs = (parsed as Record<string, unknown>).preferences;
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return undefined;
    const v = (prefs as Record<string, unknown>).loadUserMemory;
    return typeof v === "boolean" ? v : undefined;
  } catch {
    return undefined;
  }
}

function userMemoryEnabled(projectRoot: string | undefined): boolean {
  return workspaceLoadUserMemory(projectRoot) ?? process.env.HILO_LOAD_USER_MEMORY !== "0";
}

/** 用户级记忆被关掉时，list/search 当它不存在，而不是报错。 */
function listSearchScope(
  scope: MemoryScope | "all" | undefined,
  projectRoot: string | undefined,
): { empty: true } | { empty?: false; scope: MemoryScope | "all" | undefined } {
  if (userMemoryEnabled(projectRoot)) return { scope };
  const requested = scope ?? "all";
  if (requested === "user") return { empty: true };
  if (requested === "all") return projectRoot ? { scope: "project" } : { empty: true };
  return { scope: requested };
}

function withNotFoundHint(err: MemoryError): MemoryError {
  if (!err.message.startsWith("no memory entry ")) return err;
  return new MemoryError(
    `${err.message}. Run memory action=list to see the exact names, then pass one of those ` +
      `(for instance "main-character-anchor") rather than a file name.`,
  );
}

export const registerMemoryTools: RegisterTools = (registrar, gateway) => {
  registrar.registerTool(
    "memory",
    {
      description:
        "Root orchestrator memory tool. Use one `action` instead of choosing among CRUD tool names. " +
        "Sub-agents should not call memory; the orchestrator reads project/user memory and injects relevant context into task_description. " +
        "List/search before writing when unsure, read before updating, write only durable user/project preferences or asset pins.",
      inputSchema: {
        action: z.enum(ACTIONS),
        scope: z
          .enum(["user", "project", "all"])
          .optional()
          .describe("Scope filter or target scope."),
        name: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "use the lowercase-hyphenated name from the entry frontmatter, not its file name")
          .optional()
          .describe(
            'Memory entry name from frontmatter, e.g. "image-style-preference". Use the bare frontmatter name shown in the injected memory index, not the on-disk filename stem.',
          ),
        type: z.enum(MEMORY_TYPES).optional().describe("[write/search] Memory type."),
        description: z
          .string()
          .min(1)
          .max(MAX_MEMORY_DESCRIPTION_LENGTH)
          .optional()
          .describe(`[write] One-line summary, \u2264${MAX_MEMORY_DESCRIPTION_LENGTH} chars`),
        body: z.string().optional().describe(`[write] Markdown body, \u2264${MAX_MEMORY_BODY_BYTES} bytes`),
        asset_uri: z
          .string()
          .optional()
          .describe("[write asset-pin] Required when type='asset-pin'; format: hilo://asset/<id>"),
        asset_modality: z.enum(ASSET_MODALITIES).optional().describe("[write asset-pin] Required when type='asset-pin'"),
        query: z.string().optional().describe("[search] Substring to match."),
        projectRoot: z
          .string()
          .optional()
          .describe(
            "Absolute path to the active project root. Auto-injected by the runtime when omitted (set to OpenCode's cwd, which equals the active project); pass it explicitly only when targeting a different project.",
          ),
      },
      outputSchema: {
        action: z.enum(ACTIONS),
        entries: z.array(z.record(z.unknown())).optional(),
        frontmatter: z.record(z.unknown()).optional(),
        body: z.string().optional(),
        path: z.string().optional(),
        created: z.boolean().optional(),
        deleted: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        if (args.action === "list" || args.action === "search") {
          if (args.action === "search" && (!args.query || !args.query.trim())) {
            return errorReply("memory search needs a query");
          }
          const scoped = listSearchScope(args.scope, args.projectRoot);
          if (scoped.empty) return structuredReply({ action: args.action, entries: [] });
          const result =
            args.action === "list"
              ? await memoryList({ scope: scoped.scope, projectRoot: args.projectRoot })
              : await memorySearch({
                  query: args.query ?? "",
                  scope: scoped.scope,
                  type: args.type,
                  projectRoot: args.projectRoot,
                });
          return structuredReply({ action: args.action, entries: result.entries });
        }

        if (!args.scope || args.scope === "all") {
          return errorReply(`memory ${args.action} needs scope user or project`);
        }
        if (!args.name) return errorReply(`memory ${args.action} needs a name`);
        const scope = args.scope;
        const userDisabled = scope === "user" && !userMemoryEnabled(args.projectRoot);

        if (args.action === "read") {
          if (userDisabled) return errorReply(`no memory entry user/${args.name}`);
          const r = await memoryRead({ scope, name: args.name, projectRoot: args.projectRoot });
          return structuredReply({ action: "read", frontmatter: { ...r.frontmatter }, body: r.body, path: r.path });
        }
        if (args.action === "delete") {
          if (userDisabled) return structuredReply({ action: "delete", deleted: false });
          const r = await memoryDelete({ scope, name: args.name, projectRoot: args.projectRoot });
          return structuredReply({ action: "delete", deleted: r.deleted });
        }

        if (!args.type || !args.description || args.body === undefined) {
          return errorReply("memory write needs type, description and body");
        }
        const isAssetPin = args.type === "asset-pin";
        const r = await memoryWrite({
          scope,
          name: args.name,
          type: args.type,
          description: args.description,
          body: args.body,
          asset_uri: args.asset_uri,
          asset_modality: args.asset_modality,
          projectRoot: args.projectRoot,
          // agent 写的偏好也按 auto 记来源：反馈提取与压缩按同一条流水线处理
          ...(isAssetPin ? {} : { source: "auto" as const, extracted_at: new Date().toISOString() }),
        });
        if (!isAssetPin) {
          const sessionId = currentSessionId();
          if (sessionId) void gateway.notifyManualMemoryWrite(sessionId);
        }
        return structuredReply({ action: "write", path: r.path, created: r.created });
      } catch (err) {
        if (err instanceof MemoryError) return errorReply(args.action === "read" ? withNotFoundHint(err) : err);
        throw err;
      }
    },
  );
};
