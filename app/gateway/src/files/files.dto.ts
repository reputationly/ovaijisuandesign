import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

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

export class MergeCandidateDto {
  @IsString()
  @IsNotEmpty()
  candidateId!: string;
}

export class LocateAssetDto {
  @IsString()
  @IsNotEmpty()
  newPath!: string;
}

export class MkdirDto {
  @IsString()
  @IsNotEmpty()
  path!: string;
}

export class RenameDto {
  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsString()
  @IsNotEmpty()
  new_name!: string;
}

/** 移动 / 复制：`target` 是工作区里已经存在的目录。 */
export class MoveDto {
  @IsArray()
  @IsString({ each: true })
  paths!: string[];

  @IsString()
  @IsNotEmpty()
  target!: string;
}

export class TrackFileDto {
  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CheckConflictItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/\\\0]+$/, { message: "name must be a basename without path separators or NUL" })
  name!: string;

  @IsOptional()
  @IsString()
  sourcePath?: string;

  @IsOptional()
  @IsIn(["file", "folder"])
  kind?: "file" | "folder";
}

export class CheckConflictsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @ValidateNested({ each: true })
  @Type(() => CheckConflictItemDto)
  items!: CheckConflictItemDto[];

  @IsOptional()
  @IsString()
  targetDir?: string;
}

export class AdoptFilesDto extends PathsDto {
  @IsString()
  @IsNotEmpty()
  targetDir!: string;
}

export class MentionSearchQueryDto {
  @IsString()
  workspace!: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ProjectAssetMentionSearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AnchorProjectAssetItemDto {
  @IsString()
  path!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  projectFolderName?: string;
}

/** `items` 是带身份的新写法；只给 `paths` 的老调用照样能锚定，只是不进台账。 */
export class AnchorProjectAssetDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @ValidateNested({ each: true })
  @Type(() => AnchorProjectAssetItemDto)
  items?: AnchorProjectAssetItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @IsString({ each: true })
  paths?: string[];
}

export class ProjectAssetMutationEventDto {
  @IsString()
  @IsIn(["content-replaced", "deleted", "rekeyed"])
  type!: "content-replaced" | "deleted" | "rekeyed";

  @IsString()
  assetId!: string;

  @IsString()
  projectFolderName!: string;

  @IsOptional()
  @IsString()
  sourcePath?: string;

  @IsOptional()
  @IsString()
  previousAssetId?: string;
}

export class ProjectAssetPropagateDto {
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_PATHS)
  @ValidateNested({ each: true })
  @Type(() => ProjectAssetMutationEventDto)
  events!: ProjectAssetMutationEventDto[];
}
