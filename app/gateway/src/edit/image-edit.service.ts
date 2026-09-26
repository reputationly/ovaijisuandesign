import { HttpException, Injectable, Logger } from "@nestjs/common";
import { image, type MediaConfig, video } from "@ov/maas-media";
import sharp from "sharp";

import { CanvasService } from "../canvas/canvas.service.js";
import { capabilityUnavailable } from "../common/capability.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { downloadMediaToDir } from "../generate/media-download.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { FfmpegService } from "./ffmpeg.service.js";
import type {
  EnhanceImageDto,
  EraseBananaDto,
  Hailuo03VideoSuperResolutionDto,
  MoveObjectBananaDto,
  NormalizedBBoxDto,
  OutpaintBananaDto,
  RedrawBananaDto,
} from "./image-edit.dto.js";
import { resolveInsideWorkspace, toWorkspaceRel } from "./paths.js";

export interface ImageEditResult {
  ok: true;
  path: string;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// 提示词：和画布工具栏的约定一一对应（高亮 = 要改的区域，红框 / 绿框 = 搬移的起点 / 终点）
// ---------------------------------------------------------------------------

export const PROMPT_REDRAW_TEMPLATE = `You are given ONE image: the picture
to edit. The region covered by the semi-transparent light-green highlight is
the region to repaint. The highlight is an editing instruction only — it is
NOT part of the scene.

Repaint the highlighted region as: {userPrompt}

Strictly follow these rules:
- Only modify the region covered by the green highlight. Every pixel outside
  it MUST stay identical to the original — same composition, proportions,
  framing, and subject identity. Do not recolor, re-render, sharpen, or
  denoise anything outside the highlight.
- No trace of the green highlight may remain in the output — no tint,
  outline, color residue, or artifact.
- Match the scene's perspective, scale, lighting direction, color
  temperature, shadows, grain, and depth of field in the repainted area.
- Blend the boundary of the edited region seamlessly — no visible seams,
  color shifts, sharpness jumps, or outlines.
- Preserve realistic physical interaction with the surrounding scene
  (cast shadows, reflections, occlusion, contact points).

Output: a single photorealistic, high-fidelity image consistent with the
original style, with no highlight visible.
`;

export const PROMPT_REDRAW_WITH_REF_TEMPLATE = `You are given TWO images, in order:
- Image 1 — REFERENCE: reference material ONLY. It provides subject,
  appearance, color, and texture cues for what to paint into the highlighted
  region. Do NOT copy its framing, proportions, or background, and do NOT
  alter any pixel outside the highlight to match it.
- The LAST image — TARGET: the picture to edit. The region covered by the
  semi-transparent light-green highlight is the region to repaint. The
  highlight is an editing instruction only — it is NOT part of the scene.

The output MUST be based on the TARGET (the last image). Repaint the
highlighted region as: {userPrompt}, taking visual cues from the REFERENCE
(Image 1) and blending them in using the TARGET's own lighting and style.

Strictly follow these rules:
- Only modify the region covered by the green highlight. Every pixel of the
  TARGET outside it MUST stay identical — same composition, proportions,
  framing, and subject identity. Do not recolor, re-render, sharpen, or
  denoise anything outside the highlight.
- No trace of the green highlight may remain in the output — no tint,
  outline, color residue, or artifact.
- Match the TARGET scene's perspective, scale, lighting direction, color
  temperature, shadows, grain, and depth of field in the repainted area.
- Blend the boundary of the edited region seamlessly — no visible seams,
  color shifts, sharpness jumps, or outlines.
- Preserve realistic physical interaction with the surrounding scene
  (cast shadows, reflections, occlusion, contact points).

Output: a single photorealistic, high-fidelity image consistent with the
TARGET's original style, with no highlight visible.
`;

/**
 * 擦除的要求：区域里的东西去掉，用周围环境补全，不添任何新东西。
 * 套进重绘模板的 `{userPrompt}` 位置 —— 擦除在这里就是"把高亮区域重绘成干净的背景"。
 */
export const ERASE_INSTRUCTION =
  "the clean background that naturally continues the surrounding scene. Completely remove every object, person, text or mark inside the highlight, leave no trace, outline or residue of it, and do NOT add any new objects, subjects, or elements";

export const PROMPT_OUTPAINT = `/* SYSTEM: UNIVERSAL OUTPAINTING ENGINE */
/* TASK: CONTEXT-AWARE EXTENSION ONLY */
[INSTRUCTION: Analyze the pixel data at the boundary of the unmasked area. Detect style, lighting, perspective, and texture automatically. Extend the scene logically into the masked area.]
Seamlessly extend the image, high coherence, invisible transition.
1. Geometry & Perspective: Auto-detect vanishing points. Extend existing lines (walls, floors, horizons, structures) naturally into the empty space. Maintain the exact scale and proportion of the source image.
2. Texture Matching: Clone and generate adjacent textures. If the edge is concrete, extend concrete. If sky, extend sky. Match the ISO noise and film grain of the source.
3. Lighting Consistency: Calculate the light source direction and temperature from the original image. Apply consistent shadows and highlights to the new area.
4. Style Preservation: Strictly adhere to the aesthetic of the input image (whether photorealistic, anime, or artistic). Do not introduce new art styles.
/* QUALITY BOOSTERS */
Masterpiece, 8k resolution, highest fidelity, raw photo, seamless blending, perfect composition, sharp focus, hyper-detailed.
--no borders, no frames, no vignettes, no color shift, no distortion, no text, no watermarks, no altering source pixels.`;

export const PROMPT_MOVE_OBJECT = `You are given TWO images:
Image 1: A scene with two UI overlay rectangles.
 - RED RECTANGLE: Source area containing the object to be moved.
 - GREEN RECTANGLE: Target area where the object should be placed.
Image 2: A clean version of Image 1 without any UI overlays.

Task: Perform a "Content-Aware Move" of the object identified in the RED rectangle to the GREEN rectangle.

Constraints & Steps:
1. OBJECT EXTRACTION: Identify the primary foreground object within the RED rectangle of Image 1. Use the corresponding clean pixels from Image 2 as the source. Do NOT move the background pixels from the RED rectangle.
2. SOURCE INPAINTING: In the final output, the RED rectangle area must be seamlessly filled. Reconstruct the background using the surrounding textures from Image 2 to ensure the original object is completely removed without ghosting.
3. TARGET PLACEMENT: Place the extracted object into the GREEN rectangle area. Ensure the object's scale, orientation, and perspective match the original, but adjust its lighting, shadows, and reflections to naturally integrate with the new environment at the target position.
4. UI PURGE (CRITICAL): The RED and GREEN rectangles, dashed lines, and color tinting are EXCLUSIVELY instructions for your attention. They MUST NOT appear in the final output. The final image must be a clean, photorealistic result as if the UI never existed.
5. PIXEL INTEGRITY: All areas outside the RED and GREEN rectangles must remain bit-for-bit identical to Image 2.

Output: A single clean, photorealistic image.`;

/** 提示词里的 `<bbox>x1 y1 x2 y2</bbox>` 坐标记号：这里改用高亮标出区域，记号从文字里去掉。 */
const BBOX_TOKEN_RE = /<bbox>\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*<\/bbox>/g;
/** 高亮色：浅绿、半透明，和工具栏在图上画的一样。 */
const HIGHLIGHT_FILL = "rgba(144,238,144,0.55)";

export function stripBBoxTokens(prompt: string): { text: string; boxes: NormalizedBBoxDto[] } {
  const boxes: NormalizedBBoxDto[] = [];
  const text = prompt
    .replace(BBOX_TOKEN_RE, (_m, a, b, c, d) => {
      boxes.push({ x1: Number(a), y1: Number(b), x2: Number(c), y2: Number(d) });
      return "the highlighted region";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { text, boxes };
}

/** 有效的框：左上在右下的左上方。 */
export function validBoxes(boxes: (NormalizedBBoxDto | undefined)[]): NormalizedBBoxDto[] {
  return boxes.filter((b): b is NormalizedBBoxDto => !!b && b.x1 < b.x2 && b.y1 < b.y2);
}

/**
 * 在图上把这些（0–999 归一化的）框涂成半透明浅绿，回 PNG 的 data URI。
 * 平台的图片编辑模型不认坐标记号，但能看懂"图上被标出来的那块"。
 */
export async function highlightRegions(dataUriOrBuffer: string | Buffer, boxes: NormalizedBBoxDto[]): Promise<string> {
  const input = typeof dataUriOrBuffer === "string" ? decodeDataUri(dataUriOrBuffer) : dataUriOrBuffer;
  const base = sharp(input, { failOn: "none" }).rotate();
  const { width = 0, height = 0 } = await base.clone().metadata().then((m) => ((m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : m));
  if (!width || !height) throw new Error("cannot read image dimensions");
  const rects = boxes
    .map((b) => {
      const x = Math.floor((b.x1 / 1000) * width);
      const y = Math.floor((b.y1 / 1000) * height);
      const w = Math.max(1, Math.ceil(((b.x2 + 1) / 1000) * width) - x);
      const h = Math.max(1, Math.ceil(((b.y2 + 1) / 1000) * height) - y);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${HIGHLIGHT_FILL}"/>`;
    })
    .join("");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects}</svg>`);
  const png = await base.composite([{ input: svg, top: 0, left: 0 }]).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function decodeDataUri(uri: string): Buffer {
  const m = /^data:[^;,]+(?:;[^,]*)?,(.*)$/s.exec(uri);
  if (!m) throw new Error("image_data_uri is not a data URI");
  return Buffer.from(m[1]!, uri.slice(0, uri.indexOf(",")).includes(";base64") ? "base64" : "utf8");
}

/**
 * 画布工具栏的图片编辑（扩图 / 重绘 / 擦除 / 搬移 / 高清）和视频高清。
 *
 * 图片编辑都走配置里的图片编辑模型（`models.image_edit`，没配时用 `models.image`，
 * 例如 qwen-image-pro）；高清走 `models.image_upscale` / `models.video_upscale`。
 *
 * 生命周期和生成一致：有来源节点就先贴一张占位卡，成功后原地换成结果，失败把卡标红并回
 * 500 `{ok:false, error, user_message}` —— 工具栏是"发出去就不管"的，提示全靠这张卡和 user_message。
 */
@Injectable()
export class ImageEditService {
  private readonly log = new Logger("ImageEdit");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
    private readonly media: MediaConfigService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  private get root(): string {
    return this.paths.root;
  }

  private config(feature: string, userMessage: string, pick: (c: MediaConfig) => string | null | undefined, what: string): MediaConfig {
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      throw capabilityUnavailable(feature, userMessage, `platform config is unreadable (${(err as Error).message})`);
    }
    if (!cfg.platform.base_url.trim() || !pick(cfg)?.trim()) throw capabilityUnavailable(feature, userMessage, `no ${what} is configured; set it in Settings`);
    return cfg;
  }

  private editConfig(feature: string, userMessage: string): MediaConfig {
    return this.config(feature, userMessage, (c) => c.models.image_edit ?? c.models.image, "image edit model (models.image_edit / models.image)");
  }

  /** 来源节点背后的原图（工作区相对路径）：产物的"参考图"记它，而不是那段 base64。 */
  private async sourceImagePaths(sourceNodeId?: string): Promise<string[]> {
    if (!sourceNodeId) return [];
    try {
      const node = (await this.canvas.getCanvas()).nodes.find((n) => n.id === sourceNodeId);
      const row = node?.assetId ? this.assets.byId(node.assetId) : undefined;
      return row ? [row.path] : [];
    } catch (err) {
      this.log.warn(`查来源节点的原图失败 ${sourceNodeId}: ${(err as Error).message}`);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // 四种图片编辑
  // -------------------------------------------------------------------------

  async outpaint(req: OutpaintBananaDto): Promise<ImageEditResult> {
    const cfg = this.editConfig("Outpaint", "当前平台没有配置图片编辑模型，无法扩图");
    const sources = await this.sourceImagePaths(req.source_node_id);
    return this.run({
      label: "Outpaint",
      displayName: "Outpaint",
      sourceNodeId: req.source_node_id,
      sourcePaths: sources,
      meta: { source_tool: "outpaint" },
      aspectRatio: snapAspectRatio(req.aspect_ratio),
      invoke: async () => {
        this.log.log(`outpaint: resolution=${req.resolution} aspect=${snapAspectRatio(req.aspect_ratio) ?? ""}`);
        const url = await image.generate(this.media.client(), cfg, PROMPT_OUTPAINT, [req.image_data_uri], snapAspectRatio(req.aspect_ratio) ?? "", req.resolution);
        return this.download(url, req.filename);
      },
    });
  }

  /**
   * 重绘。`nano_banana` 发来的图已经画好了高亮；`seedream_5_pro`（工具栏默认）发的是原图 + 框，
   * 框也可能只以 `<bbox>` 记号写在提示词里 —— 这两种都在这里把框画成高亮，再套重绘模板。
   */
  async redraw(req: RedrawBananaDto): Promise<ImageEditResult> {
    const cfg = this.editConfig("Redraw", "当前平台没有配置图片编辑模型，无法重绘");
    const sources = await this.sourceImagePaths(req.source_node_id);
    const { text, boxes } = stripBBoxTokens(req.prompt);
    const regions = validBoxes([...(req.bbox ? [req.bbox] : []), ...boxes]);
    const alreadyMarked = req.model === "nano_banana";
    if (!alreadyMarked && regions.length === 0) {
      throw new HttpException({ ok: false, error: "Redraw failed: a valid bbox (x1<x2, y1<y2) is required", user_message: "请先框选要重绘的区域" }, 400);
    }
    const userPrompt = text || req.prompt;
    const hasRef = !!req.reference_image_data_uri;
    return this.run({
      label: "Redraw",
      displayName: "Redraw",
      sourceNodeId: req.source_node_id,
      sourcePaths: sources,
      meta: { prompt: req.prompt, source_tool: "redraw" },
      aspectRatio: snapAspectRatio(req.aspect_ratio),
      invoke: async () => {
        const target = alreadyMarked ? req.image_data_uri : await highlightRegions(req.image_data_uri, regions);
        const prompt = (hasRef ? PROMPT_REDRAW_WITH_REF_TEMPLATE : PROMPT_REDRAW_TEMPLATE).replace("{userPrompt}", userPrompt);
        const images = hasRef ? [req.reference_image_data_uri!, target] : [target];
        this.log.log(`redraw: regions=${regions.length} ref=${hasRef} resolution=${req.resolution}`);
        return this.download(await image.generate(this.media.client(), cfg, prompt, images, snapAspectRatio(req.aspect_ratio) ?? "", req.resolution), req.filename);
      },
    });
  }

  /** 擦除：把要擦的框画成高亮，按重绘模板"重绘成干净的背景"。 */
  async erase(req: EraseBananaDto): Promise<ImageEditResult> {
    const regions = validBoxes(req.bboxes?.length ? req.bboxes : [req.bbox]);
    if (regions.length === 0) {
      throw new HttpException({ ok: false, error: "Erase failed: at least one valid bbox is required", user_message: "请先框选要擦除的区域" }, 400);
    }
    const cfg = this.editConfig("Erase", "当前平台没有配置图片编辑模型，无法擦除");
    const sources = await this.sourceImagePaths(req.source_node_id);
    return this.run({
      label: "Erase",
      displayName: "Erase",
      sourceNodeId: req.source_node_id,
      sourcePaths: sources,
      meta: { source_tool: "erase" },
      aspectRatio: snapAspectRatio(req.aspect_ratio),
      invoke: async () => {
        const marked = await highlightRegions(req.image_data_uri, regions);
        this.log.log(`erase: regions=${regions.length} resolution=${req.resolution}`);
        const prompt = PROMPT_REDRAW_TEMPLATE.replace("{userPrompt}", ERASE_INSTRUCTION);
        return this.download(await image.generate(this.media.client(), cfg, prompt, [marked], snapAspectRatio(req.aspect_ratio) ?? "", req.resolution), req.filename);
      },
    });
  }

  /** 搬移：[示意图, 原图] 两张一起发。原图是工作区路径时读盘转码；示意图（data URI）不记进资产元数据。 */
  async moveObject(req: MoveObjectBananaDto): Promise<ImageEditResult> {
    const cfg = this.editConfig("Move object", "当前平台没有配置图片编辑模型，无法移动物体");
    const persistable = req.image_paths.filter((p) => !p.startsWith("data:") && !/^https?:/i.test(p));
    for (const p of persistable) {
      if (!(await resolveInsideWorkspace(this.root, p))) throw new HttpException({ ok: false, error: `Path traversal detected: ${p}` }, 400);
    }
    return this.run({
      label: "Move object",
      displayName: "Move Object",
      sourceNodeId: req.source_node_id,
      sourcePaths: persistable,
      meta: { source_tool: "move_object" },
      invoke: async () => {
        const inputs = await image.loadImageInputs(this.root, req.image_paths);
        this.log.log(`move-object: resolution=${req.resolution}`);
        return this.download(await image.generate(this.media.client(), cfg, PROMPT_MOVE_OBJECT, inputs, "", req.resolution), req.filename);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 高清
  // -------------------------------------------------------------------------

  /**
   * 图片高清：走图片超分模型。目标尺寸优先用调用方给的 `target_width × target_height`，
   * 其次按 `multiple` 倍数，都没有就放大 2 倍；总像素超过 4K 时等比收回来（平台超过会静默截断）。
   */
  async enhanceImage(req: EnhanceImageDto): Promise<ImageEditResult> {
    const cfg = this.config("Image enhance", "当前平台没有配置图片超分模型，无法高清", (c) => c.models.image_upscale, "image upscale model (models.image_upscale)");
    const abs = await resolveInsideWorkspace(this.root, req.image_path);
    if (!abs) throw new HttpException({ ok: false, error: `Path traversal detected: ${req.image_path}` }, 400);
    const rel = toWorkspaceRel(this.root, abs) ?? req.image_path;
    return this.run({
      label: "Image enhance",
      displayName: "Super Resolution",
      sourceNodeId: req.source_node_id,
      sourcePaths: [rel],
      meta: { source_tool: "enhance_image" },
      existingPlaceholderId: req.placeholder_id,
      skipCanvas: req.skip_canvas_node === true,
      invoke: async () => {
        const meta = await sharp(abs, { failOn: "none" }).metadata();
        const swap = (meta.orientation ?? 1) >= 5;
        const w = (swap ? meta.height : meta.width) ?? 0;
        const h = (swap ? meta.width : meta.height) ?? 0;
        if (!w || !h) throw new Error(`cannot read image dimensions: ${req.image_path}`);
        const size = enhanceSize(w, h, req);
        const [source] = await image.loadImageInputs(this.root, [abs]);
        this.log.log(`enhance-image: ${req.image_path} ${w}x${h} → ${size}`);
        return this.download(await image.upscale(this.media.client(), cfg, source!, size), req.filename);
      },
    });
  }

  /** 视频高清：走视频超分模型（异步任务，提交后轮询到完成）。 */
  async videoSuperResolution(req: Hailuo03VideoSuperResolutionDto): Promise<ImageEditResult> {
    const cfg = this.config("Video super resolution", "当前平台没有配置视频超分模型，无法高清", (c) => c.models.video_upscale, "video upscale model (models.video_upscale)");
    const abs = await resolveInsideWorkspace(this.root, req.video_path);
    if (!abs) throw new HttpException({ ok: false, error: `Path traversal detected: ${req.video_path}` }, 400);
    const rel = toWorkspaceRel(this.root, abs) ?? req.video_path;
    const tier = req.resolution ?? "2K";
    return this.run({
      label: "Video super resolution",
      displayName: "Super Resolution",
      kind: "video",
      sourceNodeId: req.source_node_id,
      sourcePaths: [rel],
      meta: { source_tool: "hailuo03_video_super_resolution", description: `super resolution ${tier}` },
      invoke: async () => {
        const [source] = await image.loadMediaInputs(this.root, [abs]);
        this.log.log(`video super-resolution: ${req.video_path} → ${tier}`);
        return this.download(await video.upscale(this.media.client(), cfg, source!, tier), req.filename);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 公共：占位卡 → 调平台 → 下载 → 登记 → 上画布
  // -------------------------------------------------------------------------

  private async download(url: string, filename?: string): Promise<string> {
    return downloadMediaToDir(url, this.root, filename);
  }

  private async run(o: {
    label: string;
    displayName: string;
    kind?: "image" | "video";
    sourceNodeId?: string;
    sourcePaths: string[];
    meta: { prompt?: string; source_tool: string; description?: string };
    aspectRatio?: string;
    existingPlaceholderId?: string;
    skipCanvas?: boolean;
    invoke: () => Promise<string>;
  }): Promise<ImageEditResult> {
    const kind = o.kind ?? "image";
    let placeholderId = o.existingPlaceholderId ?? null;
    if (!placeholderId && o.sourceNodeId && !o.skipCanvas) {
      placeholderId = await this.canvas
        .addPlaceholder({ sourceNodeId: o.sourceNodeId, prompt: o.meta.prompt ?? "", model: o.displayName, mediaType: kind, source_tool: o.meta.source_tool, ...(o.aspectRatio ? { aspectRatio: o.aspectRatio } : {}) })
        .then((r) => r.placeholderId)
        .catch((err: Error) => {
          this.log.warn(`${o.label} 建占位卡失败: ${err.message}`);
          return null;
        });
    }
    let abs: string;
    try {
      abs = await o.invoke();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`${o.label} 失败: ${msg}`);
      if (placeholderId) await this.canvas.failPlaceholder({ placeholderId, errorMessage: msg }).catch(() => {});
      throw new HttpException({ ok: false, error: `${o.label} failed: ${msg}`, user_message: msg }, 500);
    }
    const rel = toWorkspaceRel(this.root, abs)!;
    let dims: { width?: number; height?: number } = {};
    try {
      if (kind === "image") {
        const m = await sharp(abs, { failOn: "none" }).metadata();
        dims = { width: m.width, height: m.height };
      } else {
        const info = await this.ffmpeg.probeMedia(abs);
        dims = { width: info.width || undefined, height: info.height || undefined };
      }
    } catch {
      // 尺寸只是锦上添花
    }
    if (!o.skipCanvas) await this.record(rel, kind, o, placeholderId, dims);
    return { ok: true, path: rel, ...(dims.width ? { width: dims.width } : {}), ...(dims.height ? { height: dims.height } : {}) };
  }

  /** 登记 + 上画布。登记失败只标红占位卡：文件已经在盘上、路径也回给了调用方。 */
  private async record(rel: string, kind: "image" | "video", o: { label: string; sourceNodeId?: string; sourcePaths: string[]; meta: { prompt?: string; source_tool: string; description?: string } }, placeholderId: string | null, dims: { width?: number; height?: number }) {
    try {
      const refIds = [...new Set(o.sourcePaths.map((p) => this.assets.byPath(p)?.id).filter((id): id is string => !!id))];
      const row = await this.assets.enroll(rel, {
        prompt: o.meta.prompt ?? "",
        model: o.label,
        description: o.meta.description ?? "",
        source_tool: o.meta.source_tool,
        ...(refIds.length ? { reference_images: refIds } : {}),
      });
      const data = {
        ...(o.meta.prompt ? { prompt: o.meta.prompt } : {}),
        model: o.label,
        time: new Date().toISOString(),
        ...(dims.width ? { width: dims.width } : {}),
        ...(dims.height ? { height: dims.height } : {}),
        ...(refIds.length ? { referenceImageIds: refIds } : {}),
      };
      if (placeholderId) await this.canvas.fillGeneratedNode({ placeholderId, sourceNodeId: o.sourceNodeId, row, data });
      else await this.canvas.placeDerivedMedia({ row, sourceNodeId: o.sourceNodeId, referenceAssetIds: o.sourceNodeId ? [] : refIds, data });
    } catch (err) {
      this.log.warn(`${o.label} 产物登记失败 ${rel}: ${(err as Error).message}`);
      if (placeholderId) await this.canvas.failPlaceholder({ placeholderId, errorMessage: `${o.label} succeeded but asset record failed` }).catch(() => {});
    }
  }
}

const SUPPORTED_ASPECT_RATIOS: [string, number][] = [
  ["1:1", 1],
  ["16:9", 16 / 9],
  ["9:16", 9 / 16],
  ["4:3", 4 / 3],
  ["3:4", 3 / 4],
  ["3:2", 3 / 2],
  ["2:3", 2 / 3],
  ["5:4", 5 / 4],
  ["4:5", 4 / 5],
  ["21:9", 21 / 9],
];

/** 宽高比 → 最接近的常用比例（按对数距离，2:1 和 1:2 离 1:1 一样远）。 */
export function snapAspectRatio(ratio: number | undefined): string | undefined {
  if (!ratio || ratio <= 0 || !Number.isFinite(ratio)) return undefined;
  let best = SUPPORTED_ASPECT_RATIOS[0]!;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const c of SUPPORTED_ASPECT_RATIOS) {
    const diff = Math.abs(Math.log(c[1] / ratio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best[0];
}

/** 平台图片超分按总像素封顶（3840×2160），超过会静默截断成别的尺寸。 */
const MAX_UPSCALE_PIXELS = 3840 * 2160;

/** 扩散 / 超分模型要求边长是 8 的倍数；向下取，保证不越过像素上限。 */
function roundTo8(v: number): number {
  return Math.max(8, Math.floor(v / 8) * 8);
}

/** 高清的目标尺寸（`WxH`，边长取 8 的倍数，总像素不超过 4K）。 */
export function enhanceSize(w: number, h: number, req: { target_width?: number; target_height?: number; multiple?: number }): string {
  let tw: number;
  let th: number;
  if (req.target_width && req.target_height) {
    tw = req.target_width;
    th = req.target_height;
  } else if (req.target_width) {
    tw = req.target_width;
    th = (h * req.target_width) / w;
  } else if (req.target_height) {
    th = req.target_height;
    tw = (w * req.target_height) / h;
  } else {
    const k = req.multiple && req.multiple > 0 ? req.multiple : 2;
    tw = w * k;
    th = h * k;
  }
  const budget = Math.sqrt(MAX_UPSCALE_PIXELS / (tw * th));
  if (budget < 1) {
    tw *= budget;
    th *= budget;
  }
  return `${roundTo8(tw)}x${roundTo8(th)}`;
}
