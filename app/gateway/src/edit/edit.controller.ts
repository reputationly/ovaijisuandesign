import { BadRequestException, Body, Controller, Headers, HttpCode, Post } from "@nestjs/common";

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

/**
 * `/api/generate/text`：单轮文本生成，可带参考图 / 系统提示。请求体没和参照核对过，所以不走全局的
 * 严格校验（多一个字段就 400），只挑认识的字段；模型固定用配置里的对话模型。
 */
@Controller("api/generate")
export class GenerateTextController {
  constructor(private readonly edit: EditService) {}

  @Post("text")
  @HttpCode(200)
  generateText(@Body() raw: unknown) {
    const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
    if (!prompt) throw new BadRequestException({ ok: false, error: "prompt is required", error_code: "INVALID_PARAMS" });
    const images = b.image_paths ?? b.images;
    if (images !== undefined && !(Array.isArray(images) && images.every((p) => typeof p === "string"))) {
      throw new BadRequestException({ ok: false, error: "image_paths must be an array of strings", error_code: "INVALID_PARAMS" });
    }
    const system = [b.system_prompt, b.system].find((v): v is string => typeof v === "string" && v.trim() !== "");
    return this.edit.generateText({ prompt, ...(images ? { image_paths: images as string[] } : {}) }, system);
  }
}
