# 官方前端用的是什么

`app.asar` 里就有 `package.json`（`@hilo/desktop` 3.0.11）。**闭源的是他们写的
业务代码，技术栈本身全是开源库**，而且和我们选的基本一致。

提取方式：asar 的 header 是明文 JSON，按 offset 取 `package.json` 即可。

## 主进程

| | 用途 |
|---|---|
| Electron 43（Chrome 150） | 宿主 |
| **electron-vite** | 构建。产物结构 `out/main` + `out/renderer` 是它的约定 |
| `electron-updater` + **`velopack` 1.2.0** | 自动更新与安装器 |
| `electron-store` / `electron-log` | 配置与日志 |
| `electron-screenshots` / `node-screenshots` | 截图（唯一没被打包进 bundle 的原生模块） |
| `ws` / `protobufjs` / `prom-client` | 与子进程通信、指标 |
| `@larksuiteoapi/node-sdk` | 飞书**官方 Node SDK**（除了 spawn `lark-cli`，还直接用 SDK） |
| `grammy` | Telegram bot 框架 |
| `@cloudcare/browser-rum` | 观测云 RUM |

## 渲染进程

```
React 19
@tanstack/react-router     路由
@tanstack/react-query      数据请求
@tanstack/react-virtual    虚拟化
@base-ui/react             无头组件（MUI 团队那套）
tailwind + cva + clsx + tailwind-merge + tw-animate-css
lucide-react               图标
sonner                     toast
next-themes                主题
i18next / react-i18next    国际化
@dnd-kit/*                 拖放
embla-carousel             轮播
react-day-picker           日期
```

也就是 **shadcn/ui 那一套的技术选型**（tailwind + cva + 无头组件 + lucide），
只是无头组件用的是 Base UI 而不是 Radix。

文本与内容：

| | 用途 |
|---|---|
| **tiptap 3** (`@tiptap/*`, ProseMirror) | 文本节点的富文本编辑 |
| `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-sanitize` | Markdown 渲染 |
| `streamdown` / `@streamdown/code` | **流式** Markdown（对话里边生成边渲染） |
| `wavesurfer.js` 7 | 音频波形 |
| `qrcode` / `react-qr-code` | 扫码登录 |

## 画布本体

这几个**不在顶层依赖里**，藏在 `@hilo/canvas` 等 workspace 包中，
靠字符串扫描确认：

| | 命中 | 用途 |
|---|---|---|
| **`@xyflow/react` v12** | `useNodeConnections` / `@xyflow/${lib}/dist/style.css` 等 v12 独有标记 | 画布主体 |
| `selecto` | 1668 | 框选 |
| `immer` | 282 | 不可变更新 |
| `virtua` | 318 | 虚拟化 |
| `yjs` | 51 | CRDT |
| `zustand` | 5 | 状态（xyflow 内部也用它） |

`reactflow` 那 201 处命中是错误信息里的文档链接（`reactflow.dev`），
不是 v11 的包名 —— **确认是 v12**。

## 他们踩过的性能坑（这部分最值钱）

CSS 注释里把原因写清楚了，照着结论走能省一轮返工。下面是转述。

### 边不是用 xyflow 画的

他们自己实现了一个 canvas 图层画可见的贝塞尔曲线，xyflow 的 SVG 层
**只留每条边一个透明的命中区 `<path>`**。

原因是 xyflow 默认给 `.react-flow__edges` 挂了 `will-change: transform`，
让 SVG 边层作为一个稳定的合成层跟着平移。代价是合成器要按**整张图的
bbox**（不是可视窗口）光栅化这一层，纹理开销随 zoom² 增长 ——
他们注释里记的实测数字是 **760 条边时会撑爆 VRAM**。

边一旦改由 canvas 画，SVG 层就只剩透明的命中几何，没有任何东西需要 GPU
纹理了，所以他们把 `.react-flow__edges` 和 `.react-flow__edge-interaction`
的 `will-change` 改回 `auto`。

**对我们的含义**：`apps/canvas-web` 现在直接用 xyflow 的默认 SVG 边。节点上到
几百个之前不会有问题，但**这是一个已知会撞墙的地方**，撞了就照这个方案改：
canvas 画可见的线 + SVG 只留命中区。

### 边和连线画在节点下面

React Flow 默认 `connectionline` 的 z-index 是 1001（盖住一切）。他们把
`.react-flow__edges` / `.react-flow__edgelabel-renderer` /
`svg.react-flow__connectionline` 全压到 `z-index: 0`，让拖拽中的连线从卡片
**底下**穿过。理由是让卡片在视觉上占主导。这是个纯样式决定，成本为零。

### 其他信号

`OffscreenCanvas` 73 处、`requestIdleCallback` 11 处、`contain:` 13 处、
`onlyRenderVisible`（xyflow 的 `onlyRenderVisibleElements`）10 处 ——
说明重活确实都在渲染性能上。

## 对 `apps/canvas-web` 的结论

选型可以基本照搬，**我们已经选对了主干**（React 19 + `@xyflow/react` v12）。
差的是外围：

| | 状态 |
|---|---|
| tailwind + cva（`clsx` / `tailwind-merge` / `cva`） | ✅ 已换 |
| tiptap 3 —— 文本节点编辑 | ✅ 已接，纯文本 schema，带 `expectedContentHash` |
| `wavesurfer.js` —— 音频波形 | ✅ 已接 |
| xyflow 的 `onlyRenderVisibleElements` | ✅ 已开 |
| 框选 | ✅ 用 xyflow 内置的 `selectionOnDrag`，暂不引 `selecto` |
| `virtua` | ⏭ 那是**列表**虚拟化，等有资产侧栏再说 |
| Base UI | ⏭ 还没有 dialog / select 要做，等生成面板 |
| `<canvas>` 画边 | ⏭ 边还很少，撞墙再换（方案见上） |
