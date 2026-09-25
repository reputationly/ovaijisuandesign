/**
 * 首次启动：把旧版（单工作区、多画布）的数据搬进新模型（一张画布一个工作区）。
 *
 * 旧版布局：
 *   <旧工作区>/.hilo/canvas.json            当前画布
 *   <旧工作区>/.hilo/canvases/<id>.json      其余画布的存档（当前那张的存档可能是旧的）
 *   <旧工作区>/.hilo/canvases.json           {current, list:[{id,name,updatedAt,project?}], projects:[{id,name}]}
 *   <旧工作区>/.hilo/assets.json             {by_path:{相对路径:{id,path,type}}}，节点用 assetId 引用
 *   <旧工作区>/images|videos|audios|texts|files/   所有画布共用的媒体
 *
 * 搬法：每张非空画布 → `<projectsRoot>/<画布名>` 一个新工作区，只复制它引用到的文件，
 * 保持相对路径不变（节点里的路径照样能解析），画布写成新工作区的 `.hilo/canvas.json`；
 * 索引库由 gateway 第一次打开时重建。旧数据里有项目分组就按分组建项目，否则建一个
 * 以旧工作区命名的项目收下全部。平台配置（base_url / api_key / 模型）带到新配置。
 *
 * 规则：
 * - 旧目录和旧配置**只读**：任何写入目标都不许落在它们里面（有断言）。
 * - 可以中断：进度记在 state.json，每张画布的目标目录第一次定下后就固定，重跑不会
 *   生成 `-2` 副本；文件已存在且大小一致就跳过；画布文件最后写。全部完成才写标记。
 * - api_key 不进日志。
 */
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { ProjectRecord } from "../ipc/types.js";
import { generateProjectDirName } from "../project/naming.js";
import type { GlobalStore, RecentWorkspace } from "../storage/global-store.js";
import { isPlainObject, readJsonFile, writeJsonAtomic } from "../storage/json-file.js";

export const MIGRATION_VERSION = 1;

export interface LegacyMigrationDeps {
  /** 旧配置（只读）。 */
  legacyConfigPath: string;
  /** 新配置。 */
  configPath: string;
  projectsRoot: string;
  /** 完成标记。 */
  markerPath: string;
  /** 进度文件。 */
  statePath: string;
  store: GlobalStore;
  projects: {
    list(): ProjectRecord[];
    createProject(input: { name: string; kind: "local" }): Promise<ProjectRecord>;
    assignWorkspace(workspacePath: string, projectId: string, caseInsensitive?: boolean): Promise<void>;
  };
  log?(line: string): void;
  now?(): number;
  /** 测试用：每张画布搬完后调用（可以在这里抛错模拟中断）。 */
  afterCanvas?(canvasId: string): void;
}

export interface MigratedWorkspace {
  canvasId: string;
  name: string;
  folderPath: string;
  files: number;
  group?: string;
}

export interface MigrationReport {
  status: "skipped" | "no-legacy" | "done";
  reason?: string;
  sourceWorkspace?: string;
  workspaces: MigratedWorkspace[];
  skippedEmpty: string[];
  projects: string[];
  configCarried: boolean;
  missingFiles: number;
}

interface CanvasTask {
  id: string;
  name: string;
  updatedAt: number;
  group?: string;
  source: string[];
}

interface MigrationState {
  version: number;
  source: string;
  canvases: Record<string, { target: string; done: boolean; files: number }>;
  groups: Record<string, string>;
  configDone: boolean;
}

const CANVAS_ID = /^[A-Za-z0-9_-]{1,64}$/;

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

/** 旧目录只读：任何写入前都过一遍。 */
function guardWrite(target: string, readOnlyRoots: string[]): void {
  for (const root of readOnlyRoots) {
    if (isInside(path.resolve(target), path.resolve(root))) throw new Error(`refusing to write into legacy data: ${target}`);
  }
}

function readJson(file: string): unknown {
  const r = readJsonFile(file);
  return r.kind === "ok" ? r.value : undefined;
}

