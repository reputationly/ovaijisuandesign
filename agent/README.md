# agent

给 opencode 的配置：agents、contracts、skills、workflows。

## 原则：能一样就一样

只有 `app.asar`（Electron 主进程 + 画布渲染层）是闭源的、必须自己写。
其余全部**保持接口一致** —— 包括这一层。

所以这里**直接用官方那套配置**，不重写。理由不是省事，是这样能得到一个很好的
性质：**每一块都能单独和官方那块对跑**。我们的 agent 配置能驱动我们的 MCP
工具，也能驱动官方的；反过来官方的配置也能驱动我们的。哪一层出问题，
换掉一块就能定位。

前提是 [`mcp/`](../mcp/) 把那 103 个工具按同名同参实现出来。
清单见 [`docs/mcp-tools.md`](../docs/mcp-tools.md)。

## 怎么跑

```bash
./scripts/snapshot-agent-profiles.sh          # 一次性：快照官方配置到 reference/
cargo run -p gateway                          # :8100
./scripts/run-agent.sh <工作区> -- run "生成一张…"
```

脚本在临时目录里现拼 opencode 配置（**不落进版本库，里面有 api_key**）：

- `provider` 指向自建平台，形状取自 DesignPlusPlus 里那份实测跑通的
- `mcp.hub` 指向我们的 MCP server
- `agent` / `default_agent` / `tools` **原样取自官方 `base.json`**
- `OPENCODE_CONFIG_DIR` 指向 staging，opencode 从那里扫
  `{agent,agents}/**/*.md`（判据：`packages/opencode/src/config/agent.ts`）

唯独不带官方的 `plugin` —— 那是 `session-header.ts`，依赖他们的运行时注入。

## 怎么接

配置本体在应用里，不复制进仓库。快照一份到 `reference/`（已 gitignore）
当稳定基线：

```bash
./scripts/snapshot-agent-profiles.sh    # → reference/agent-profiles/
```

快照而不是直接指 `~/.hub/.config-v2/`，因为**那个目录会被应用按版本重刷** ——
基线要是会动的，`diff` 就没有意义了。

opencode 配置按文件覆盖：自己写好一个放进 `agent/`，它盖掉 `reference/` 里的
同名文件。任何时候：

```bash
diff -rq agent reference/agent-profiles/v2/config
```

就知道改了哪些、还剩哪些是他们的。

## 哪些要改

没有一处是**做不了**的（见
[`docs/closed-source-surface.md`](../docs/closed-source-surface.md)），
只有"还没做"。规则很简单：**没实现对应能力之前，把那段路由删掉**，
否则 agent 会一本正经地引用不存在的功能。实现了就加回来。

| 出现在 | 依赖什么 | 现在怎么办 |
|---|---|---|
| 飞书集成（`media-agent.md` 一整节） | `LARK_CLI_PATH` / `LARKSUITE_CLI_CONFIG_DIR`；报错文案指向「设置 → 接入飞书 / 微信」 | 先删。要做的话：下同一个官方 `lark-cli` + 自己走一遍 OAuth |
| ComfyUI 子 agent 路由 | `comfyui-agent` + `<canvas_plugin_nodes>` 注入 + 10 个 comfyui 工具 | 先删。要做的话：ComfyUI 是 GPL-3.0，安装脚本 1655 行明文 |
| `working_language` | 他们运行时注入的字段（10 处引用） | **不用改** —— 我们注入同名字段就行，成本很低 |
| 模型路由 | 他们十几个 vendor；我们只有 `minimax-h3-fl2va` / `ace-step` / `indextts-2.5` 等 | **不用改** —— 在模型目录里做别名，保持他们的 id 指向我们的模型 |

后两行是"能一样就一样"的典型：**改我们这边去适配契约，而不是改契约**。

其余部分（`anti-loop`、`baseline`、`semantic-judgment`、`canvas-discipline`、
`canvas-grouping`）和运行时耦合很松，原样用。

## 布局

```
agents/         覆盖官方同名文件的部分
contracts/      同上
skills/         我们自己的知识（官方的 skill 走市场下发，不在这套里）
opencode.json   mcp / agent / plugin 的接线
```
