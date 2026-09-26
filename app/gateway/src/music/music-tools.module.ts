import { stat } from "node:fs/promises";

import { Body, Controller, HttpException, HttpStatus, Logger, Module, Post } from "@nestjs/common";
import { type MediaConfig, PlatformError, lyrics, route } from "@ov/maas-media";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { EditModule } from "../edit/edit.module.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";
import { resolveInsideWorkspace, toWorkspaceRel } from "../edit/paths.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { saveCoverFeature } from "./cover-features.js";

type CoverPreprocessResult =
  | { ok: true; cover_feature_id: string; formatted_lyrics: string; audio_duration: number; structure_result: string }
  | { ok: false; error: string };

/**
 * 音乐的两个辅助接口：翻唱预处理、写歌词。音乐生成本身在 `/api/generate/music`。
 */
@Controller()
export class MusicToolsController {
  private readonly log = new Logger("MusicTools");

  constructor(
    private readonly media: MediaConfigService,
    private readonly paths: WorkspacePathService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  /**
   * 翻唱两步走的第一步：参考音频 → `cover_feature_id`（生成时放进 `params.cover_feature_id`）。
   *
   * 平台上的翻唱模型（`models.music_edit`，如 ace-step）没有单独的特征提取接口，参考音频是
   * 跟着生成请求一起发的；这里做的是本机能做的那部分 —— 确认音频在、量出时长、登记一个 id。
   * 歌词识别和段落分析需要语音识别，平台没有，所以 `formatted_lyrics` / `structure_result`
   * 回空串：调用方要改词就自己给 `lyrics`，不给则照参考音频原来的词唱。
   * 失败回 `{ok:false, error}`（HTTP 仍是成功码），和生成前的其他预处理一样。
   */
  @Post("api/music/cover/preprocess")
  async musicCoverPreprocess(@Body() body: Record<string, unknown>): Promise<CoverPreprocessResult> {
    const audio = typeof body?.audio === "string" ? body.audio.trim() : "";
    if (!audio) return { ok: false, error: "audio is required" };
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      return { ok: false, error: `platform config is unreadable: ${(err as Error).message}` };
    }
    if (!route.route(cfg.models, null, route.Modality.MusicEdit)) {
      return { ok: false, error: "Music cover is not available: no music edit model (models.music_edit, e.g. ace-step) is configured." };
    }
    let stored = audio;
    let duration = 0;
    if (!/^https?:\/\//i.test(audio)) {
      const abs = await resolveInsideWorkspace(this.paths.root, audio);
      if (!abs) return { ok: false, error: `Path traversal detected: ${audio}` };
      if (!(await stat(abs).catch(() => null))?.isFile()) return { ok: false, error: `audio file not found: ${audio}` };
      const info = await this.ffmpeg.probeMedia(abs).catch(() => null);
      duration = info && Number.isFinite(info.duration) ? Math.round(info.duration * 1000) / 1000 : 0;
      if (!(duration > 0)) return { ok: false, error: `not a playable audio file: ${audio}` };
      stored = toWorkspaceRel(this.paths.root, abs) ?? audio;
    }
    const id = await saveCoverFeature(this.paths.root, stored, duration);
    this.log.log(`翻唱预处理 ${audio} → ${id} (${duration}s)`);
    return { ok: true, cover_feature_id: id, formatted_lyrics: "", audio_duration: duration, structure_result: "" };
  }

  /**
   * 写歌词 / 润色歌词。平台没有歌词模型，用配置里的对话模型来写（`@ov/maas-media` 的 `lyrics.draft`）。
   * 入参沿用歌词接口的字段：`mode`（write_full_song / edit）、`prompt`、`lyrics`、`title`；
   * 回 `song_title` / `style_tags` / `lyrics`，外加表示成功的 `base`，和原接口的成功响应同形。
   */
  @Post("api/music/lyrics/generate")
  async generateLyrics(@Body() body: Record<string, unknown>) {
    const s = (k: string) => (typeof body?.[k] === "string" ? (body[k] as string) : "");
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      throw new HttpException(`[lyrics] platform config is unreadable: ${(err as Error).message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!cfg.platform.base_url.trim() || !cfg.platform.chat_model.trim()) {
      throw new HttpException("[lyrics] No chat model configured: set the platform base URL and chat model in Settings.", HttpStatus.SERVICE_UNAVAILABLE);
    }
    try {
      const out = await lyrics.draft(this.media.client(), cfg, lyrics.Mode.parse(s("mode")), s("prompt"), s("lyrics"), s("title") || null);
      return { ...out, base: { code: 0, message: "success" } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`写歌词失败: ${msg}`);
      const status = err instanceof PlatformError && err.code === "dpp.config" ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(`[lyrics] generateLyrics failed: ${msg}`, status);
    }
  }
}

@Module({ imports: [EditModule], controllers: [MusicToolsController] })
export class MusicToolsModule {}