/** 旧工作区里的画布清单。没有清单的老工作区只有一张 canvas.json。 */
function listCanvases(root: string): CanvasTask[] {
  const hilo = path.join(root, ".hilo");
  const idx = readJson(path.join(hilo, "canvases.json"));
  const index = isPlainObject(idx) ? idx : {};
  const current = typeof index.current === "string" ? index.current : "";
  const list = Array.isArray(index.list) ? index.list.filter(isPlainObject) : [];
  const archive = (id: string) => (CANVAS_ID.test(id) ? [path.join(hilo, "canvases", `${id}.json`)] : []);
  const tasks: CanvasTask[] = [];
  for (const e of list) {
    const id = typeof e.id === "string" ? e.id : "";
    if (!id) continue;
    const isCurrent = id === current;
    tasks.push({
      id,
      name: typeof e.name === "string" && e.name.trim() ? e.name : "画布",
      updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : 0,
      group: typeof e.project === "string" && e.project ? e.project : undefined,
      // 当前画布以 canvas.json 为准：它的存档只在切走时才更新
      source: isCurrent ? [path.join(hilo, "canvas.json"), ...archive(id)] : archive(id),
    });
  }
  if (!list.some((e) => e.id === current) && existsSync(path.join(hilo, "canvas.json"))) {
    tasks.unshift({ id: current || "current", name: path.basename(root) || "画布", updatedAt: 0, source: [path.join(hilo, "canvas.json")] });
  }
  return tasks;
}

function loadCanvas(sources: string[]): Record<string, unknown> | undefined {
  for (const s of sources) {
    const v = readJson(s);
    if (isPlainObject(v) && Array.isArray(v.nodes)) return v;
  }
  return undefined;
}

/** assetId → 相对路径（旧版资产索引）。 */
function loadAssetIndex(root: string): Map<string, string> {
  const raw = readJson(path.join(root, ".hilo", "assets.json"));
  const out = new Map<string, string>();
  const byPath = isPlainObject(raw) && isPlainObject(raw.by_path) ? raw.by_path : {};
  for (const [rel, a] of Object.entries(byPath)) {
    if (isPlainObject(a) && typeof a.id === "string") out.set(a.id, typeof a.path === "string" ? a.path : rel);
  }
  return out;
}

/** 字符串是不是指向旧工作区里的一个文件；是就返回规范的相对路径（`/` 分隔）。 */
function asWorkspaceFile(value: string, root: string): string | undefined {
  if (!value || value.length > 1024) return undefined;
  // URL 协议至少两个字符，单个字母加冒号是 Windows 盘符（C:\…），不能当成 URL 跳过
  if (!path.isAbsolute(value) && /^[a-z][a-z0-9+.-]+:/i.test(value)) return undefined;
  let rel: string;
  if (path.isAbsolute(value)) {
    if (!isInside(value, root)) return undefined;
    rel = path.relative(root, value);
  } else {
    if (!/[\\/]/.test(value) && !/\.[A-Za-z0-9]{1,8}$/.test(value)) return undefined;
    rel = path.normalize(value);
  }
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || rel.split(path.sep)[0] === ".hilo") return undefined;
  const abs = path.join(root, rel);
  try {
    if (!statSync(abs).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return rel.split(path.sep).join("/");
}

/**
 * 找出画布引用的所有文件：节点里任何像路径的字符串（data.path、封面、帧……），
 * 以及 assetId 经资产索引解析出的路径。绝对路径改写成相对路径，让新工作区自成一体。
 */
function collectReferences(canvas: Record<string, unknown>, root: string, assets: Map<string, string>): { files: Set<string>; missing: number } {
  const files = new Set<string>();
  let missing = 0;
  const visit = (node: unknown, holder?: Record<string, unknown> | unknown[], key?: string | number): void => {
    if (typeof node === "string") {
      const rel = asWorkspaceFile(node, root);
      if (rel) {
        files.add(rel);
        if (path.isAbsolute(node) && holder !== undefined && key !== undefined) (holder as Record<string | number, unknown>)[key] = rel;
      }
      return;
    }
    if (Array.isArray(node)) node.forEach((v, i) => visit(v, node, i));
    else if (isPlainObject(node)) for (const [k, v] of Object.entries(node)) visit(v, node, k);
  };
  for (const n of canvas.nodes as unknown[]) {
    if (!isPlainObject(n)) continue;
    visit(n);
    const id = typeof n.assetId === "string" ? n.assetId : typeof n.asset_id === "string" ? n.asset_id : undefined;
    if (!id) continue;
    const rel = assets.get(id);
    const resolved = rel ? asWorkspaceFile(rel, root) : undefined;
    if (resolved) files.add(resolved);
    else missing++;
  }
  return { files, missing };
}

/** 复制（APFS 上是克隆，几乎不占空间）；目标已有同样大小的就跳过。 */
function copyInto(src: string, dst: string, readOnly: string[]): void {
  guardWrite(dst, readOnly);
  try {
    if (statSync(dst).size === statSync(src).size) return;
  } catch {
    // 目标还没有
  }
  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst, constants.COPYFILE_FICLONE);
}

