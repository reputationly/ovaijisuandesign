# 参照原文

按版本号放的 MiniMax Design 安装包原文，用来对照复刻。仓库是私有的，产品只在内部使用。

## `3.0.16/`（macOS arm64）

| 目录 | 来源（`MiniMax Design.app/Contents/Resources/` 下） | 内容 |
|---|---|---|
| `app/` | `app.asar` 解包（`npx @electron/asar extract`） | `out/main` 主进程、`out/preload`、`out/renderer` 渲染层（未压缩，保留组件名） |
| `gateway/` | `gateway/{dist,assets,package.json}` | NestJS gateway，466 条路由，`dist/main.js` 为主 bundle，另有 SQL 迁移 |
| `mcp-tools/` | `mcp-tools/` | MCP server，54 个工具 |
| `opencode-plugin-hilo/`、`opencode-plugin-trace/` | 同名目录 | opencode 插件（ESM，带 `.d.ts`） |
| `agent-profiles/` | `agent-profiles/` | agent 配置原文（仓库里实际加载的那份在 `assets/agent-profiles/`） |
| `conf/` | `conf/` | 云端路径表 |
| `bundled-plugins/` | `bundled-plugins/*/{manifest.json,skills,python,hub}` | 内置插件的清单和脚本，前端没收 |

没收的：第三方 `node_modules`、ComfyUI 前端、`project-templates/`（约 80MB，要用时从安装包里拿）、opencode / ffmpeg / rg 二进制。

技能原文在 `assets/skills/`（来自 `~/.hub/skills`）。

应用升级后新建一个版本目录重新拷，不要覆盖旧的。

## `3.0.20/`（macOS arm64）

同一口径（`app/`、`gateway/`、`mcp-tools/`、两个 opencode 插件、`agent-profiles/`、`conf/`、
`bundled-plugins/`），路线和上面的 `3.0.16/` 一致。和 3.0.16 的差异：

- **gateway 多出 `node_modules/`（57MB）**，按"不收第三方 node_modules"的口径删掉了，只留 `dist`、`assets`、`package.json`。
- **bundled-plugins 的三个插件前端资源变多**（`comfyui/assets` 就 43MB），同样按口径只留
  `{manifest.json,skills,python,hub}`。3.0.16 收的时候就是这个口径，两边可比。
- 渲染层主 bundle 从 `index-C4qF1HE0.js` 变成 `index-CANVzzmD.js`（21MB → 22MB），
  首页 chunk 从 `index-CzL_EVKV.js` 变成 `index-BOHfiUzs.js`。

两个版本都留着，对照用；不要覆盖旧的。
