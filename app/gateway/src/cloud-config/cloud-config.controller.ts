import { Controller, Get, NotFoundException, Post, Query } from "@nestjs/common";

import { APOLLO_DEFAULTS, EMPTY_POPUP, EMPTY_PROMOTION, EMPTY_VIDEO_TRIAL_STATUS, HOME_QUICK_START_DEFAULT } from "./cloud-defaults.js";

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

  /** 首页快速开始（场景 + 精选技能）。`config_version` 只影响云端取哪一版，本地只有一版。 */
  @Get("api/v1/home/quick_start_config")
  homeQuickStartConfig() {
    return HOME_QUICK_START_DEFAULT;
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
