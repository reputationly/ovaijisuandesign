/**
 * 对话里的本地文件引用（`shell:inspect-file-reference` / `shell:reveal-file-reference`）。
 *
 * 渲染层给的是模型写出来的原始路径（可能带引号、`file:` URL、`sandbox:` 前缀），
 * 这里解析成绝对路径后分三档：
 * - openable：在允许目录里（用户目录、数据目录、最近打开的项目、当前项目、用户信任过的目录），直接可点；
 * - needs-consent：在别处，点的时候要用户确认一次（或信任整个目录）；
 * - blocked：解析不了、不存在、或是敏感位置（.ssh、.aws、/dev …）。
 * 确认用一次性 token 绑定到具体路径，五分钟过期，免得渲染层绕过确认直接打开任意路径。
 */
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export type PathKind = "file" | "directory" | "missing" | "other";

export interface FileReferenceHost {
  platform?: NodeJS.Platform;
  getStaticAllowedDirs(): string[];
  getTrustedDirs(): string[];
  trustDirectory(dir: string): void;
  getPathKind(filePath: string): PathKind;
  openPath(filePath: string): Promise<string>;
  showItemInFolder(filePath: string): void | Promise<void>;
  now?: () => number;
  createToken?: () => string;
}

export interface FileReferenceRequest {
  rawPath?: unknown;
  currentWorkspace?: unknown;
  consent?: unknown;
  consentToken?: unknown;
}

export type InspectResult =
  | { status: "openable"; path: string; directory: string; permission: "static" | "trusted-folder" }
  | { status: "needs-consent"; path: string; directory: string }
  | { status: "blocked"; reason: string; path?: string; directory?: string };

export type RevealResult =
  | InspectResult
  | { status: "needs-consent"; path: string; directory: string; consentToken: string }
  | { status: "revealed"; path: string; directory: string; permission: "static" | "trusted-folder" | "once" | "new-trusted-folder" }
  | { status: "blocked"; reason: string; path?: string; directory?: string; message?: string };

const CONSENT_TOKEN_TTL_MS = 5 * 60 * 1000;
const SENSITIVE_SEGMENTS = [
  ".ssh", ".gnupg", ".aws", ".config", ".env", ".npmrc", ".docker", ".kube", ".gitconfig", ".netrc", ".bash_history", ".zsh_history",
];

type Parsed = { ok: true; path: string } | { ok: false; reason: string };

function isWindowsAbsolutePath(v: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(v) || /^\\\\[^\\/?]/.test(v) || /^\\\\\?\\[a-zA-Z]:[\\/]/.test(v) || /^\\\\\?\\UNC\\/i.test(v);
}

function hasNonFileUrlScheme(v: string): boolean {
  if (isWindowsAbsolutePath(v) || /^[a-zA-Z]:(?![\\/])/.test(v)) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(v) && !/^file:/i.test(v);
}

