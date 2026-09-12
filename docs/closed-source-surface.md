# 闭源面到底有多大

调研 MiniMax Design 的结论：**只有 `app.asar` 是闭源的**。
初版基于 **3.0.11**（macOS arm64），后来在 **3.0.12**（macOS + Windows）、
**3.0.14**（macOS）上复核过。

这份文档存在的意义是**防止把"工作量大"说成"做不了"** —— 两者的排期含义完全
不同。下面每一条都标明了判据，改结论之前先复核判据。

## 〇、版本会漂，规格要重跑

3.0.11 → 3.0.12 之间，**MCP 工具面从 103 个缩到 58 个**：官方把
`canvas_write_{media,text,table,file}_node` 合并成了一个 `canvas_write_node`
（用 `kind` 区分），`memory_*` 五个合并成 `memory`，音乐那一串合并进
`generate_audio_music`，等等。gateway 的 HTTP 路由面**一条没变**。

值得记住的是：**两个版本的 agent 提示词引用的都是合并后的那个名字** ——
被删掉的 45 个 agent 从来没调过。我们一开始照 103 那份实现了其中两个，
等于实现了 agent 永远不会调的东西。

这是 `scripts/extract-mcp-tools.py` + `mcp/src/tools.test.ts` 抓出来的，
也正是当初把规格做成"可重跑的提取"而不是手写清单的理由。
**应用升级后先重跑提取，再看测试。**

另外 3.0.12 删掉了 `Contents/Resources/opencode/config` 整套（3.0.11 里
那第二份 contracts 更全的配置）。

## 一、真正闭源的

`app.asar`（44M），两部分：

| | 内容 |
|---|---|
| **Electron 主进程** | 进程编排（gateway / opencode / mcp-tools 的拉起与环境变量注入）、窗口、自动更新、账号与登录、扫码授权流程、IPC 桥 |
| **渲染进程 UI** | 画布渲染与交互、对话界面、资产中心、设置、插件宿主 |

为什么不改它：`Info.plist` 里有 `ElectronAsarIntegrity` 存 asar 的 SHA256，
asar 内每个文件条目自带 SHA256 + 分块哈希，改内容要重算 header → 要改
`Info.plist` → 破坏代码签名 → hardened runtime 下起不来。详见
[`app-internals.md`](app-internals.md)。

**这是唯一需要从零写的部分。**

### 但闭源的只是业务代码，技术栈是公开的

asar 的 header 是明文 JSON，里面直接带着 `package.json`
（`@hilo/desktop` 3.0.11）—— 全部依赖一览无余：React 19 + TanStack 全家桶 +
Base UI + tailwind + tiptap + `@xyflow/react` v12 + selecto + yjs，
主进程是 electron-vite + velopack。

**和我们的选型基本一致**，连他们踩过的渲染性能坑都写在 CSS 注释里。
详见 [`canvas-stack.md`](canvas-stack.md)。

所以"从零写"指的是**业务逻辑与交互**，不是技术方案 —— 后者不用自己摸索。

## 二、第三方开源 / 官方软件，不是他们的

| | 许可 / 来源 | 应用怎么用的 |
|---|---|---|
| `opencode` 1.18.18 | **MIT** | 原版二进制，**一行没改**（整个二进制里 `hilo` 零命中，`minimax` 全是 models.dev 的 provider 图标） |
| ComfyUI | **GPL-3.0** | 前端打包在 `bundled-plugins/comfyui`（38M）；后端**不在包里**，首次使用时从 `cdn.hailuoai.com/public_assets/comfyui-backend/` 按平台下载 |
| `lark-cli` | 飞书**官方** CLI | **应用没打包**，扫码登录时才从 `registry.npmmirror.com/-/binary/lark-cli` 下 |
| ffmpeg | LGPL/GPL | 打包在 `Contents/Resources/ffmpeg` |

## 三、他们写的，但未混淆

函数名、注释（含中文）、类名都在，直接 grep 就能读：

| | 大小 | 内容 |
|---|---|---|
| `gateway/dist/main.js` | 16M | NestJS，423 条路由。资产库、画布持久化、生成队列、ffmpeg 链路、水印 |
| `mcp-tools/dist/main.js` | 2.8M | 58 个 MCP 工具（3.0.11 是 103，3.0.12 合并掉了一批；**3.0.14 仍是这 58 个，一个没变**） |
| `opencode-plugin-hilo` / `-trace` | 660K | 用公开的 `@opencode-ai/plugin` API，dist 是未压缩 ESM |
| `bundled-plugins/comfyui/hub/*.py` | 1655 行 | ComfyUI 后端的安装与启动脚本，中文注释 |
| `agent-profiles/v2/config/` | 1.5M | agents / contracts / knowledge / workflows，全是 markdown |
| `conf/external_api_conf.yaml` | — | 云端路径表（不是全集，代码里每个键都有默认值） |

## 四、按这个重新给三件事定性

我一度把飞书和 ComfyUI 归进"对齐不了、只能删"，那是**没查就下的结论**。
实际上：

| | 性质 | 要做的 | 成本 |
|---|---|---|---|
| **画布渲染层** | 真的闭源 | 从零写。`canvas.json` 的结构是开的，React Flow 的自定义节点组件要自己实现 | 已在做（`apps/canvas-web`） |
| **飞书** | 第三方官方 CLI + 薄封装 | 下同一个 `lark-cli`；自己做一遍 OAuth（`open.larksuite.com/open-apis/authen/v2/oauth/token`）；`hub_feishu` 就是拼参数 spawn 它 | 中。**和主线无关，可以最后** |
| **ComfyUI** | 开源后端 + 明文安装脚本 | 要么直接用官方 ComfyUI，要么照着那 1655 行自己打包 runtime；10 个 `comfyui_*` 工具的实现可读 | 中。取决于要不要托管 runtime |

MiniMax 在飞书这件事上的全部工作是**扫码登录流程 + 一个 spawn 封装**，
登录流程那部分在 app.asar 里（闭源），但那是 OAuth，自己实现一遍不难。

## 五、还没查清的

- 扫码登录具体怎么把 UAT 写进 `LARKSUITE_CLI_CONFIG_DIR`（只看到调用点，
  没跟到实现）
- ComfyUI backend bundle 里到底装了什么（`latest.json` 没拉过）
- `opencode-plugin-hilo` 那 20 多个模块具体各做什么（只看了文件名）
