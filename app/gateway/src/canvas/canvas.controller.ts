import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Post, Query } from "@nestjs/common";
import type { CanvasFile } from "@ov/protocol";

import { CanvasDestructiveSaveRejectedError, CanvasInvalidSaveRejectedError, type DeletionIntent } from "./canvas-persistence.js";
import { CanvasService } from "./canvas.service.js";
import {
  ApplyTextEditsDto,
  FileNodeDto,
  FocusDto,
  GroupDto,
  GroupRecentDto,
  ListNodesQueryDto,
  MediaNodeDto,
  NodeIdsDto,
  NodesGroupDto,
  PlaceholderCleanupDto,
  PlaceholderDto,
  PlaceholderFailDto,
  PlaceholderGroupDto,
  PluginDataReadDto,
  PluginDataWriteDto,
  RevertTextEditsDto,
  SearchQueryDto,
  SelectionDto,
  TextEditStateDto,
  UngroupDto,
  WriteTableNodeDto,
  WriteTextNodeDto,
} from "./canvas.dto.js";

/** 把画布写入被拒的两类错误映射成 409，body 里带机器可读的 code。 */
async function guarded<T>(fn: () => Promise<T>, source: "renderer" | "gateway"): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof CanvasDestructiveSaveRejectedError) {
      throw new HttpException(
        {
          statusCode: 409,
          error: "Conflict",
          code: "CANVAS_DESTRUCTIVE_SAVE_REJECTED",
          reason: err.reason,
          message:
            source === "renderer"
              ? "Canvas save was rejected because graph elements disappeared without an authorized deletion operation."
              : "Canvas mutation was blocked because its deletion proof was incomplete.",
          currentNodeCount: err.currentNodeCount,
          incomingNodeCount: err.incomingNodeCount,
        },
        HttpStatus.CONFLICT,
      );
    }
    if (err instanceof CanvasInvalidSaveRejectedError) {
      throw new HttpException(
        {
          statusCode: 409,
          error: "Conflict",
          code: "CANVAS_INVALID_SAVE_REJECTED",
          message: "Canvas save was rejected because the graph snapshot is structurally invalid.",
        },
        HttpStatus.CONFLICT,
      );
    }
    throw err;
  }
}

/** 渲染层保存时附带的删除意图：字段不齐就当没给（按"没有删除证据"处理）。 */
function parseSaveRequest(body: Record<string, unknown>): { canvas: CanvasFile; deletionIntent?: DeletionIntent } {
  const { deletionIntent: c, ...canvas } = body as { deletionIntent?: any } & Record<string, unknown>;
  const ok =
    c &&
    typeof c.operationId === "string" &&
    c.operationId.trim() &&
    (c.version === undefined || c.version === 1) &&
    Array.isArray(c.removedNodeIds) &&
    c.removedNodeIds.every((x: unknown) => typeof x === "string") &&
    (c.removedEdgeIds === undefined || (Array.isArray(c.removedEdgeIds) && c.removedEdgeIds.every((x: unknown) => typeof x === "string"))) &&
    (c.highBlastConfirmed === undefined || typeof c.highBlastConfirmed === "boolean");
  return { canvas: canvas as unknown as CanvasFile, deletionIntent: ok ? c : undefined };
}

@Controller("api/canvas")
export class CanvasController {
  constructor(private readonly canvas: CanvasService) {}

  @Get()
  get() {
    return this.canvas.getCanvas();
  }

  /** 整份保存。body 是画布本身（不走 DTO 白名单：画布里有大量客户端自带的字段）。 */
  @Post()
  save(@Body() body: Record<string, unknown>) {
    const { canvas, deletionIntent } = parseSaveRequest(body);
    return guarded(() => this.canvas.replaceCanvas(canvas, deletionIntent), "renderer");
  }

  @Get("nodes")
  nodes(@Query() q: ListNodesQueryDto) {
    return this.canvas.listNodes(q);
  }

  @Post("nodes/detail")
  detail(@Body() b: NodeIdsDto) {
    return this.canvas.nodeDetails(b.nodeIds);
  }

  @Post("nodes/delete")
  deleteNodes(@Body() b: NodeIdsDto) {
    return guarded(() => this.canvas.deleteNodes(b.nodeIds), "gateway");
  }

