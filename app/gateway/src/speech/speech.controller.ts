import { Body, Controller, Get, Post } from "@nestjs/common";

import { VoiceCloneDto, VoiceDesignDto } from "./speech.dto.js";
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
}
