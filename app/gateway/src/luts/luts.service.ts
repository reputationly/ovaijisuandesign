import { statSync } from "node:fs";
import { access, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";

const MAX_NAME_BYTES = 200;
const WINDOWS_RESERVED = new Set(["CON", "PRN", "AUX", "NUL", ...["COM", "LPT"].flatMap((p) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${p}${n}`))]);

export interface LutEntry {
  name: string;
  sizeBytes: number;
  mtime: number;
  isPreset?: true;
}

export interface UploadedLut {
  originalname: string;
  buffer: Buffer;
}

/**
 * 调色 LUT（`.cube`）：自带预设 + 每个工作区自己导入的（`.hilo/luts/`）。
 *
 * 预设只读、随 gateway 一起发（`assets/luts-presets/`），列表里排在前面；工作区里有同名文件时
 * 以工作区的为准（用户可以用同名文件覆盖一个预设的效果）。
 */
@Injectable()
export class LutsService {
  private readonly log = new Logger("Luts");
  private readonly mkdirCache = new Set<string>();
  private presetEntries: LutEntry[] | null = null;
  private readonly presetContent = new Map<string, string>();
  readonly presetsDir: string | null;

  constructor(private readonly workspace: WorkspacePathService) {
    this.presetsDir = resolvePresetsDir();
    if (!this.presetsDir) this.log.warn("找不到自带 LUT 预设目录，预设不可用");
  }

  private workspaceLutsDir(): string {
    return path.join(this.workspace.root, ".hilo", "luts");
  }

  private async ensureWorkspaceLutsDir(): Promise<string> {
    const dir = this.workspaceLutsDir();
    if (this.mkdirCache.has(dir)) return dir;
    await mkdir(dir, { recursive: true });
    this.mkdirCache.add(dir);
    return dir;
  }

  async list(): Promise<{ luts: LutEntry[] }> {
    const out = new Map<string, LutEntry>();
    for (const e of await this.listPresetEntries()) out.set(e.name, e);
    try {
      const dir = await this.ensureWorkspaceLutsDir();
      for (const e of await listCubes(dir)) out.set(e.name, e);
    } catch {
      // 工作区目录读不了就只给预设
    }
    const luts = [...out.values()].sort((a, b) => (!!a.isPreset !== !!b.isPreset ? (a.isPreset ? -1 : 1) : a.name.localeCompare(b.name)));
    return { luts };
  }

  /** 预设随安装包只读发布，一个进程里读一次。 */
  private async listPresetEntries(): Promise<LutEntry[]> {
    if (this.presetEntries) return this.presetEntries;
    if (!this.presetsDir) return (this.presetEntries = []);
    try {
      this.presetEntries = (await listCubes(this.presetsDir)).map((e) => ({ ...e, isPreset: true as const }));
    } catch (err) {
      this.log.warn(`读 LUT 预设失败: ${(err as Error).message}`);
      this.presetEntries = [];
    }
    return this.presetEntries;
  }

  /** 导入时文件名不合规就改成合规的，而不是拒绝；重名自动加 ` (1)`。 */
  async import(file: UploadedLut | undefined): Promise<{ name: string }> {
    if (!file) throw new BadRequestException("file is required");
    const dir = await this.ensureWorkspaceLutsDir();
    const safe = this.sanitizeName(Buffer.from(file.originalname, "latin1").toString("utf8"));
    return { name: await writeUnique(dir, safe, file.buffer) };
  }

  async readContent(name: string): Promise<string> {
    const safe = this.assertSimpleName(name);
    try {
      return await readFile(path.join(this.workspaceLutsDir(), safe), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    if (this.presetsDir) {
      const cached = this.presetContent.get(safe);
      if (cached !== undefined) return cached;
      try {
        const text = await readFile(path.join(this.presetsDir, safe), "utf8");
        this.presetContent.set(safe, text);
        return text;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    throw new BadRequestException(`LUT not found: ${safe}`);
  }

  /** 删工作区里的；只剩预设同名的时候拒绝（预设删不掉），都没有就当已经删了。 */
  async delete(name: string): Promise<{ ok: true }> {
    const safe = this.assertSimpleName(name);
    try {
      await unlink(path.join(this.workspaceLutsDir(), safe));
      return { ok: true };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    if (this.presetsDir) {
      const isPreset = await access(path.join(this.presetsDir, safe)).then(
        () => true,
        () => false,
      );
      if (isPreset) throw new ForbiddenException("Built-in LUT presets cannot be deleted");
    }
    return { ok: true };
  }

  /** 名字要能安全地 `path.join(dir, name)`：不带分隔符、不以点开头、不是 Windows 保留名、以 `.cube` 结尾。 */
  assertSimpleName(name: string): string {
    if (!name || typeof name !== "string") throw new BadRequestException("invalid LUT name");
    if (Buffer.byteLength(name, "utf8") > MAX_NAME_BYTES) throw new BadRequestException(`LUT name too long (max ${MAX_NAME_BYTES} bytes)`);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 故意拦控制字符
    if (name.includes("/") || name.includes("\\") || name.startsWith(".") || /[\x00-\x1f]/.test(name)) throw new BadRequestException("invalid LUT name");
    if (!name.toLowerCase().endsWith(".cube")) throw new BadRequestException("LUT name must end with .cube");
    if (WINDOWS_RESERVED.has(name.slice(0, -".cube".length).toUpperCase())) throw new BadRequestException("LUT name uses a reserved device name");
    return name;
  }

  sanitizeName(orig: string): string {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 故意替换控制字符
    let n = orig.replace(/[/\\:\x00-\x1f]/g, "_").replace(/^\.+/, "_").trim();
    if (!n) n = "lut.cube";
    if (!n.toLowerCase().endsWith(".cube")) n = `${n}.cube`;
    if (Buffer.byteLength(n, "utf8") > MAX_NAME_BYTES) {
      const stem = n.slice(0, -".cube".length);
      let end = stem.length;
      while (end > 0 && Buffer.byteLength(`${stem.slice(0, end)}.cube`, "utf8") > MAX_NAME_BYTES) end--;
      n = `${stem.slice(0, end)}.cube`;
    }
    if (WINDOWS_RESERVED.has(n.slice(0, -".cube".length).toUpperCase())) n = `_${n}`;
    return n;
  }
}

async function listCubes(dir: string): Promise<LutEntry[]> {
  const names = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".cube")).map((e) => e.name);
  const stats = await Promise.all(
    names.map((name) =>
      stat(path.join(dir, name)).then(
        (st) => ({ name, sizeBytes: st.size, mtime: st.mtimeMs }),
        () => null,
      ),
    ),
  );
  return stats.filter((s): s is LutEntry => s !== null);
}

/**
 * 独占创建（`wx`）占名，重名依次试 ` (1)`、` (2)`……
 * 先找空名再写有竞态：两次并发导入同名文件会挑中同一个名字，后写的覆盖先写的。
 */
async function writeUnique(dir: string, base: string, data: Buffer): Promise<string> {
  const ext = path.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  let candidate = base;
  for (let i = 0; i <= 9999; i++) {
    try {
      await writeFile(path.join(dir, candidate), data, { flag: "wx" });
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      candidate = `${stem} (${i + 1})${ext}`;
    }
  }
  throw new Error("Too many LUT name collisions");
}

/**
 * 预设目录：环境变量优先；否则在 gateway 包根的 `assets/luts-presets`。
 * 编译产物 `dist/luts/` 和源码 `src/luts/` 往上两级都是包根。
 */
function resolvePresetsDir(): string | null {
  const env = process.env.HILO_LUTS_PRESETS_DIR?.trim();
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const c of [env, path.resolve(here, "..", "..", "assets", "luts-presets")]) {
    if (!c) continue;
    try {
      if (statSync(c).isDirectory()) return c;
    } catch {
      // 下一个
    }
  }
  return null;
}
