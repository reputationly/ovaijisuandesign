# 剩余工作清单

复刻 MiniMax Design 3.0.16 还剩下哪些事、按什么顺序做、做到什么程度算完。
写于 2026-09-25，基于分支 `replicate-official-stack`。

> 接手前先读完「一、原则」和「三、云端环境须知」。前者是用户明确定下的规矩，后者决定哪些活能在云上做。
> 和参照版本不一致的全部已知项（没做的、故意不做的、做了但行为不同的）见 [`parity-gaps.md`](parity-gaps.md)。

---

## 一、原则（不可违反）

1. **对照重写，不拷代码。**官方代码只当规格读：接口路径、字段名、错误码、类名字符串、设计 token、文案、交互行为要一模一样；实现代码必须自己写。
   - 合并前跑 `python3 scripts/check-verbatim.py <路径>`：逻辑文件和官方逐字相同的长行要低于 5%，模型 id 表这类接口数据不算。
   - Markdown / agent 配置用 `scripts/check-verbatim-md.py`，在 `wip/m8-agent-profiles` 分支上。
2. **代码、注释、测试名、包描述里不写「官方」「official」「MiniMax」。**出处说明只写在 `docs/`。接口值本身例外，比如模型 id `minimax-h3-fl2va`、vendor 值 `"MiniMax"`。
3. **不提交任何 MiniMax 专有文件。**`reference/` 已被 gitignore，只放本机抽出来的材料。
4. **数据目录不和同机的官方应用共用。**
   - 我们用 `~/Movies/蒜狸小助手`、`~/.ovhub` 和自己的 userData。
   - 绝不读写 `~/Movies/Hub`、`~/.hub`、`~/Library/Application Support/@hilo`。
5. **不做的功能：**账号、计费、团队、云端下发、ComfyUI、内置浏览器。界面需要的地方给桩，让界面能正常渲染。
6. 注释用中文，只写「为什么」，风格对齐周围代码；提交信息用中文。

---

## 二、当前状态

### 分支

| 分支 | 内容 |
|---|---|
| `replicate-official-stack` | 主线，已完成的都在这里 |
| `ui-wave-1` | 界面第一波，做到一半，已基于最新主线，**未验证，别直接合** |
| `wip/m8-agent-profiles` | 我们自己的 agent 配置，做到一半 |
| `main` | 旧的 Rust + Tauri 版本，M10 切换前不动 |

### 已完成

| 里程碑 | 内容 | 测试 |
|---|---|---|
| M0–M4 | pnpm + turbo 骨架、`maas-media`（平台适配）、`protocol`、`assets`（SQLite 资产库）、gateway 核心（文件、画布、静态文件、回收站）、Electron 主进程编排 | — |
| M5 | 项目模型与多工作区：最多 5 个工作区同时运行、LRU 挂起、闲置挂起、应用级 gateway、重启恢复和熔断、旧版迁移；主进程 ↔ 渲染层 IPC（`app/desktop/src/main/ipc`、`app/desktop/src/renderer/src/ipc`） | desktop 343 |
| M6 | 聊天链路：gateway ↔ opencode、我们的插件 `opencode-plugin-hilo` | 插件 10 |
| M7 | gateway 生成（异步提交 / 查询、占位卡原地换成结果、重启续等）、编辑路由（ffmpeg、拼接、音频、媒体分析、文档读取、表格节点）、MCP server 重写（33 个工具） | gateway 126、mcp-tools 186、maas-media 129 |

对齐程度：
- gateway 路由 85 / 466。以 `docs/gateway-api.md` 里行首的 ✓ 为准，用 `scripts/extract-gateway-routes.py` 重新生成。
- MCP 工具 33 / 54，另外 21 个在 `app/mcp-tools/src/tools/unsupported.ts` 里注明了原因。

真实平台验证过：对话、出图（`qwen-image-pro`）、文生视频（`minimax-h3-fl2va`）。

### 已知问题

- **主线上画布连不到工作区。**M5 之后 `__HILO_CONFIG__.gatewayUrl` 是应用级 gateway，它没有工作区。现在的旧界面把它当成工作区 gateway 用，所以画布和聊天请求都打错了地方。界面第一波合入后恢复，见 P0-1。
- **界面没有对齐。**主线上跑的还是旧界面原样搬进 Electron 的样子，菜单、画布、聊天都和官方不一样。

