import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { currentSessionId, currentToolUseId } from "../context.js";
import { knowledgeDir as resolveKnowledgeDir, workflowsDir as resolveWorkflowsDir } from "../env.js";
import { structuredReply } from "../replies.js";
import { AnalyzeMediaResponseSchema } from "../schemas.js";
import type { RegisterTools } from "./types.js";

/**
 * 编排辅助：search_knowledge（查 knowledge / workflows 卡片）、select_image_recipe
 * （判断直出图要不要加载配方卡）、report_outcome（结构化结果只写 stderr 供日志聚合）。
 */

export const KNOWLEDGE_DIR_TOKEN = "<knowledgeDir>";
export const WORKFLOWS_DIR_TOKEN = "<workflowsDir>";

/** 这几个工具的错误文本不带 `Error:` 前缀，和它们的结构化回话风格一致。 */
function plainError(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

// ── search_knowledge ──

const KNOWLEDGE_CATEGORIES = ["vendors", "failures", "workflows", "image-recipes", "all"] as const;
type KnowledgeCategory = Exclude<(typeof KNOWLEDGE_CATEGORIES)[number], "all">;
const SEARCHABLE_CATEGORIES = KNOWLEDGE_CATEGORIES.filter((c): c is KnowledgeCategory => c !== "all");

interface SearchScope {
  category: KnowledgeCategory;
  rootDir: string;
  searchDir: string;
}

interface KnowledgeHit {
  path: string;
  score: number;
  excerpt: string;
  lines_total: number;
}

/** 递归收集 .md；`.` / `_` 开头的是草稿或私有目录，跳过。 */
function walkMarkdown(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (/^[._]/.test(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(abs);
      else if (ent.isFile() && ent.name.endsWith(".md")) out.push(abs);
    }
  }
  return out;
}

/** 分数 = 各词出现次数之和；记下第一个命中词所在行做摘录。 */
function scoreBody(body: string, terms: string[]): { score: number; firstHitLine: number } {
  const lower = body.toLowerCase();
  let score = 0;
  let firstHitLine = -1;
  for (const t of terms) {
    if (!t) continue;
    const n = lower.split(t).length - 1;
    score += n;
    if (n > 0 && firstHitLine < 0) firstHitLine = body.slice(0, lower.indexOf(t)).split("\n").length - 1;
  }
  return { score, firstHitLine };
}

function excerptAround(lines: string[], hitLine: number): string {
  if (hitLine < 0) return lines.slice(0, 3).join("\n");
  return lines.slice(Math.max(0, hitLine - 1), Math.min(lines.length, hitLine + 2)).join("\n");
}

function buildScopes(categories: KnowledgeCategory[], kDir: string | null, wDir: string | null): SearchScope[] | string {
  const scopes: SearchScope[] = [];
  for (const category of categories) {
    if (category === "workflows") {
      if (!wDir) return "Requested workflows resource root is unavailable.";
      scopes.push({ category, rootDir: wDir, searchDir: wDir });
    } else {
      if (!kDir) return "Requested knowledge resource root is unavailable.";
      scopes.push({ category, rootDir: kDir, searchDir: path.join(kDir, category) });
    }
  }
  return scopes;
}

/** 回逻辑路径而不是绝对路径：profile 根因机器而异，`read` 会把令牌解析回真实目录。 */
function logicalPath(scope: SearchScope, abs: string): string {
  const token = scope.category !== "workflows" ? KNOWLEDGE_DIR_TOKEN : WORKFLOWS_DIR_TOKEN;
  return `${token}/${path.relative(scope.rootDir, abs).split(path.sep).join("/")}`;
}

function readSafe(abs: string): string | undefined {
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return undefined;
  }
}

// ── select_image_recipe ──

const RECIPE_MODALITIES = ["image", "video", "audio", "postprocess", "unknown"] as const;
const IMAGE_RECIPE_IDS = new Set(["poster"]);

const ClassifierResultSchema = z.object({
  selected: z.boolean(),
  recipe_id: z.string().nullable(),
  confidence: z.number().min(0).max(1).catch(0),
});

