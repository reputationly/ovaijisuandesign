import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { type MediaConfig, PlatformError, audio, route } from "@ov/maas-media";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { downloadMediaToDir } from "../generate/media-download.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { voicesFrom } from "../generate/model-catalog.js";
import type { VoiceCloneDto, VoiceDesignDto } from "./speech.dto.js";
import { VoiceLibraryService } from "./voice-library.service.js";

const CLONE_EXTS = new Set([".mp3", ".m4a", ".wav"]);
const CLONE_MAX_BYTES = 20 * 1024 * 1024;

export interface VoiceCloneResult {
  voice_id: string;
  demo_audio?: string;
}

/**
 * 音色：列表、克隆、设计。
 *
 * 平台的语音模型是零样本的（音色就是一段参考音频），所以「克隆」不需要上游训练：
 * 把参考音频登记进本机音色表、发一个 voice_id，合成时按 id 换回那段音频。
 * 「设计」要从文字描述生成一个新声音，平台没有这种模型，直接回不可用。
 */
@Injectable()
export class SpeechService {
  private readonly log = new Logger("Speech");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly media: MediaConfigService,
    private readonly library: VoiceLibraryService,
  ) {}

  async listVoices() {
    const cfg = this.media.load();
    const configured = voicesFrom(cfg).map((voice) => {
      // 预置音色在 voice_map 里的 key 是 `preset_*`，说话人名字与语言从随包的
      // `voice-presets/presets.json` 里取；没有清单就退回用 id 当名字。
      const preset = this.presetMeta(voice.voice_id);
      return preset
        ? { ...voice, name: preset.label, language: preset.language ?? "", gender: preset.gender ?? "" }
        : voice;
    });
    const taken = new Set(configured.map((v) => v.voice_id));
    const local = (await this.library.list())
      .filter((v) => !taken.has(v.voice_id))
      .map((v) => ({
        voice_id: v.voice_id,
        name: v.source_name.replace(/\.[^.]+$/, "") || v.voice_id,
        description: `Cloned from: ${v.source_name}`,
        language: "",
        gender: "",
        age: "",
        accent: "",
        sample_audio: "",
      }));
    return [...configured, ...local];
  }

  /** 随包预置音色的展示信息（读一次缓存）。 */
  private presetCache?: Record<string, { label: string; language?: string; gender?: string }>;

  private presetMeta(voiceId: string) {
    if (this.presetCache === undefined) {
      this.presetCache = {};
      try {
        const file = path.join(path.dirname(this.library.dir), "voice-presets", "presets.json");
        const raw = JSON.parse(readFileSync(file, "utf8")) as {
          voices?: { id: string; label: string; language?: string; gender?: string }[];
        };
        for (const voice of raw.voices ?? []) {
          if (typeof voice?.id === "string") this.presetCache[voice.id] = voice;
        }
      } catch {
        // 没随包清单（老安装）就只显示 id，不是错误。
      }
    }
    return this.presetCache[voiceId];
  }

  /** 试听 / 校验用：把 voiceId 解析成参考音频的绝对路径。 */
  async voiceFile(voiceId: string): Promise<string | undefined> {
    const cfg = this.media.load();
    const mapped = cfg.models.voice_map[voiceId];
    if (typeof mapped === "string" && mapped.trim() !== "") return path.isAbsolute(mapped) ? mapped : path.join(this.paths.root, mapped);
    const preset = this.presetMeta(voiceId);
    if (preset) {
      const presetFile = path.join(path.dirname(this.library.dir), "voice-presets", `${voiceId.replace(/^preset_/, "")}.wav`);
      if (existsSync(presetFile)) return presetFile;
    }
    const local = (await this.library.list()).find((voice) => voice.voice_id === voiceId);
    return local ? this.library.referencePath(local) : undefined;
  }

  async deleteVoice(voiceId: string): Promise<{ deleted: boolean; reason?: string }> {
    if (voiceId.startsWith("preset_")) {
      return { deleted: false, reason: "预置音色随包提供，不能删除；可以直接改用别的音色。" };
    }
    const removed = await this.library.remove(voiceId);
    return removed ? { deleted: true } : { deleted: false, reason: `找不到本机音色 ${voiceId}` };
  }

  async cloneVoice(dto: VoiceCloneDto): Promise<VoiceCloneResult> {
    if (dto.demo_text && !dto.demo_model) {
      throw new BadRequestException("demo_model is required when demo_text is provided");
    }
    // 设置页上传/录音走 base64：先落到工作区的临时目录，后面与"给了路径"完全同一条流程。
    let audioAbs: string;
    if (typeof dto.audio_base64 === "string" && dto.audio_base64.trim() !== "") {
      const dir = path.join(this.paths.root, ".hilo", "tmp", "voice-upload");
      await mkdir(dir, { recursive: true });
      const ext = (() => {
        const name = (dto.filename ?? "").toLowerCase();
        for (const candidate of [".wav", ".mp3", ".m4a", ".webm", ".ogg"]) if (name.endsWith(candidate)) return candidate;
        return ".wav";
      })();
      const file = path.join(dir, `upload-${randomUUID()}${ext}`);
      const bytes = Buffer.from(dto.audio_base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (bytes.length === 0) throw new BadRequestException("上传的音频是空的");
      if (bytes.length > CLONE_MAX_BYTES) throw new BadRequestException(`参考音频不能超过 ${CLONE_MAX_BYTES / 1024 / 1024}MB`);
      await writeFile(file, bytes);
      audioAbs = file;
    } else if (typeof dto.audio_path === "string" && dto.audio_path.trim() !== "") {
      audioAbs = this.resolveMedia(dto.audio_path);
    } else {
      throw new BadRequestException("需要 audio_path 或 audio_base64 之一");
    }
    await checkCloneAudio(audioAbs);
    // 平台的零样本合成只吃一段参考音频，提示音频用不上；照样校验，免得坏文件被悄悄放过。
    if (dto.prompt_audio_path && dto.prompt_text) await checkCloneAudio(this.resolveMedia(dto.prompt_audio_path));
    const cfg = this.speechConfig("Voice clone");

    const voiceId = this.library.newVoiceId();
    const staged = await this.library.stage(voiceId, audioAbs, path.basename(audioAbs));
    let demoAudio: string | undefined;
    try {
      if (dto.demo_text) {
        const withVoice: MediaConfig = { ...cfg, models: { ...cfg.models, voice_map: { [voiceId]: staged.referencePath } } };
        const url = await audio.synthesizeSpeech(this.media.client(), withVoice, dto.demo_text, voiceId, null);
        demoAudio = await downloadMediaToDir(url, this.paths.root, `voice-clone-demo-${voiceId}`);
      }
      await staged.commit();
    } catch (err) {
      await staged.discard().catch(() => undefined);
      throw asHttp(err);
    }
    this.log.log(`clone: file=${path.basename(audioAbs)} voice_id=${voiceId} demo=${!!demoAudio}`);
    return { voice_id: voiceId, ...(demoAudio ? { demo_audio: demoAudio } : {}) };
  }

  designVoice(_dto: VoiceDesignDto): never {
    throw new HttpException(
      "Voice design is not available: the configured platform has no text-to-voice design model. Clone a voice from a reference audio instead.",
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  /** 绝对路径照用（参考音频可能来自别的工作区），相对路径按工作区解析。 */
  private resolveMedia(p: string): string {
    if (path.isAbsolute(p)) return p;
    const abs = this.paths.resolve(p);
    if (!abs) throw new BadRequestException("Path traversal detected");
    return abs;
  }

  private speechConfig(what: string): MediaConfig {
    let cfg: MediaConfig;
    try {
      cfg = this.media.load();
    } catch (err) {
      throw new HttpException(`${what} is not available: platform config is unreadable (${(err as Error).message})`, HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!cfg.platform.base_url.trim() || !cfg.platform.api_key.trim() || route.route(cfg.models, null, route.Modality.Speech) === null) {
      throw new HttpException(`${what} is not available: no speech model is configured. Set one in Settings.`, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return cfg;
  }
}

/** 存在、不超 20MB、扩展名是 mp3/m4a/wav。文案和上游克隆接口的预检一致。 */
async function checkCloneAudio(abs: string): Promise<void> {
  const st = await stat(abs).catch(() => null);
  if (!st?.isFile()) throw new BadRequestException(`voice clone audio not found: ${abs}`);
  if (st.size > CLONE_MAX_BYTES) {
    throw new BadRequestException(`voice clone audio exceeds 20MB (got ${(st.size / 1024 / 1024).toFixed(1)}MB): ${abs}`);
  }
  const ext = path.extname(abs).toLowerCase();
  if (!CLONE_EXTS.has(ext)) throw new BadRequestException(`voice clone audio must be mp3/m4a/wav, got ${ext || "(no ext)"}: ${abs}`);
}

/** 平台失败按上游失败回（502 + 原文）；其余的原样抛，交给 Nest 回 500。 */
function asHttp(err: unknown): unknown {
  if (err instanceof HttpException) return err;
  if (err instanceof PlatformError) return new HttpException(err.message, HttpStatus.BAD_GATEWAY);
  return err;
}
