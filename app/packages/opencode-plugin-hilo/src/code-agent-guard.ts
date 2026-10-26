/**
 * Code Project 的路径守卫。照参照 4.0.4 `sidecar/opencode-plugin-hilo/dist/hilo.js` 的
 * `src/code-agent-guard.ts`（约 328,569 字节起）移植。
 *
 * 为什么需要：`design_code_project_open` 打开一棵工作树之后，code-agent 的文件工具
 * （read/write/edit/…）与 `bash` **只能**在树里动。没有守卫时，模型可以用
 * `read /etc/passwd` 或 `bash "cd .. && …"` 跳出工作树 —— 而它已经拿到了 write 权限。
 *
 * 只对 `code-agent` 会话生效（调用方判）：普通媒体会话的 read/grep 不该被这层拦。
 */
import * as nodePath from "node:path";

import { CODE_PROJECT_HTTP_PATHS } from "@ov/protocol";

import { withGatewayIdentity } from "./gateway-identity.js";

export const CODE_AGENT_NAME = "code-agent";

const BINDING_FETCH_TIMEOUT_MS = 5_000;
const BINDING_CACHE_MAX = 256;

/** 需要检查路径参数的工具 → 参数名。 */
export const PATH_ARGUMENT: Record<string, { key: string; optional: boolean }> = {
  read: { key: "filePath", optional: false },
  write: { key: "filePath", optional: false },
  edit: { key: "filePath", optional: false },
  list: { key: "path", optional: true },
  glob: { key: "path", optional: true },
  grep: { key: "path", optional: true },
  bash: { key: "workdir", optional: true },
};

export function isCodeAgentGuardedTool(tool: string): boolean {
  return Object.hasOwn(PATH_ARGUMENT, tool) || tool === "apply_patch";
}

/**
 * 会话 → 代码工作树。查不到（没开 Code Project）就是 undefined，调用方据此报"先 open"。
 * 取值失败抛错让工具调用失败：静默放过等于没有守卫。
 */
export function createCodeAgentBindings(gatewayUrl: string, fetchImpl: typeof fetch = fetch) {
  const cache = new Map<string, string>();
  return {
    async get(sessionId: string): Promise<string | undefined> {
      const cached = cache.get(sessionId);
      if (cached) return cached;
      const url = `${gatewayUrl.replace(/\/+$/, "")}${CODE_PROJECT_HTTP_PATHS.binding}?sessionId=${encodeURIComponent(sessionId)}`;
      const response = await fetchImpl(
        url,
        withGatewayIdentity({ signal: AbortSignal.timeout(BINDING_FETCH_TIMEOUT_MS) }),
      ).catch((error) => {
        throw new Error(
          `Code Project binding lookup failed (${error instanceof Error ? error.message : String(error)}); retry the tool call.`,
        );
      });
      if (!response.ok) throw new Error(`Code Project binding lookup failed (HTTP ${response.status}); retry the tool call.`);
      const body = (await response.json().catch(() => null)) as { binding?: { workDir?: unknown } } | null;
      const workDir = body?.binding?.workDir;
      if (typeof workDir !== "string" || !workDir) return undefined;
      cache.set(sessionId, workDir);
      if (cache.size > BINDING_CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return workDir;
    },
    forget(sessionId: string): void {
      cache.delete(sessionId);
    },
  };
}

function pathsFor(platform: NodeJS.Platform) {
  return platform === "win32" ? nodePath.win32 : nodePath.posix;
}

function inside(root: string, directory: string, target: string, platform: NodeJS.Platform): boolean {
  const paths = pathsFor(platform);
  const fold = (value: string) => (platform === "win32" ? value.toLowerCase() : value);
  const relative = paths.relative(fold(root), fold(paths.resolve(directory, target)));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${paths.sep}`) && !paths.isAbsolute(relative));
}

function outside(workDir: string, target: string) {
  return {
    allowed: false as const,
    message: `${target} is outside the Code Project working tree. Keep every file operation and command inside ${workDir} (use absolute paths under it).`,
  };
}

/** `apply_patch` 的补丁正文里列出要改的文件（`*** Add File: x` 等）。 */
function patchPaths(patchText: string): string[] {
  const paths: string[] = [];
  for (const line of patchText.split(/\r?\n/)) {
    const match = /^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/.exec(line.trim());
    if (match?.[1]) paths.push(match[1].trim());
  }
  return paths;
}

export interface GuardInput {
  tool: string;
  args: Record<string, unknown>;
  workDir: string | undefined;
  /** 解析相对路径用的目录（会话的工作区根）。 */
  directory: string;
  platform?: NodeJS.Platform;
}

export type GuardResult = { allowed: true } | { allowed: false; message: string };

export function guardCodeAgentTool(input: GuardInput): GuardResult {
  const { tool, args, workDir, directory } = input;
  const platform = input.platform ?? process.platform;
  if (!isCodeAgentGuardedTool(tool)) return { allowed: true };
  if (!workDir) {
    return {
      allowed: false,
      message:
        "No Code Project is open in this session. Call design_code_project_open first; file tools and commands work only inside its working tree.",
    };
  }
  if (tool === "apply_patch") {
    const text = typeof args.patchText === "string" ? args.patchText : "";
    for (const file of patchPaths(text)) {
      if (!inside(workDir, directory, file, platform)) return outside(workDir, file);
    }
    return { allowed: true };
  }
  const spec = PATH_ARGUMENT[tool];
  if (!spec) return { allowed: true };
  const raw = args[spec.key];
  if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) {
    // 可选参数缺省 = 指工作树根（等于 bash 在树里跑）。
    if (!spec.optional) return { allowed: false, message: `${tool} requires ${spec.key} inside ${workDir}.` };
    args[spec.key] = workDir;
    return { allowed: true };
  }
  if (typeof raw !== "string") return { allowed: false, message: `${spec.key} must be a path.` };
  return inside(workDir, directory, raw, platform) ? { allowed: true } : outside(workDir, raw);
}
