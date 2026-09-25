import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
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

export class SuperResolutionDto {
  @IsString() @IsNotEmpty() image_path!: string;
  /** 档位 1K / 2K / 4K，大小写不敏感；缺省 2K。目标尺寸由后端按源图实际像素算。 */
  @IsOptional() @IsString() resolution?: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsString() source_node_id?: string;
  @IsOptional() @IsString() replace_node_id?: string;
  @IsOptional() @IsBoolean() preserve_source_canvas_node?: boolean;
}