---

## 三、云端环境须知

云上的会话**拿不到**下面这些东西：

| 缺什么 | 影响 |
|---|---|
| 官方应用 `/Applications/MiniMax Design.app` 和解包出来的 `/tmp/asar16` | 看不到官方源码，没法从中抽规格 |
| `reference/`（gitignore 了）：`ui-inventory/`、`main-inventory/`、`config-v2/` | 界面清单、主进程服务清单、官方 agent 配置都不在 |
| 用户的平台配置和 key（`~/Library/Application Support/ovaijisuandesign/config.json`） | 不能打真实平台 |
| macOS 图形界面 | 不能启动 Electron、截图、和官方并排比对 |

所以按下面的方式分工：

- **适合云上做**（规格已经在仓库里，或者纯逻辑）：
  - P0-2 M8 收尾里的结构和测试部分；
  - P2 的后端补齐：gateway 路由、主进程服务、飞书 / 微信移植；
  - P3 打包脚本和 CI；
  - 所有单元测试和 e2e 测试（vitest，gateway 用假平台）。
- **必须在本机做**：
  - 需要读官方包的界面工作：P0-1、P1、各界面波次；
  - 截图比对；
  - 真实平台联调。
- **想把界面工作也放到云上**，需要先把 `reference/ui-inventory/`、`reference/main-inventory/` 里的**接口事实**整理进 `docs/`：组件树、类名、token、文案 key、菜单清单、交互说明，不含代码。这一步要用户同意，因为这些清单原本刻意只放在本机。

---

## 四、待办（按优先级）

### P0-1 界面第一波收尾并合入（分支 `ui-wave-1`）

已完成：
- 库版本钉死：React 19.2.4、lucide 0.468.0、Tailwind 4.2.2、Base UI、TanStack Router / Query、zustand、i18next、sonner 等；
- 701 个设计 token 和主题切换；
- 中英文案资源；
- 基础组件；
- 路由和外壳；
- 11 个分区的设置框外壳。

剩余：
1. 工作区页面按工作区连接 gateway：
   - 从 `main.hilo.getWorkspaceRuntime(id)`（或 `workspace-bundle-<id>` 的状态）拿到工作区自己的 gateway 地址。
   - `api.ts` / `chat.ts` 从模块级单例改成每个工作区一份实例，画布、聊天、WS 都指向它。
2. 标签栏：标签列表来自 `listWorkspaceEntries` 加变更事件，再按 `visiblePreviewTabs` 过滤。
   - `lastActiveWorkspacePath`、`visiblePreviewTabs` 通过 `storage:global-set` 写回。
   - 响应 `menu:new-workspace` / `menu:close-tab`。
3. 首页和项目页连应用级 gateway，项目增删改走 `main.project`。
4. 验收：
   - `pnpm --filter @ov/desktop typecheck`、`test`、`build` 全部通过；
   - 启动后能打开两个工作区，画布和聊天都能用；
   - 首页、项目页、设置框（亮色和暗色）和官方并排截图一致，截图放 `/tmp/ui-wave1/`；
   - `check-verbatim.py app/desktop/src/renderer` 达标。

### P0-2 M8 我们自己的 agent 配置（分支 `wip/m8-agent-profiles`）

已写 87 个文件：`config/opencode-v2/base*.json`，`.opencode-v2/` 下的 agents、contracts、knowledge、workflows、plugins。

剩余：
1. 删掉 `.opencode-v2/agents/comfyui-agent.md`，我们不支持 ComfyUI；在 `.opencode-v2/README.md` 里列出所有刻意省略的结构和原因。
2. 补齐 `agents/README.md`、`contracts/README.md`、顶层 `README.md`。
3. 写完三个做到一半的工作流：
   - `workflows/ad-tvc`：导演卡片（direction）；
   - `workflows/drama-series`；
   - `workflows/mv`：`reference/post.md` 在重写中。
