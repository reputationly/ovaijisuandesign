import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { CanvasService } from "../canvas/canvas.service.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";

const PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_VALUE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;
const MAX_KEYS = 256;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

/**
 * 插件包在数据根的 plugins/，插件自己写的文件在 plugin-data/，配置是旁边的 JSON。
 * 跟网关其它跨工作区状态共用同一个数据根，不另开一套目录。
 */
@Injectable()
export class PluginFilesService {
  private readonly log = new Logger("Plugins");
  private readonly writes = new Map<string, Promise<unknown>>();

  constructor(
    @Inject(GatewayConfig) private readonly cfg: GatewayConfig,
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
    @Inject(AssetsService) private readonly assets: AssetsService,
    @Inject(CanvasService) private readonly canvas: CanvasService,
  ) {}

  async list(): Promise<Record<string, unknown>[]> {
    const found = new Map<string, ListedPlugin>();
    const roots: { dir: string; source: "user" | "bundled" }[] = [{ dir: path.join(this.cfg.hubDir, "plugins"), source: "user" }];
    const bundled = process.env.HILO_BUNDLED_PLUGINS_DIR?.trim();
    if (bundled) roots.push({ dir: bundled, source: "bundled" });
    for (const root of roots) {
      let entries: { name: string; isDirectory: () => boolean }[] = [];
      try {
        entries = await readdir(root.dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || found.has(entry.name)) continue;
        const plugin = await this.readPlugin(path.join(root.dir, entry.name), root.source);
        if (plugin) found.set(plugin.id, plugin);
      }
    }
    return [...found.values()].map(({ entryAbsolute: _absolute, entry: _entry, ...wire }) => wire);
  }

  async installLocal(args: { filePath: string; displayName?: string; width?: number; height?: number }) {
    const absolute = path.isAbsolute(args.filePath) ? path.resolve(args.filePath) : this.paths.resolve(args.filePath);
    if (!absolute) return { ok: false, error: "invalid_path" };
    if (!/\.html?$/i.test(absolute)) return { ok: false, error: "not_html" };
    try {
      if (!(await stat(absolute)).isFile()) return { ok: false, error: "not_file" };
    } catch {
      return { ok: false, error: "file_missing" };
    }
    const baseName = path.basename(absolute).replace(/\.html?$/i, "");
    const baseId = slugifyPluginId(baseName);
    if (!PLUGIN_ID_RE.test(baseId) || baseId.length > 64) return { ok: false, error: "invalid_id" };
    const userDir = path.join(this.cfg.hubDir, "plugins");
    await mkdir(userDir, { recursive: true });
    const pluginId = await pickFreePluginId(baseId, userDir);
    if (!pluginId) return { ok: false, error: "id_collision" };
    const displayName = (args.displayName?.trim() || baseName).slice(0, 80) || baseName || pluginId;
    const iconUrl = process.env.HILO_RELEASE_REGION === "overseas"
      ? "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/8ae0eae3-e547-4078-a64b-e13713a2e88d.svg"
      : "https://cdn.hailuoai.com/hailuo-video-web/public_assets/77136285-b47e-4863-a214-e679d0871815.svg";
    const width = clampDimension(args.width);
    const height = clampDimension(args.height);
    const manifest = {
      id: pluginId,
      version: "0.1.0",
      entry: "index.html",
      name: { "zh-CN": displayName, "en-US": displayName },
      description: { "zh-CN": "本地导入的 HTML 插件", "en-US": "HTML plugin imported from canvas" },
      icon: { "zh-CN": iconUrl, "en-US": iconUrl },
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    };
    const destination = path.join(userDir, pluginId);
    try {
      await mkdir(destination);
      await copyFile(absolute, path.join(destination, "index.html"));
      await writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    } catch (error) {
      await rmDir(destination);
      return { ok: false, error: `write_failure: ${error instanceof Error ? error.message : String(error)}` };
    }
    return { ok: true, pluginId };
  }

