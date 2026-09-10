# 画布交互面对照表

由 `scripts/extract-canvas-surface.py` 从 MiniMax Design **3.0.12** 的 renderer
产物提取，应用升级后重跑。

**这张表存在的意义**：之前是等用户报「这里跟官方不一样」再去扒对应那一段 ——
必然是他先发现、我再补，一条一条来。一次性把清单导出来，才能自己按表走完。

> 只记接口事实（动作 id、菜单文案），不含任何官方文件的原文。

## 总量

| | 官方 | 我们 |
|---|---|---|
| `data-action-ui-id` | 1528 | 15 |
| 其中画布相关 | 323 | 8 |
| 带文案的菜单项 | 63 | — |

官方的节点类型：Audio, File, Group, Image, Placeholder, Sticker, Table, Text, Video

> `data-action-ui-id` 是官方的**埋点属性，不是功能计数**。我们只在逐字照搬
> 他们标记的几处顺带抄了下来，实际交互点远不止表里这几个（70 个 `<button>`、
> 107 处 `onClick`）。要看功能差距，看下面的菜单项。

## 菜单项（63）

| 动作 id | 文案 | 说明 | 我们 |
|---|---|---|---|
| `asset-panel.view-grid` | 网格视图 |  |  |
| `asset-panel.view-tree` | 树形视图 |  |  |
| `canvas-sidebar-asset-center.view-grid` | 网格视图 |  |  |
| `canvas-sidebar-asset-center.view-tree` | 树形视图 |  |  |
| `canvas-sidebar.tab-assets` | 资产 |  |  |
| `canvas-sidebar.tab-canvas` | 画布 |  |  |
| `canvas-text-add-to-chat` | 添加到对话 |  |  |
| `canvas-text-copy` | 复制内容 |  |  |
| `canvas-text-edit` | 文本编辑 |  |  |
| `canvas-text-find-open` | 查找 |  |  |
| `canvas-text-redo` | 重做 |  |  |
| `canvas-text-undo` | 撤销 |  |  |
| `canvas.comfyui.run` | 运行 |  |  |
| `canvas.file-node.add-to-chat` | 添加到对话 |  |  |
| `canvas.file-node.fullscreen` | 刷新 |  |  |
| `canvas.file-node.refresh` | 刷新 |  |  |
| `canvas.file-node.run` | 执行 |  |  |
| `canvas.file-node.view-card` | 卡片视图 |  |  |
| `canvas.file-node.view-preview` | 预览视图 |  |  |
| `canvas.group-background-reset` | 清除颜色 |  |  |
| `canvas.menu-add-audio` | 音频 | 音效、配音、音乐 |  |
| `canvas.menu-add-comfyui` | ComfyUI 工作流 | 节点式 AI 绘图工作流，全屏打开编辑 |  |
| `canvas.menu-add-director-stage` | 3D 导演台 | 角色、机位与运镜编排 |  |
| `canvas.menu-add-image` | 图片 | 海报、分镜、角色设计 |  |
| `canvas.menu-add-table` | 表格 | 结构化的行列数据 |  |
| `canvas.menu-add-text` | 文本 | 剧本、广告词、品牌文案 |  |
| `canvas.menu-add-video` | 视频 | 创意广告、动画、电影 |  |
| `canvas.menu-add-video-editing` | 视频剪辑 | 多轨时间线剪辑，全屏打开编辑 |  |
| `canvas.menu-comfyui-new-node` | 新建工作流 | 创建一个空的 ComfyUI 工作流 |  |
| `canvas.node-add-to-chat` | 添加到对话 |  |  |
| `canvas.node-add-to-clip-node` | 添加到剪辑节点 |  |  |
| `canvas.node-promote-to-asset` | 存为资产 |  |  |
| `canvas.pane-menu-add-block` | 添加节点 |  |  |
| `canvas.pane-menu-paste` | 粘贴 |  |  |
| `canvas.pane-menu-redo` | 重做 |  |  |
| `canvas.pane-menu-undo` | 撤销 |  |  |
| `canvas.pane-menu-upload` | 上传 |  |  |
| `canvas.panorama-node` | 全屏 |  |  |
| `canvas.plugin-node.add-to-chat` | 添加到对话 |  |  |
| `canvas.plugin-node.fullscreen` | 刷新 |  |  |
| `canvas.plugin-node.open-launcher` | 运行 |  |  |
| `canvas.plugin-node.refresh` | 刷新 |  |  |
| `canvas.plugin-node.run` | 执行 |  |  |
| `canvas.sticker-copy-node` | 复制贴纸 |  |  |
| `canvas.sticker-delete-node` | 删除 |  |  |
| `canvas.table-node` | 全屏编辑 |  |  |
| `canvas.tag-filter-clear` | 清除筛选 |  |  |
| `canvas.tag-filter-next` | 下一个标签节点 |  |  |
| `canvas.tag-filter-previous` | 上一个标签节点 |  |  |
| `canvas.tag-palette-manage` | 清除筛选 |  |  |
| `canvas.toolbar-fit` | 放大 |  |  |
| `canvas.zoom-menu-in` | 缩小 |  |  |
| `project-assets-panel.view-grid` | 网格视图 |  |  |
| `project-assets-panel.view-tree` | 树形视图 |  |  |
| `team.management-purchase` | 去购买 |  |  |
| `team.management.open` | 团队管理 |  |  |
| `user-menu.changelog` | 更新日志 |  |  |
| `user-menu.debug-panel` | 调试面板 |  |  |
| `user-menu.logout` | 退出登录 |  |  |
| `user-menu.memory-management` | 记忆管理 |  |  |
| `user-menu.settings` | 设置 |  |  |
| `user-menu.tutorial` | 教程 |  |  |
| `user-menu.ui-spec` | UI组件预览 |  |  |