/** 平台配置带过去：新配置没有的字段才补，已有的不覆盖。 */
function carryConfig(legacy: Record<string, unknown>, configPath: string, readOnly: string[]): boolean {
  guardWrite(configPath, readOnly);
  const existing = readJson(configPath);
  const next: Record<string, unknown> = isPlainObject(existing) ? { ...existing } : {};
  let changed = false;
  const oldPlatform = isPlainObject(legacy.platform) ? legacy.platform : {};
  const platform: Record<string, unknown> = isPlainObject(next.platform) ? { ...next.platform } : {};
  for (const k of ["base_url", "api_key", "chat_model"]) {
    if ((platform[k] === undefined || platform[k] === "") && typeof oldPlatform[k] === "string" && oldPlatform[k]) {
      platform[k] = oldPlatform[k];
      changed = true;
    }
  }
  next.platform = { base_url: "", api_key: "", chat_model: "", ...platform };
  if (isPlainObject(legacy.models)) {
    const models: Record<string, unknown> = isPlainObject(next.models) ? { ...next.models } : {};
    for (const [k, v] of Object.entries(legacy.models)) {
      if (v === null || v === undefined) {
        if (!(k in models)) models[k] = v;
        continue;
      }
      if (!(k in models) || models[k] === null || models[k] === undefined) {
        models[k] = v;
        changed = true;
      }
    }
    next.models = models;
  }
  if (changed || !isPlainObject(existing)) writeJsonAtomic(configPath, next);
  return changed;
}

function loadState(file: string, source: string): MigrationState {
  const v = readJson(file);
  if (isPlainObject(v) && v.version === MIGRATION_VERSION && v.source === source && isPlainObject(v.canvases)) {
    return {
      version: MIGRATION_VERSION,
      source,
      canvases: v.canvases as MigrationState["canvases"],
      groups: isPlainObject(v.groups) ? (v.groups as Record<string, string>) : {},
      configDone: v.configDone === true,
    };
  }
  return { version: MIGRATION_VERSION, source, canvases: {}, groups: {}, configDone: false };
}

