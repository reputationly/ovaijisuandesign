import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

/** 字段和取值范围与画布工具栏发来的请求一致；多一个字段就 400（全局 ValidationPipe）。 */

export const BANANA_RESOLUTIONS = ["1K", "2K", "4K"] as const;
export const REDRAW_MODELS = ["nano_banana", "seedream_5_pro"] as const;
export const ENHANCE_IMAGE_TOOL_VERSIONS = ["standard", "professional", "max"] as const;
export const MAX_ERASE_REGIONS = 32;

/** 归一化到 0–999 的框（左上 x1,y1，右下 x2,y2）。 */
export class NormalizedBBoxDto {
  @IsInt() @Min(0) @Max(999) x1!: number;
  @IsInt() @Min(0) @Max(999) y1!: number;
  @IsInt() @Min(0) @Max(999) x2!: number;
  @IsInt() @Min(0) @Max(999) y2!: number;
}

export class EraseBananaDto {
  @IsString() @IsNotEmpty() image_data_uri!: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_ERASE_REGIONS) @ValidateNested({ each: true }) @Type(() => NormalizedBBoxDto) bboxes?: NormalizedBBoxDto[];
  @IsOptional() @ValidateNested() @Type(() => NormalizedBBoxDto) bbox?: NormalizedBBoxDto;
  @IsIn(BANANA_RESOLUTIONS) resolution!: (typeof BANANA_RESOLUTIONS)[number];
  @IsOptional() @IsNumber() @IsPositive() aspect_ratio?: number;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
}

export class RedrawBananaDto {
  @IsString() @IsNotEmpty() image_data_uri!: string;
  @IsOptional() @ValidateNested() @Type(() => NormalizedBBoxDto) bbox?: NormalizedBBoxDto;
  @IsOptional() @IsString() mask_data_uri?: string;
  @IsOptional() @IsString() reference_image_data_uri?: string;
  @IsOptional() @IsIn(REDRAW_MODELS) model?: (typeof REDRAW_MODELS)[number];
  @IsIn(BANANA_RESOLUTIONS) resolution!: (typeof BANANA_RESOLUTIONS)[number];
  @IsString() @IsNotEmpty() prompt!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsNumber() @IsPositive() aspect_ratio?: number;
}

export class OutpaintBananaDto {
  @IsString() @IsNotEmpty() image_data_uri!: string;
  @IsIn(BANANA_RESOLUTIONS) resolution!: (typeof BANANA_RESOLUTIONS)[number];
  @IsNumber() aspect_ratio!: number;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
}

export class MoveObjectBananaDto {
  /** [带红绿框的示意图, 原图]。 */
  @IsArray() @IsString({ each: true }) @ArrayMinSize(2) @ArrayMaxSize(2) image_paths!: string[];
  @IsIn(BANANA_RESOLUTIONS) resolution!: (typeof BANANA_RESOLUTIONS)[number];
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
}

export class EnhanceImageDto {
  @IsString() @IsNotEmpty() image_path!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsIn(ENHANCE_IMAGE_TOOL_VERSIONS) tool_version?: (typeof ENHANCE_IMAGE_TOOL_VERSIONS)[number];
  @IsOptional() @IsNumber() @IsPositive() multiple?: number;
  @IsOptional() @IsInt() @IsPositive() target_width?: number;
  @IsOptional() @IsInt() @IsPositive() target_height?: number;
  /** 调用方已经建好的占位卡（宫格高清一次建一组）。 */
  @IsOptional() @IsString() placeholder_id?: string;
  /** 只要结果文件、不上画布（插件在自己的界面里显示）。 */
  @IsOptional() @IsBoolean() skip_canvas_node?: boolean;
  @IsOptional() @IsString() aspect_ratio?: string;
}

export class Hailuo03VideoSuperResolutionDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsString() @IsNotEmpty() provider_task_id!: string;
  @IsOptional() @IsIn(["2K"]) resolution?: "2K";
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

// ---------------------------------------------------------------------------
// 平台做不了的几项：只做入参校验
// ---------------------------------------------------------------------------

export class LipSyncDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsString() @IsNotEmpty() audio_path!: string;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

export class AsrDto {
  @IsString() @IsNotEmpty() audio_path!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() total_duration?: unknown;
}

export class AsrMediaKitDto {
  @IsOptional() @IsString() video_path?: string;
  @IsOptional() @IsString() audio_path?: string;
  @IsOptional() @IsIn(["auto", "zh", "en"]) language?: string;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsBoolean() record_asset?: boolean;
}

export class AsrWhisperDto {
  @IsOptional() @IsString() video_path?: string;
  @IsOptional() @IsString() audio_path?: string;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsBoolean() record_asset?: boolean;
}

export class AudioSeparateDto {
  @ValidateIf((o: AudioSeparateDto) => !o.video_path) @IsString() @MinLength(1) audio_path?: string;
  @ValidateIf((o: AudioSeparateDto) => !o.audio_path) @IsString() @MinLength(1) video_path?: string;
  @IsString() @MinLength(1) @MaxLength(120) filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

export class EnhanceVideoMediaKitDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsOptional() @IsIn(["standard", "professional"]) tool_version?: string;
  @IsOptional() @IsIn(["common", "ugc", "short_series", "aigc", "old_film"]) scene?: string;
  @IsOptional() @IsIn(["720p", "1080p", "2k", "4k"]) resolution?: string;
  @IsOptional() @IsIn([30, 60]) fps?: number;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

export class EraseBoxDto {
  @IsNumber() @Min(0) @Max(1) top_left_x!: number;
  @IsNumber() @Min(0) @Max(1) top_left_y!: number;
  @IsNumber() @Min(0) @Max(1) bottom_right_x!: number;
  @IsNumber() @Min(0) @Max(1) bottom_right_y!: number;
}

export class EraseSubtitleMediaKitDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsOptional() @IsIn(["Subtitle", "Text"]) mode?: "Subtitle" | "Text";
  @ValidateIf((o: EraseSubtitleMediaKitDto) => o.mode === "Text") @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => EraseBoxDto) regions?: EraseBoxDto[];
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

export class LayerDecomposeDto {
  @IsString() @IsNotEmpty() image_path!: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
}

export class RemoveBackgroundDto {
  @IsString() @IsNotEmpty() image_path!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() filename?: string;
}
