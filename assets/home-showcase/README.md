# 首页「创作灵感」素材

## `quick-start-config-v2.json`

官方云端 `GET /api/v1/home/quick_start_config?config_version=2` 的完整响应原文（319KB），
由官方 3.0.21 应用于 2026-10-01 拉取，从官方应用的 Chromium 磁盘缓存
（`~/Library/Application Support/@hilo/desktop/Cache/Cache_Data/`，Simple Cache 明文 JSON 流）提取。

- 8 个分区 / 165 条示例：工具集成(13)、特效包装(12)、达人营销(7)、电影感开场(18)、
  MV(11)、游戏PV(30)、品牌广告(36)、UI动效(38)。
- 每条示例：中英提示词、`model_id`（该示例用的模型）、参考附件图（64 张）、
  效果演示（封面图 + 视频，165 组，3 条标 `featured`）。
- 774 个 CDN 链接（cdn.hailuoai.com / cdn.hailuoai.video / cdn.hailuo.ai， domestic/overseas 镜像成对），
  公网可下，无需登录。
- **没有技能绑定**（无 `skill` 字段、提示词无 `/技能` 前缀），不需要云端技能市场。

## `media/`（gitignored，~484MB）

`scripts/fetch-home-showcase-images.py` 把配置里全部**图片**（452 个 URL：type=="image" 的附件 + 封面；
video / audio 附件和输出视频不下、运行时走 CDN，共 318 个 URL）
下载到本目录，文件名 = `<sha1(url) 前 16 位>-<原始文件名>`（与
`app/gateway/src/cloud-config/home-quick-start-cloud.ts` 的 `showcaseAssetKey` 一致，
一致性由 `media-manifest.json` 的对账测试保证）。重跑会自动清掉不在 manifest 里的残留文件。

`media-manifest.json` 由下载脚本生成并入库（key → CDN URL，派生数据，防两端派生规则漂移）。

## 应用升级后怎么更新

1. 打一次官方应用，让它的渲染层重新拉 `quick_start_config`（登录状态下会写进缓存）；
2. 用 `scripts/decompile` 之外的任意方式从缓存里重新提取（搜 `quick_start_config` 的
   `1/0/http://127.0.0.1:8001/...` 条目，取 `unix` 时间戳最新、`version_code` 与新参照一致的那份）；
3. 覆盖本文件，重跑 `scripts/fetch-home-showcase-images.py`（增量，已有的文件跳过）。

旧版历史 payload（3.0.12 / 3.0.14 各一份）在提取时也见过，未入库；要对比界面改版时可再从缓存提取。
