/**
 * 画布上的"引用"：不拷进工作区、按身份指向项目素材库（`source:"project"`）或主体库
 * （`source:"subject"`）里的一个文件。以 `hilo-ref:<URI 编码的 JSON>` 的形式出现在提示词和路径里。
 * 字段校验和身份计算要和渲染层完全一致：身份的哈希决定落盘目录，算得不一样就找不回同一个文件。
 */
import { homedir } from "node:os";
import path from "node:path";

export const CANVAS_REFERENCE_PREFIX = "hilo-ref:";
export const CANVAS_REFERENCE_MATERIALIZED_DIR = ".hilo/canvas-references";

const KINDS = ["image", "video", "audio", "text", "other"] as const;
export type CanvasReferenceKind = (typeof KINDS)[number];

export interface CanvasReference {
  target?: "entity";
  entityType?: string;
  source: "project" | "subject";
  id: string;
  scope: string;
  name: string;
  kind: CanvasReferenceKind;
  subjectName?: string;
  attachmentKinds?: CanvasReferenceKind[];
}

export function mapCanvasDirectReference(value: unknown): CanvasReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  if (row.source !== "project" && row.source !== "subject") return undefined;
  if (typeof row.id !== "string" || !row.id || row.id.length > 256) return undefined;
  if (typeof row.scope !== "string" || !row.scope || row.scope.length > 256) return undefined;
  if (typeof row.name !== "string" || row.name.length > 1024) return undefined;
  if (!KINDS.includes(String(row.kind) as CanvasReferenceKind)) return undefined;
  if (row.target !== undefined && (row.target !== "entity" || row.source !== "subject" || row.id !== row.scope)) return undefined;
  if (
    row.attachmentKinds !== undefined &&
    (row.target !== "entity" ||
      !Array.isArray(row.attachmentKinds) ||
      row.attachmentKinds.length > 256 ||
      row.attachmentKinds.some((k) => !KINDS.includes(k as CanvasReferenceKind)))
  ) {
    return undefined;
  }
  return {
    ...(row.target === "entity" ? { target: "entity" as const } : {}),
    ...(typeof row.entityType === "string" ? { entityType: row.entityType } : {}),
    source: row.source,
    id: row.id,
    scope: row.scope,
    name: row.name,
    kind: row.kind as CanvasReferenceKind,
    ...(typeof row.subjectName === "string" ? { subjectName: row.subjectName } : {}),
    ...(Array.isArray(row.attachmentKinds) ? { attachmentKinds: row.attachmentKinds as CanvasReferenceKind[] } : {}),
  };
}

export function parseCanvasReference(value: unknown): CanvasReference | undefined {
  if (typeof value !== "string" || !value.startsWith(CANVAS_REFERENCE_PREFIX) || value.length > 8192) return undefined;
  try {
    return mapCanvasDirectReference(JSON.parse(decodeURIComponent(value.slice(CANVAS_REFERENCE_PREFIX.length))));
  } catch {
    return undefined;
  }
}

export function canvasReferenceIdentity(r: CanvasReference): string {
  return JSON.stringify([r.source, r.scope, r.id, ...(r.target ? [r.target] : [])]);
}

/**
 * 项目根目录（下面的 `.projects/<folderName>/` 是各项目的素材库）。和主进程的
 * `app/desktop/src/main/roots.ts` 同一套规则；主进程起 gateway 时会直接传 HILO_PROJECTS_ROOT。
 */
export function projectsRoot(): string {
  const explicit = process.env.HILO_PROJECTS_ROOT?.trim();
  if (explicit) return explicit;
  const custom = process.env.HILO_DATA_DIR?.trim();
  return path.join(custom || path.join(homedir(), "Movies", "蒜狸小助手"), "Projects");
}
