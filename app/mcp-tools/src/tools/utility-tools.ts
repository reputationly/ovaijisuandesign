import { createHash } from "node:crypto";
import path from "node:path";

import { z } from "zod";

import { currentSessionId } from "../context.js";
import { probeOneMedia } from "../ffprobe.js";
import type { GatewayClient } from "../gateway-client.js";
import { errorReply, structuredReply } from "../replies.js";
import { AnalyzeMediaResponseSchema } from "../schemas.js";
import { isMediaFile, markFileRead, readTextOrDirectory, type DocumentPage } from "./file-io.js";
import type { RegisterTools } from "./types.js";

/**
 * `read`（本地文本 / 目录 / 文档）与 `analyse_media`（ffprobe 元数据 + 多模态语义分析）。
 */

// ── gateway 调用 ──

const DocumentReadResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    lines: z.array(z.string()),
    offset: z.number().int().positive(),
    totalLines: z.number().int().nonnegative(),
    more: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["unsupported", "too-large", "parse-error", "not-found", "invalid-offset"]),
    message: z.string().optional(),
  }),
]);

function readDocument(gw: GatewayClient, file: string, offset: number, limit: number): Promise<DocumentPage> {
  const q = `path=${encodeURIComponent(file)}&offset=${offset}&limit=${limit}`;
  return gw.get(`/api/internal/document/read?${q}`, 30_000, DocumentReadResponseSchema);
}

const AttachmentLookupSchema = z.object({
  found: z.boolean(),
  entityId: z.string().optional(),
  attachmentId: z.string().optional(),
  user_desc: z.string().optional(),
  prompt: z.string().optional(),
});

// ── 语义分析缓存（写在资产 metadata 里，按问题归一化后的哈希分条） ──

const CACHE_VERSION = "semantic-v3";
const CACHE_FIELD = "read_media_cache";
const CACHE_MAX_ENTRIES = 12;

type Rec = Record<string, unknown>;
const asRecord = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const normalizeQuestion = (q: string) => q.trim().replace(/\s+/g, " ");

export function cacheKey(question: string): string {
  return createHash("sha256").update(`${CACHE_VERSION}\n${normalizeQuestion(question)}`).digest("hex").slice(0, 16);
}

function cachedText(asset: Rec | undefined, question: string): string | null {
  const cache = asRecord(asRecord(asset?.metadata)?.[CACHE_FIELD]);
  if (cache?.version !== CACHE_VERSION) return null;
  const entry = asRecord(asRecord(cache.entries)?.[cacheKey(question)]);
  if (entry?.version !== CACHE_VERSION) return null;
  return typeof entry.text === "string" && entry.text.length > 0 ? entry.text : null;
}

