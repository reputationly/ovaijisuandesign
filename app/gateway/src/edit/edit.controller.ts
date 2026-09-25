import { Body, Controller, Headers, Post } from "@nestjs/common";

import {
  AnalyzeMediaDto,
  ConcatenateDto,
  EmbedAudioDto,
  ExtractAudioDto,
  FfmpegRunDto,
  GenerateTextDto,
  GenerateTextMessagesDto,
  SuperResolutionDto,
} from "./edit.dto.js";
import { EditService } from "./edit.service.js";

/**
 * 本地编辑与多模态理解。失败统一回 `{ok:false, error}`（HTTP 仍是成功码）：调用方是 MCP 工具，
 * 它把 error 原样转给 agent，比一个裸 500 更能让 agent 改参数重试。路径越界仍是 400。
 * 会话 id 取 `x-session-id` 头，记进产物的元数据（"这一轮产出的"分组靠它）。
 */
@Controller("api/edit")
export class EditController {
  constructor(private readonly edit: EditService) {}

  @Post("ffmpeg")
  ffmpeg(@Body() b: FfmpegRunDto, @Headers("x-session-id") session?: string) {
    return this.edit.runFfmpeg(b, session?.trim() || undefined);
  }

  @Post("concatenate-videos")
  concatenate(@Body() b: ConcatenateDto, @Headers("x-session-id") session?: string) {
    return this.edit.concatenateVideos(b, session?.trim() || undefined);
  }

  @Post("embed-audio")
  embedAudio(@Body() b: EmbedAudioDto, @Headers("x-session-id") session?: string) {
    return this.edit.embedAudio(b, session?.trim() || undefined);
  }

  @Post("extract-audio")
  extractAudio(@Body() b: ExtractAudioDto, @Headers("x-session-id") session?: string) {
    return this.edit.extractAudio(b, session?.trim() || undefined);
  }

  @Post("super-resolution")
  superResolution(@Body() b: SuperResolutionDto, @Headers("x-session-id") session?: string) {
    return this.edit.superResolution(b, session?.trim() || undefined);
  }

  @Post("analyze-media")
  analyzeMedia(@Body() b: AnalyzeMediaDto) {
    return this.edit.analyzeMedia(b);
  }

  @Post("generate-text")
  generateText(@Body() b: GenerateTextDto) {
    return this.edit.generateText(b);
  }

  @Post("generate-text-messages")
  generateTextMessages(@Body() b: GenerateTextMessagesDto) {
    return this.edit.generateTextMessages(b);
  }
}