  async instantiate(pluginId: string, body: { workspacePath?: unknown; position?: unknown; sourceNodeIds?: unknown; initialData?: unknown }) {
    const located = await this.findListed(pluginId);
    if (!located) throw new NotFoundException(`plugin not found: ${pluginId}`);
    if (body.workspacePath !== undefined && body.workspacePath !== this.paths.root) throw new BadRequestException("workspacePath does not match the open workspace");
    const position = body.position === undefined ? undefined : normalPosition(body.position);
    const sourceNodeIds = body.sourceNodeIds === undefined ? undefined : stringList(body.sourceNodeIds, "sourceNodeIds");
    const initialData = body.initialData === undefined ? undefined : record(body.initialData, "initialData");
    const entryName = path.basename(located.entry);
    const relative = await uniqueRelative(this.paths.root, path.join("plugins", `${pluginId}-${entryName}`));
    await mkdir(path.dirname(path.join(this.paths.root, relative)), { recursive: true });
    await copyFile(located.entryAbsolute, path.join(this.paths.root, relative));
    const row = await this.assets.enroll(relative, { model: "installed-plugin", plugin_id: pluginId });
    const nodeId = await this.canvas.placePlugin(row, { pluginId, version: located.version, entry: located.entry, position, sourceNodeIds, initialData });
    return nodeId;
  }

  async keys(pluginId: string): Promise<string[]> {
    return Object.keys(await this.readConfig(pluginId));
  }

  async get(pluginId: string, key: string): Promise<{ found: boolean; value?: unknown }> {
    const bucket = await this.readConfig(pluginId);
    return key in bucket ? { found: true, value: bucket[key] } : { found: false };
  }

  async set(pluginId: string, key: string, value: unknown): Promise<void> {
    if (value === undefined) throw new BadRequestException("config.set: value cannot be undefined");
    let valueSize: number;
    try {
      valueSize = Buffer.byteLength(JSON.stringify(value), "utf8");
    } catch {
      throw new BadRequestException("config.set: value is not JSON-serializable");
    }
    if (valueSize > MAX_VALUE_BYTES) throw new BadRequestException(`config.set: value for "${key}" is ${valueSize} bytes (limit ${MAX_VALUE_BYTES})`);
    await this.enqueue(pluginId, async () => {
      const current = await this.readConfig(pluginId);
      if (!(key in current) && Object.keys(current).length >= MAX_KEYS) {
        throw new BadRequestException(`config.set: too many keys (limit ${MAX_KEYS}). Delete entries before adding new ones.`);
      }
      const next = { ...current, [key]: value };
      const total = Buffer.byteLength(JSON.stringify(next), "utf8");
      if (total > MAX_TOTAL_BYTES) throw new BadRequestException(`config.set: total config ${total} bytes would exceed limit ${MAX_TOTAL_BYTES}`);
      await this.writeConfig(pluginId, next);
    });
  }

  async delete(pluginId: string, key: string): Promise<void> {
    await this.enqueue(pluginId, async () => {
      const current = await this.readConfig(pluginId);
      if (!(key in current)) return;
      const next = { ...current };
      delete next[key];
      await this.writeConfig(pluginId, next);
    });
  }

