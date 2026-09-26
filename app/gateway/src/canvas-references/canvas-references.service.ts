import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, NotFoundException } from "@nestjs/common";
import Database from "better-sqlite3";
import sharp from "sharp";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";
import {
  CANVAS_REFERENCE_MATERIALIZED_DIR,
  type CanvasReference,
  type CanvasReferenceKind,
  canvasReferenceIdentity,
  mapCanvasDirectReference,
  projectsRoot,
} from "./canvas-reference.js";

interface ResolvedSource {
  name: string;
  absolutePath: string;
}

export interface ReferenceMetadata {
  file_size: number;
  width?: number;
  height?: number;
  duration_sec?: number;
}

export type ReferenceStatus = "available" | "missing" | "deleted" | "unavailable";

/**
 * 画布引用的解析：查在不在、读尺寸时长、把源文件"挂"进工作区供预览和生成使用。
 *
 * 项目素材库在本机（主进程维护的 `.projects/<folder>/.assets` + `.hilo/project-assets.sqlite`），
 * 按 id 查库得到文件。主体库（资产中心）在本机还没有实现，主体引用一律报 `unavailable`：
 * 这正是主体库打不开时该有的状态，渲染层会把引用显示成"暂不可用"而不是"已删除"。
 */
@Injectable()
export class CanvasReferencesService {
  constructor(
    private readonly workspace: WorkspacePathService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  /** 搜索只覆盖主体库；主体库不可用时没有结果。 */
  async searchSubjects(_query: string): Promise<unknown[]> {
    return [];
  }

  private async source(ref: CanvasReference): Promise<ResolvedSource | undefined> {
    if (ref.source !== "project") throw new Error("Subject library unavailable");
    return resolveProjectReference(ref);
  }

  async checkAvailability(refs: CanvasReference[], opts: { include_metadata?: boolean } = {}) {
    return Promise.all(
      refs.map(async (reference) => {
        try {
          if (reference.target === "entity") throw new Error("Subject library unavailable");
          const src = await this.source(reference);
          if (!src) return { reference, status: "deleted" as ReferenceStatus };
          const st = await stat(src.absolutePath);
          if (!st.isFile()) return { reference, status: "missing" as ReferenceStatus };
          return {
            reference,
            status: "available" as ReferenceStatus,
            name: src.name,
            ...(opts.include_metadata ? { metadata: { media: await this.probe(src.absolutePath, reference.kind, st.size), attachments: [] } } : {}),
          };
        } catch (err) {
          return { reference, status: ((err as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unavailable") as ReferenceStatus };
        }
      }),
    );
  }

  /** 只读探测：读不出来就不带这一项，不影响"在不在"的判断。 */
  private async probe(abs: string, kind: CanvasReferenceKind, size: number): Promise<ReferenceMetadata> {
    const m: ReferenceMetadata = { file_size: size };
    try {
      if (kind === "image") {
        const meta = await sharp(abs, { failOn: "none" }).metadata();
        const swap = (meta.orientation ?? 1) >= 5;
        const w = swap ? meta.height : meta.width;
        const h = swap ? meta.width : meta.height;
        if (w && w > 0) m.width = w;
        if (h && h > 0) m.height = h;
      } else if (kind === "video" || kind === "audio") {
        const info = await this.ffmpeg.probeMedia(abs);
        if (Number.isFinite(info.duration) && info.duration > 0) m.duration_sec = info.duration;
        if (kind === "video") {
          if (info.width > 0) m.width = info.width;
          if (info.height > 0) m.height = info.height;
        }
      }
    } catch {
      // 探测失败只是少几项元数据
    }
    return m;
  }

  /**
   * 把引用的源文件挂进工作区，返回工作区相对路径。每次都重新查一遍源：源被删了就 404，
   * 不留一份会过期的拷贝。
   *
   * 挂的方式是在 `.hilo/canvas-references/<身份哈希>/` 下建一个指向源**目录**的软链，
   * 旁边放一份 `reference.json` 记下是谁 —— 链接到目录而不是文件，源文件被替换（同名覆盖）后
   * 仍然指向新内容；目录名用身份哈希，同一个引用每次落在同一处。
   */
  async prepare(ref: CanvasReference): Promise<string> {
    const src = await this.source(ref).catch(() => undefined);
    if (!src || !(await stat(src.absolutePath).catch(() => null))?.isFile()) {
      throw new NotFoundException(`Reference unavailable: ${ref.subjectName ?? ref.name}`);
    }
    const hash = createHash("sha256").update(canvasReferenceIdentity(ref)).digest("hex");
    const dir = path.join(this.workspace.root, CANVAS_REFERENCE_MATERIALIZED_DIR, hash);
    await mkdir(dir, { recursive: true });
    const sourceDir = path.dirname(src.absolutePath);
    const linkName = `source-${createHash("sha256").update(sourceDir).digest("hex").slice(0, 16)}`;
    const link = path.join(dir, linkName);
    try {
      await symlink(sourceDir, link, process.platform === "win32" ? "junction" : "dir");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST" || (await realpath(link)) !== (await realpath(sourceDir))) throw err;
    }
    const manifest = path.join(dir, "reference.json");
    const tmp = `${manifest}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(ref));
      await rename(tmp, manifest);
    } finally {
      await rm(tmp, { force: true }).catch(() => {});
    }
    return `${CANVAS_REFERENCE_MATERIALIZED_DIR}/${hash}/${linkName}/${path.basename(src.absolutePath)}`;
  }

  /** 反查：工作区里的一个挂载路径是哪个引用（哈希对不上的不认）。 */
  async identifyPrepared(input: string): Promise<CanvasReference | undefined> {
    const normalized = input.replaceAll("\\", "/");
    const prefix = `${CANVAS_REFERENCE_MATERIALIZED_DIR}/`;
    if (!normalized.startsWith(prefix)) return undefined;
    const [hash, source, filename, ...rest] = normalized.slice(prefix.length).split("/");
    if (!hash || !/^[a-f0-9]{64}$/.test(hash) || !source || !/^source-[a-f0-9]{16}$/.test(source) || !filename || rest.length) return undefined;
    try {
      const raw = await readFile(path.join(this.workspace.root, CANVAS_REFERENCE_MATERIALIZED_DIR, hash, "reference.json"), "utf8");
      const ref = mapCanvasDirectReference(JSON.parse(raw));
      if (ref && createHash("sha256").update(canvasReferenceIdentity(ref)).digest("hex") === hash) return ref;
    } catch {
      return undefined;
    }
    return undefined;
  }
}

/**
 * 项目素材：`scope` 是项目目录名，`id` 是素材库里的行 id。
 * 目录名只许一段（不许带分隔符、不许是 `.` / `..`），解析出的文件 realpath 必须还在素材目录里 ——
 * 素材目录里一个指向别处的软链不能成为读任意文件的口子。
 */
export async function resolveProjectReference(ref: CanvasReference): Promise<ResolvedSource | undefined> {
  const folder = ref.scope;
  if (ref.source !== "project" || !folder || folder === "." || folder === ".." || /[/\\]/.test(folder)) throw new Error("Invalid project reference scope");
  const projectDir = path.join(projectsRoot(), ".projects", folder);
  const db = new Database(path.join(projectDir, ".hilo", "project-assets.sqlite"), { readonly: true, fileMustExist: true });
  let row: { rel_path: string; name: string } | undefined;
  try {
    row = db.prepare("SELECT rel_path, name FROM asset_entries WHERE id = ?").get(ref.id) as typeof row;
  } finally {
    db.close();
  }
  if (!row) return undefined;
  const root = path.join(projectDir, ".assets");
  const abs = path.resolve(root, row.rel_path);
  if (!abs.startsWith(root + path.sep)) throw new Error("Invalid asset path");
  const realRoot = await realpath(root);
  const realSource = await realpath(abs);
  if (!realSource.startsWith(realRoot + path.sep)) throw new Error("Asset escaped project");
  return { name: row.name, absolutePath: realSource };
}
