# Plugins — opencode 运行时插件

`base.json` 的 `plugin` 列表点名本目录下的文件；桌面主进程生成配置时把它解析成同步目录里 `plugins/` 的绝对 `file://` 路径交给 opencode。

## 文件清单

| 文件 | 用途 |
|------|------|
| `session-header.ts` | 给每个模型请求加 `X-OpenCode-Session-Id`、`X-Agent-Type`，并在用户消息触发的第一个请求上带一次 `X-Source-Type` |

工作语言注入、防打转、工具参数补全等行为在另一个插件（`app/packages/opencode-plugin-hilo`）里，由桌面端额外追加，不在本目录。

## 这里 NOT 包含

合同不是插件注入的。桌面主进程在启动 opencode 之前，由 `app/desktop/src/main/opencode/profile.ts` 的 `stageProfile` 把合同拼进 staging 目录下的 agent 文件，再用 `OPENCODE_CONFIG_DIR` 指过去。机制见 `contracts/README.md`。

## 修改约束

- 改完要重启 opencode 子进程才生效（开发时重新 `pnpm dev`）。
- opencode 加载插件时旁边没有 `node_modules`：只能 `import type`，运行时依赖一律不许引入。
- 钩子跑在每次对话请求的路径上，里面不做网络请求或重计算。