export async function migrateLegacyWorkspace(deps: LegacyMigrationDeps): Promise<MigrationReport> {
  const log = (l: string) => deps.log?.(`[migration] ${l}`);
  const report: MigrationReport = { status: "skipped", workspaces: [], skippedEmpty: [], projects: [], configCarried: false, missingFiles: 0 };
  if (existsSync(deps.markerPath)) return { ...report, reason: "already-migrated" };

  const legacyRaw = existsSync(deps.legacyConfigPath) ? readJson(deps.legacyConfigPath) : undefined;
  if (!isPlainObject(legacyRaw)) {
    writeJsonAtomic(deps.markerPath, { version: MIGRATION_VERSION, completedAt: deps.now?.() ?? Date.now(), result: "no-legacy" });
    return { ...report, status: "no-legacy" };
  }
  const legacyWs = typeof legacyRaw.workspace === "string" && legacyRaw.workspace ? path.resolve(legacyRaw.workspace) : undefined;
  const readOnly = [deps.legacyConfigPath, ...(legacyWs ? [legacyWs] : [])];
  const state = loadState(deps.statePath, legacyWs ?? "");
  const saveState = () => writeJsonAtomic(deps.statePath, state);

  // 1. 平台配置（和旧配置是同一个文件时什么都不做——旧文件只读）
  if (!state.configDone) {
    if (path.resolve(deps.configPath) !== path.resolve(deps.legacyConfigPath)) {
      report.configCarried = carryConfig(legacyRaw, deps.configPath, readOnly);
      if (report.configCarried) log("已带入平台与模型配置");
    }
    state.configDone = true;
    saveState();
  }

  // 2. 画布 → 工作区
  if (legacyWs && existsSync(path.join(legacyWs, ".hilo"))) {
    report.sourceWorkspace = legacyWs;
    guardWrite(deps.projectsRoot, readOnly);
    const assets = loadAssetIndex(legacyWs);
    for (const task of listCanvases(legacyWs)) {
      const canvas = loadCanvas(task.source);
      if (!canvas || (canvas.nodes as unknown[]).length === 0) {
        report.skippedEmpty.push(task.id);
        continue;
      }
      let slot = state.canvases[task.id];
      if (!slot) {
        const target = generateProjectDirName(task.name, deps.projectsRoot);
        guardWrite(target, readOnly);
        mkdirSync(target, { recursive: true });
        slot = { target, done: false, files: 0 };
        state.canvases[task.id] = slot;
        saveState();
      }
      if (!slot.done) {
        const { files, missing } = collectReferences(canvas, legacyWs, assets);
        report.missingFiles += missing;
        for (const rel of files) copyInto(path.join(legacyWs, ...rel.split("/")), path.join(slot.target, ...rel.split("/")), readOnly);
        const canvasFile = path.join(slot.target, ".hilo", "canvas.json");
        guardWrite(canvasFile, readOnly);
        writeJsonAtomic(canvasFile, canvas);
        slot.done = true;
        slot.files = files.size;
        saveState();
      }
      report.workspaces.push({ canvasId: task.id, name: task.name, folderPath: slot.target, files: slot.files, group: task.group });
      deps.afterCanvas?.(task.id);
    }
  }

  // 3. 项目分组
  if (report.workspaces.length > 0) {
    const idx = readJson(path.join(legacyWs!, ".hilo", "canvases.json"));
    const oldProjects = new Map<string, string>();
    if (isPlainObject(idx) && Array.isArray(idx.projects)) {
      for (const p of idx.projects) if (isPlainObject(p) && typeof p.id === "string" && typeof p.name === "string") oldProjects.set(p.id, p.name);
    }
    const grouped = report.workspaces.filter((w) => w.group && oldProjects.has(w.group));
    const buckets = new Map<string, { name: string; paths: string[] }>();
    if (grouped.length > 0) {
      for (const w of grouped) {
        const b = buckets.get(w.group!) ?? { name: oldProjects.get(w.group!)!, paths: [] };
        b.paths.push(w.folderPath);
        buckets.set(w.group!, b);
      }
    } else {
      buckets.set("__all__", { name: path.basename(legacyWs!) || "旧版画布", paths: report.workspaces.map((w) => w.folderPath) });
    }
    for (const [key, b] of buckets) {
      let projectId = state.groups[key];
      if (!projectId || !deps.projects.list().some((p) => p.id === projectId)) {
        projectId = (await deps.projects.createProject({ name: b.name, kind: "local" })).id;
        state.groups[key] = projectId;
        saveState();
      }
      // 倒序分配：assignWorkspace 往前插，这样项目里的顺序和旧清单一致
      for (const p of [...b.paths].reverse()) await deps.projects.assignWorkspace(p, projectId, false);
      report.projects.push(b.name);
    }

    // 4. 最近列表：新的在前，按旧清单的更新时间排
    const recents = deps.store.get("recentWorkspaces") as RecentWorkspace[];
    const have = new Set(recents.map((r) => r.path));
    const tasks = new Map(listCanvases(legacyWs!).map((t) => [t.id, t]));
    const added: RecentWorkspace[] = report.workspaces
      .filter((w) => !have.has(w.folderPath))
      .map((w) => ({ path: w.folderPath, openedAt: (tasks.get(w.canvasId)?.updatedAt ?? 0) * 1000 || (deps.now?.() ?? Date.now()) }));
    const merged = [...recents, ...added].sort((a, b) => b.openedAt - a.openedAt).map((r, i) => ({ ...r, manualOrder: i }));
    deps.store.replace("recentWorkspaces", merged);
  }

  writeJsonAtomic(deps.markerPath, {
    version: MIGRATION_VERSION,
    completedAt: deps.now?.() ?? Date.now(),
    result: "done",
    source: legacyWs ?? null,
    workspaces: report.workspaces.map((w) => w.folderPath),
  });
  log(
    `完成：${report.workspaces.length} 个工作区，${report.skippedEmpty.length} 张空画布跳过，` +
      `${report.projects.length} 个项目，${report.missingFiles} 个引用找不到文件`,
  );
  return { ...report, status: "done" };
}

/** 旧配置里读出的平台地址等，用于日志（不含 api_key）。 */
export function describeLegacyConfig(file: string): string {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const p = isPlainObject(raw.platform) ? raw.platform : {};
    return `base_url=${String(p.base_url ?? "")} chat_model=${String(p.chat_model ?? "")} api_key=${p.api_key ? "(已设置)" : "(空)"}`;
  } catch {
    return "(读不出)";
  }
}