  @Post("focus")
  focus(@Body() b: FocusDto) {
    return this.canvas.focus(b.nodeIds, b.padding, b.duration);
  }

  @Get("search")
  search(@Query() q: SearchQueryDto) {
    return this.canvas.search(q);
  }

  @Get("selection")
  selection() {
    return this.canvas.getSelection();
  }

  @Post("selection")
  @HttpCode(204)
  setSelection(@Body() b: SelectionDto) {
    this.canvas.setSelection(b.nodeIds);
  }

  @Post("text-edit-state")
  @HttpCode(204)
  textEditState(@Body() b: TextEditStateDto) {
    this.canvas.setTextEditState(b);
  }

  @Post("text-node")
  textNode(@Body() b: WriteTextNodeDto) {
    return guarded(() => this.canvas.writeTextNode(b), "gateway");
  }

  @Post("text-node/apply-edits")
  applyEdits(@Body() b: ApplyTextEditsDto) {
    return this.canvas.applyTextEdits(b);
  }

  @Post("text-node/revert-edits")
  revertEdits(@Body() b: RevertTextEditsDto) {
    return this.canvas.revertTextEdits(b);
  }

  @Post("table-node")
  tableNode(@Body() b: WriteTableNodeDto) {
    return guarded(() => this.canvas.writeTableNode(b), "gateway");
  }

  @Post("media-node")
  mediaNode(@Body() b: MediaNodeDto) {
    return guarded(() => this.canvas.mediaNode(b), "gateway");
  }

  @Post("file-node")
  fileNode(@Body() b: FileNodeDto) {
    return guarded(() => this.canvas.fileNode(b), "gateway");
  }

  @Post("plugin-data")
  pluginData(@Body() b: PluginDataWriteDto) {
    return this.canvas.writePluginData(b);
  }

  @Post("plugin-data/read")
  pluginDataRead(@Body() b: PluginDataReadDto) {
    return this.canvas.readPluginData(b);
  }

  /** 不走 DTO：参数不对回一句固定的 400。 */
  @Post("split-sub-images")
  @HttpCode(200)
  splitSubImages(@Body() body: unknown) {
    return guarded(() => this.canvas.splitSubImages(body), "gateway");
  }

  @Post("group")
  group(@Body() b: GroupDto) {
    return guarded(() => this.canvas.group(b), "gateway");
  }

  @Post("ungroup")
  ungroup(@Body() b: UngroupDto) {
    return guarded(() => this.canvas.ungroup(b.groupId), "gateway");
  }

  @Post("group-recent-outputs")
  groupRecent(@Body() b: GroupRecentDto, @Headers("x-session-id") sessionId?: string) {
    return guarded(() => this.canvas.groupRecentOutputs(b.label, sessionId?.trim() || undefined), "gateway");
  }

  @Post("placeholder")
  placeholder(@Body() b: PlaceholderDto) {
    return guarded(() => this.canvas.createPlaceholder(b), "gateway");
  }

  @Post("placeholder-group")
  placeholderGroup(@Body() b: PlaceholderGroupDto) {
    return guarded(() => this.canvas.placeholderGroup(b), "gateway");
  }

  @Post("nodes-group")
  nodesGroup(@Body() b: NodesGroupDto) {
    return guarded(() => this.canvas.nodesGroup(b), "gateway");
  }

  @Post("placeholder/fail")
  @HttpCode(204)
  placeholderFail(@Body() b: PlaceholderFailDto) {
    return this.canvas.failPlaceholder(b);
  }

  @Post("placeholder/cleanup")
  @HttpCode(204)
  placeholderCleanup(@Body() b: PlaceholderCleanupDto) {
    return guarded(() => this.canvas.cleanupPlaceholder(b.placeholderId), "gateway");
  }

  /** 生成状态对账。目前没有要对的，回一个空结果。 */
  @Post("generation/reconcile")
  async reconcile() {
    const c = await this.canvas.getCanvas();
    const inflight = c.nodes.filter(
      (n) => ["placeholder", "image", "video", "audio"].includes(n.type) && ["pending", "generating", "loading"].includes((n.data as any)?.status),
    );
    return { ok: true, terminalized: 0, loaded: true, remaining: inflight.length, updatedNodeIds: [] };
  }
}