function extractJsonObject(text: string): unknown {
  const t = text.trim();
  if (!t) throw new Error("empty classifier output");
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("classifier output did not contain JSON");
    return JSON.parse(m[0]);
  }
}

/** 模型回的 recipe_id 不在已知集合里就当没选中，防止拼出不存在的卡片路径。 */
export function parseClassifierResult(text: string): z.infer<typeof ClassifierResultSchema> {
  const parsed = ClassifierResultSchema.parse(extractJsonObject(text));
  if (!parsed.selected) return { ...parsed, recipe_id: null };
  if (!parsed.recipe_id || !IMAGE_RECIPE_IDS.has(parsed.recipe_id)) return { selected: false, recipe_id: null, confidence: 0 };
  return parsed;
}

function classifierPrompt(userRequest: string): string {
  return [
    "You classify whether an image generation request should load one optional direct-image recipe card.",
    "",
    "Decision boundary:",
    "- Return selected=true only when the request is an image-only generation/editing task and a recipe materially improves prompt compilation.",
    "- Return selected=false for video, drama, MV, audio, multi-stage asset planning, or when no listed recipe applies.",
    "- A recipe is never a workflow and must not imply planner/executor routing.",
    "",
    "Available recipe cards:",
    "- poster: single standalone poster, key visual, campaign graphic, product launch graphic, event graphic, film/series poster, or marketing image where designed text/layout/typography hierarchy is part of the output.",
    "",
    "Return strict JSON only, with this exact shape:",
    '{"selected":boolean,"recipe_id":"poster"|null,"confidence":number}',
    "",
    "User request:",
    userRequest,
  ].join("\n");
}

// ── report_outcome ──

const OutcomeItemSchema = z.object({
  phase: z
    .enum(["triage", "plan", "execute", "deliver"])
    .describe("Which orchestrator stage emitted this. `execute` is per-asset; `deliver` is per-batch."),
  outcome: z
    .enum(["success", "failed", "partial"])
    .describe("Coarse verdict. `partial` only for batches where some assets passed and others failed."),
  asset_id: z.string().optional().describe("Planner-assigned id (e.g. `asset-1`). Required for `execute` phase."),
  modality: z
    .enum(["image", "video", "audio.tts", "audio.music", "postprocess"])
    .optional()
    .describe("Modality of the asset, if applicable."),
  vendor: z.string().optional().describe("Picked vendor (e.g. `seedance`). Required for `execute` phase outcomes."),
  error_class: z
    .enum([
      "tool_unavailable",
      "model_unavailable",
      "refs_missing",
      "constraint_conflict",
      "vendor_error",
      "medium_drift_detected",
      "user_blocked",
      "unknown",
    ])
    .optional()
    .describe("Matches the executor failure signals in `executor.md`. Required when outcome=failed."),
  details: z.string().max(500).optional().describe('One-line specifics, e.g. "veo3 returned 429 rate-limit".'),
  retries: z.number().int().min(0).max(10).optional().describe("Retry index for this asset."),
});
type OutcomeItem = z.infer<typeof OutcomeItemSchema>;

function validateOutcome(item: OutcomeItem, index: number): string | undefined {
  if (item.outcome === "failed" && !item.error_class) return `outcomes[${index}].error_class is required when outcome=failed.`;
  if (item.phase === "execute" && !item.asset_id) return `outcomes[${index}].asset_id is required for phase=execute.`;
  if (item.phase === "execute" && item.outcome === "success" && !item.vendor) {
    return `outcomes[${index}].vendor is required for successful execute outcomes.`;
  }
  return undefined;
}

function outcomeError(errors: { index: number; message: string }[]): CallToolResult {
  return {
    isError: true,
    structuredContent: { ok: false, logged_at: null, count: 0, errors },
    content: [{ type: "text", text: errors.map((e) => e.message).join(" ") }],
  };
}

