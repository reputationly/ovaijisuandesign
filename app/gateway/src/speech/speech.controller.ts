import { Body, Controller, Get, Post } from "@nestjs/common";

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
