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
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { CANVAS_NODE_TYPES } from "@ov/protocol";

import {
  FILTER_MATCH_MODES,
  FILTER_OPS,
  TABLE_FIELD_TYPES,
  TABLE_ROW_HEIGHTS,
  type TableFieldType,
  type TableRowHeight,
} from "./table-document.js";

export class PositionDto {
  @IsInt() x!: number;
  @IsInt() y!: number;
}

export class ListNodesQueryDto {
  @IsOptional() @IsIn(CANVAS_NODE_TYPES as unknown as string[]) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

export class NodeIdsDto {
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) nodeIds!: string[];
}

export class FocusDto extends NodeIdsDto {
  @IsOptional() @IsNumber() @Min(0) @Max(2) padding?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) duration?: number;
}

export class SelectionDto {
  @IsArray() @IsString({ each: true }) nodeIds!: string[];
}

export class TextEditStateDto {
  @IsString() @IsNotEmpty() nodeId!: string;
  @IsString() @IsNotEmpty() editSessionId!: string;
  @IsBoolean() active!: boolean;
}

export class WriteTextNodeDto {
  @IsString() @IsNotEmpty() content!: string;
  @IsOptional() @IsString() nodeId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @ValidateNested() @Type(() => PositionDto) position?: PositionDto;
  @IsOptional() @IsArray() @IsString({ each: true }) sourceNodeIds?: string[];
  @IsOptional() @IsIn(["replace", "append", "prepend"]) mode?: "replace" | "append" | "prepend";
  @IsOptional() @IsIn(["auto-newline", "none"]) appendSeparator?: "auto-newline" | "none";
  @IsOptional() @IsString() expectedContentHash?: string;
  @IsOptional() @IsIn(["auto", "suppress"]) review?: "auto" | "suppress";
}

export class TextEditDto {
  @IsString() @IsNotEmpty() annotationId!: string;
  @IsOptional() @IsInt() @Min(0) targetIndex?: number;
  @IsString() @IsNotEmpty() exact!: string;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() suffix?: string;
  @IsOptional() @IsInt() @Min(0) occurrence?: number;
  @IsString() replacement!: string;
}

export class ApplyTextEditsDto {
  @IsOptional() @IsString() @IsNotEmpty() requestId?: string;
  @IsOptional() @IsString() editSessionId?: string;
  @IsString() @IsNotEmpty() nodeId!: string;
  @IsString() @IsNotEmpty() expectedContentHash!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TextEditDto) edits!: TextEditDto[];
}

export class MediaNodeDto {
  @IsString() @IsNotEmpty() assetPath!: string;
  @IsOptional() @ValidateNested() @Type(() => PositionDto) position?: PositionDto;
  @IsOptional() @IsArray() @IsString({ each: true }) sourceNodeIds?: string[];
  @IsOptional() @IsBoolean() allowDuplicate?: boolean;
}

export class GroupDto {
  @IsArray() @ArrayMinSize(2) @IsString({ each: true }) nodeIds!: string[];
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsIn(["grid", "vertical"]) layout?: "grid" | "vertical";
}

export class UngroupDto {
  @IsString() @IsNotEmpty() groupId!: string;
}

export class GroupRecentDto {
  @IsOptional() @IsString() label?: string;
}

export class PlaceholderDto {
  @IsString() @IsNotEmpty() sourceNodeId!: string;
  @IsString() @IsNotEmpty() prompt!: string;
  @IsString() @IsNotEmpty() model!: string;
  @IsOptional() @IsString() mediaType?: string;
  @IsOptional() @IsString() aspectRatio?: string;
}

export class PlaceholderFailDto {
  @IsString() @IsNotEmpty() placeholderId!: string;
  @IsString() @IsNotEmpty() errorMessage!: string;
  @IsOptional() @IsString() errorReason?: string;
  @IsOptional() retryPayload?: unknown;
}

export class PlaceholderCleanupDto {
  @IsString() @IsNotEmpty() placeholderId!: string;
}

export class SearchQueryDto {
  @IsString() @IsNotEmpty() query!: string;
  @IsOptional() @IsIn(CANVAS_NODE_TYPES as unknown as string[]) type?: string;
  @IsOptional() @IsString() fields?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

// ---------------------------------------------------------------------------
// 表格节点（canvas_write_node kind=table）
// ---------------------------------------------------------------------------

export class TableColumnInputDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsIn(TABLE_FIELD_TYPES as unknown as string[]) type?: TableFieldType;
  @IsOptional() @IsBoolean() visible?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(40) @Max(2000) width?: number;
}

export class TableRowInputDto {
  /** 按列下标排的单元格值；附件列是数组。类型不在这里校验，由文档构建时按列类型筛。 */
  @IsArray() cells!: unknown[];
}

export class TableFilterConditionInputDto {
  @Type(() => Number) @IsInt() @Min(0) columnIndex!: number;
  @IsIn(FILTER_OPS as unknown as string[]) op!: (typeof FILTER_OPS)[number];
  @IsOptional() value?: unknown;
}

export class TableFilterInputDto {
  @IsIn(FILTER_MATCH_MODES as unknown as string[]) match!: (typeof FILTER_MATCH_MODES)[number];
  @IsArray() @ValidateNested({ each: true }) @Type(() => TableFilterConditionInputDto) conditions!: TableFilterConditionInputDto[];
}

export class WriteTableNodeDto {
  @IsOptional() @IsString() nodeId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @ValidateNested() @Type(() => PositionDto) position?: PositionDto;
  @IsOptional() @IsArray() @IsString({ each: true }) sourceNodeIds?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TableColumnInputDto) columns?: TableColumnInputDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TableRowInputDto) rows?: TableRowInputDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => TableFilterInputDto) filter?: TableFilterInputDto;
  @IsOptional() @IsIn(TABLE_ROW_HEIGHTS as unknown as string[]) rowHeight?: TableRowHeight;
}
