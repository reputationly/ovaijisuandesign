import type Database from "better-sqlite3";

import { ProjectKernelError } from "./errors.js";

const NAME_MAX_UNITS = 12;
const COLOR_PALETTE = ["#0A84FF", "#BF5AF2", "#FF9F0A", "#5E3DF5", "#FF5F57", "#30D158", "#FFD60A"] as const;
const PRESET_IDS = {
  "#FF5F57": "color:red",
  "#FF9F0A": "color:orange",
  "#FFD60A": "color:yellow",
  "#30D158": "color:green",
  "#0A84FF": "color:blue",
  "#BF5AF2": "color:purple",
  "#5E3DF5": "color:deep-purple",
} as const;
const PRESET_NAME_KEYS: Record<string, string> = {
  "color:red": "canvasTags.preset.red",
  "color:orange": "canvasTags.preset.orange",
  "color:yellow": "canvasTags.preset.yellow",
  "color:green": "canvasTags.preset.green",
  "color:blue": "canvasTags.preset.blue",
  "color:purple": "canvasTags.preset.purple",
  "color:deep-purple": "canvasTags.preset.deepPurple",
};
/** 中日韩和 emoji 占两个长度单位，和画布标签输入框的计数一致。 */
const WIDE_GRAPHEME = /(?:[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\p{Regional_Indicator}\u{3000}-\u{303F}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}]|\u{20E3}|\u{FE0F})/u;

type Tag = { id: string; kind: "color" | "keyword"; name?: string; color?: string; legacyNameKey?: string };
type Registry = { version: 2; revision: number; orderMode: "default" | "custom"; tags: Tag[] };
type Assignment = { resourceId: string; tagIds: string[] };
type Snapshot = { revision: number; registry: Registry; assignments: Assignment[] };
type TagCommand = { commandId: string; expectedRevision: number; registry?: Registry; assignments?: Assignment[] };

function canonicalCommand(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalCommand).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalCommand(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function seedRegistry(): Registry {
  return {
    version: 2,
    revision: 0,
    orderMode: "default",
    tags: COLOR_PALETTE.map((color) => {
      const id = PRESET_IDS[color];
      return { id, kind: "color" as const, color, legacyNameKey: PRESET_NAME_KEYS[id] };
    }),
  };
}

function nameUnits(name: string): number {
  const segments = typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name)].map((part) => part.segment) : [...name];
  return segments.reduce((total, grapheme) => total + (WIDE_GRAPHEME.test(grapheme) ? 2 : 1), 0);
}

function invalid(): never {
  throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid();
}

function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}

function id(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || value.includes("\0")) invalid();
  return value;
}

function registry(value: unknown): Registry {
  const raw = object(value);
  keys(raw, ["version", "revision", "orderMode", "tags"]);
  if (raw.version !== 2 || (raw.orderMode !== "default" && raw.orderMode !== "custom") || !Array.isArray(raw.tags) || raw.tags.length > 1000) invalid();
  const seen = new Set<string>();
  const names = new Set<string>();
  const tags = raw.tags.map((candidate) => {
    const tag = object(candidate);
    keys(tag, ["id", "kind", "name", "color", "legacyNameKey"]);
    const tagId = id(tag.id);
    if (seen.has(tagId)) invalid();
    seen.add(tagId);
    const presetKey = PRESET_NAME_KEYS[tagId];
    const kind = presetKey ? "color" : "keyword";
    if (tag.kind !== kind) invalid();
    const name = tag.name === undefined ? undefined : id(tag.name).trim();
    if (name && (nameUnits(name) > NAME_MAX_UNITS || names.has(name))) invalid();
    if (name) names.add(name);
    if (!name && !presetKey) invalid();
    if (tag.legacyNameKey !== undefined && tag.legacyNameKey !== presetKey) invalid();
    if (kind === "color" && (typeof tag.color !== "string" || !COLOR_PALETTE.includes(tag.color as (typeof COLOR_PALETTE)[number]))) invalid();
    if (kind === "keyword" && tag.color !== undefined) invalid();
    return {
      id: tagId,
      kind,
      ...(name ? { name } : {}),
      ...(kind === "color" ? { color: tag.color as string } : {}),
      ...(presetKey && !name ? { legacyNameKey: presetKey } : {}),
    } satisfies Tag;
  });
  if (Object.keys(PRESET_NAME_KEYS).some((key) => !seen.has(key))) invalid();
  return { version: 2, revision: revision(raw.revision), orderMode: raw.orderMode, tags };
}

function assignments(value: unknown): Assignment[] {
  if (!Array.isArray(value)) invalid();
  const seen = new Set<string>();
  return value.map((candidate) => {
    const item = object(candidate);
    keys(item, ["resourceId", "tagIds"]);
    const resourceId = id(item.resourceId);
    if (seen.has(resourceId) || !Array.isArray(item.tagIds) || item.tagIds.length > 1000) invalid();
    seen.add(resourceId);
    const tagIds = item.tagIds.map(id);
    if (new Set(tagIds).size !== tagIds.length) invalid();
    return { resourceId, tagIds };
  });
}

function tagIndex(registryValue: Registry): Map<string, Tag> {
  return new Map(registryValue.tags.map((tag) => [tag.id, tag]));
}

/** 一个资源最多一个颜色标签；未知或重复的标签不能写进去。 */
function assignmentError(tagIds: string[], registryValue: Registry): boolean {
  const index = tagIndex(registryValue);
  const seen = new Set<string>();
  let colors = 0;
  for (const tagId of tagIds) {
    const tag = index.get(tagId);
    if (!tag || seen.has(tagId)) return true;
    seen.add(tagId);
    if (tag.kind === "color") colors += 1;
  }
  return colors > 1;
}

