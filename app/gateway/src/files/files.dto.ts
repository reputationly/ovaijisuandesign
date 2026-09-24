import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

/** 一次批量操作最多多少个路径 / URL。 */
export const MAX_BATCH_PATHS = 100;

export class PathsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @IsString({ each: true })
  paths!: string[];
}

export class ImportUrlsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @IsString({ each: true })
  urls!: string[];
}

export class PatchMetadataDto {
  @IsObject()
  patch!: Record<string, unknown>;
}

export class WriteContentDto {
  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unique?: boolean;
}

export class TextAssetDto {
  @IsString()
  content!: string;
}