  async writeData(pluginId: string, relativePath: string, bytes: Buffer): Promise<void> {
    if (!(await this.packageExists(pluginId))) throw new NotFoundException(`plugin not found: ${pluginId}`);
    const target = this.resolveInside(this.dataDir(pluginId), relativePath);
    if (!target) throw new BadRequestException(`invalid data path: ${relativePath}`);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, target);
  }

  async resolveData(pluginId: string, relativePath: string): Promise<string | null> {
    return this.resolveFile(this.dataDir(pluginId), relativePath);
  }

  async resolveStatic(pluginId: string, relativePath: string): Promise<string | null> {
    const root = await this.packageDir(pluginId);
    if (!root) return null;
    return this.resolveFile(root, relativePath);
  }

  private async resolveFile(root: string, relativePath: string): Promise<string | null> {
    const target = this.resolveInside(root, relativePath);
    if (!target) return null;
    try {
      const info = await stat(target);
      return info.isFile() ? target : null;
    } catch {
      return null;
    }
  }

  private resolveInside(root: string, relativePath: string): string | null {
    if (!relativePath || relativePath.includes("\0")) return null;
    const target = path.resolve(root, relativePath);
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    return target;
  }

  private dataDir(pluginId: string): string {
    const base = process.env.HUB_PLUGIN_DATA_DIR?.trim() || path.join(this.cfg.hubDir, "plugin-data");
    return path.join(base, pluginId);
  }

  private configFile(pluginId: string): string {
    const dir = process.env.HUB_PLUGIN_CONFIG_DIR?.trim() || path.join(this.cfg.hubDir, "plugin-config");
    return path.join(dir, `${pluginId}.json`);
  }

  private async findListed(pluginId: string): Promise<ListedPlugin | null> {
    const roots: { dir: string; source: "user" | "bundled" }[] = [{ dir: path.join(this.cfg.hubDir, "plugins"), source: "user" }];
    const bundled = process.env.HILO_BUNDLED_PLUGINS_DIR?.trim();
    if (bundled) roots.push({ dir: bundled, source: "bundled" });
    for (const root of roots) {
      const plugin = await this.readPlugin(path.join(root.dir, pluginId), root.source);
      if (plugin) return plugin;
    }
    return null;
  }

  private async readPlugin(pluginDir: string, source: "user" | "bundled"): Promise<ListedPlugin | null> {
    let raw: string;
    try {
      raw = await readFile(path.join(pluginDir, "manifest.json"), "utf8");
    } catch {
      return null;
    }
    let manifest: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      manifest = parsed as Record<string, unknown>;
    } catch (error) {
      this.log.warn(`Plugin scan: invalid manifest at ${pluginDir}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    const id = manifest.id;
    if (typeof id !== "string" || !PLUGIN_ID_RE.test(id) || path.basename(pluginDir) !== id) return null;
    if (typeof manifest.version !== "string" || !VERSION_RE.test(manifest.version)) return null;
    const name = locales(manifest.name, 80);
    const description = locales(manifest.description, 2000);
    const icon = locales(manifest.icon, 2048);
    if (!name || !description || !icon || typeof manifest.entry !== "string" || !manifest.entry) return null;
    if (manifest.displayMode !== undefined && manifest.displayMode !== "inline" && manifest.displayMode !== "launcher") return null;
    const entryAbsolute = path.resolve(pluginDir, manifest.entry);
    const relativeEntry = path.relative(pluginDir, entryAbsolute);
    if (!relativeEntry || relativeEntry.startsWith("..") || path.isAbsolute(relativeEntry)) return null;
    try {
      if (!(await stat(entryAbsolute)).isFile()) return null;
    } catch {
      return null;
    }
    const iconUrl = Object.fromEntries(Object.entries(icon).map(([locale, ref]) => [locale, ref.startsWith("http://") || ref.startsWith("https://") ? ref : `/api/plugins/${encodeURIComponent(id)}/static/${ref.split("/").map(encodeURIComponent).join("/")}`]));
    return {
      id,
      name,
      description,
      version: manifest.version,
      source,
      iconUrl,
      entryPath: "",
      entry: relativeEntry.split(path.sep).join("/"),
      entryAbsolute,
      ...(manifest.displayMode ? { displayMode: manifest.displayMode } : {}),
      ...(parseAgent(manifest.agent) ? { agent: parseAgent(manifest.agent)! } : {}),
    };
  }

  async agentFor(pluginId: string): Promise<ListedPlugin["agent"] | null> {
    const plugin = await this.findListed(pluginId);
    return plugin?.agent ?? null;
  }

  async packageRoot(pluginId: string): Promise<string | null> {
    return this.packageDir(pluginId);
  }

  private async packageDir(pluginId: string): Promise<string | null> {
    const roots = [path.join(this.cfg.hubDir, "plugins")];
    const bundled = process.env.HILO_BUNDLED_PLUGINS_DIR?.trim();
    if (bundled) roots.push(bundled);
    for (const root of roots) {
      const dir = path.join(root, pluginId);
      try {
        if ((await stat(dir)).isDirectory()) return dir;
      } catch {
        // 下一个根目录
      }
    }
    return null;
  }

  private async packageExists(pluginId: string): Promise<boolean> {
    return (await this.packageDir(pluginId)) !== null;
  }

  private async readConfig(pluginId: string): Promise<Record<string, unknown>> {
    try {
      const parsed = JSON.parse(await readFile(this.configFile(pluginId), "utf8")) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  private async writeConfig(pluginId: string, bucket: Record<string, unknown>): Promise<void> {
    const file = this.configFile(pluginId);
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(bucket), "utf8");
    await rename(temporary, file);
  }

  private enqueue(pluginId: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.writes.get(pluginId) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    this.writes.set(pluginId, next.then(() => undefined, () => undefined));
    return next;
  }
}

type ListedPlugin = {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  version: string;
  source: "user" | "bundled";
  iconUrl: Record<string, string>;
  entryPath: "";
  entry: string;
  entryAbsolute: string;
  displayMode?: "inline" | "launcher";
  agent?: { editorSurface?: boolean; methods: { name: string; timeoutMs?: number }[] };
};

function parseAgent(value: unknown): ListedPlugin["agent"] | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as { editorSurface?: unknown; methods?: unknown };
  if (raw.editorSurface !== undefined && typeof raw.editorSurface !== "boolean") return undefined;
  if (!Array.isArray(raw.methods)) return undefined;
  const methods: { name: string; timeoutMs?: number }[] = [];
  for (const item of raw.methods) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
    const name = (item as { name?: unknown }).name;
    const timeoutMs = (item as { timeoutMs?: unknown }).timeoutMs;
    if (typeof name !== "string" || !name.trim()) return undefined;
    if (timeoutMs !== undefined && typeof timeoutMs !== "number") return undefined;
    methods.push({ name: name.trim(), ...(typeof timeoutMs === "number" ? { timeoutMs } : {}) });
  }
  return { ...(typeof raw.editorSurface === "boolean" ? { editorSurface: raw.editorSurface } : {}), methods };
}

function locales(value: unknown, max: number): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [locale, text] of Object.entries(value)) {
    if (!LOCALE_RE.test(locale) || typeof text !== "string" || !text.trim() || text.length > max) return null;
    out[locale] = text;
  }
  return Object.keys(out).length ? out : null;
}

function normalPosition(value: unknown): { x: number; y: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("position must be an object with numeric x / y");
  const point = value as { x?: unknown; y?: unknown };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new BadRequestException("position must be an object with numeric x / y");
  return { x: point.x as number, y: point.y as number };
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) throw new BadRequestException(`${label} must be a list of node ids`);
  return value as string[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function slugifyPluginId(input: string): string {
  const kebab = input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const trimmed = kebab.slice(0, 64);
  return trimmed || "plugin";
}

async function pickFreePluginId(base: string, parentDir: string): Promise<string | null> {
  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    if (candidate.length > 64 || !PLUGIN_ID_RE.test(candidate)) return null;
    try {
      await stat(path.join(parentDir, candidate));
    } catch {
      return candidate;
    }
  }
  return null;
}

function clampDimension(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 1) return undefined;
  return Math.min(rounded, 4096);
}

async function rmDir(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

async function uniqueRelative(root: string, preferred: string): Promise<string> {
  const parsed = path.parse(preferred);
  for (let index = 0; index <= 1000; index += 1) {
    const relative = index === 0 ? preferred : path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`);
    try {
      await stat(path.join(root, relative));
    } catch {
      return relative.split(path.sep).join("/");
    }
  }
  throw new BadRequestException("Could not place the plugin file in the workspace");
}

export function requirePluginId(pluginId: string): void {
  if (!pluginId || pluginId.length > 64 || !PLUGIN_ID_RE.test(pluginId)) throw new BadRequestException(`Invalid plugin id: ${pluginId}`);
}

export function requireConfigKey(key: string): void {
  if (!key || key.length > 1024) throw new BadRequestException("config key must be a non-empty string (<= 1024 chars)");
}

export function pluginRelativePath(pluginId: string, segment: "data" | "static", requestPath: string): string | null {
  const prefix = `/api/plugins/${pluginId}/${segment}/`;
  let relative: string;
  try {
    relative = decodeURIComponent(requestPath.replace(prefix, ""));
  } catch {
    return null;
  }
  if (!relative || relative.includes("\0")) return null;
  return relative;
}