function parseFileUrl(value: string, platform: NodeJS.Platform): Parsed {
  let url: URL;
  let decoded: string;
  try {
    url = new URL(value);
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return { ok: false, reason: "invalid-path" };
  }
  if (!decoded) return { ok: false, reason: "invalid-path" };
  const remoteHost = url.hostname && url.hostname !== "localhost";
  if (platform === "win32") {
    if (remoteHost) return { ok: true, path: `\\\\${url.hostname}${decoded.replace(/\//g, "\\")}` };
    if (/^\/[a-zA-Z]:\//.test(decoded)) return { ok: true, path: decoded.slice(1).replace(/\//g, "\\") };
    return { ok: false, reason: "unsupported-platform" };
  }
  if (remoteHost || /^\/[a-zA-Z]:\//.test(decoded)) return { ok: false, reason: "unsupported-platform" };
  return { ok: true, path: decoded };
}

/** 模型写出的路径 → 绝对路径。只接受绝对路径和 file: URL。 */
export function parseLocalPath(rawPath: string, platform: NodeJS.Platform = process.platform): Parsed {
  let value = rawPath.trim().replace(/^[`'"]+|[`'"]+$/g, "");
  if (!value || value.includes("\0")) return { ok: false, reason: "invalid-path" };
  value = value.replace(/^sandbox:/i, "");
  if (/^file:/i.test(value)) return parseFileUrl(value, platform);
  if (hasNonFileUrlScheme(value)) return { ok: false, reason: "unsupported-scheme" };
  if (/^[a-zA-Z]:(?![\\/])/.test(value)) return { ok: false, reason: "invalid-path" };
  if (isWindowsAbsolutePath(value)) {
    if (platform !== "win32") return { ok: false, reason: "unsupported-platform" };
    return { ok: true, path: path.win32.resolve(value) };
  }
  if (platform === "win32" && value.startsWith("/")) return { ok: false, reason: "unsupported-platform" };
  const impl = platform === "win32" ? path.win32 : path.posix;
  if (!impl.isAbsolute(value)) return { ok: false, reason: "invalid-path" };
  return { ok: true, path: impl.resolve(value) };
}

function resolveSafely(p: string): string {
  try {
    return realpathSync(path.resolve(p));
  } catch {
    return path.resolve(p);
  }
}

function normalizeForCompare(p: string): string {
  if (process.platform === "darwin") return p.normalize("NFC");
  if (process.platform === "win32") return p.toLowerCase();
  return p;
}

export function isSensitivePath(target: string): boolean {
  return normalizeForCompare(resolveSafely(target))
    .split(path.sep)
    .some((seg) => SENSITIVE_SEGMENTS.includes(seg));
}

function isBlockedSystemPath(p: string): boolean {
  const n = p.replace(/\\/g, "/");
  if (/^\/\/\.\//.test(n)) return true;
  return ["/dev", "/proc", "/sys"].some((root) => n === root || n.startsWith(`${root}/`));
}

export function isPathWithinAllowedDirs(target: string, allowedDirs: string[]): boolean {
  if (isSensitivePath(target)) return false;
  const resolved = normalizeForCompare(resolveSafely(target));
  return allowedDirs.some((dir) => {
    const d = normalizeForCompare(resolveSafely(dir));
    const prefix = d.endsWith(path.sep) ? d : `${d}${path.sep}`;
    return resolved === d || resolved.startsWith(prefix);
  });
}

function uniqueDirs(dirs: string[]): string[] {
  const out: string[] = [];
  for (const d of dirs) {
    const clean = typeof d === "string" ? d.trim() : "";
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}

export function inspectFileReference(host: FileReferenceHost, req: FileReferenceRequest | undefined): InspectResult {
  if (!req || typeof req.rawPath !== "string") return { status: "blocked", reason: "invalid-path" };
  const platform = host.platform ?? process.platform;
  const parsed = parseLocalPath(req.rawPath, platform);
  if (!parsed.ok) return { status: "blocked", reason: parsed.reason };
  const filePath = parsed.path;
  const directory = (platform === "win32" ? path.win32 : path.posix).dirname(filePath);
  if (isSensitivePath(filePath) || isBlockedSystemPath(filePath)) return { status: "blocked", reason: "sensitive-path", path: filePath, directory };
  const kind = host.getPathKind(filePath);
  if (kind === "missing") return { status: "blocked", reason: "missing", path: filePath, directory };
  if (kind === "other") return { status: "blocked", reason: "invalid-path", path: filePath };
  const workspace = typeof req.currentWorkspace === "string" && req.currentWorkspace ? [req.currentWorkspace] : [];
  const trusted = uniqueDirs(host.getTrustedDirs());
  if (isPathWithinAllowedDirs(filePath, uniqueDirs([...host.getStaticAllowedDirs(), ...workspace, ...trusted]))) {
    return { status: "openable", path: filePath, directory, permission: isPathWithinAllowedDirs(filePath, trusted) ? "trusted-folder" : "static" };
  }
  return { status: "needs-consent", path: filePath, directory };
}

export function createFileReferenceRevealer(host: FileReferenceHost): (req: FileReferenceRequest | undefined) => Promise<RevealResult> {
  const pending = new Map<string, { path: string; directory: string; expiresAt: number }>();
  const now = () => host.now?.() ?? Date.now();
  const consume = (token: unknown, filePath: string, directory: string) => {
    for (const [t, p] of pending) if (p.expiresAt <= now()) pending.delete(t);
    if (typeof token !== "string" || !token) return false;
    const hit = pending.get(token);
    pending.delete(token);
    return !!hit && hit.path === filePath && hit.directory === directory;
  };
  return async (req) => {
    const inspection = inspectFileReference(host, req);
    if (inspection.status === "blocked") return inspection;
    const { path: filePath, directory } = inspection;
    const allowed = inspection.status === "openable";
    const consent = req?.consent;
    if (!allowed && !consent) {
      const consentToken = host.createToken?.() ?? randomUUID();
      pending.set(consentToken, { path: filePath, directory, expiresAt: now() + CONSENT_TOKEN_TTL_MS });
      return { status: "needs-consent", path: filePath, directory, consentToken };
    }
    if (!allowed && !consume(req?.consentToken, filePath, directory)) {
      return { status: "blocked", reason: "invalid-consent", path: filePath, directory };
    }
    if (!allowed && consent === "trust-folder") host.trustDirectory(directory);
    try {
      if (host.getPathKind(filePath) === "directory") {
        const err = await host.openPath(filePath);
        if (err) throw new Error(err);
      } else {
        await host.showItemInFolder(filePath);
      }
      const permission = allowed ? inspection.permission : consent === "trust-folder" ? "new-trusted-folder" : "once";
      return { status: "revealed", path: filePath, directory, permission };
    } catch (err) {
      return { status: "blocked", reason: "reveal-failed", path: filePath, directory, message: err instanceof Error ? err.message : String(err) };
    }
  };
}

/** 文件系统上的路径种类。 */
export function pathKindOnDisk(filePath: string): PathKind {
  if (!existsSync(filePath)) return "missing";
  try {
    const s = statSync(filePath);
    if (s.isFile()) return "file";
    if (s.isDirectory()) return "directory";
    return "other";
  } catch {
    return "missing";
  }
}