4. `base.json` 的 `tools` 白名单必须等于 MCP 实际注册的 33 个工具（带 `hub_` 前缀）。加一个始终运行的测试钉住这一点。
5. 结构对照测试，放在 `app/desktop/src/main/opencode/`：本地有 `reference/config-v2` 时，比对文件集合（扣掉注明的省略项）、每个 agent 的 frontmatter 键、合同到 agent 的映射、各节标题；没有 reference 时跳过。
6. `knowledge/vendors` 只描述我们平台真实有的模型：

   | 用途 | 模型 |
   |---|---|
   | 图片（也用于图生图） | `qwen-image-pro`；另有 `z-image` 可用 |
   | 视频 | `minimax-h3-fl2va`（文生、图生、首尾帧、尾帧）、`minimax-h3-ref2va`（参考生视频） |
   | 音乐 | `minimax-music3`；`ace-step`（翻唱 / 重绘） |
   | 语音 | `indextts-2.5`，靠 `voice_map` 里的参考音频零样本克隆，没有预设音色 |
   | 超分 | `swiftvr` |

   平台上各种坑见 `app/packages/maas-media/src/*.ts` 的注释。
7. Markdown 重合率低于 3%（`scripts/check-verbatim-md.py`）。
8. 本机联调（需要真实 key）：不设 `OV_AGENT_PROFILE_DIR` 启动；让 agent 生成一张图，确认它调了 `hub_generate_image`，图进了工作区、画布上出现节点。

### P1 菜单对齐（本机）

用户最直观能看到的差异，放在界面第一波之后马上做。
1. 从官方主进程（`/tmp/asar16/out/main/chunks/index-*.js`）抽出应用菜单栏；从渲染层抽出画布右键菜单、节点菜单、各工具栏和下拉菜单。每项记录：菜单项、顺序、分组、快捷键、启用条件、i18n key。菜单项总数约 144。
2. 应用菜单栏在 `app/desktop/src/main/menu.ts`，现在只有 M5 顺手加的几项，快捷键是猜的。
3. 验收：逐项对照清单，并和官方并排截图。

### P1 界面后续波次（本机，详见 `reference/ui-inventory/gap-vs-ours.md`）

| 波次 | 内容 | 依赖 |
|---|---|---|
| W2 聊天面板 | 消息流、markdown（streamdown）、思考块、工具卡、子 agent 块、提问栏、**工具确认卡和死循环防护卡**（现在收到了却不显示）、tiptap 输入框、会话标签、模型 / 模式 / Skill 选择器、上下文压缩提示 | W1；先移植官方 `/debug/chat-case` 的样例当验收基准 |
| W3 首页和项目 | 首页输入框（复用 W2 输入框）、项目列表、创作集、项目详情 | W2 |
| W4 画布核心 | 撤销重做、复制粘贴、快捷键、右键菜单、选中工具栏、`<canvas>` 绘制的边 / 小地图 / 背景、对齐吸附（要打过补丁的 @xyflow/react 12）、节点外壳 | W1，可与 W2 并行 |
| W5 生成弹层与图片工具 | 各节点上的生成弹层、裁剪、超分、扩图、擦除、重绘、移动物体；重打光、多角度、图层拆分这些平台没有后端的做成禁用态 | gateway 的 `/api/edit/*` |
| W6 其他节点类型 | 文本节点升级、视频 / 音频节点和播放、表格节点、文件节点（含预览）、贴纸 | — |
| W7 其余页面 | 技能、资产中心、更新日志、全局搜索、新手引导、横幅 | — |
| 暂缓 | 团队 / 计费、登录、内置浏览器、插件节点、全景图、开发面板、遥测 | — |

### P2 gateway 与后端补齐（适合云上）

1. **图片超分** `POST /api/edit/super-resolution`：旧界面的超分入口现在没有后端。用 `maas-media` 的 `image.upscale`，尺寸按源图实际像素算。
2. **语音**：
   - 按零样本克隆的方式实现 `POST /api/speech/voice_clone` / `voice_design`：把参考音频登记进本地音色表（工作区或应用级），语音合成时查这张表。
   - `/api/speech/voices` 合并 `voice_map` 和本地音色表。
