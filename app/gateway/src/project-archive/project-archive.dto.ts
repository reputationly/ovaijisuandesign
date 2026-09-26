import { IsArray, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from "class-validator";

import type { OpenCodeArchivePayload } from "./opencode-archive.js";
import type { VaultRename } from "./vault-path-rewrite.js";

export class PrepareExportRequestDto {
  @IsString() @IsNotEmpty() dir!: string;
}

export class OpenCodeExportRequestDto {
  @IsString() @IsNotEmpty() dir!: string;
  /** 只导这一个会话和它的子会话（反馈时只带出问题的那段对话）。 */
  @IsOptional() @IsString() @IsNotEmpty() sessionId?: string;
}

export class AssetHashesRequestDto {
  @IsString() @IsNotEmpty() dir!: string;
}

export class OpenCodeImportRequestDto {
  @IsObject() payload!: OpenCodeArchivePayload;
  @IsString() @IsNotEmpty() oldDir!: string;
  @IsString() @IsNotEmpty() newDir!: string;
  /** opencode 进程实际读写的那份库。不给就按环境变量找。 */
  @IsOptional() @IsString() @IsNotEmpty() dbPath?: string;
}

export class VaultPathRewriteRequestDto {
  @IsString() @IsNotEmpty() vaultDbPath!: string;
  @IsOptional() @IsArray() renames?: VaultRename[];
}

export const ACTIVITY_OPERATIONS = ["project-archive-export", "canvas-tag-download"] as const;

export class ProjectExportActivityStartDto {
  @IsString() @IsNotEmpty() dir!: string;
  @IsString() @IsNotEmpty() leaseId!: string;
  @IsInt() @Min(1) ownerPid!: number;
  @IsOptional() @IsIn(ACTIVITY_OPERATIONS) operation?: (typeof ACTIVITY_OPERATIONS)[number];
}

export class ProjectExportActivityLeaseDto {
  @IsString() @IsNotEmpty() leaseId!: string;
}
