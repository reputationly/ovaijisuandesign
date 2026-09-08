# 独立运行 gateway

把 MiniMax Design 的本地 gateway 从 Electron 应用里剥出来单独跑。
**实测通过** —— 423 条路由全部注册，画布读写、资产库、文件服务、生成提交
都能用，脱离主进程只丢一个功能。

这是「自己写画布前端、复用官方 gateway」这条路线的地基。

## 结论先行

| | 结果 |
|---|---|
| 能否脱离 Electron 主进程启动 | **能**，423 条路由全部注册 |
| 画布读 / 写 | **能**，落盘到 `.hilo/canvas.json` |
| 资产库（SQLite） | **能**，reconcile / 入库 / 列表都正常 |
| 文件服务 + 缩略图 | **能**，`GET /files/{path}`、`?w=` 走 sharp 实时缩放 |
| 生成提交 | **路由挂上了**，校验器正常工作 |
| WebSocket 推送 | **在**，`/ws` |
| 删除到废纸篓 | **降级**为 `fs.rm` 永久删除 —— 唯一的损失 |
| 用纯 node 跑 | **不行**，见「原生模块」 |

## 怎么跑

必须用应用自带的 Electron 当 node（`ELECTRON_RUN_AS_NODE=1`），
原因见下面「原生模块」。

```bash
APP="/Applications/MiniMax Design.app"

ELECTRON_RUN_AS_NODE=1 \
WORKSPACE_DIR=/path/to/workspace \
OUTPUT_DIR=/path/to/workspace \
HILO_GATEWAY_ROLE=workspace \
HILO_GATEWAY_HOST=127.0.0.1 \
PORT=8099 \
NODE_ENV=development \
HILO_RELEASE_REGION=domestic \
HILO_RELEASE_CHANNEL=prod \
  "$APP/Contents/MacOS/MiniMax Design" \
  "$APP/Contents/Resources/gateway/dist/main.js"
```

启动成功的判据：

```
Gateway started — env: development, host: 127.0.0.1, port: 8099,
                  workspace: /path/to/workspace (locked)
nest bootstrap: RouterExplorer=423 InstanceLoader=71 RoutesResolver=69
```

### 环境变量

`packages/config/dist/env.js` 的 `createEnvOverrides()` 是全集：

| 变量 | 落到 | 说明 |
|---|---|---|
| `WORKSPACE_DIR` | `storage.workspaceDir` | **role=workspace 时必填**，缺了 `assertGatewayConfig` 直接 `process.exit(1)` |
| `OUTPUT_DIR` | `storage.outputDir` | 兜底输出目录 |
| `PORT` | `app.port` | 默认 8001 |
| `HILO_GATEWAY_ROLE` | — | `workspace` 或不填（app-level） |
| `HILO_GATEWAY_HOST` | — | 默认 `127.0.0.1` |
| `NODE_ENV` | `app.env` | **别填 `production`**，见「废纸篓」 |
| `HILO_RELEASE_REGION` / `_CHANNEL` | `app.region` | 决定云端网关域名和水印素材 |
| `OPENCODE_URL` | `runtime.openCodeUrl` | 接 OpenCode，不填则 runtime 相关功能不可用 |
| `LOG_LEVEL` / `LOG_PRETTY` | `logger.*` | |
| `HILO_GATEWAY_VERBOSE_BOOT=1` | — | 打印全部 423 条路由 |
| `HILO_MAIN_BRIDGE_URL` / `_TOKEN` | — | 主进程桥，见下 |

`external_api_conf.yaml` 按 `dist/../../conf/` 相对定位，跑官方目录下的入口
时自动找到，不用管。

## 实测通过的接口

```
GET  /api/health/live                    → 200
GET  /api/workspace                      → {"dir":"/path/to/workspace"}
GET  /api/canvas                         → 完整 React Flow 图（nodes + edges）
GET  /api/canvas/nodes                   → {"count":3,"nodes":[…]}
POST /api/canvas/text-node               → 建节点 + 落盘 + 资产入库，一次全做完
GET  /api/assets                         → 资产列表（含 width/height/fileSize）
GET  /files/{workspace-relative-path}    → 200 image/png 原图
GET  /files/{path}?w=256                 → 200 缩略图（sharp 实时缩放）
GET  /api/models/image                   → 模型目录（含 params 的 UI schema）
GET  /api/v1/models/config               → 200
POST /api/generate/image/submit          → 400 + 字段级校验错误（路由已挂）
```

`POST /api/canvas/text-node` 那一次实测：返回
`{nodeId, assetId, path:"探测.md", contentLength:16, created:true}`，
同时 `canvas.json` 从 3 个节点变 4 个、工作区里多出 `探测.md`、
资产库里多一条 —— **三件事一次调用全做完**，这正是自己写前端最不想复刻的部分。

### 写请求不需要身份头

`docs/media-pipeline.md` 里记的 workspace 身份中间件：

```js
requiresCompleteLifetime = expectedInstance && expectedGeneration
                        && req.method !== "GET" && req.method !== "HEAD"
```

`expectedInstance` / `expectedGeneration` 来自
`HILO_WORKSPACE_INSTANCE_ID` / `_GENERATION` 环境变量。**独立启动时不设这两个，
中间件就整个不生效**，POST 直接放行。上面那次 text-node 写入没带任何身份头。

（应用内跑的 gateway 会设，所以那时必须透传 —— 两种场景不冲突。）

