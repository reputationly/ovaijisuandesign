import { Controller, Get, Module } from "@nestjs/common";

/**
 * ComfyUI 工作流。不接 ComfyUI：没有用户导入的工作流，精选目录也没有发布（目录本身在云端配置里）。
 * 两个列表都回空，形状和有数据时一样，工作流页和画布的工作流面板显示空状态。
 */
@Controller("api/comfyui")
export class ComfyUiController {
  @Get("workflows")
  listWorkflows() {
    return { workflows: [] };
  }

  @Get("featured-workflows")
  listFeaturedWorkflows() {
    return { workflows: [], total: 0 };
  }
}

@Module({ controllers: [ComfyUiController] })
export class ComfyUiModule {}
