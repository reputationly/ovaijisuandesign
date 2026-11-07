import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { createReadStream, existsSync } from "node:fs";

import { capabilityUnavailable } from "../common/capability.js";
import { VoiceCloneDto, VoiceDesignDto, VoiceIsolationDto } from "./speech.dto.js";
import { SpeechService } from "./speech.service.js";

@Controller()
export class SpeechController {
  constructor(private readonly speech: SpeechService) {}

  /** 配置里的 voice_map 加上本机克隆的音色。`page_size` 等查询参数不看：一次回全部。 */
  @Get("api/speech/voices")
  listVoices() {
    return this.speech.listVoices();
  }

  /**
   * `voice_search` 工具的音色检索（`GET /api/v3/voices?q=女声,温柔`）。
   *
   * **本地实现**：查的是「配置的 voice_map + 本机克隆音色」，不依赖云端。
   * 之前这条路由不存在，工具每次都 404 —— 模型在"选旁白音色"这一步只能绕路，
   * 甚至去问用户或改用别的音色来源。
   *
   * 返回形状必须与 `voice_search` 的 outputShape 一致：
   * `{ results: [{ id?, voices:[{voice_id,name,language,gender,age,accent,sample_audio}], error? }] }`
   */
  @Get("api/v3/voices")
  async searchVoices(@Query("q") q?: string) {
    const all = await this.speech.listVoices();
    const terms = String(q ?? "")
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean);
    const queries = terms.length > 0 ? terms : [""];
    const toView = (voice: (typeof all)[number]) => ({
      voice_id: voice.voice_id,
      name: voice.name || voice.voice_id,
      language: voice.language ?? "",
      gender: voice.gender ?? "",
      age: voice.age ?? "",
      accent: voice.accent ?? "",
      sample_audio: voice.sample_audio ?? "",
    });
    return {
      results: queries.map((term) => {
        if (!term) return { voices: all.slice(0, 50).map(toView) };
        const needle = term.toLowerCase();
        const hits = all.filter((voice) =>
          [voice.voice_id, voice.name, voice.language, voice.gender, voice.accent, voice.description ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
        return hits.length > 0
          ? { id: term, voices: hits.slice(0, 50).map(toView) }
          : { id: term, voices: [], error: `没有匹配「${term}」的音色；可以先 design_execute generate_speech 用默认音色，或用 voice_clone 克隆一个。` };
      }),
    };
  }

  /**
   * 试听：直接把参考音频吐出来（预置音色是随包 wav，克隆音色是本机文件）。
   * 没有这条路由时，设置页只能列名字、听不到声音，用户没法判断哪个音色合适。
   */
  @Get("api/speech/voices/:voiceId/preview")
  async previewVoice(@Param("voiceId") voiceId: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.speech.voiceFile(voiceId);
    if (!file || !existsSync(file)) throw new NotFoundException(`找不到音色 ${voiceId} 的参考音频`);
    res.set({ "content-type": "audio/wav", "cache-control": "no-store" });
    return new StreamableFile(createReadStream(file));
  }

  /** 删除本机克隆音色（预置音色拒绝，见 SpeechService.deleteVoice）。 */
  @Delete("api/speech/voices/:voiceId")
  deleteVoice(@Param("voiceId") voiceId: string) {
    return this.speech.deleteVoice(voiceId);
  }

  @Post("api/speech/voice_clone")
  voiceClone(@Body() body: VoiceCloneDto) {
    return this.speech.cloneVoice(body);
  }

  @Post("api/speech/voice_design")
  voiceDesign(@Body() body: VoiceDesignDto) {
    return this.speech.designVoice(body);
  }

  /**
   * 人声提取（去伴奏 / 环境音）。平台没有音源分离模型：参数照样校验，通过后回"能力不可用"，
   * 不建占位卡 —— 画布上不会留下一张永远转圈的卡。
   */
  @Post("api/speech/voice_isolation")
  voiceIsolation(@Body() _body: VoiceIsolationDto) {
    throw capabilityUnavailable("Voice isolation", "当前平台不支持人声提取", "the configured platform has no audio source separation model");
  }
}
