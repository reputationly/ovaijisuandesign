import { createHash, randomUUID } from "node:crypto";
import { open, rename, rm } from "node:fs/promises";
import path from "node:path";

import { withFileLock } from "../common/file-lock.js";

/** 和记忆锁同一套超时：MCP 用 proper-lockfile 锁同一个目标，两边必须一起放弃。 */
const LOCK_OPTS = { staleMs: 30_000, waitMs: 5_000, retryMs: 50 };

export const PROJECT_RULES_HTTP_PATH = "/api/project-rules";
export const PROJECT_RULES_MAX_BYTES = 16 * 1024;

export class ProjectRulesConflictError extends Error {
  constructor() {
    super("Project rules changed. Read the latest document, merge your edits, and save with its revision.");
    this.name = "ProjectRulesConflictError";
  }
}

export function projectRulesPath(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "project-rules.md");
}

export function projectRulesRevision(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function validateProjectRulesContent(content: string): void {
  if (typeof content !== "string") throw new Error("Project rules content must be text.");
  if (new TextEncoder().encode(content).byteLength > PROJECT_RULES_MAX_BYTES) {
    throw new Error(`Project rules exceed ${PROJECT_RULES_MAX_BYTES} UTF-8 bytes. Shorten the document before saving.`);
  }
  if (content.includes("\0")) throw new Error("Project rules must not contain null bytes.");
}

export function parseSaveProjectRulesRequest(value: unknown): { content: string; expectedRevision: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a project rules document.");
  const data = value as { content?: unknown; expectedRevision?: unknown };
  if (typeof data.content !== "string") throw new Error("Project rules content must be text.");
  validateProjectRulesContent(data.content);
  const expected = data.expectedRevision;
  if (expected === null) return { content: data.content, expectedRevision: null };
  if (typeof expected === "string" && /^[a-f0-9]{64}$/.test(expected)) return { content: data.content, expectedRevision: expected };
  throw new Error("Read project rules first and use the returned revision.");
}

export async function readProjectRules(projectRoot: string): Promise<{ content: string; revision: string | null }> {
  const filePath = projectRulesPath(projectRoot);
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "", revision: null };
    throw rulesReadError(filePath, error);
  }
  try {
    const bytes = Buffer.alloc(PROJECT_RULES_MAX_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > PROJECT_RULES_MAX_BYTES) {
      throw new Error(`Project rules exceed ${PROJECT_RULES_MAX_BYTES} UTF-8 bytes. Shorten ${filePath} before continuing.`);
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
    validateProjectRulesContent(content);
    return { content, revision: projectRulesRevision(content) };
  } catch (error) {
    throw rulesReadError(filePath, error);
  } finally {
    await handle.close();
  }
}

export async function saveProjectRules(projectRoot: string, input: unknown): Promise<{ content: string; revision: string }> {
  const { content, expectedRevision } = parseSaveProjectRulesRequest(input);
  const filePath = projectRulesPath(projectRoot);
  return withFileLock(`${filePath}.write`, LOCK_OPTS, async () => {
    const current = await readProjectRules(projectRoot);
    if (current.revision !== expectedRevision) throw new ProjectRulesConflictError();
    const temporary = `${filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(content, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, filePath);
    } finally {
      await rm(temporary, { force: true });
    }
    return { content, revision: projectRulesRevision(content) };
  });
}

function rulesReadError(filePath: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    `Cannot load project rules at ${filePath}. Edit this file to contain valid UTF-8 Markdown within ${PROJECT_RULES_MAX_BYTES} bytes, or remove it to clear the rules. ${message}`,
    { cause: error },
  );
}