## 唯一的降级：删除到废纸篓

`HILO_MAIN_BRIDGE_URL` 在 gateway 里**只被 `TrashService` 一个类用到**，
8 处引用全在它构造函数里。没有桥时：

```
NODE_ENV != production  →  WARN，delete 退化成 fs.rm（永久删除）
NODE_ENV == production  →  ERROR，拒绝所有删除
```

所以独立跑的时候 `NODE_ENV` **不要**填 `production`，否则删不掉任何东西；
填了 `development` 则要接受「删除不进废纸篓」。

主进程桥不是结构性依赖，这是它唯一的用途。

## 原生模块：必须用 Electron 当 node

`gateway/node_modules` 下有三个原生模块：

```
better-sqlite3/build/Release/better_sqlite3.node   资产库
@img/sharp-darwin-arm64                            缩略图 / 水印栅格化
@node-rs/xxhash-darwin-arm64                       资产指纹（xxh3）
```

它们按 **Electron 43 的 ABI（`NODE_MODULE_VERSION` 148）** 编译。
用本机 node v26（ABI 147）跑会一路走穿 NestJS 的整个模块图，
最后倒在第一次开库上：

```
[gateway] Failed to start: Error: The module '…/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 148. This version of Node.js requires NODE_MODULE_VERSION 147.
    at migrateAssetsJsonToSqlite (…/main.js:217134:14)
```

值得注意的是**除此之外没有任何 Electron 依赖** —— 整份 bundle 只 import
`node:` 内置模块（`async_hooks` / `child_process` / `crypto` / `dns` / `events` /
`fs` / `module` / `net` / `os` / `path` / `perf_hooks` / `stream` / `timers` /
`url` / `util` / `zlib`），没有 `require("electron")`。

两个选择：

- **用应用的 Electron 当 node**（当前采用）：零成本，ABI 天然匹配，
  应用升级跟着一起升
- **给纯 node 重编三个原生模块**：能彻底摆脱应用包，但要维护三份原生构建，
  且 `better-sqlite3` 的 schema 要和 gateway 的 11 个 migration 对齐

## 副作用：启动会同步 skill 市场

gateway 一起来就打云端：

```
GET https://design.minimaxi.com/api/v1/skills/market            200
GET https://design.minimaxi.com/api/v1/skills/market/whitelist  200
Whitelist refreshed: 12 skills
Skill "skill-reviewer" version mismatch: local=0.4.1 remote=0.2.8
Skill "skill-creator"  version mismatch: local=2.3.4 remote=2.0.6
Skill "voice-clone"    version mismatch: local=0.4.11 remote=0.4.5
Whitelist sync complete: installed=0 updated=3 failed=0 skipped=0
```

**它会按远端版本覆写 `~/.hub/skills/`，包括「远端比本地旧」的情况**
（上面三个都是降级）。这是应用自己每次启动也在做的事，不是独立运行引入的，
但独立跑一次同样会触发 —— 拿别的工作区做实验时要知道它动的是全局目录。

同理它还会从 tmpfile 恢复登录 token（`TokenService`），所以独立跑的 gateway
**带着你的登录态**，云端调用会真的花官方额度。

## 对「自写画布前端」的意义

要复刻的东西比预想的少得多。gateway 已经提供：

- **画布图的读写与校验** —— `canvasFileSchema`（zod）守着 `nodes` / `edges`
  的图不变式，破坏性写入有防护，坏快照会进隔离区
- **资产库** —— SQLite，xxh3 指纹、inode 追踪、文件移动后自动重绑、
  丢失资产的候选匹配
- **文件服务** —— 原图 + 实时缩略图 + 视频转码播放
- **生成链路** —— 提交 / 轮询 / 恢复对账，也正是 DesignPlusPlus 接管的那一层
- **实时推送** —— `/ws`

缺的只有 React Flow 的自定义节点组件和交互。数据模型是现成的：

```ts
node = { id, type, positions: Record<mode,{x,y}>, size?, sizes?,
         assetId?, groupId?, round?, parentId?, isEmpty?, data?, meta? }
edge = { id, source, sourceHandle?, target, targetHandle?, type, data? }
file = { version, mode, nodes[], edges[], hiddenAssetIds? }
```

`mode` 有四种：`freeform` / `grid` / `storyboard` / `workflow`，
同一个节点在四种模式下各存一套坐标 —— 这是相对 React Flow 原生模型
唯一的结构差异。

## 复现脚本

`scripts/standalone-gateway.sh`。

## 已经验证到哪一步

`apps/canvas-web/` 是照这条路线做的最小前端，**已跑通完整闭环**：

- 打开真实项目、渲染出画布上的图片 / 音频 / 文本节点和 derivation 边
- 四种模式切换，坐标各读各的
- 真实浏览器里拖动节点 → `POST /api/canvas` → 落到 `.hilo/canvas.json`
  （用 CDP 驱动 headless Chrome 验证过，不是 curl 模拟）

一次实测的拖动结果：

```
拖动前      x=37 y=0
拖动后      x=182.85 y=93.49
落盘        ✓ 变了
节点数      4 → 4          ← 没有静默丢节点
边数        1 → 1
assetId     ✓ 保住
```

**「节点数 4 → 4」是这里唯一值得盯的数字。** 整份快照回写最容易犯的错
就是按界面重建文件，把界面上没渲染的节点和不认识的字段一起抹掉 ——
而这种写入结构合法，gateway 的校验拦不住。
