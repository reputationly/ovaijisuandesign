import { existsSync } from "node:fs";
import path from "node:path";

import { Controller, Get, NotFoundException, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { WorkspacePathService } from "../common/workspace-path.service.js";

import {
  APOLLO_DEFAULTS,
  EMPTY_GROUP_LIST,
  EMPTY_POPUP,
  EMPTY_PROMOTION,
  EMPTY_VIDEO_TRIAL_STATUS,
  EMPTY_WALLET,
  PRICING_DISABLED,
  TEAM_CONTRACT_UNAVAILABLE,
} from "./cloud-defaults.js";
import {
  HOME_QUICK_START_CONFIG,
  HOME_SHOWCASE_ASSET_FILES,
  HOME_SHOWCASE_ASSET_ROUTE,
  homeShowcaseDir,
} from "./home-showcase.js";
import { loadShowcaseCloudConfig, showcaseMediaEntry } from "./home-quick-start-cloud.js";
import { showcaseCacheDir } from "./showcase-warm.js";

/**
 * 云端配置类路由的本地实现：客户端配置、Apollo 配置项、首页快速开始、全局弹窗、计费活动。
 * 全部回本地默认值（见 cloud-defaults.ts），不发任何网络请求。
 */
@Controller()
export class CloudConfigController {
  constructor(private readonly paths: WorkspacePathService) {}

  /** 客户端配置：云端失败时就回 `{}`，渲染层据此判定「没有进行中的活动」。 */
  @Get("api/v1/client_config")
  clientConfig() {
    return {};
  }

  /** 应用级配置（更新提示、首页挂件、启动弹窗排期……）：`{}` 让每一项都落到渲染层的默认值。 */
  @Get("api/v1/hub/client_config")
  hubClientConfig() {
    return {};
  }

  /** 单个 Apollo 配置项。只认渲染层实际会取的那些 key；不认识的 key 等同于云端没有这一项。 */
  @Get("api/v1/apollo/config")
  apolloConfig(@Query("key") key?: string) {
    if (!key) return {};
    if (!Object.hasOwn(APOLLO_DEFAULTS, key)) throw new NotFoundException(`Apollo config not found: ${key}`);
    return APOLLO_DEFAULTS[key];
  }

  /**
   * 首页快速开始（v2）：云端原文（8 分区 165 条示例，见 home-quick-start-cloud.ts），
   * 图片地址已重写成静态路由。原文文件缺失（发布包漏拷 / 仓库不完整）时退回手写兜底配置
   * （home-showcase.ts 的 4 场景），保证首页有东西可渲染。`config_version` 只影响云端取哪一版，本地只有一版。
   */
  @Get("api/v1/home/quick_start_config")
  homeQuickStartConfig() {
    return localQuickStartConfig();
  }

  /**
   * 首页示例用到的素材。三级，**顺序不能换**：
   * 1. **可写缓存**（`HILO_HOMESHOWCASE_CACHE`，通常是 userData/home-showcase/media）——
   *    首启预热写在这里（见 showcase-warm.ts）。开发时仓库里的 media/ 已经有全套，所以这一级
   *    基本不命中；发布包里没有素材，靠预热把它填上。
   * 2. **包内 / 仓库内**的 `media/`（开发时是 assets/home-showcase/media，468MB 全套）。
   * 3. 都没有 → 302 回 CDN，界面照常工作，只是图走网络。
   *
   * 缓存排在包内之前，是为了让「预热写的新图」和「包里自带的图」在同名时以预热为准 ——
   * 预热拿到的是更新过的 CDN 版本，而包里那份可能是上一次发布时抓的旧图。
   *
   * legacy 那 8 个文件名 + 教程 PDF 不走这套，它们必须来自包内（用户点开示例要把附件
   * 塞进输入框，302 到 CDN 的话附件会是跨域 URL，行为和官方不一致）。
   *
   * 名字不在登记表里一律 404，不拿请求里的路径去拼文件系统路径。
   * 渲染层点示例时会把附件整个下载下来塞进输入框，所以这里要回真实的 Content-Type（sendFile 按扩展名给）。
   */
  @Get(`${HOME_SHOWCASE_ASSET_ROUTE}/:name`)
  homeShowcaseAsset(@Param("name") name: string, @Res() res: Response) {
    const dir = homeShowcaseDir();
    if (!dir) throw new NotFoundException();
    const media = showcaseMediaEntry(name);
    if (media) {
      const cached = path.join(showcaseCacheDir(this.paths), name);
      if (existsSync(cached)) return res.sendFile(cached, { dotfiles: "allow" });
      const file = path.join(dir, "media", name);
      if (existsSync(file)) return res.sendFile(file, { dotfiles: "allow" });
      return res.redirect(302, media.cdnUrl);
    }
    if (!(HOME_SHOWCASE_ASSET_FILES as readonly string[]).includes(name)) throw new NotFoundException();
    // 路径里的上级目录可能带点开头（比如开发时的 .claude/worktrees/…），sendFile 默认会当隐藏文件拒掉。
    return res.sendFile(path.join(dir, name), { dotfiles: "allow" });
  }

  @Get("api/v1/credit/wallet")
  creditWallet() {
    return EMPTY_WALLET;
  }

  @Get("api/v1/billing/pricing")
  billingPricing() {
    return PRICING_DISABLED;
  }

  @Get("api/v1/team/contract")
  teamContract() {
    return TEAM_CONTRACT_UNAVAILABLE;
  }

  @Get("backend/group/list")
  groupList() {
    return EMPTY_GROUP_LIST;
  }

  @Get("api/v1/popup")
  popup() {
    return EMPTY_POPUP;
  }

  @Get("api/v1/billing/promotion")
  billingPromotion() {
    return EMPTY_PROMOTION;
  }

  @Get("api/v1/promotions/hailuo03-video-trial/status")
  videoTrialStatus() {
    return EMPTY_VIDEO_TRIAL_STATUS;
  }

  /** 领取失败和查询失败回的是同一份空状态：渲染层据此提示「活动不可用」。 */
  @Post("api/v1/promotions/hailuo03-video-trial/claim")
  claimVideoTrial() {
    return EMPTY_VIDEO_TRIAL_STATUS;
  }
}

/**
 * 云端原文配置（重写后），加载失败退回手写兜底。进程内缓存，加载失败也缓存兜底结果。
 */
let quickStartConfigCache: unknown;
function localQuickStartConfig(): unknown {
  if (quickStartConfigCache !== undefined) return quickStartConfigCache;
  try {
    quickStartConfigCache = loadShowcaseCloudConfig().config;
  } catch (error) {
    console.warn(`[cloud-config] 云端创作灵感配置不可用，退回手写兜底：${error instanceof Error ? error.message : error}`);
    quickStartConfigCache = HOME_QUICK_START_CONFIG;
  }
  return quickStartConfigCache;
}
