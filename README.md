# ovaijisuandesign

一个 agent 驱动的媒体创作画布，生成全部落在自建 MaaS 平台
（`maas.ovaijisuan.com`）上。

不依赖任何商业客户端 —— 这是它和 [DesignPlusPlus](../DesignPlusPlus) 的区别：
那个是「接管官方 MiniMax Design、把它的模型换掉」，需要官方应用装着；
这个是把整条链自己搭起来。

## 为什么可行

MiniMax Design 是这条路上最完整的参考实现，而它**大部分不闭源**：

| | |
|---|---|
| `opencode` 1.18.18 | MIT，**原封不动**嵌进去当 agent runtime，零业务代码 |
| `gateway/dist/main.js` | 未混淆，类名注释齐全，能脱离 Electron 独立跑（[实测](docs/standalone-gateway.md)） |
| `mcp-tools/dist/main.js` | 未混淆，14 个 `hub_*` + 15 个 `canvas_*` 工具 |
| 画布 | React Flow + Yjs + selecto，全是 MIT 库；`canvas.json` 就是 RF 的 nodes/edges |
| `app.asar` | **唯一闭源的部分** —— Electron 主进程 + 画布渲染层 |

也就是说：难的部分（资产依赖图、生成任务恢复对账、agent 编排契约）设计全都
可读，而闭源的那部分恰好是整套东西里最标准、最好写的一层。

## 原则：能一样就一样

**只有 `app.asar` 是闭源的，只有它需要自己写。其余全部保持接口一致。**

这不只是省事。接口对齐之后能得到一个很好的性质 ——
**每一块都能单独和官方那块对跑**：

```
我们的前端  +  官方 gateway      ← 已验证（apps/canvas-web）
官方 mcp-tools + 我们的 gateway  ← 拿来验证 gateway 写对没有
官方 agent 配置 + 我们的 MCP     ← 拿来验证工具面对齐没有
```

哪一层出问题，换掉一块就能定位，而不是整条链一起怀疑。

要对齐的两个接口面已经提取成规格：

| | |
|---|---|
| [`docs/mcp-tools.md`](docs/mcp-tools.md) | 103 个 MCP 工具的名字与入参 |
| [`docs/gateway-api.md`](docs/gateway-api.md) | gateway 的 423 条 HTTP 路由 |

两份都由脚本从官方产物提取，应用升级后重跑就能看出接口面变了没有。

### 什么直接用、什么自己写

判据是**能不能作为独立依赖存在** —— 不是"有没有源码"。能读不等于能依赖。

| 类别 | 例子 | 做法 |
|---|---|---|
| 第三方开源 | opencode (MIT)、ComfyUI (GPL-3)、lark-cli（飞书官方）、ffmpeg | **直接依赖**，永久 |
| 纯数据 / 文本 | agent 配置那 1.5M markdown | **直接指过去**，快照在 `reference/`，可以一直借 |
| 他们的可执行产物 | `gateway/dist/main.js`、`mcp-tools/dist/main.js` | **开发期借用，最终自己写** |
| 真闭源 | `app.asar` | 只能自己写 |

第三类是要盯住的。gateway 未混淆、能读、现在也确实在跑，但它**只能从
`/Applications` 里借**：

1. 用户必须装着官方应用 —— 那 C 的目标（能独立分发）就没达成
2. 应用升级整包替换，跟着断
3. **改不了**。要加自己的能力就得改它，而它是编译产物

所以 `apps/canvas-web` 现在接的官方 gateway 是**脚手架，不是地基**。
它的价值是让前端能先做、接口能先验，把 gateway 这块最大的风险排到最后
（见下面的路线第 6 步）。

### 仓库里不放他们的文件

只记**接口事实**（路径、字段名、枚举值、`canvasFileSchema` 的结构、
失败长什么样），照着实现是互操作。他们的 markdown 原文、gateway 的实现代码
一个字都不进版本库。

要对照原文时快照到 `reference/`（已 gitignore）：

```bash
./scripts/snapshot-agent-profiles.sh
```

opencode 是 MIT，直接依赖，不 fork —— MiniMax 自己都没改一行。

### 闭源面到底有多大

