# canvas-web

用 [React Flow](https://reactflow.dev)（`@xyflow/react` v12，MIT）重写 MiniMax
Design 的画布前端，后端**直接用官方 gateway**。

技术选型和官方对齐 —— 他们的 `package.json` 就在 asar 里，
见 [`docs/canvas-stack.md`](../../docs/canvas-stack.md)。

## 跑起来

三个进程。

```bash
# 1. 官方 gateway —— 暂时提供资产库、画布持久化、文件服务
../../scripts/standalone-gateway.sh ~/Movies/Hub/Projects/<某个项目> 8099

# 2. 我们的 gateway —— 生成
cargo run -p gateway            # :8100，首次会写配置模板

# 3. 前端
bun install && bun dev          # http://localhost:5273
```

端口不一样时：`GATEWAY_URL=… OVGW_URL=… bun dev`。

> 全部经 Vite 代理，前端只认识同源地址。**分流顺序有意义** ——
> `/api/generate` 必须排在 `/api` 前面，否则生成请求会打到官方那边，
> 而它也有同名路由，于是会"成功"地花掉官方额度且不报错。

## 现在能做什么

| | 走的接口 |
|---|---|
| 读画布，渲染节点与边 | `GET /api/canvas` |
| 节点名 / 文本内容 | `POST /api/canvas/nodes/detail` |
| 图片 / 视频渲染 | `GET /files/id/:assetId?w=512` |
| **音频波形 + 播放** | 同上，`wavesurfer.js` |
| **文本节点双击编辑** | `POST /api/canvas/text-node`，带 `expectedContentHash` |
| 拖动落盘 | `POST /api/canvas` 整份快照回写 |
| **文生图** | 我们的 gateway `/api/generate/*` → `maas-media` → 平台 |
| 框选、多选 | xyflow 内置（`selectionOnDrag`） |
| 四种模式切换 | `freeform` / `grid` / `storyboard` / `workflow` |
| 实时事件 | `/ws`，事件名原样显示在底栏 |

节点类型实现了 `image` / `video` / `audio` / `text`，其余画成显式的
「未支持」卡片。

## 生成链路

```text
canvas-web ──► 我们的 gateway :8100 ──► maas-media ──► 平台（返回公网 URL）
           ├─► 官方 gateway /api/files/import-url    落盘 + 入库
           └─► 官方 gateway /api/canvas/media-node   建节点
```

编排放在前端而不是我们的 gateway 里，是为了让**借用官方的那两跳显式可见**。
等自己的 gateway 有了资产库，后两跳会挪进去，前端只留一次调用。

`import-url` 有个坑值得记住：**它每个 URL 失败也回 200**，失败落在
`errors[]`（源码注释原文 "returns 200 even if every URL failed"）。
只看 HTTP 状态会把失败当成功，然后拿着一个 undefined 的 path 去建节点。

## 三个不能省的约定

**一、整份回写，且以服务端原文为底。**

`POST /api/canvas` 收整份快照，gateway 侧 `CanvasPersistenceService.write`
会跑 `canvasFileSchema` 校验 + 一道破坏性写入防护（节点数骤降会被拒、
坏快照进隔离区）。

但防护只管**图的结构**，不管内容。`canvas.json` 里有大量我们没有解释的字段 ——
`data.popoverDraft` 存着「重新生成」要用的 prompt / modelId / 歌词，还有
`meta` / `round` / `groupId` / `isEmpty`。从 React Flow 的节点反推出一份新
文件，这些会被**静默抹掉，而且校验能过**。

所以 `toCanvasFile()` 是拿服务端那份原文当底，只改 `positions[mode]`。

**二、坐标按模式分开存。**

```ts
positions: Record<"freeform" | "grid" | "storyboard" | "workflow", {x, y}>
```

这是相对 React Flow 原生模型唯一的结构差异。一个节点**不保证四种模式都有
坐标** —— 只在 workflow 里摆过的，切到 storyboard 就没有条目。读不到时退回
文件声明的 `mode`、再退到原点，而不是把节点丢掉。

**三、文本编辑必须带 `expectedContentHash`。**

不带的话，agent 或另一个窗口在编辑期间改过同一个节点，保存会**静默覆盖掉
对方** —— 而文本节点恰恰是最可能被 agent 同时写的东西。

编辑器还刻意收窄成纯文本 schema（`doc + paragraph + text`）而不是 StarterKit：
文本节点存的是 Markdown 源码，用富文本 schema 打开再保存会让源码悄悄变形，
两种失败都不报错。理由写在 `src/TextEditor.tsx` 里。

## 刻意没做的

| | 为什么 |
|---|---|
| `selecto` | xyflow v12 的内置框选够用了。等确认不够再引 —— 官方引它多半是为了某个具体行为，我们还不知道是哪个 |
| `virtua` | 那是**列表**虚拟化（资产侧栏用），我们还没有侧栏。画布的虚拟化是 xyflow 的 `onlyRenderVisibleElements`，已开 |
| Base UI | 还没有 dialog / select / popover 要做。等生成面板落地时一起，那时才真需要 |
| canvas 画边 | 官方在 760 条边时撞了 VRAM 墙才改的。我们边还很少，撞了再换 —— 方案已记在 `docs/canvas-stack.md` |

其余画布 UI：group / table / file / plugin 节点、连边编辑、右键菜单、
生成参数面板、资产侧栏、对话框。这些都是**前端工作量，不涉及未知协议**。
