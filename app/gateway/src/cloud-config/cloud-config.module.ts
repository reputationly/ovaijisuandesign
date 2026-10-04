import { Module } from "@nestjs/common";

import { CloudConfigController } from "./cloud-config.controller.js";
import { ShowcaseWarmer } from "./showcase-warm.js";

/**
 * `ShowcaseWarmer` 在 `OnApplicationBootstrap` 里 fire-and-forget 地预热首页封面，
 * 不 await —— 启动路径不因为下载图片变慢，预热失败也只是首页慢一点。
 */
@Module({ controllers: [CloudConfigController], providers: [ShowcaseWarmer] })
export class CloudConfigModule {}