查下来**只有 `app.asar` 是闭源的**（Electron 主进程 + 渲染进程 UI）。
飞书和 ComfyUI 一度被我归进"做不了"，其实都不是：

| | 性质 | 成本 |
|---|---|---|
| 画布渲染层 | **真的要从零写** | 已在做 |
| 飞书 | `lark-cli` 是飞书**官方** CLI，应用没打包、扫码登录时才下；`hub_feishu` 就是 spawn 它 | 中，和主线无关 |
| ComfyUI | 本体 GPL-3.0；后端按需下载，安装脚本 1655 行明文中文注释 | 中，看要不要托管 runtime |

而且**闭源的只是业务代码，技术栈是公开的** —— asar 里就带着 `package.json`：
React 19 + TanStack + Base UI + tailwind + tiptap + `@xyflow/react` v12 +
selecto + yjs，主进程 electron-vite + velopack。和我们的选型基本一致，
连踩过的渲染性能坑都写在 CSS 注释里。

详见 [`docs/closed-source-surface.md`](docs/closed-source-surface.md) 和
[`docs/canvas-stack.md`](docs/canvas-stack.md)。

真正需要在 agent 配置里删掉的，只有依赖他们私有运行时**而我们暂时不做**的
路由段。模型差异不算 —— 在模型目录里做别名，保持
`nano_banana_2_flash` / `MiniMax-H3` 这些 id 不变而指向自己的实现，
连模型路由的 contract 都不用动。

## 登录：不做

官方那套（扫码授权、账号体系、积分计费、skill 市场下发）我们**整个不实现**。
用户只填两样东西：

```jsonc
{
  "platform": {
    "base_url": "https://maas.ovaijisuan.com/v1",
    "api_key":  "sk-…",
    "chat_model": "…"      // 写 caption / 歌词用
  }
}
```

`crates/maas-media` 本来就是这个形状，不用改。

代价与收益都要说清楚：

- **省掉**官方接口面里「账号与计费」那 13 条路由，以及 gateway 的
  `TokenService`（它现在会从 tmpfile 恢复登录态、带着你的身份去打云端）
- **同时省掉**积分预估、余额提示、skill 市场自动同步 —— 后两个我们本来
  也不需要
- 但 agent 配置里凡是提到"额度不足""请登录"的话术都要删，否则它会引用一个
  不存在的流程。归到 [`agent/README.md`](agent/README.md) 那张表里

## 结构

```
crates/maas-media/     平台适配层。已完成，55 个测试
crates/gateway/        本地 gateway。生成 + 落盘 + 反代未实现的路由，27 个测试
apps/canvas-web/       React Flow 画布前端。已跑通读写与生成闭环
mcp/                   MCP server。8 个工具（画布 4 + 生成 4），对齐官方同名同参
agent/                 opencode 配置。直接用官方那套，只覆盖对齐不了的部分
docs/                  接口规格与逆向记录
scripts/               规格提取、快照、开发辅助
reference/             官方配置快照（gitignore，脚本生成）
```

### `crates/maas-media`

**不知道 MiniMax 的存在** —— 只回答「给一段提示词和一些素材，怎么让平台产出
图 / 视频 / 语音 / 音乐」。

平台侧的形状：图片是同步的（`POST /v1/images/*` 直接返回 URL），**其余全部**
挂在 `POST /v1/videos` 下靠 `metadata.task_type` 区分（`t2v` / `i2v` /
`flf2v` / `l2va` / `r2va` / `sr` / `tts` / `t2m` / `cover` / `repaint`）。

这一层的注释密度偏高，因为**这条链上大量失败是不报错的**：键名放错位置、
参数越界、音色映射不到，平台照样返回一个成功的任务和一段能播的音频，
只是内容完全不是要的东西。每处都记着实测依据。

最典型的一处 —— 两个音乐引擎的映射**正好相反**：

| | caption | 歌词 |
|---|---|---|
| `minimax-music3` | `metadata.instructions` | 顶层 `prompt` |
| `ace-step` | 顶层 `prompt` | `metadata.lyrics` |

