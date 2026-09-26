import { randomUUID } from "node:crypto";

import { BadRequestException, GoneException, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { chat } from "@ov/maas-media";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import {
  applyRewrite,
  buildRewritePlan,
  type CompactionPlan,
  computeCompactionPlan,
  executeCompaction,
  isMemoryCompactionSchedule,
  listSnapshots,
  MEMORY_COMPACTION_DEFAULTS,
  type MemoryCompactionConfig,
  restoreSnapshot,
  type RewriteEntry,
} from "./memory-compaction.js";
import { isMemoryType, listMemoryFiles, MAX_MEMORY_DESCRIPTION_LENGTH, MEMORY_NAME_RE, MemoryError, type MemoryType } from "./memory-store.js";
import { MemoryService } from "./memory.service.js";

/**
 * 压缩配置：默认开，主进程在 gateway 就绪后把用户在设置页的选择推过来（POST config）。
 * 数值项可以用环境变量改默认值，和其他 gateway 参数一样。
 */
@Injectable()
export class MemoryCompactionConfigService {
  private cfg: MemoryCompactionConfig;

  constructor() {
    const env = process.env;
    const num = (key: string, fallback: number) => Number(env[key]) || fallback;
    const schedule = env.MEMORY_COMPACTION_SCHEDULE;
    this.cfg = {
      enabled: MEMORY_COMPACTION_DEFAULTS.enabled,
      schedule: isMemoryCompactionSchedule(schedule) ? schedule : MEMORY_COMPACTION_DEFAULTS.schedule,
      thresholdCount: num("MEMORY_COMPACTION_THRESHOLD_COUNT", MEMORY_COMPACTION_DEFAULTS.thresholdCount),
      thresholdBytes: num("MEMORY_COMPACTION_THRESHOLD_BYTES", MEMORY_COMPACTION_DEFAULTS.thresholdBytes),
      snapshotRetention: num("MEMORY_COMPACTION_SNAPSHOT_RETENTION", MEMORY_COMPACTION_DEFAULTS.snapshotRetention),
      snapshotTtlDays: num("MEMORY_COMPACTION_SNAPSHOT_TTL_DAYS", MEMORY_COMPACTION_DEFAULTS.snapshotTtlDays),
      llmMergeEnabled: MEMORY_COMPACTION_DEFAULTS.llmMergeEnabled,
      expireFeedbackDays: num("MEMORY_COMPACTION_EXPIRE_FEEDBACK_DAYS", MEMORY_COMPACTION_DEFAULTS.expireFeedbackDays),
    };
  }

  get(): MemoryCompactionConfig {
    return this.cfg;
  }

  /** 部分更新，整体替换：读的人拿到的要么是旧的一份，要么是新的一份，不会半新半旧。 */
  patch(partial: Record<string, unknown>): MemoryCompactionConfig {
    if (partial.schedule !== undefined && !isMemoryCompactionSchedule(partial.schedule)) throw new Error(`invalid schedule: ${String(partial.schedule)}`);
    for (const key of ["thresholdCount", "thresholdBytes", "snapshotRetention", "snapshotTtlDays", "expireFeedbackDays"]) {
      const value = partial[key];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative finite number, got ${String(value)}`);
    }
    for (const key of ["enabled", "llmMergeEnabled"]) {
      if (partial[key] !== undefined && typeof partial[key] !== "boolean") throw new Error(`${key} must be a boolean, got ${String(partial[key])}`);
    }
    const known = Object.fromEntries(Object.entries(partial).filter(([k]) => k in this.cfg));
    this.cfg = { ...this.cfg, ...known };
    return this.cfg;
  }
}

/** 合并改写的预览结果先缓存起来：执行时用的必须是用户看过的那一份，不能再问一次模型拿到另一份。 */
@Injectable()
export class ProposalCache {
  static readonly TTL_MS = 5 * 60 * 1000;
  static readonly MAX_PROPOSALS = 128;
  private readonly store = new Map<string, { plan: CompactionPlan; llmModel: string; expiresAt: number }>();
  nowMs: () => number = () => Date.now();

  put(plan: CompactionPlan, llmModel: string): { proposalId: string; expiresAt: number } {
    const now = this.nowMs();
    for (const [id, e] of this.store) if (now > e.expiresAt) this.store.delete(id);
    while (this.store.size >= ProposalCache.MAX_PROPOSALS) {
      const oldest = this.store.keys().next().value;
      if (!oldest) break;
      this.store.delete(oldest);
    }
    const proposalId = randomUUID();
    const expiresAt = now + ProposalCache.TTL_MS;
    this.store.set(proposalId, { plan, llmModel, expiresAt });
    return { proposalId, expiresAt };
  }

  get(id: string): { plan: CompactionPlan; llmModel: string } | null {
    const e = this.store.get(id);
    if (!e) return null;
    if (this.nowMs() > e.expiresAt) {
      this.store.delete(id);
      return null;
    }
    return { plan: e.plan, llmModel: e.llmModel };
  }

  delete(id: string): void {
    this.store.delete(id);
  }
}

export class RewriteLlmError extends Error {}

const REWRITE_TIMEOUT_MS = 120_000;
/** 推理模型的思考和正文共用 max_tokens：合并后的正文可能不短，给足。 */
const REWRITE_MAX_TOKENS = 8192;

const REWRITE_SYSTEM_PROMPT = [
  "You consolidate AI agent long-term memories on user request.",
  "",
  "Input: N memory entries (frontmatter + body) the user explicitly selected.",
  "Output: M consolidated entries (M ≤ N, target ~30-50% reduction when redundancy exists).",
  "",
  "LANGUAGE RULE (most important): write each output `description` + `body` in the EXACT language the input `description` + `body` use. The inputs are ground truth — do NOT default to English just because this system prompt is in English.",
  '- If inputs are Chinese, outputs MUST be 100% Chinese with NO English glosses, NO English wrapper sentences, NO bilingual annotations. WRONG: "富家女 (rich girl)" / "User prefers Chinese drama". RIGHT: "富家女" / "用户偏好中文短剧".',
  "- If inputs are English, outputs MUST be English.",
  "- If inputs mix languages, follow the dominant one.",
  "- `name` is ALWAYS English kebab-case (filename + dedup rules require ASCII).",
  "",
  "Rules:",
  "1. Preserve all factual content; remove only redundancy and stale references.",
  '2. Each output entry MUST list its sources in `compactedFrom: ["original-name", ...]`.',
  "   Every original input name must appear in at least one output entry's compactedFrom.",
  "3. `type` must be one of: user, feedback, project, reference.",
  "4. `name` must be lowercase kebab-case, max 64 chars, and must NOT collide with",
  "   any surviving (non-selected) memory name provided in the context.",
  "5. `description` is a one-line summary, max 200 chars, no line breaks.",
  "6. `body` follows the original markdown conventions (no frontmatter — that is",
  "   reconstructed from name/description/type by the engine).",
  "",
  "Output: a raw JSON array, no markdown fences, no commentary.",
].join("\n");

function buildRewriteUserPrompt(entries: { name: string; type: string; description: string; body: string }[], survivingNames: string[]): string {
  const lines: string[] = [`=== Memories to consolidate (N=${entries.length}) ===`];
  entries.forEach((e, i) => {
    lines.push(`[${i + 1}] name: ${e.name} | type: ${e.type} | description: ${e.description}`, "    body:");
    for (const bodyLine of e.body.split("\n")) lines.push(`    ${bodyLine}`);
    lines.push("");
  });
  lines.push(`=== Names to AVOID (surviving non-selected memories, M=${survivingNames.length}) ===`);
  if (survivingNames.length === 0) lines.push("(none — the rewrite can use any kebab-case name)");
  else for (const n of survivingNames) lines.push(`- ${n}`);
  lines.push("", "Return: JSON array of consolidated entries.");
  return lines.join("\n");
}

export function parseRewriteJson(text: string): Record<string, unknown>[] {
  let stripped = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(stripped);
  if (fence?.[1]) stripped = fence[1].trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];
  } catch {
    return [];
  }
}

/** 单条结果的清洗：名字、类型、描述、来源任何一项不合格就整条丢掉（后面建计划时还会整体再校验一遍）。 */
function sanitiseOutputEntry(raw: Record<string, unknown>, inputNames: Set<string>, surviving: Set<string>): RewriteEntry | null {
  if (typeof raw.name !== "string") return null;
  const name = raw.name.trim();
  if (!MEMORY_NAME_RE.test(name) || surviving.has(name)) return null;
  if (typeof raw.description !== "string") return null;
  const description = raw.description.trim().replace(/\s+/g, " ");
  if (!description || description.length > MAX_MEMORY_DESCRIPTION_LENGTH) return null;
  if (typeof raw.type !== "string" || !isMemoryType(raw.type) || raw.type === "asset-pin" || raw.type === "media-style") return null;
  if (typeof raw.body !== "string" || !raw.body.trim()) return null;
  if (!Array.isArray(raw.compactedFrom) || raw.compactedFrom.length === 0) return null;
  const sources: string[] = [];
  for (const src of raw.compactedFrom) {
    if (typeof src !== "string" || !inputNames.has(src)) return null;
    sources.push(src);
  }
  return { name, description, type: raw.type as MemoryType, body: raw.body.trim(), compactedFrom: [...new Set(sources)] };
}

/** 合并改写用平台上配置的对话模型（和画布文本生成同一个），不走任何云端服务。 */
@Injectable()
export class RewriteLlmService {
  private readonly log = new Logger("MemoryRewrite");

  constructor(private readonly media: MediaConfigService) {}

  get model(): string {
    try {
      return this.media.load().platform.chat_model;
    } catch {
      return "";
    }
  }

  async rewrite(entries: { name: string; type: string; description: string; body: string }[], survivingNames: string[]): Promise<RewriteEntry[]> {
    if (entries.length === 0) throw new RewriteLlmError("rewrite called with empty entries");
    let cfg;
    try {
      cfg = this.media.load();
    } catch (err) {
      throw new RewriteLlmError(`platform config is unreadable: ${(err as Error).message}`);
    }
    if (!cfg.platform.chat_model.trim() || !cfg.platform.base_url.trim()) throw new RewriteLlmError("no chat model configured — cannot call rewrite LLM");
    let text: string;
    try {
      const turn = await chat.completeWithTools(
        this.media.client(),
        cfg,
        [
          { role: "system", content: REWRITE_SYSTEM_PROMPT },
          { role: "user", content: buildRewriteUserPrompt(entries, survivingNames) },
        ],
        [],
        REWRITE_MAX_TOKENS,
        REWRITE_TIMEOUT_MS,
      );
      text = turn.content;
    } catch (err) {
      throw new RewriteLlmError(`rewrite LLM failed: ${(err as Error).message}`);
    }
    if (!text.trim()) throw new RewriteLlmError("rewrite LLM returned empty text content");
    const raw = parseRewriteJson(text);
    if (raw.length === 0) throw new RewriteLlmError("rewrite LLM produced 0 entries; expected at least 1");
    const inputNames = new Set(entries.map((e) => e.name));
    const surviving = new Set(survivingNames);
    const validated: RewriteEntry[] = [];
    for (const candidate of raw) {
      const clean = sanitiseOutputEntry(candidate, inputNames, surviving);
      if (clean) validated.push(clean);
      else this.log.warn(`rewrite: candidate rejected ${JSON.stringify(candidate).slice(0, 120)}`);
    }
    if (validated.length === 0) throw new RewriteLlmError("rewrite LLM returned no validatable entries");
    return validated;
  }
}

/**
 * 用户级记忆的压缩、快照恢复和合并改写。每次改动后发一条聚合的 `memory_changed`（name="*"），
 * 让界面整个作用域重拉，而不是一条条对。
 */
@Injectable()
export class MemoryCompactionService {
  private readonly log = new Logger("MemoryCompaction");

  constructor(
    private readonly bus: GatewayEventBus,
    private readonly cfgSvc: MemoryCompactionConfigService,
    private readonly rewriteLlm: RewriteLlmService,
    private readonly proposals: ProposalCache,
    private readonly memory: MemoryService,
  ) {}

  private dirs() {
    return { userDir: this.memory.userDir() };
  }

  preview(force: boolean) {
    return this.wrap(() => computeCompactionPlan(this.dirs(), "user", this.cfgSvc.get(), force));
  }

  async execute(keepNames?: string[]) {
    const summary = await this.wrap(() => executeCompaction(this.dirs(), "user", this.cfgSvc.get(), { ...(keepNames ? { keepNames } : {}) }));
    this.bus.emit("memory:changed", {
      type: "memory_changed",
      scope: "user",
      name: "*",
      action: "compaction",
      compaction: { deleted: summary.deleted, merged: summary.merged, freedBytes: summary.freedBytes, snapshotId: summary.snapshotId },
    });
    this.log.log(`compaction ok deleted=${summary.deleted} freedBytes=${summary.freedBytes} snapshotId=${summary.snapshotId ?? "null"}`);
    return summary;
  }

  listSnapshots() {
    return listSnapshots(this.dirs(), "user");
  }

  async restore(snapshotId: string) {
    const result = await this.wrap(() => restoreSnapshot(this.dirs(), "user", snapshotId));
    this.bus.emit("memory:changed", { type: "memory_changed", scope: "user", name: "*", action: "snapshot_restore" });
    this.log.log(`snapshot restore ok snapshotId=${snapshotId} restored=${result.restored}`);
    return { restored: result.restored };
  }

  /**
   * 合并改写第一步：读出选中的记忆，让模型合并，校验成计划缓存起来，回一个 proposalId 给界面预览。
   * 选中的不存在、选中了资产锚点都算调用方的错（界面该先刷新列表）。
   */
  async rewritePreview(selectedNames: string[]) {
    if (new Set(selectedNames).size !== selectedNames.length) throw new BadRequestException("selectedNames contains duplicates");
    const dir = this.memory.userDir();
    let files;
    try {
      files = await listMemoryFiles(dir);
    } catch (err) {
      throw new BadRequestException(`failed to read user memory vault: ${(err as Error).message}`);
    }
    const requested = new Set(selectedNames);
    const selected = [];
    const survivingNames: string[] = [];
    for (const f of files) {
      if (!requested.has(f.frontmatter.name)) {
        survivingNames.push(f.frontmatter.name);
        continue;
      }
      if (f.frontmatter.type === "asset-pin") throw new BadRequestException(`'${f.frontmatter.name}' is an asset-pin anchor — anchors cannot be rewritten`);
      selected.push(f);
    }
    if (selected.length !== requested.size) {
      const found = new Set(selected.map((f) => f.frontmatter.name));
      throw new BadRequestException(`selected memories not found in user vault: ${selectedNames.filter((n) => !found.has(n)).join(", ")}`);
    }
    let llmEntries: RewriteEntry[];
    try {
      llmEntries = await this.rewriteLlm.rewrite(
        selected.map((f) => ({ name: f.frontmatter.name, description: f.frontmatter.description, type: f.frontmatter.type, body: f.body })),
        survivingNames,
      );
    } catch (err) {
      if (err instanceof RewriteLlmError) throw new HttpException(err.message, HttpStatus.BAD_GATEWAY);
      throw err;
    }
    let plan: CompactionPlan;
    try {
      plan = buildRewritePlan({
        scope: "user",
        dir,
        selectedNames,
        survivingNames,
        llmEntries,
        current: { count: files.length, bytes: files.reduce((sum, f) => sum + Buffer.byteLength(f.body, "utf8"), 0) },
      });
    } catch (err) {
      throw new HttpException(`LLM output failed plan validation: ${(err as Error).message}`, HttpStatus.BAD_GATEWAY);
    }
    const llmModel = this.rewriteLlm.model;
    const { proposalId, expiresAt } = this.proposals.put(plan, llmModel);
    this.log.log(`rewritePreview ok proposalId=${proposalId} inputs=${selected.length} outputs=${llmEntries.length}`);
    return { proposalId, expiresAt, plan, llmModel };
  }

  /**
   * 合并改写第二步：按缓存的计划执行。找不到（过期或已执行）回 410：界面该重新生成预览，而不是拿同一个 id 重试。
   * 执行失败时计划留在缓存里，修好问题（比如磁盘满）可以原样再试。
   */
  async rewriteExecute(proposalId: string) {
    const cached = this.proposals.get(proposalId);
    if (!cached) throw new GoneException(`proposal ${proposalId} not found or expired — regenerate the preview`);
    const summary = await this.wrap(() => applyRewrite(this.dirs(), cached.plan, this.cfgSvc.get()));
    this.bus.emit("memory:changed", {
      type: "memory_changed",
      scope: "user",
      name: "*",
      action: "compaction",
      compaction: { deleted: summary.deleted, merged: summary.merged, freedBytes: summary.freedBytes, snapshotId: summary.snapshotId },
    });
    this.proposals.delete(proposalId);
    this.log.log(`rewriteExecute ok proposalId=${proposalId} deleted=${summary.deleted} merged=${summary.merged}`);
    return summary;
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof MemoryError) throw this.memory.translate(err);
      throw err;
    }
  }
}