## 画布动作 id 分类

| 前缀 | 官方 | 我们 |
|---|---|---|
| `canvas.sidebar` | 36 | 0 |
| `canvas.image` | 31 | 7 |
| `canvas.video` | 30 | 0 |
| `canvas.text` | 29 | 0 |
| `canvas.tag` | 24 | 0 |
| `canvas.node` | 17 | 1 |
| `canvas.toolbar` | 16 | 0 |
| `canvas.media` | 15 | 0 |
| `canvas.file` | 14 | 0 |
| `canvas.watermark` | 13 | 0 |
| `canvas.source` | 7 | 0 |
| `canvas.group` | 7 | 0 |
| `canvas.erase` | 6 | 0 |
| `canvas.multi` | 6 | 0 |
| `canvas.enhance` | 5 | 0 |
| `canvas.help` | 5 | 0 |
| `canvas.relight` | 5 | 0 |
| `canvas.comfyui` | 4 | 0 |
| `canvas.storyboard` | 4 | 0 |
| `canvas.hailuo03` | 3 | 0 |
| `canvas.load` | 3 | 0 |
| `canvas.params` | 3 | 0 |
| `canvas.save` | 3 | 0 |
| `canvas.selection` | 3 | 0 |
| `canvas.sticker` | 3 | 0 |
| `canvas.asset` | 2 | 0 |
| `canvas.add` | 2 | 0 |
| `canvas.appearance` | 2 | 0 |
| `canvas.asr` | 2 | 0 |
| `canvas.empty` | 2 | 0 |
| `canvas.layer` | 2 | 0 |
| `canvas.panorama` | 2 | 0 |
| `canvas.plugin` | 2 | 0 |
| `canvas.assets` | 1 | 0 |
| `canvas.audio` | 1 | 0 |
| `canvas.command` | 1 | 0 |
| `canvas.global` | 1 | 0 |
| `canvas.menu` | 1 | 0 |
| `canvas.missing` | 1 | 0 |
| `canvas.pane` | 1 | 0 |
| `canvas.placeholder` | 1 | 0 |
| `canvas.promote` | 1 | 0 |
| `canvas.provider` | 1 | 0 |
| `canvas.restoring` | 1 | 0 |
| `canvas.tool` | 1 | 0 |
| `canvas.ungroup` | 1 | 0 |
| `canvas.utility` | 1 | 0 |
| `canvas.viewport` | 1 | 0 |