发反了会把风格描述一遍遍唱出来，出曲成功、时长正常，只有听了才知道。
所以引擎族推断不出来时**拒绝启动**，而不是挑一个默认值。

### `apps/canvas-web`

React Flow 重写的画布前端。当前后端接的是官方 gateway（独立跑，见
[`docs/standalone-gateway.md`](docs/standalone-gateway.md)），等
`crates/gateway` 写完再切过去。

已跑通：打开真实项目、渲染 image/video/audio/text 节点和边、四种模式切换、
拖动落盘（CDP 驱动 headless Chrome 实测，不是 curl 模拟）。

## 路线

**gateway 放最后写。** 顺序是按"未知数从多到少"排的，不是按依赖关系：

1. ~~平台适配层~~ —— 已完成
2. ~~画布前端读写闭环~~ —— 已完成
3. ~~提取两个接口面的规格~~ —— 已完成（103 工具 / 423 路由）
4. ~~canvas-web 接上 `maas-media` 的生成~~ —— 已完成。画布上点生成直接出图，
   中间仍借官方 gateway 落盘
5. ~~`mcp/` 的画布 4 个 + 生成 4 个工具，挂上 opencode 和官方 agent 配置~~
   —— 已完成，**用他们的提示词跑通了我们的工具**
6. **`crates/gateway` 补齐资产库、画布持久化、文件服务、事件推送** ← 下一步。
   写的时候可以拿官方 mcp-tools 当测试客户端
7. 自己的分发与升级通道，包放 R2 / OBS。见
   [`docs/distribution.md`](docs/distribution.md)

现在官方应用只剩"存文件"一个用途（`import-url` 落盘 + `media-node` 建节点 +
`/files` 取图 + `/ws` 事件），第 6 步之后完全不需要它。

> `/ws` 是唯一还**直连**官方的一跳 —— 我们的反代用 reqwest，转不了
> WebSocket 的 Upgrade 握手。接过来只会让实时事件安静地不工作，
> 所以留到第 6 步自己实现推送时一起解决。

### 第 5 步实测

官方的 `media-agent` 提示词 + 我们的 MCP 工具 + 我们的 gateway + 自建平台：

```
> media-agent · qwen3.8-27b
我来生成这张油画质感的白猫图。
⚙ hub_generate_image {"filename":"白猫书架油画",
    "prompt":"一只白色的猫端坐在书架前，油画质感，厚重笔触…",
    "vendor_params":{"aspect_ratio":"3:4"}}
已生成完成…已放到画布上。
```

画布 5 → 6 个节点，图片 2.0MB 落进工作区。agent **自己选了 3:4 的比例**
并填进 `vendor_params` —— 那是官方契约的形状，不是我们教它的。

中途上游 gateway 掉过一次，agent 收到 502 后重试两次、`sleep 3`、然后
如实报告"画布后端持续返回 502"。错误一路从平台传到 agent 没有丢，
这正是那几处"不要把失败包装成成功"的设计在起作用。

### 第 4 步实测

真实浏览器 + 真实平台调用，不是 mock：

```
提示词          一只戴着圆框眼镜的柴犬，水彩插画风格，米色背景
节点数（前）    4
  3s  平台出图中… 2s
 15s  平台出图中… 14s
节点数（后）    5
新增节点        ✓ image assetId=720657e7…
资产            ✓ images/f648fa64ec3a…png 1024x1024 1.67MB
```

链路：

```text
canvas-web ──► 我们的 gateway :8100 ──► maas-media ──► 平台（公网 URL）
           ├─► 官方 gateway /api/files/import-url    落盘 + 入库
           └─► 官方 gateway /api/canvas/media-node   建节点
```

Vite 按前缀分流：`/api/generate` 走我们的，其余走官方。**顺序有意义** ——
官方 gateway 也有同名路由，排错了生成会"成功"地花掉官方额度而不报错。

## 起环境

```bash
# 平台适配层
cargo test -p maas-media

# 画布前端（需要先起一个 gateway）
./scripts/standalone-gateway.sh ~/Movies/Hub/Projects/<项目> 8099
cd apps/canvas-web && bun install && bun dev   # http://localhost:5273
```

## 许可

个人学习研究用，未授权分发。
