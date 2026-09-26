import { BadRequestException, Body, Controller, Post } from "@nestjs/common";

import { capabilityUnavailable } from "../common/capability.js";
import {
  AsrDto,
  AsrMediaKitDto,
  AsrWhisperDto,
  AudioSeparateDto,
  EnhanceImageDto,
  EnhanceVideoMediaKitDto,
  EraseBananaDto,
  EraseSubtitleMediaKitDto,
  Hailuo03VideoSuperResolutionDto,
  LayerDecomposeDto,
  LipSyncDto,
  MoveObjectBananaDto,
  OutpaintBananaDto,
  RedrawBananaDto,
  RemoveBackgroundDto,
} from "./image-edit.dto.js";
import { ImageEditService } from "./image-edit.service.js";

/** 语音识别在平台上没有对应模型：三条识别路由共用这一句。 */
const noAsr = () => capabilityUnavailable("Speech recognition", "当前平台不支持语音识别（字幕生成）", "the configured platform has no speech recognition (ASR) model");

/**
 * 画布工具栏的编辑。平台能做的（扩图、重绘、擦除、搬移、图片 / 视频高清）走配置里的模型；
 * 做不了的（语音识别、音源分离、视频增强补帧、去字幕、图层拆分、对口型、抠图）
 * 入参照样校验，然后回统一的"能力不可用"（见 `common/capability.ts`）。
 */
@Controller("api/edit")
export class ImageEditController {
  constructor(private readonly edits: ImageEditService) {}

  @Post("outpaint-banana")
  outpaint(@Body() b: OutpaintBananaDto) {
    return this.edits.outpaint(b);
  }

  @Post("redraw-banana")
  redraw(@Body() b: RedrawBananaDto) {
    return this.edits.redraw(b);
  }

  @Post("erase-banana")
  erase(@Body() b: EraseBananaDto) {
    return this.edits.erase(b);
  }

  @Post("move-object-banana")
  moveObject(@Body() b: MoveObjectBananaDto) {
    return this.edits.moveObject(b);
  }

  @Post("enhance-image")
  enhanceImage(@Body() b: EnhanceImageDto) {
    return this.edits.enhanceImage(b);
  }

  @Post("hailuo03-video-super-resolution")
  videoSuperResolution(@Body() b: Hailuo03VideoSuperResolutionDto) {
    return this.edits.videoSuperResolution(b);
  }

  // ---------------------------------------------------------------------------
  // 平台做不了的
  // ---------------------------------------------------------------------------

  @Post("asr")
  asr(@Body() _b: AsrDto) {
    throw noAsr();
  }

  @Post("asr-mediakit")
  asrMediaKit(@Body() b: AsrMediaKitDto) {
    assertVideoOrAudioPath(b);
    throw noAsr();
  }

  @Post("asr-whisper")
  asrWhisper(@Body() b: AsrWhisperDto) {
    assertVideoOrAudioPath(b);
    throw noAsr();
  }

  @Post("audio-separate")
  audioSeparate(@Body() _b: AudioSeparateDto) {
    throw capabilityUnavailable("Audio separation", "当前平台不支持人声 / 伴奏分离", "the configured platform has no audio source separation model");
  }

  @Post("enhance-video-mediakit")
  enhanceVideo(@Body() _b: EnhanceVideoMediaKitDto) {
    throw capabilityUnavailable("Video enhance (upscale + frame interpolation)", "当前平台不支持视频高清补帧", "the configured platform has no video enhancement / frame interpolation model");
  }

  @Post("erase-subtitle-mediakit")
  eraseSubtitle(@Body() _b: EraseSubtitleMediaKitDto) {
    throw capabilityUnavailable("Subtitle erase", "当前平台不支持字幕消除", "the configured platform has no video subtitle erasing model");
  }

  @Post("layer-decompose")
  layerDecompose(@Body() _b: LayerDecomposeDto) {
    throw capabilityUnavailable("Layer decomposition", "当前平台不支持图层拆分", "the configured platform has no layer decomposition model");
  }

  @Post("lip-sync")
  lipSync(@Body() _b: LipSyncDto) {
    throw capabilityUnavailable("Lip sync", "当前平台不支持对口型", "the configured platform has no lip-sync model");
  }

  @Post("remove-background")
  removeBackground(@Body() _b: RemoveBackgroundDto) {
    throw capabilityUnavailable("Background removal", "当前平台不支持抠图", "the configured platform has no background removal model");
  }
}

function assertVideoOrAudioPath(b: { video_path?: string; audio_path?: string }): void {
  if (!b.video_path?.trim() && !b.audio_path?.trim()) throw new BadRequestException("video_path or audio_path is required");
}