3. **画布剩余路由**（M3 遗留）：file-node、plugin-data、split-sub-images、placeholder-group、nodes-group、revert-edits；视频和音频的缩略图要用 ffmpeg。
4. **工作区身份校验**：`x-hilo-workspace` / `-instance` / `-generation` 三个头。主进程已经生成并通过环境变量传给 gateway，但 gateway 还没校验：不一致回 409，缺失回 428。
5. **生成**：`/api/generate/text`，以及同步的 `/api/generate/image` 和 `/api/generate/video`（给画布弹层直接用）。
6. **Skills 模块**：8 条路由，从 `crates/gateway/src/skills.rs` 移植并对齐官方形状。
7. **飞书 / 微信**（官方放在主进程的 imBridge 通道）：从 `crates/gateway/src/{feishu,wechat}` 移植，35 个 Rust 测试一起移植。
8. **主进程服务**，M5 里现在都是桩，按这个顺序补：desktopSettings、log、notification、trash / clipboard / skillExport、projectArchive、本地 projectAssets、dataDirectory、connectors、networkDiagnostics / assetCenter / 关窗确认。
9. **M5 的已知偏差**：
   - 没有「找不到文件夹，重新定位」对话框；
   - 全局存储没有加密 token；
   - 工作区预算固定为 5；
   - `agent_running` 恒为 false。

   详见 commit `60efdab` 的说明和 `reference/main-inventory/gap-vs-ours.md`。
10. 每补一批路由就重跑 `scripts/extract-gateway-routes.py --out docs/gateway-api.md`，覆盖率只增不减。

### P3 打包、发布、切换（M10）

1. 资源布局：`gateway/`、`mcp-tools/`、`opencode/{opencode,rg}`、`ffmpeg/{ffmpeg,ffprobe}`、`agent-profiles/v2/config`、`opencode-plugin-hilo/`、`project-templates/`。
2. **原生模块要按 Electron 的 ABI 重编**（better-sqlite3；sharp 用的是 N-API，不受影响）：
   - 开发时 gateway 用系统 Node 跑（见 `app/desktop/src/main/paths.ts` 的 `nodeExecutable`）；
   - 发布包里 gateway 由 Electron 以 Node 模式运行，打包时必须用 `@electron/rebuild` 重编，否则第一次访问资产库就会抛 `NODE_MODULE_VERSION` 不一致。
3. electron-vite build → 按目录出包 → `vpk pack`（macOS 和 Windows 都用 Velopack）；继续用双源 feed（R2 + GitHub）、四段版本号和 Velopack 的版本换算，见 `docs/distribution.md`。
4. CI 换成 pnpm + turbo（`.github/workflows/ci.yml` 已经有 node job），加上打包流水线。
5. 切换后删除：`crates/`、`apps/desktop`（Tauri）、`apps/canvas-web`、旧 `mcp/`、`agent/`、Cargo 文件和 Rust CI；改写 README 和 `docs/distribution.md`。
6. 验收：在干净的 macOS / Windows 机器上安装运行，能从 feed 升级到下一个版本。

---

## 五、验证方法

### 测试

每个包单独跑，不要把几个脚本串在一次 pnpm 调用里：

```
pnpm --filter @ov/gateway test
pnpm --filter @ov/mcp-tools test
pnpm --filter @ov/desktop test
pnpm --filter @ov/maas-media test
pnpm turbo run build typecheck test   # 全量
```

### 本机真实联调（只在本机，需要用户的 key）

```
OV_CONFIG_PATH="$HOME/Library/Application Support/ovaijisuandesign/config.json" \
OPENCODE_BIN="/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode" \
OV_USER_DATA_DIR=<临时目录> HILO_DATA_DIR=<临时目录> OV_SKIP_LEGACY_MIGRATION=1 \
OV_DEV_OPEN_WORKSPACES=<临时工作区> \
pnpm --filter @ov/desktop dev
```

- 在日志里找工作区 gateway 的地址，连它的 `/ws` 发 `create_session`，再发 `message`，收帧直到 `session_idle`。
- 平台的 key 分组：default 分组只能对话；dev 分组才有媒体模型。配置里用的是 dev 分组的 key。
- 不要打印 key；只停自己启动的进程，同机可能开着官方应用。

---

## 六、参考文档

| 文档 | 内容 |
|---|---|
| `docs/gateway-api.md` | 466 条路由，✓ 表示已实现 |
| `docs/mcp-tools.md`、`docs/mcp-tools-architecture.md` | MCP 工具面和架构 |
| `docs/opencode-runtime.md`、`docs/plugin-hilo.md` | opencode 运行时和插件契约 |
| `docs/contracts-canvas.md`、`docs/contracts-files.md` | 画布和文件路由的契约 |
| `docs/opencode-agent-tools.json` | agent 工具白名单 |
| `docs/distribution.md` | 发布链路 |
| `reference/ui-inventory/`、`reference/main-inventory/`（仅本机） | 界面清单、主进程服务清单 |
