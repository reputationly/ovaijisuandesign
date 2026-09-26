import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Controller, Get, NotFoundException, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

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
import { HOME_QUICK_START_CONFIG, HOME_SHOWCASE_ASSET_FILES, HOME_SHOWCASE_ASSET_ROUTE } from "./home-showcase.js";

/**
 * 云端配置类路由的本地实现：客户端配置、Apollo 配置项、首页快速开始、全局弹窗、计费活动。
 * 全部回本地默认值（见 cloud-defaults.ts），不发任何网络请求。
 */
@Controller()
export class CloudConfigController {
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

  /** 首页快速开始（场景示例 + 精选技能，见 home-showcase.ts）。`config_version` 只影响云端取哪一版，本地只有一版。 */
  @Get("api/v1/home/quick_start_config")
  homeQuickStartConfig() {
    return HOME_QUICK_START_CONFIG;
  }

  /**
   * 首页示例用到的图片 / 附件。只发 HOME_SHOWCASE_ASSET_FILES 里登记过的文件名，别的一律 404。
   * 渲染层点示例时会把附件整个下载下来塞进输入框，所以这里要回真实的 Content-Type（sendFile 按扩展名给）。
   */
  @Get(`${HOME_SHOWCASE_ASSET_ROUTE}/:name`)
  homeShowcaseAsset(@Param("name") name: string, @Res() res: Response) {
    const dir = homeShowcaseDir();
    if (!dir || !(HOME_SHOWCASE_ASSET_FILES as readonly string[]).includes(name)) throw new NotFoundException();
    // 路径里的上级目录可能带点开头（比如开发时的 .claude/worktrees/…），sendFile 默认会当隐藏文件拒掉。
    res.sendFile(path.join(dir, name), { dotfiles: "allow" });
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
 * 示例素材目录：发布包里是 resources/home-showcase，开发时是仓库的 assets/home-showcase
 * （和自带技能 resources/skills ↔ assets/skills 同一个约定）。开发时从本文件往上找，src/ 和 dist/ 下跑都认得。
 */
function homeShowcaseDir(): string | undefined {
  const resources = (process as { resourcesPath?: string }).resourcesPath;
  const candidates = resources ? [path.join(resources, "home-showcase")] : [];
  for (let dir = path.dirname(fileURLToPath(import.meta.url)); ; dir = path.dirname(dir)) {
    candidates.push(path.join(dir, "assets", "home-showcase"));
    if (path.dirname(dir) === dir) break;
  }
  return candidates.find((c) => existsSync(c));
}
