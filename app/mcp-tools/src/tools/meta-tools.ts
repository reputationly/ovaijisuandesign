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
      if (!wDir) return "No workflows directory is configured for this profile, so the workflows category cannot be searched.";
      scopes.push({ category, rootDir: wDir, searchDir: wDir });
    } else {
      if (!kDir) return "No knowledge directory is configured for this profile, so knowledge categories cannot be searched.";
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
  if (!t) throw new Error("classifier returned nothing");
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("classifier reply had no JSON object");
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
    "Task: judge whether a prompt-writing recipe card would help with the image request at the end.",
    "",
    "Say yes only if the request produces or edits still images alone and one of the cards below would noticeably improve the prompt.",
    "Say no for anything involving video, short drama, music videos, sound, or several production stages, and whenever none of the cards matches.",
    "Cards only shape the prompt text; choosing one says nothing about workflows or which agent handles the job.",
    "",
    "Card list:",
    "- poster — a single designed graphic such as a movie or series poster, key art, launch or event visual, or ad image, where typography and layout are part of what gets delivered.",
    "",
    "Reply with a bare JSON object using these keys and value types:",
    '{"selected":boolean,"recipe_id":"poster"|null,"confidence":number}',
    "",
    "Image request:",
    userRequest,
  ].join("\n");
}

// ── report_outcome ──

const OutcomeItemSchema = z.object({
  phase: z
    .enum(["triage", "plan", "execute", "deliver"])
    .describe("Pipeline step this record belongs to; `execute` records cover a single asset, `deliver` records a whole batch."),
  outcome: z
    .enum(["success", "failed", "partial"])
    .describe("Result of the step. Reserve `partial` for batches with a mix of passing and failing assets."),
  asset_id: z.string().optional().describe("Planner-given asset identifier such as `asset-1`; must be set for execute records."),
  modality: z
    .enum(["image", "video", "audio.tts", "audio.music", "postprocess"])
    .optional()
    .describe("Kind of asset involved, if any."),
  vendor: z.string().optional().describe("Vendor the executor dispatched to (for example `seedance`); must be set when an execute record succeeds."),
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
    .describe("Why it failed, named after the executor failure signals; must be set for failed records."),
  details: z.string().max(500).optional().describe('Brief free-text detail, for example "provider answered 429 too many requests".'),
  retries: z.number().int().min(0).max(10).optional().describe("Retry number this record reports for the asset (0 = first attempt)."),
});
type OutcomeItem = z.infer<typeof OutcomeItemSchema>;

function validateOutcome(item: OutcomeItem, index: number): string | undefined {
  if (item.outcome === "failed" && !item.error_class) return `outcomes[${index}]: failed records need an error_class.`;
  if (item.phase === "execute" && !item.asset_id) return `outcomes[${index}]: execute records need an asset_id.`;
  if (item.phase === "execute" && item.outcome === "success" && !item.vendor) {
    return `outcomes[${index}]: successful execute records need a vendor.`;
  }
  return undefined;
}

function outcomeError(errors: { index: number; message: string }[]): CallToolResult {
  return {
    isError: true,
    structuredContent: { ok: false, count: 0, logged_at: null, errors },
    content: [{ type: "text", text: errors.map((e) => e.message).join(" ") }],
  };
}

export const registerMetaTools: RegisterTools = (registrar, gateway) => {
  registrar.registerTool(
    "search_knowledge",
    {
      description: [
        "Look up markdown knowledge cards and workflow definitions, either by exact card name or by keywords, optionally within one category.",
        "",
        "Examples:",
        '  - fetch the card for a vendor you already picked: category "vendors" with topic set to that vendor',
        '  - check known pitfalls before a risky step: category "failures" with keywords such as "reference consistency"',
        '  - find a workflow that suits the project: category "workflows" with keywords describing the project',
        "",
        "Each hit carries a score, a few lines of excerpt and the line count. Hit paths begin with the placeholder `<knowledgeDir>` or `<workflowsDir>`; give them to `hub_read` as-is and it maps them to the real profile folder.",
      ].join("\n"),
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Keywords separated by spaces; each is counted as a case-insensitive substring in the card text. Not used when `topic` is given."),
        topic: z
          .string()
          .optional()
          .describe('File name of one card, extension optional (a vendor name, a pitfall slug, a workflow folder). If it exists in the searched categories it is returned directly.'),
        category: z
          .enum(KNOWLEDGE_CATEGORIES)
          .optional()
          .describe('Category to search: vendors, failures, workflows or image-recipes. Leave it out or use "all" to search every category.'),
        limit: z.number().int().min(1).max(20).optional().describe("How many hits to return at most (5 when omitted)."),
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

      if (!args.query || !args.query.trim()) return plainError("Provide keywords in `query` or a card name in `topic`.");
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
      description: [
        "Ask whether a specialised prompt-writing recipe applies to an image-only request, and get its card if so.",
        "",
        "Meant for the Simple Direct Path, i.e. one image being generated or edited without planning.",
        "Recipes only guide prompt writing: they are unrelated to workflows, the planner, or Stage Execution Plans.",
        "On a hit, open recipe_path with `hub_read`, use it to write the prompt, and then call hub_generate_image.",
        "If nothing applies the result has selected=false.",
      ].join("\n"),
      inputSchema: {
        user_request: z.string().min(1).describe("What the user is asking for now, verbatim or condensed to the image task."),
        modality: z
          .enum(RECIPE_MODALITIES)
          .optional()
          .describe("Modality of the task when you already know it (unknown if omitted). Anything other than image or unknown returns no recipe."),
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
        return plainError("Cannot locate the knowledge folder: set HILO_KNOWLEDGE_DIR or make sure the active profile ships one.");
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
      description: [
        "Log how pipeline steps turned out, as structured records.",
        "",
        "Who calls it:",
        "  - the orchestrator when triage, planning or delivery checks finish",
        "  - the executor after each dispatch, whether it succeeded or failed (give error_class on failure)",
        "",
        "Records go in the outcomes array, even when there is only one. Every record becomes a single `[hub-outcome] {json}` line on stderr, which log tooling collects to tally outcomes per session. The reply is just an acknowledgement and changes nothing about generation.",
      ].join("\n"),
      inputSchema: {
        outcomes: z
          .array(OutcomeItemSchema)
          .min(1)
          .max(100)
          .describe("List of outcome records; wrap even a single record in the array."),
      },
      outputSchema: {
        ok: z.boolean(),
        logged_at: z.string().nullable(),
        count: z.number(),
        errors: z.array(z.object({ index: z.number(), message: z.string() })).optional(),
      },
    },
    async (args) => {
      if (!args.outcomes || args.outcomes.length === 0) return outcomeError([{ index: 0, message: "outcomes must contain at least one record." }]);
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
