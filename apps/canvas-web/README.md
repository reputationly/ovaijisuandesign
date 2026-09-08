# canvas-web

用 [React Flow](https://reactflow.dev)（`@xyflow/react`，MIT）重写 MiniMax Design
的画布前端，后端**直接用官方 gateway**。

目标是验证一件事：官方应用里真正闭源的只有 `app.asar` 里的渲染层，
而画布的数据模型、持久化、资产库、生成链路全在开放的 gateway 里 ——
所以「换掉前端、留住后端」是可行的。

背景与证据见 [`../../docs/standalone-gateway.md`](../../docs/standalone-gateway.md)。

## 跑起来

两个进程。先起 gateway：

```bash
# 参数是 MiniMax Design 的项目目录（里面有 .hilo/）
../../scripts/standalone-gateway.sh ~/Movies/Hub/Projects/<某个项目> 8099
```

再起前端：

```bash
bun install
bun dev          # http://localhost:5273
```

gateway 不在 8099 的话：`GATEWAY_URL=http://127.0.0.1:8001 bun dev`。

> `/api`、`/files`、`/ws` 全部由 Vite 代理到 gateway，前端只认识同源地址。

## 它做了什么

| | |
|---|---|
| 读画布 | `GET /api/canvas` → React Flow 图 |
| 节点名 / 文本内容 | `POST /api/canvas/nodes/detail` |
| 媒体渲染 | `GET /files/id/:assetId?w=700`（gateway 侧 sharp 实时缩放） |
| 拖动落盘 | `POST /api/canvas` 整份快照回写 |
| 四种模式切换 | `freeform` / `grid` / `storyboard` / `workflow` |
| 实时事件 | `/ws`，事件名原样显示在底栏 |

节点类型实现了 `image` / `video` / `audio` / `text`，其余画成显式的
「未支持」卡片。

## 两个不能省的约定

**一、整份回写，且以服务端原文为底。**

`POST /api/canvas` 收的是整份快照，gateway 侧 `CanvasPersistenceService.write`
会跑 `canvasFileSchema` 校验 + 一道破坏性写入防护（节点数骤降会被拒、
坏快照进隔离区）。

但防护只管**图的结构**，不管内容。`canvas.json` 里有大量我们没有解释的字段 ——
`data.popoverDraft` 存着「重新生成」要用的 prompt / modelId / 歌词，
还有 `meta` / `round` / `groupId` / `isEmpty`。从 React Flow 的节点反推出
一份新文件，这些会被**静默抹掉，而且校验能过**。

所以 `toCanvasFile()` 是拿服务端那份原文当底，只改 `positions[mode]`。

**二、坐标按模式分开存。**

```ts
positions: Record<"freeform" | "grid" | "storyboard" | "workflow", {x, y}>
```

这是相对 React Flow 原生模型唯一的结构差异。一个节点**不保证四种模式都有
坐标** —— 只在 workflow 里摆过的，切到 storyboard 就没有条目。读不到时退回
文件声明的 `mode`、再退到原点，而不是把节点丢掉。

## 没做的

画布 UI 的其余部分：group / table / file / plugin 节点、连边编辑、
框选与对齐、右键菜单、生成参数面板（`data.popoverDraft` 那一摊）、
资产侧栏、对话框。

这些都是**前端工作量**，不涉及未知的协议 —— 需要的接口在 gateway 的
423 条路由里都已经存在。
