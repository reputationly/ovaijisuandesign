import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * 同步生成路由（`/api/generate/{image,video,speech,music}`）的请求体，字段和参照一致：
 * 多一个字段就 400。`backend` 只校验非空 —— 所有后端都落到同一个平台。
 */
export class GenerateBaseDto {
  @IsString() @IsNotEmpty() backend!: string;
  @IsString() @IsOptional() model_id?: string;
  @IsString() @IsNotEmpty() prompt!: string;
  @IsString() @IsOptional() display_prompt?: string;
  @IsObject() @IsOptional() @Type(() => Object) params?: Record<string, unknown>;
  @IsString() @IsOptional() source_node_id?: string;
  @IsString() @IsOptional() replace_node_id?: string;
  @IsString() @IsOptional() source_tool?: string;
  @IsString() @IsNotEmpty() filename!: string;
}

export class GenerateImageDto extends GenerateBaseDto {
  @IsArray() @IsString({ each: true }) @IsOptional() image_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() text_paths?: string[];
  /** 平台一次只出一张，多张收下但只出一张。 */
  @IsInt() @Min(1) @Max(9) @IsOptional() count?: number;
}

export class GenerateVideoDto {
  @IsString() @IsNotEmpty() backend!: string;
  @IsString() @IsOptional() model_id?: string;
  @IsString() @IsOptional() prompt?: string;
  @IsString() @IsOptional() display_prompt?: string;
  @IsObject() @IsOptional() @Type(() => Object) params?: Record<string, unknown>;
  @IsArray() @IsString({ each: true }) @IsOptional() image_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() video_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() audio_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() text_paths?: string[];
  @IsString() @IsOptional() source_node_id?: string;
  @IsString() @IsOptional() replace_node_id?: string;
  @IsBoolean() @IsOptional() new_round?: boolean;
  @IsInt() @Min(1) @Max(4) @IsOptional() count?: number;
  @IsString() @IsOptional() source_tool?: string;
  @IsString() @IsNotEmpty() filename!: string;
}

export class GenerateAudioDto extends GenerateBaseDto {
  @IsArray() @IsString({ each: true }) @IsOptional() audio_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() image_paths?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() text_paths?: string[];
}
