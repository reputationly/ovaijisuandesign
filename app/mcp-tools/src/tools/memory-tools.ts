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
        "Persistent memory for the root orchestrator, driven by a single `action` (list / read / write / delete / search). " +
        "Sub-agents should not call it: the orchestrator reads project or user memory and passes the relevant facts into the task description. " +
        "When unsure, list or search before writing; read an entry before updating it. Only write durable preferences " +
        "(user or project scope) or asset pins — not transient task state.",
      inputSchema: {
        action: z.enum(ACTIONS),
        scope: z
          .enum(["user", "project", "all"])
          .optional()
          .describe("Filter for list/search, or the target scope (user | project) for read/write/delete."),
        name: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "use the lowercase-hyphenated name from the entry frontmatter, not its file name")
          .optional()
          .describe(
            'The entry\'s frontmatter name, such as "image-style-preference" — the label shown in the memory index. Do not pass the on-disk file name.',
          ),
        type: z.enum(MEMORY_TYPES).optional().describe("[write/search] Memory type."),
        description: z
          .string()
          .min(1)
          .max(MAX_MEMORY_DESCRIPTION_LENGTH)
          .optional()
          .describe(`[write] Single-line summary, at most ${MAX_MEMORY_DESCRIPTION_LENGTH} characters.`),
        body: z.string().optional().describe(`[write] Markdown body, at most ${MAX_MEMORY_BODY_BYTES} bytes.`),
        asset_uri: z
          .string()
          .optional()
          .describe("[write asset-pin] Required for type='asset-pin'. Format: hilo://asset/<id>"),
        asset_modality: z.enum(ASSET_MODALITIES).optional().describe("[write asset-pin] Required for type='asset-pin'."),
        query: z.string().optional().describe("[search] Case-insensitive substring to look for."),
        projectRoot: z
          .string()
          .optional()
          .describe(
            "Absolute path of the active project. The runtime fills it in (the session cwd) when omitted; only pass it to target a different project.",
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
