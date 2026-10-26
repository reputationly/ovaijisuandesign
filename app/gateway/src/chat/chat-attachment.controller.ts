import { Body, Controller, HttpCode, Logger, Param, Post } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";

const CHAT_TURN_ID_RE = /^[0-9a-f]{32}$/i;
const MAX_PATHS = 32;

interface AttachmentObservationBody {
  paths?: unknown;
  /**
   * v3 的素材：`[{versionId}|{artifactId}|{path}|{url}|{compositionId,memberId}|{resourceId}]`。
   * `design_*` 的产出是 Resource/Version，往往没有路径 —— 只报路径的话 v3 会话的附件归属是空的。
   * 目前只把里面**带路径/URL** 的项送去解析（资源 id 到资产 id 的映射还没有那条链），
   * 其余原样忽略并计数，行为与参照 gateway 一致（它也只消费 paths）。
   */
  materials?: unknown;
  tool_call_id?: unknown;
  chat_turn_id?: unknown;
  direction?: unknown;
  scope?: unknown;
}

/**
 * 对话附件的归属登记：插件 / MCP 报上来"这次工具调用读了 / 产出了哪些文件"，这里把它们解析成资产库的
 * 稳定引用 `{attachment_source: "asset_vault", attachment_id}`，写进对话记录后换了路径也能找回同一个素材。
 *
 * 只做本地解析，不上传：没有云端对话存储，附件永远只在本机资产库里。不在资产库里的路径、逃出工作区的
 * 路径直接跳过，同一个资产只回一次。
 */
@Controller("api/internal/sessions")
export class ChatAttachmentController {
  private readonly log = new Logger("ChatAttachment");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
  ) {}

  @Post(":id/attachment-observations")
  @HttpCode(200)
  observe(@Param("id") sessionId: string, @Body() body: AttachmentObservationBody) {
    const rawPaths = Array.isArray(body?.paths) ? body.paths.filter((v): v is string => typeof v === "string") : [];
    // v3 素材里带路径/URL 的项并入同一条解析链；只有 resourceId/versionId 的项暂时只计数。
    const materials = Array.isArray(body?.materials) ? body.materials.slice(0, MAX_PATHS) : [];
    let materialPaths = 0;
    for (const item of materials) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const location = typeof row.path === "string" ? row.path : typeof row.url === "string" ? row.url : "";
      if (location) {
        rawPaths.push(location);
        materialPaths += 1;
      }
    }
    const paths = rawPaths.slice(0, MAX_PATHS);
    const toolCallId = typeof body?.tool_call_id === "string" ? body.tool_call_id.trim() : "";
    const direction = body?.direction === "input" || body?.direction === "output" ? body.direction : undefined;
    if (!sessionId || paths.length === 0 || !direction) return { attachment_refs: [] };
    // 用户消息里的附件：只查不登记（它们在发送时已经入库了）。
    if (body.scope === "message") return { attachment_refs: direction === "input" && !toolCallId ? this.resolveRefs(paths) : [] };
    if (!toolCallId) return { attachment_refs: [] };
    const turn = typeof body.chat_turn_id === "string" && CHAT_TURN_ID_RE.test(body.chat_turn_id) ? body.chat_turn_id.toLowerCase() : undefined;
    this.log.debug(
      `observe session=${sessionId} tool_call=${toolCallId} direction=${direction}${turn ? ` turn=${turn}` : ""} paths=${paths.length}` +
        (materials.length > 0 ? ` materials=${materials.length} (paths ${materialPaths})` : ""),
    );
    return { attachment_refs: this.resolveRefs(paths) };
  }

  /** 工具产出（生成的图、导出的视频）：和 observations 同一套解析，方向固定为 output。 */
  @Post(":id/attachment-outputs")
  @HttpCode(200)
  outputs(@Param("id") sessionId: string, @Body() body: AttachmentObservationBody) {
    return this.observe(sessionId, { ...(body ?? {}), direction: "output" });
  }

  private resolveRefs(rawPaths: string[]): { attachment_source: "asset_vault"; attachment_id: string }[] {
    const refs: { attachment_source: "asset_vault"; attachment_id: string }[] = [];
    const seenPaths = new Set<string>();
    const seenIds = new Set<string>();
    for (const raw of rawPaths) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const abs = this.paths.resolve(trimmed);
      const rel = abs ? this.paths.relativize(abs) : null;
      if (!rel) {
        this.log.warn(`skip attachment observation: invalid path ${raw}`);
        continue;
      }
      if (seenPaths.has(rel)) continue;
      seenPaths.add(rel);
      let id: string | undefined;
      try {
        id = this.assets.byPath(rel)?.id;
      } catch (err) {
        this.log.warn(`asset ref lookup failed: file=${rel} error=${(err as Error).message}`);
      }
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      refs.push({ attachment_source: "asset_vault", attachment_id: id });
    }
    return refs;
  }
}
