import { existsSync } from "node:fs";
import path from "node:path";

import { BadRequestException, Controller, Get, Module, Query } from "@nestjs/common";

import { GatewayConfig } from "../config/gateway-config.js";

const ENTITY_TYPES = ["character", "scene", "style_pack", "prop", "custom"];
const ENTITY_SORT_MODES = ["updated_at", "use_count"];

/**
 * 资产中心（跨工作区的角色 / 场景 / 风格库）的只读入口。
 *
 * 资产中心是本机的一个 SQLite 库，放在 `<数据根>/.asset-center/meta/asset-center.sqlite`，
 * 只有第一次写入（新建实体、导入）时才建。写入还没做，所以这里走的是「库还没建」的分支：
 * 列表回空、`library-status` 报未初始化 —— 渲染层靠后者区分「从没用过」和「建了但是空的」。
 * 参数校验照样做，写错的 type / limit / sort 回 400，免得以后接上真实数据时行为变化。
 */
@Controller("api/asset-center")
export class AssetCenterController {
  constructor(private readonly config: GatewayConfig) {}

  @Get("entities")
  listEntities(@Query("type") type?: string, @Query("limit") limit?: string, @Query("sort") sort?: string) {
    if (type !== undefined && !ENTITY_TYPES.includes(type)) {
      throw new BadRequestException({ code: "invalid_request", message: `Unknown entity type "${type}"; expected one of: ${ENTITY_TYPES.join(", ")}` });
    }
    if (limit !== undefined) {
      const n = Number.parseInt(limit, 10);
      if (!Number.isFinite(n) || n <= 0) throw new BadRequestException({ code: "invalid_request", message: `Invalid limit: ${limit}` });
    }
    if (sort !== undefined && !ENTITY_SORT_MODES.includes(sort)) {
      throw new BadRequestException({ code: "invalid_request", message: `Unknown sort mode "${sort}"; expected one of: ${ENTITY_SORT_MODES.join(", ")}` });
    }
    return { entities: [] };
  }

  @Get("library-status")
  libraryStatus() {
    return { initialized: existsSync(path.join(this.root(), "meta", "asset-center.sqlite")) };
  }

  @Get("workspace-refs")
  workspaceRefs(@Query("workspace") workspace?: string) {
    if (!workspace) throw new BadRequestException({ code: "invalid_request", message: "workspace query param is required" });
    if (!path.isAbsolute(workspace)) throw new BadRequestException({ code: "invalid_request", message: "workspace must be an absolute path" });
    return { refs: [] };
  }

  /** 和主进程同一套规则：环境变量覆盖优先，否则放在应用数据根下。 */
  private root(): string {
    return process.env.HILO_ASSET_CENTER_DIR?.trim() || path.join(this.config.hubDir, ".asset-center");
  }
}

@Module({ controllers: [AssetCenterController] })
export class AssetCenterModule {}
