import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { TEXT_VERSION_NOTE_MAX_CHARS, TEXT_VERSION_TITLE_MAX_CHARS } from "./text-version.service.js";

export class SaveTextVersionDto {
  @IsOptional() @IsString() @IsNotEmpty() assetId?: string;
  @IsOptional() @IsString() @IsNotEmpty() path?: string;
  @IsOptional() @IsString() @MaxLength(TEXT_VERSION_TITLE_MAX_CHARS) title?: string;
  @IsOptional() @IsString() @MaxLength(TEXT_VERSION_NOTE_MAX_CHARS) note?: string;
  @IsOptional() @IsIn(["manual", "ai"]) noteSource?: "manual" | "ai";
  @IsOptional() @IsString() nodeId?: string;
}

export class UpdateTextVersionDto {
  @IsOptional() @IsString() @MaxLength(TEXT_VERSION_TITLE_MAX_CHARS) title?: string;
  @IsOptional() @IsString() @MaxLength(TEXT_VERSION_NOTE_MAX_CHARS) note?: string;
  @IsOptional() @IsIn(["manual", "ai"]) noteSource?: "manual" | "ai";
  @IsOptional() @IsBoolean() pinned?: boolean;
}

export class RestoreTextVersionDto {
  @IsOptional() @IsString() @MaxLength(TEXT_VERSION_NOTE_MAX_CHARS) autoSnapshotNote?: string;
  @IsOptional() @IsString() nodeId?: string;
}

export class SummarizeTextVersionDto {
  @IsOptional() @IsString() @IsNotEmpty() assetId?: string;
  @IsOptional() @IsString() @IsNotEmpty() path?: string;
  @IsOptional() @IsString() @IsNotEmpty() versionId?: string;
  @IsOptional() @IsString() baseVersionId?: string;
}

export class TextVersionContentQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class TextVersionDiffQueryDto {
  @IsString() @IsNotEmpty() from!: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
