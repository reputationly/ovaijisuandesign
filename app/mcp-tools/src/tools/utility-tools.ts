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
          `Batch context: you are looking at file ${index + 1}; the user handed over ${total} files, each examined separately.`,
          "Do not suggest the user sent a single file, and do not request the remaining ones.",
          "Talk about the current file alone. When the user wants files compared, report the facts about this file that a comparison would need; merging happens later.",
        ]
      : [];
  return [
    ...batch,
    "",
    "You explain what a piece of media means, for a creative assistant.",
    "Cover the subjects and objects, what they are doing, the setting, how the shot or scene is arranged, and the general medium or artistic style; leave out written text and colors.",
    'Numbers that come from measuring the file (resolution, length, frame counts) or from the canvas/project are outside your remit: if asked, reply that they need analyse_media with type="metadata" or the canvas data, and never estimate them by eye.',
    "Label what you can see separately from what you infer, and do not treat camera or scanning artifacts as deliberate choices.",
    "Distinguish the picture itself from whatever surrounds it (app chrome, page or table borders, overlays, masks, scanned paper), and describe concrete visible details instead of vague category words.",
    "",
    `What the user wants to know: ${question}`,
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
        `[hilo-tools] analyse_media: asset list unavailable, skipping cache: ${err instanceof Error ? err.message : String(err)}\n`,
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
        "Open a single local file (plain text, source code, JSON, Word .docx or PDF) or list a folder. Output is line-numbered and paged via offset/limit; archives and other binaries are refused.\n" +
        "Images, video and audio are not handled here: use `hub_analyse_media`. If the media sits on the canvas, canvas_get_node already gives its model, prompt, size and connections from the asset store, with no model call. " +
        "Logical paths starting with `<knowledgeDir>` or `<workflowsDir>` (as returned by search_knowledge) are accepted.",
      inputSchema: {
        file_path: z
          .string()
          .describe(
            "Where the file lives. Use an absolute path when you can: relative paths are taken from the server working directory (normally the project root), which may not be the workspace you mean.",
          ),
        offset: z.number().int().nonnegative().optional().describe("1-based line number to start from (default 1)."),
        limit: z.number().int().positive().optional().describe("Maximum number of lines to return (default 2000)."),
      },
    },
    async (args) => {
      const file = args.file_path?.trim();
      if (!file) return errorReply("file_path is empty");
      if (isMediaFile(file)) {
        return errorReply(
          `${file} looks like an image, video or audio file; inspect it with hub_analyse_media (type "semantic" or "both") instead.`,
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
        "Inspect local image, video or audio files. Choose `type` according to what you need to know. `metadata` probes the file itself and gives exact " +
        "numbers — pixel size, length, aspect ratio, orientation and media_type — with no AI involved. `semantic` sends each file with your question to a " +
        "multimodal model and returns its description: who or what appears, what happens, where, how it is framed, and the overall medium or style. " +
        "`both` gives you the two together. Call it before generating whenever an input file should drive the framing, or when the request hinges on " +
        "what a file depicts or sounds like. Model descriptions are observations, not measurements. When a file will be used as a generation reference, " +
        "leave its colors out of your prompt text (tones, backgrounds, skin, hair, clothing, color words) and hand over the file so the generator sees them.",
      inputSchema: {
        file_path: z
          .string()
          .optional()
          .describe("Path of one media file; absolute is safest since relative paths depend on the server working directory."),
        file_paths: z.array(z.string()).optional().describe("A list of media files; each gets its own result."),
        type: z
          .enum(["semantic", "metadata", "both"])
          .describe("semantic = model description, metadata = probed file facts, both = the two combined."),
        question: z
          .string()
          .optional()
          .describe("What the model should look for in each file; mandatory unless type is metadata."),
        force: z
          .boolean()
          .default(false)
          .describe("Ignore any stored answer to the same question and analyse again (semantic part only)."),
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
      if (paths.length === 0) return errorReply("no media given: set file_path or file_paths.");
      const nonMedia = paths.filter((p) => !isMediaFile(p));
      if (nonMedia.length > 0) {
        return errorReply(
          `these are not image/video/audio files: ${nonMedia.join(", ")}. Open text or code with hub_read instead.`,
        );
      }
      const withMetadata = type === "metadata" || type === "both";
      const withSemantic = type === "semantic" || type === "both";
      const question = typeof args.question === "string" ? args.question.trim() : "";
      if (withSemantic && !question) return errorReply('semantic analysis needs a question; add one or use type "metadata".');

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