function snapshot(value: unknown): Snapshot {
  const raw = object(value);
  const parsed = { revision: revision(raw.revision), registry: registry(raw.registry), assignments: assignments(raw.assignments) };
  if (parsed.registry.revision !== parsed.revision || parsed.assignments.some((item) => assignmentError(item.tagIds, parsed.registry))) invalid();
  return parsed;
}

function command(value: unknown): TagCommand {
  const raw = object(value);
  keys(raw, ["commandId", "expectedRevision", "registry", "assignments"]);
  if (raw.registry === undefined && raw.assignments === undefined) invalid();
  const parsed: TagCommand = { commandId: id(raw.commandId), expectedRevision: revision(raw.expectedRevision) };
  if (raw.registry !== undefined) {
    parsed.registry = registry(raw.registry);
    if (parsed.registry.revision !== parsed.expectedRevision) invalid();
  }
  if (raw.assignments !== undefined) {
    parsed.assignments = assignments(raw.assignments);
    if (parsed.assignments.length > 500) invalid();
  }
  return parsed;
}

/**
 * 标签登记和资源行分开记账：改标签不抬资源的 metadataRevision，
 * 但整份登记有自己的 revision，写错预期就整单退回。
 */
export class ProjectResourceTags {
  constructor(private readonly db: Database.Database) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_resource_tag_registry (
          singleton INTEGER PRIMARY KEY CHECK(singleton=1), registry_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS project_resource_tag_assignments (
          resource_id TEXT PRIMARY KEY REFERENCES resources(resource_id) ON DELETE CASCADE,
          tag_ids_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS project_resource_tag_commands (
          command_id TEXT PRIMARY KEY, request_json TEXT NOT NULL, receipt_json TEXT NOT NULL
        );
      `);
      db.prepare("INSERT OR IGNORE INTO project_resource_tag_registry VALUES(1,?)").run(JSON.stringify(seedRegistry()));
    }).immediate();
  }

  read(): Snapshot {
    this.assertOpen();
    return this.db.transaction(() => this.capture())();
  }

  execute(value: unknown): { commandId: string; committed: boolean; snapshot: Snapshot } {
    this.assertOpen();
    const parsed = command(value);
    const request = canonicalCommand(parsed);
    return this.db.transaction(() => {
      const previous = this.db.prepare("SELECT request_json, receipt_json FROM project_resource_tag_commands WHERE command_id=?").get(parsed.commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return snapshotReceipt(JSON.parse(previous.receipt_json));
      }
      const current = this.capture();
      let receipt: { commandId: string; committed: boolean; snapshot: Snapshot };
      if (current.revision !== parsed.expectedRevision) {
        receipt = { commandId: parsed.commandId, committed: false, snapshot: current };
      } else {
        const nextRegistry = parsed.registry ?? current.registry;
        const write = this.db.prepare("INSERT INTO project_resource_tag_assignments(resource_id,tag_ids_json) VALUES(?,?) ON CONFLICT(resource_id) DO UPDATE SET tag_ids_json=excluded.tag_ids_json");
        const known = new Set(nextRegistry.tags.map((tag) => tag.id));
        for (const item of current.assignments) {
          const tagIds = item.tagIds.filter((tagId) => known.has(tagId));
          if (tagIds.length !== item.tagIds.length) write.run(item.resourceId, JSON.stringify(tagIds));
        }
        for (const item of parsed.assignments ?? []) {
          const resource = this.db.prepare("SELECT lifecycle FROM resources WHERE resource_id=?").get(item.resourceId) as { lifecycle: string } | undefined;
          if (!resource) throw new ProjectKernelError("PROJECT_RESOURCE_NOT_FOUND");
          if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
          if (assignmentError(item.tagIds, nextRegistry)) invalid();
          write.run(item.resourceId, JSON.stringify(item.tagIds));
        }
        nextRegistry.revision = current.revision + 1;
        this.db.prepare("UPDATE project_resource_tag_registry SET registry_json=? WHERE singleton=1").run(JSON.stringify(nextRegistry));
        this.db.prepare("DELETE FROM project_resource_tag_assignments WHERE tag_ids_json='[]'").run();
        receipt = { commandId: parsed.commandId, committed: true, snapshot: this.capture() };
      }
      this.db.prepare("INSERT INTO project_resource_tag_commands VALUES(?,?,?)").run(parsed.commandId, request, JSON.stringify(receipt));
      return receipt;
    }).immediate();
  }

  private assertOpen(): void {
    if (!this.db.open) throw new ProjectKernelError("PROJECT_STORE_CLOSED");
  }

  private capture(): Snapshot {
    const row = this.db.prepare("SELECT registry_json FROM project_resource_tag_registry WHERE singleton=1").get() as { registry_json: string } | undefined;
    if (!row) throw new ProjectKernelError("PROJECT_STORE_SCHEMA_UNSUPPORTED");
    const stored = JSON.parse(row.registry_json) as Registry;
    const rows = this.db.prepare("SELECT resource_id AS resourceId, tag_ids_json AS tagIdsJson FROM project_resource_tag_assignments ORDER BY resource_id").all() as { resourceId: string; tagIdsJson: string }[];
    return snapshot({
      revision: stored.revision,
      registry: stored,
      assignments: rows.map((item) => ({ resourceId: item.resourceId, tagIds: JSON.parse(item.tagIdsJson) as string[] })),
    });
  }
}

function snapshotReceipt(value: unknown): { commandId: string; committed: boolean; snapshot: Snapshot } {
  const raw = object(value);
  if (typeof raw.committed !== "boolean") invalid();
  return { commandId: id(raw.commandId), committed: raw.committed, snapshot: snapshot(raw.snapshot) };
}