/** 合并新条目，按更新时间保留最近 12 条 —— metadata 只做浅合并，必须整块回写。 */
function cachePatch(asset: Rec | undefined, question: string, text: string): Rec {
  const existing = asRecord(asRecord(asset?.metadata)?.[CACHE_FIELD]);
  const entries: Record<string, Rec> = {};
  if (existing?.version === CACHE_VERSION) {
    for (const [k, v] of Object.entries(asRecord(existing.entries) ?? {})) {
      const e = asRecord(v);
      if (e && e.version === CACHE_VERSION && typeof e.text === "string" && e.text.length > 0) entries[k] = e;
    }
  }
  entries[cacheKey(question)] = {
    version: CACHE_VERSION,
    question: normalizeQuestion(question),
    text,
    updated_at: new Date().toISOString(),
  };
  const trimmed = Object.fromEntries(
    Object.entries(entries)
      .sort(([, a], [, b]) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
      .slice(0, CACHE_MAX_ENTRIES),
  );
  return { [CACHE_FIELD]: { version: CACHE_VERSION, entries: trimmed } };
}

/** 发给多模态模型的问题：批量时声明“第几个 / 共几个”，免得模型以为用户只给了一个文件。 */
function itemQuestion(question: string, index: number, total: number): string {
  const batch =
    total > 1
      ? [
          `You are analyzing item ${index + 1} of ${total} in a multi-file hub_analyse_media semantic batch.`,
          `The user supplied ${total} files.`,
          "Do not state or imply that the user only provided one image/file. Do not ask for the other files.",
          "Answer only for the current file. If the original request asks for comparison, extract comparable semantic facts for this item; the caller will synthesize the cross-file comparison.",
        ]
      : [];
  return [
    ...batch,
    "",
    "You are hub_analyse_media in semantic mode, a semantic media observer.",
    "Your job is to describe non-text, non-color meaning-bearing media content and portable design signals: what is depicted, what it is doing, how it is staged, and what broad style or medium it expresses.",
    'Do not answer measured or instrument-derived facts. If the requested fact depends on measurement, metadata, or canvas/project state rather than semantic observation, state that this tool cannot determine it and name hub_analyse_media type="metadata" or canvas metadata instead. Do not guess from visual priors.',
    "Separate direct observations from interpretation. Avoid turning capture/substrate observations into intent.",
    "Separate content-plane signals from carrier-plane remnants. Content-plane signals belong to the depicted subject, scene, action, composition, medium, style, or portable design traits. Carrier-plane remnants are capture/container structure such as UI/document/table frames, overlays, masks, and scan substrate. Describe present evidence using concrete visible traits, not abstract labels.",
    "",
    `User semantic focus: ${question}`,
    "",
  ].join("\n");
}

interface EntityInfo {
  entityRef: { entityId: string; attachmentId: string };
  user_desc?: string;
  prompt?: string;
}

export const registerUtilityTools: RegisterTools = (registrar, gateway) => {
  /** 资产库索引：先按完整路径，退回按文件名匹配（agent 给的路径可能是绝对的或相对的）。 */
  async function loadAssetIndex() {
    let assets: Rec[];
    try {
      assets = await gateway.listAssets({ includeMetadata: true });
    } catch (err) {
      process.stderr.write(
        `[hilo-tools] analyse_media: vault unreachable, caching disabled: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return null;
    }
    const byPath = new Map<string, Rec>();
    const byBase = new Map<string, Rec>();
    for (const a of assets) {
      const p = typeof a.path === "string" ? a.path : "";
      if (!p) continue;
      byPath.set(p, a);
      const b = path.basename(p);
      if (!byBase.has(b)) byBase.set(b, a);
    }
    return { byPath, byBase };
  }

  /** 物化进工作区的主体库附件带有用户描述 / 原始提示词；查不到或接口不可用都当普通文件。 */
  async function entityMeta(file: string): Promise<EntityInfo | null> {
    try {
      const r = await gateway.get(
        `/api/asset-center/lookup-attachment?path=${encodeURIComponent(file)}`,
        5_000,
        AttachmentLookupSchema,
      );
      if (!r.found || !r.entityId || !r.attachmentId) return null;
      return {
        entityRef: { entityId: r.entityId, attachmentId: r.attachmentId },
        ...(r.user_desc !== undefined ? { user_desc: r.user_desc } : {}),
        ...(r.prompt !== undefined ? { prompt: r.prompt } : {}),
      };
    } catch {
      return null;
    }
  }

  async function analyzeSemantic(paths: string[], question: string, force: boolean): Promise<Rec[]> {
    const sessionId = currentSessionId();
    const total = paths.length;
    const index = await loadAssetIndex();
    return Promise.all(
      paths.map(async (p, i) => {
        const analysisQuestion = itemQuestion(question, i, total);
        const asset = index ? (index.byPath.get(p) ?? index.byBase.get(path.basename(p))) : undefined;
        const entity = await entityMeta(p);
        const result = (source: "assets" | "analyzed" | "error", text: string): Rec => ({
          file_path: p,
          ...(total > 1 ? { index: i + 1, total, analysis_question: analysisQuestion } : {}),
          source,
          text,
          ...(entity
            ? {
                entity_ref: entity.entityRef,
                ...(entity.user_desc !== undefined ? { entity_user_desc: entity.user_desc } : {}),
                ...(entity.prompt !== undefined ? { entity_prompt: entity.prompt } : {}),
              }
            : {}),
        });

        if (!force) {
          const hit = cachedText(asset, question);
          if (hit) {
            markFileRead(sessionId, p);
            return result("assets", hit);
          }
        }
        const r = await gateway.post(
          "/api/edit/analyze-media",
          { file_path: p, question: analysisQuestion },
          210_000,
          AnalyzeMediaResponseSchema,
        );
        if (!r.ok) return result("error", r.error ?? "unknown");
        const text = r.text ?? "";
        const assetId = typeof asset?.id === "string" ? asset.id : null;
        // 回写都是尽力而为：写失败不影响本次分析结果
        await Promise.all([
          assetId && text
            ? gateway
                .patch(
                  `/api/assets/${encodeURIComponent(assetId)}/metadata`,
                  { patch: cachePatch(asset, question, text) },
                  10_000,
                  z.object({ ok: z.literal(true), metadata: z.record(z.unknown()) }),
                )
                .catch((err: unknown) =>
                  process.stderr.write(
                    `[hilo-tools] analyse_media: failed to write back cache for ${assetId}: ${err instanceof Error ? err.message : String(err)}\n`,
                  ),
                )
            : undefined,
          entity && entity.prompt === undefined && text.trim()
            ? gateway
                .patch(
                  `/api/asset-center/attachments/${encodeURIComponent(entity.entityRef.attachmentId)}/prompt`,
                  { prompt: text },
                  5_000,
                  z.object({}).passthrough(),
                )
                .catch((err: unknown) =>
                  process.stderr.write(
                    `[hilo-tools] analyse_media: writeback prompt failed for attachment ${entity.entityRef.attachmentId}: ${err instanceof Error ? err.message : String(err)}\n`,
                  ),
                )
            : undefined,
        ]);
        markFileRead(sessionId, p);
        return result("analyzed", text);
      }),
    );
  }

  registrar.registerTool(
    "read",
    {
      description:
        "Read a text/code/JSON/DOCX/PDF file from disk. Returns numbered lines with offset/limit pagination; unsupported binary files are rejected. " +
        "Single file only — text reading is one-file-at-a-time.\n" +
        "For image/video/audio understanding use `hub_analyse_media`. " +
        "For canvas-attached media (model / prompt / dimensions / user-arranged edges), prefer canvas_get_node — it returns metadata directly from the SQLite v" +
        "ault without invoking multimodal analysis.",
      inputSchema: {
        file_path: z
          .string()
          .describe(
            "Single file path (text/code/JSON/DOCX/PDF). Absolute path strongly recommended; relative paths are resolved against the MCP server cwd (typically the project root) and may be ambiguous when the agent operates across workspaces.",
          ),
        offset: z.number().int().nonnegative().optional().describe("1-indexed line number to start reading from (default 1)"),
        limit: z.number().int().positive().optional().describe("Max lines to read (default 2000)"),
      },
    },
    async (args) => {
      const file = args.file_path?.trim();
      if (!file) return errorReply("file_path is required");
      if (isMediaFile(file)) {
        return errorReply(
          `${file} is a media file. Use hub_analyse_media with type="semantic" or type="both" for image/video/audio analysis.`,
        );
      }
      return readTextOrDirectory(file, args.offset, args.limit, currentSessionId(), (p, offset, limit) =>
        readDocument(gateway, p, offset, limit),
      );
    },
  );

  const MediaProbeResultSchema = z.object({
    tool: z.literal("hub_analyse_media").optional(),
    file_path: z.string(),
    ok: z.boolean(),
    media_type: z.enum(["image", "video", "audio", "unknown"]).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration_sec: z.number().optional(),
    aspect_ratio: z.string().optional(),
    exact_aspect_ratio: z.string().optional(),
    orientation: z.enum(["landscape", "portrait", "square"]).optional(),
    error: z.string().optional(),
  });

  registrar.registerTool(
    "analyse_media",
    {
      description:
        "Unified local media understanding. Choose `type` by evidence need: `metadata` returns deterministic file facts (width, height, duration, aspect ratio," +
        " orientation, media_type) without multimodal inference; `semantic` returns question-scoped multimodal observations (subjects, actions, scene/world, br" +
        "oad medium/style, composition, and portable design signals); `both` returns both in one call. " +
        "Use this before generation when source/reference media should determine framing or when user intent depends on visual/audio semantics. " +
        "Do not promote semantic prose into measured facts. " +
        "For reference-based generation, semantic mode must not textify colors, palette, background tone, paper/substrate hue, complexion, hair/clothing color," +
        " or color adjectives; pass refs so the generation model sees color directly.",
      inputSchema: {
        file_path: z
          .string()
          .optional()
          .describe("Single media file path. Absolute path strongly recommended; relative paths are resolved against the MCP server cwd and may be ambiguous across workspaces."),
        file_paths: z.array(z.string()).optional().describe("Multiple media file paths for per-file analysis."),
        type: z
          .enum(["semantic", "metadata", "both"])
          .describe("Which evidence class to return: semantic multimodal observations, deterministic metadata, or both."),
        question: z
          .string()
          .optional()
          .describe("Required when type is semantic or both. State what semantic facts to extract from each media file."),
        force: z
          .boolean()
          .default(false)
          .describe("For semantic analysis only: re-analyze even if a question-scoped cache entry exists."),
      },
      outputSchema: {
        type: z.enum(["semantic", "metadata", "both"]),
        batch_mode: z.literal("per_file").optional(),
        batch_question: z.string().optional(),
        results: z.array(
          z.object({
            file_path: z.string(),
            metadata: MediaProbeResultSchema.optional(),
            semantic: z
              .object({
                file_path: z.string(),
                source: z.enum(["assets", "analyzed", "error"]),
                text: z.string(),
                index: z.number().optional(),
                total: z.number().optional(),
                analysis_question: z.string().optional(),
                entity_ref: z.object({ entityId: z.string(), attachmentId: z.string() }).optional(),
                entity_user_desc: z.string().optional(),
                entity_prompt: z.string().optional(),
              })
              .optional(),
          }),
        ),
      },
    },
    async (args) => {
      const type = args.type;
      const paths = [
        ...new Set([...(args.file_paths ?? []), ...(args.file_path ? [args.file_path] : [])].map((p) => p.trim()).filter(Boolean)),
      ];
      if (paths.length === 0) return errorReply("provide file_path or file_paths.");
      const nonMedia = paths.filter((p) => !isMediaFile(p));
      if (nonMedia.length > 0) {
        return errorReply(
          `hub_analyse_media only accepts media files. Non-media: ${nonMedia.join(", ")}. Use hub_read for text/code files.`,
        );
      }
      const withMetadata = type === "metadata" || type === "both";
      const withSemantic = type === "semantic" || type === "both";
      const question = typeof args.question === "string" ? args.question.trim() : "";
      if (withSemantic && !question) return errorReply('question is required when type is "semantic" or "both".');

      const [metadata, semantic] = await Promise.all([
        withMetadata ? Promise.all(paths.map((p) => probeOneMedia(p))) : Promise.resolve([]),
        withSemantic ? analyzeSemantic(paths, question, Boolean(args.force)) : Promise.resolve([]),
      ]);
      const results = paths.map((p, i) => ({
        file_path: p,
        ...(withMetadata && metadata[i] ? { metadata: { tool: "hub_analyse_media", ...metadata[i] } } : {}),
        ...(withSemantic && semantic[i] ? { semantic: semantic[i] } : {}),
      }));
      return structuredReply({
        type,
        ...(withSemantic && paths.length > 1 ? { batch_mode: "per_file", batch_question: question } : {}),
        results,
      });
    },
  );
};