export const registerMetaTools: RegisterTools = (registrar, gateway) => {
  registrar.registerTool(
    "search_knowledge",
    {
      description: "Search versioned knowledge and workflow markdown resources by recall terms + category.\n" +
        "\n" +
        "Use this when:\n" +
        "  - executor knows the vendor it picked but needs the right card path (pass `category: \"vendors\", topic: \"<vendor>\"`)\n" +
        "  - executor detects a semantic risk (pass `category: \"failures\", query: \"character refs\"`)\n" +
        "  - planner is looking for a workflow that matches the project type (pass `category: \"workflows\", query: \"narrative video\"`)\n" +
        "\n" +
        "Returns ranked logical file paths + short excerpts. " +
        "Paths start with `<knowledgeDir>` or `<workflowsDir>` and can be passed directly to `hub_read`; that tool resolves the active profile root.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Space-separated recall terms. Case-insensitive substring match against file bodies. Ignored when `topic` is supplied."),
        topic: z
          .string()
          .optional()
          .describe('Exact card name without `.md` (e.g. "seedance", "character-refs"). Returns the file directly if it exists under the category.'),
        category: z
          .enum(KNOWLEDGE_CATEGORIES)
          .optional()
          .describe('Restrict search to one of vendors / failures / workflows. Omit or "all" to search the whole knowledge corpus.'),
        limit: z.number().int().min(1).max(20).optional().describe("Cap on returned hits. Default 5."),
      },
      outputSchema: {
        ok: z.boolean(),
        knowledge_dir: z.string().nullable(),
        results: z.array(z.any()),
        error: z.string().optional(),
      },
    },
    async (args) => {
      const limit = args.limit ?? 5;
      const category = args.category ?? "all";
      const categories: KnowledgeCategory[] =
        category === "all" ? [...SEARCHABLE_CATEGORIES] : [category];
      const scopes = buildScopes(categories, resolveKnowledgeDir(), resolveWorkflowsDir());
      if (typeof scopes === "string") return plainError(scopes);

      if (args.topic) {
        const topic = args.topic.replace(/\.md$/i, "");
        const hits: KnowledgeHit[] = [];
        for (const scope of scopes) {
          // workflow 是目录，卡片是其中的 workflow.md
          const abs =
            scope.category === "workflows"
              ? path.join(scope.rootDir, topic, "workflow.md")
              : path.join(scope.searchDir, `${topic}.md`);
          if (!existsSync(abs)) continue;
          const body = readSafe(abs);
          if (body === undefined) continue;
          const lines = body.split("\n");
          hits.push({ path: logicalPath(scope, abs), score: 100, excerpt: lines.slice(0, 5).join("\n"), lines_total: lines.length });
        }
        return structuredReply({ ok: true, knowledge_dir: KNOWLEDGE_DIR_TOKEN, results: hits.slice(0, limit) });
      }

      if (!args.query || !args.query.trim()) return plainError("Either `query` or `topic` is required.");
      const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean);
      const hits: KnowledgeHit[] = [];
      for (const scope of scopes) {
        if (!existsSync(scope.searchDir)) continue;
        for (const abs of walkMarkdown(scope.searchDir)) {
          const body = readSafe(abs);
          if (body === undefined) continue;
          const { score, firstHitLine } = scoreBody(body, terms);
          if (score <= 0) continue;
          const lines = body.split("\n");
          hits.push({ path: logicalPath(scope, abs), score, excerpt: excerptAround(lines, firstHitLine), lines_total: lines.length });
        }
      }
      hits.sort((a, b) => b.score - a.score);
      return structuredReply({ ok: true, knowledge_dir: KNOWLEDGE_DIR_TOKEN, results: hits.slice(0, limit) });
    },
  );

  registrar.registerTool(
    "select_image_recipe",
    {
      description: "Select one optional direct-image recipe card for specialty prompt compilation.\n" +
        "\n" +
        "Use this only on the Simple Direct Path for image-only generation or image editing.\n" +
        "A selected recipe is not a workflow, not a planner dependency, and not a Stage Execution Plan.\n" +
        "Caller should `hub_read` the returned recipe_path, compile a better direct prompt, then call hub_generate_image.\n" +
        "Returns selected=false when no specialty recipe applies.",
      inputSchema: {
        user_request: z.string().min(1).describe("The current user request or concise image-task summary."),
        modality: z
          .enum(RECIPE_MODALITIES)
          .optional()
          .describe("Task modality if already known. Defaults to unknown; non-image values return selected=false."),
      },
      outputSchema: {
        ok: z.boolean(),
        selected: z.boolean(),
        recipe_id: z.string().nullable(),
        recipe_path: z.string().nullable(),
        recipe_ref: z.string().nullable(),
        confidence: z.number(),
      },
    },
    async (args) => {
      const none = () =>
        structuredReply({ ok: true, selected: false, recipe_id: null, recipe_path: null, recipe_ref: null, confidence: 0 });
      const modality = args.modality ?? "unknown";
      if (modality !== "image" && modality !== "unknown") return none();
      const kDir = resolveKnowledgeDir();
      if (!kDir) {
        return plainError("Knowledge directory not found. Expected HILO_KNOWLEDGE_DIR or the active profile knowledge directory.");
      }
      // 分类只是锦上添花：模型调用失败、输出不合法都退回“不选”，不挡住出图
      let classified: z.infer<typeof ClassifierResultSchema>;
      try {
        const resp = await gateway.post(
          "/api/edit/generate-text-messages",
          { max_tokens: 128, prompt: classifierPrompt(args.user_request.trim()) },
          120_000,
          AnalyzeMediaResponseSchema,
        );
        if (!resp.ok) return none();
        classified = parseClassifierResult(resp.text ?? "");
      } catch {
        return none();
      }
      if (!classified.selected || !classified.recipe_id) return none();
      const recipeId = classified.recipe_id;
      const recipePath = path.join(kDir, "image-recipes", `${recipeId}.md`);
      const exists = existsSync(recipePath);
      return structuredReply({
        ok: true,
        selected: exists,
        recipe_id: exists ? recipeId : null,
        recipe_path: exists ? recipePath : null,
        recipe_ref: exists ? `${KNOWLEDGE_DIR_TOKEN}/image-recipes/${recipeId}.md` : null,
        confidence: exists ? classified.confidence : 0,
      });
    },
  );

  registrar.registerTool(
    "report_outcome",
    {
      description: "Emit structured outcome records for one or more pipeline phase results.\n" +
        "\n" +
        "Called by:\n" +
        "  - orchestrator at end of triage, planning, or deliver readiness\n" +
        "  - executor on every dispatch outcome (success or `failed: true` + signal)\n" +
        "\n" +
        "Pass outcomes[]; use a single-element array for one outcome. " +
        "Output is logged to stderr as one `[hub-outcome] {json}` line per item so opencode-trace and downstream log harvesters can aggregate per-session succe" +
        "ss classes. Returns ack only — does not affect generation.",
      inputSchema: {
        outcomes: z
          .array(OutcomeItemSchema)
          .min(1)
          .max(100)
          .describe("Batch of outcome records. Single outcome calls must still use outcomes[]."),
      },
      outputSchema: {
        ok: z.boolean(),
        logged_at: z.string().nullable(),
        count: z.number(),
        errors: z.array(z.object({ index: z.number(), message: z.string() })).optional(),
      },
    },
    async (args) => {
      if (!args.outcomes || args.outcomes.length === 0) return outcomeError([{ index: 0, message: "outcomes[] is required." }]);
      const errors = args.outcomes.flatMap((item, index) => {
        const message = validateOutcome(item, index);
        return message ? [{ index, message }] : [];
      });
      if (errors.length > 0) return outcomeError(errors);
      const loggedAt = new Date().toISOString();
      for (const item of args.outcomes) {
        const record = {
          ts: loggedAt,
          session_id: currentSessionId() ?? null,
          tool_use_id: currentToolUseId() ?? null,
          phase: item.phase,
          outcome: item.outcome,
          asset_id: item.asset_id ?? null,
          modality: item.modality ?? null,
          vendor: item.vendor ?? null,
          error_class: item.error_class ?? null,
          details: item.details ?? null,
          retries: item.retries ?? null,
        };
        process.stderr.write(`[hub-outcome] ${JSON.stringify(record)}\n`);
      }
      return structuredReply({ ok: true, logged_at: loggedAt, count: args.outcomes.length });
    },
  );
};
