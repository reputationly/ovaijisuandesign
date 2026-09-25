import { Controller, Get, Module } from "@nestjs/common";

/**
 * HTML 插件。还不支持安装插件，已装插件目录永远是空的，列表就是空的；
 * 渲染层（插件轮播、画布的插件入口）按空列表直接不显示。
 */
@Controller("api/plugins")
export class PluginsController {
  @Get()
  listPlugins() {
    return { plugins: [] };
  }
}

@Module({ controllers: [PluginsController] })
export class PluginsModule {}
