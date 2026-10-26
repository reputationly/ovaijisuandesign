/**
 * v3 工具的**素材**：从 `design_*` 的入参/结果里挑出"这次读了/产出了哪些素材"。
 *
 * 照参照 4.0.4 `sidecar/opencode-plugin-hilo/dist/hilo.js` 的 `src/v3-attachment-fields.ts`
 * （约 476,314 字节起）逐条移植：`inputFields` / `outputFields` 两张字段表 +
 * `material()` 的归一化规则（versionId > artifactId > path > url > composition/member >
 * resourceId）。
 *
 * 为什么不能只报路径：v3 的 `design_execute` 产出是 Resource/Version，入参里可能就是
 * `{resourceId}` 或 `{versionId}` —— 没有路径可报。不报这些，v3 会话的附件归属就是空的。
 */
import { ATTACHMENT_OBSERVATION_MAX_FILES } from "./attachment-inputs.js";

type Direction = "input" | "output";

/** 入参字段：`source[:key]`，`*` 表示数组里每一项。 */
const inputFields: Record<string, string[]> = {
  execute: ["references.*"],
  deliver: ["sources.*"],
  resource_get: ["", "versionIds.*:versionId", "resourceIds.*:resourceId"],
  resource_preview: [""],
  read: ["", "file_path:path"],
  document_write: ["baseVersionId:versionId"],
  analyse_media: ["references.*"],
};

const taskOutputs = [
  "task.outputs.*",
  "delivery.outputs.*",
  "items.*.outputs.*",
  "task.artifacts.*.id:artifactId",
  "items.*.artifacts.*.id:artifactId",
];

const outputFields: Record<string, string[]> = {
  execute: taskOutputs,
  deliver: taskOutputs,
  task_wait: taskOutputs,
  task_query: taskOutputs,
  task_resolve: taskOutputs,
  document_write: [""],
  image_search: ["queries.*.images.*"],
  voice_search: ["results.*.voices.*.sample_audio:file"],
};

export interface ToolMaterial {
  versionId?: string;
  artifactId?: string;
  path?: string;
  url?: string;
  compositionId?: string;
  memberId?: string;
  resourceId?: string;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function values(value: unknown, fields: string[]): unknown[] {
  if (fields.length === 0) return [value];
  const [field, ...rest] = fields;
  if (field === "*") {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const row = record(item);
      // 失败项与不可用项不算素材。
      return row.error || (row.availability && row.availability !== "available") ? [] : values(item, rest);
    });
  }
  return values(record(value)[field!], rest);
}

function material(value: unknown): ToolMaterial[] {
  const row = record(value);
  for (const key of ["versionId", "artifactId", "path", "url"] as const) {
    if (typeof row[key] === "string" && row[key]) return [{ [key]: row[key] as string }];
  }
  if (typeof row.compositionId === "string" && typeof row.memberId === "string") {
    return [{ compositionId: row.compositionId, memberId: row.memberId }];
  }
  return typeof row.resourceId === "string"
    ? [{ resourceId: row.resourceId, ...(typeof row.compositionId === "string" ? { compositionId: row.compositionId } : {}) }]
    : [];
}

export function v3ToolMaterials(tool: string, direction: Direction, value: unknown): ToolMaterial[] {
  if (!tool.startsWith("design_")) return [];
  let body = record(value);
  if (direction === "output") {
    if (body.isError) return [];
    if (body.structuredContent) body = record(body.structuredContent);
    else {
      try {
        body = record(JSON.parse(String(record(values(body, ["content", "*"])[0]).text)));
      } catch {
        return [];
      }
    }
  }
  const fields = (direction === "input" ? inputFields : outputFields)[tool.slice("design_".length)] ?? [];
  const found = fields.flatMap((field) => {
    const [source, key] = field.split(":");
    return values(body, source ? source.split(".") : []).flatMap((item) => {
      if (!key) return material(item);
      if (typeof item !== "string" || !item) return [];
      return material({ [key === "file" ? (/^https?:\/\//i.test(item) ? "url" : "path") : key]: item });
    });
  });
  // 去重后截断，顺序保持"先出现的先报"。
  return [...new Map(found.map((item) => [JSON.stringify(item), item])).values()].slice(0, ATTACHMENT_OBSERVATION_MAX_FILES);
}
