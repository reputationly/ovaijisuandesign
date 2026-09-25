import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import type { ScaleMode } from "./ffmpeg.service.js";
import type { OutputType } from "./ffmpeg-args.js";

export class ConcatenateDto {
  @IsArray() @IsString({ each: true }) @ArrayMinSize(2) video_paths!: string[];
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsIn(["first", "max", "min", "custom"]) scale_mode?: ScaleMode;
  @IsOptional() @IsInt() @IsPositive() target_width?: number;
  @IsOptional() @IsInt() @IsPositive() target_height?: number;
}

export class EmbedAudioDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsString() @IsNotEmpty() audio_path!: string;
  @IsOptional() @IsBoolean() replace?: boolean;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() replace_node_id?: string;
}

export class ExtractAudioDto {
  @IsString() @IsNotEmpty() video_path!: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsString() source_node_id?: string;
}

export class AnalyzeMediaDto {
  @IsString() @IsNotEmpty() file_path!: string;
  @IsString() @IsNotEmpty() question!: string;
}

export class GenerateTextDto {
  @IsString() @IsNotEmpty() prompt!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) image_paths?: string[];
}

export class GenerateTextMessagesDto {
  @IsString() @IsNotEmpty() prompt!: string;
  /** 调用方点名的模型。我们的平台只有配置里的对话模型，这个字段只收不用。 */
  @IsString() @IsNotEmpty() model!: string;
  @IsOptional() @IsInt() @Min(1) @Max(4096) max_tokens?: number;
}

export class FfmpegMetadataDto {
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() description?: string;
}

export class FfmpegRunDto {
  @IsArray() @IsString({ each: true }) @ArrayMinSize(1) args!: string[];
  @IsOptional() @IsIn(["video", "audio", "image"]) output_type?: OutputType;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() replace_node_id?: string;
  /** 为真时即使给了 replace_node_id 也不原地替换：源节点保留，产物作为它的派生节点另放。 */
  @IsOptional() @IsBoolean() preserve_source_canvas_node?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) input_paths?: string[];
  @IsOptional() @ValidateNested() @Type(() => FfmpegMetadataDto) metadata?: FfmpegMetadataDto;
}

/** 图片或视频二选一（都给时按图片处理）；档位和输出文件名必填。 */
export class SuperResolutionDto {
  @ValidateIf((o: SuperResolutionDto) => !o.image_path) @IsString() @IsNotEmpty() video_path?: string;
  @ValidateIf((o: SuperResolutionDto) => !o.video_path) @IsString() @IsNotEmpty() image_path?: string;
  /** 档位 1K / 2K / 4K，大小写不敏感。图片的目标尺寸由后端按源图实际像素算。 */
  @IsString() @IsNotEmpty() resolution!: string;
  @IsString() @IsNotEmpty() filename!: string;
  @IsOptional() @IsString() source_node_id?: string;
}

/** `/api/generate/text`：画布文本节点的生成。字段和参照一致，多一个字段就 400。 */
export class GenerateCanvasTextDto {
  @IsString() @IsNotEmpty() model_id!: string;
  @IsString() @IsNotEmpty() prompt!: string;
  @IsOptional() @IsString() display_prompt?: string;
  @IsOptional() @IsObject() @Type(() => Object) params?: Record<string, unknown>;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() replace_node_id?: string;
  @IsOptional() @IsString() session_id?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) image_paths?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) text_paths?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) video_paths?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) audio_paths?: string[];
}
