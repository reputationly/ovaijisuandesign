# 界面源码还原 · 交接文档（2026-10-11）

写给下一个接手的人或 agent。上一份交接 [`handoff-phase1-npm-swap.md`](handoff-phase1-npm-swap.md) 讲的是 npm 换包工具，里面「剩 112 个包」等数字已过时，以本文为准。

## 目标与验收标准

把 `app/renderer/src` 里剩下的、从参照（MiniMax Design）界面 bundle 拆出来的编译产物，还原成可维护的源码。**外观、功能、交互都要和还原前一致**（用户明确要求，不能只看截图）。

每一批改动合进来前必须满足：

1. `pnpm turbo run build` 全过（11/11）。
2. `node scripts/desource/check-undef.mjs` 无输出问题（见下文「检查脚本」）。
3. `scripts/ui-compare/gate.sh`：和 441a06b 录的基线逐页比对，**非抗锯齿像素差异为 0，网络 / DOM / 持久化状态三类对比全空，控制台报错不超出基线**（基线只有 `projects-team` 一条预期的 cloud-list 404）。原始 `diffPct` 仍记录并报告，但只作信息，不作为失败条件。

不允许为了过门禁放宽阈值或把页面排除在外；要排除必须写进 `DISABLED_PAGES` / `NET_VOLATILE` 并写明原因。

## 分支与提交

分支 `devin/1791701596-renderer-desource`（基于 main，尚未开 PR）：

| 提交 | 内容 |
|---|---|
| `c0ef882` | 修 aee54ac 换包留下的白屏：补 `Placeholder`（`@tiptap/extensions`）和 PDF worker 配置的导入；新增 `scripts/desource/check-undef.mjs`；compare 稳定化（挡 CDN 视频、固定随机数、固定 fixture 时间等） |
| `bbe3ed7` | d3-selection / d3-drag / d3-zoom 改成 npm 导入，全局只剩一份 d3-selection（修画布初始视口）；PDF.js `getDocument` 改从 `pdfjs-dist` 导入，删掉空的 `globalThis.pdfjsLib` 桩；检查脚本加「属性缺失」「原型补丁丢失」两条规则；删掉重复的 `fixture/ws-b` |
| `509cde9` | compare：ws-a 始终用自己的样例，ws-b 缺省时复制 ws-a |
| 本次交接提交 | 功能一致性对比（未验收，见下）、`gate.sh` 入库、本文档 |

`bbe3ed7` 时 32 屏全部 0.000%、无新增报错：报告在本机 `.probe/ui-compare/2026-10-11T10-52-43-643Z/report.json`（`.probe/` 不进仓库）。

## aee54ac（「把打包进去的库换成 npm 包」）留下的问题，已全部修复

| 问题 | 现象 | 原因 |
|---|---|---|
| 白屏 | `ReferenceError: Placeholder is not defined` | 删了内联的 tiptap Placeholder，没加 import |
| PDF 打不开 | `getDocument` 是 undefined | 删了 pdf.js 代码，留下一个空对象桩 `globalThis.pdfjsLib = {}`，属性读出来都是 undefined，不报错 |
| 画布初始视口失效，「重新打光」等节点工具栏跑到屏幕外 | 视口停在 `translate(0,0) scale(1)`，控制台无报错 | **双实例**：d3-transition 换成 npm 后只给 npm 的 d3-selection 原型补 `interrupt`/`transition`，vendor.js 里那份没有，d3-zoom 调 `selection.interrupt()` 抛错被吞 |

教训：**换包只换一半最危险**。换一个包时要确认它的依赖、被它打补丁的包是同一份实例（`pnpm why <包>` 只能有一个版本/路径）。

## 检查脚本 `scripts/desource/check-undef.mjs`

扫 renderer 全部源文件（1125 个），四条规则：

1. 未定义的标识符（漏 import）。
2. 从本地文件 import 了对方没导出的名字。
3. 读一个本地已知形状的对象上不存在的属性（抓空桩，比如上面的 PDF.js）。相等比较的操作数不算。
4. `--base <ref>`（默认 441a06b）：对比基线版本 vendor.js 里的 `X.prototype.Y = …` / `Object.assign(X.prototype, …)` / `Object.defineProperty(X.prototype, …)`，X 还在、补丁却没了就报（抓双实例）。

当前 HEAD 全部通过。

## 功能一致性对比（本次交接提交）

`scripts/ui-compare/compare.mjs` 在截图之外，每页还记录三类数据，和基线一起存成 `<页>.net.json` / `.dom.json` / `.state.json`：

- **网络**：在 `location.assign` 前开始捕获，并以 requestId → loaderId / documentURL 绑定新主框架文档，只收当前导航 loader 的本机（127.0.0.1 / localhost）HTTP 和 WebSocket 请求，因此包含页面加载阶段。页面步骤完成后等待本机请求至少连续 3 秒无在途请求（最多 10 秒）再采集最终状态和截图；捕获持续到截图完成。`ws-pdf` 在上传后、打开预览前另等 1.6 秒网络空闲（画布保存 debounce 为 500ms，另加 1 秒以上余量），场景结束后再等 3 秒，最多 15 秒。原始 sidecar 保留 `OPTIONS`；可比较视图丢弃浏览器生成的 `OPTIONS`，GET 去重排序，非 GET 按 method+path 分组、组内保序、组间按 key 排序，WS 发出帧保留全局顺序。uuid、时间戳、端口、随机会话 / 请求 ID 已归一化；嵌套文件 URL 的 `_canvas_v` 缓存版本只归一化为 `<version>`，请求仍保留。`.hilo/tables/<12位随机十六进制>.htable` 路径在每页内按首次出现映射为 `table-1`、`table-2` 等；`col_`、`row_`、`cond_` 后的 8 位随机十六进制 ID 也按类型和首次出现顺序映射，net、DOM、state 共用同一映射。生成位置：`app/gateway/src/canvas/table-document.ts:47`（表格路径）及 `:42`（列、行、条件 ID）。`NET_VOLATILE` 仅有 GET 路径前缀 `/api/v1/home/showcase-assets/`：云端轮换展示素材会产生不同哈希路径，与本地交互逻辑无关。
- **DOM 状态**：带 `data-action-ui-id`、`role`、`aria-*`、`disabled`、`checked`、`contenteditable` 的元素和表单控件，按文档顺序比较属性、值和文本；对 React `useId` 随机标识和空聊天推荐卡片的动态示例标签做归一化。`skills` 与 `skill-community` 都等待社区列表退出 loading 并出现列表项；`project-assets` 等待资产面板。DOM 与持久化状态每 500ms 重新采集，连续两份相等才继续，最多 10 秒，超时会带最后差异失败。每次采集前都等待 toast 消失（最多 10 秒，不主动关闭）。
- **持久化状态**：localStorage 全量（JSON 字符串会解析并递归归一化），以及工作区 `.hilo/` 下除 sqlite 外的文件（canvas.json 等）。顶层缩略图缓存路径会按 SHA-256 内容和大小比较，保留重复数量，忽略随资源 ID 变化的文件名。
- 截图前最多等 5 秒，等待图片完成且成功加载的图片 `naturalWidth > 0`，随后对这些图片等待 `decode()`（捕获解码错误；总时限 5 秒）。卡片封面视频 host `cdn.hailuoai.com` 及打光预设缩略图 host `cdn.hailuoai.video` 属外部展示资源，通过 `BLOCKED_URLS` 屏蔽，避免远端内容影响截图。像素报告保留 raw `diffPct`（RGB 三通道差值和 `d > TOL=24`）；另用 `pixelmatch@7.2.0`（2026-04-29 发布，`includeAA: false`、`threshold: 0`，显式指定红色 `diffColor` 和黄色 `aaColor`）报告纯 pixelmatch `pixelmatchNonAA` 数量。门禁用 `diffPctNonAA`，仅计入同一像素同时满足 `d > TOL` 且 pixelmatch 输出红色非 AA 差异的交集；`.non-aa.diff.png` 也只显示此交集。

- **门禁稳定性**：先执行完整 40 页比较；任一页面失败时再执行第二次完整比较，只有同一页面在两次运行中同一通道（像素、网络、DOM、状态或新增错误）都失败才阻断。代码回归应稳定复现，而只出现一次的差异更可能是 harness 时序噪声，因此会连同两份报告路径列为“不稳定（一次失败）”但不阻断。

新增 8 个真操作场景；全部启用时 32 → 40 页，目前 40 页全部启用：

| 场景 | 操作 |
|---|---|
| `ws-pdf` | 通过画布文件上传控件导入 PDF，打开预览并等待 pdf.js 渲染出 canvas |
| `ws-chat-input` | tiptap 聊天输入：占位符 → 输入 → Shift+Enter 换行 → Enter 发送，等待生成结束，并验证请求 / WS 帧包含内容 |
| `ws-code-editor` | CodeMirror：输入、Ctrl/Cmd+F 搜索、撤销。文件必须超过 50 万字符才走 CodeMirror（`resolveTextEditorMode`），fixture 由 `generate-fixtures.mjs` 运行时用固定种子生成，不入库。该编辑器没注册自动补全，所以不测补全 |
| `ws-markdown` | Markdown 预览：标题、GFM 表格、代码块。441a06b 与 branch 的 DOM dump 都是原始 `<pre><code>`，没有 Shiki token；运行时路径 `text-node-inner.jsx` 只用 remarkGfm、不调用 Shiki，因此这不是已观察到的 swap 回归。Shiki 走聊天消息的 Streamdown 路径，本场景不要求 token |
| `ws-video` | 通过画布上传控件导入（`DOM.setFileInputFiles`），检查元数据、播放、用进度条 seek、暂停 |
| `ws-audio` | 通过画布上传控件导入（`DOM.setFileInputFiles`），检查元数据、播放、用波形实际 seek、暂停 |
| `ws-table-edit` | 全屏表格编辑器：加行、改单元格，有筛选控件时也操作 |
| `ws-canvas-ops` | 拖动节点、滚轮缩放、连线、撤销 / 重做 |

**状态**：`DISABLED_PAGES` 为空；`NET_VOLATILE` 仅有 GET `/api/v1/home/showcase-assets/`。`BLOCKED_URLS` 只屏蔽外部展示素材 host `cdn.hailuoai.com`（封面视频）与 `cdn.hailuoai.video`（打光缩略图）。441a06b 的正式 40 页 golden 已按当前 harness 重录。

**RNG trace（默认关闭）**：设置 `OV_RANDOM_TRACE=1` 才会在 `ws-pdf` 记录随机调用栈、reset 索引与推荐池 ID；基线与分支的 348-call 调用序列及 152-ID 推荐池（SHA-256 `beff55ae27e5aaa86bf77b3bbd04c37a5cb8511b13508608fd6cc33f01a12669`）一致，先前卡片差异不是换包造成。

**441a06b 全量自比较**：两次 gate 等效运行都在第一次完整比较通过，没有触发第二轮：

- `/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T08-56-10-445Z/report.json`
- `/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T09-14-23-858Z/report.json`

两份报告的 40 页均无非 AA 像素、网络、DOM、状态或新增错误差异。raw-only 像素差异仅作信息报告：第一份为 `ws-a` 5、`ws-code-editor` 7、`ws-table-edit` 7；第二份为 `ws-a` 5、`ws-code-editor` 7；以上页面的 `diffPctNonAA` 均为 0。先前完整自比较 `/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T08-35-45-963Z/report.json` 同样所有门禁通道为 0。

此前 `skill-community` 的 DOM 41 差异是旧 golden 与恢复页面开关状态不一致：旧报告的恢复 DOM 开关为关闭，而旧 golden 对应项为开启；新录制 golden 与两次完整恢复均为关闭且 DOM 差异为 0。源码中已安装 Skill 的 `enabled` 来自 `base.json` 权限与用户覆盖；harness 对 `skills`、`skill-community` 等待 `/api/skills` / 市场请求、社区列表及 `base.json` 权限就绪。旧运行时目录已不存在，且比较 sidecar 不含响应体，无法还原旧 golden 记录时卡片开关的具体数据来源；因此不把旧 `true` 归因到未经验证的存储值。现有证据确认旧 golden 状态与后续恢复不一致，新 golden 与两次完整恢复一致。

原自比较中的其它问题本轮均未复现：`ws-chat-input` 使用关闭的本地 provider 端口保持请求 payload 可比较；`ws-pdf` 在场景后等待网络 idle；表格路径及相关 ID 在每页共享映射中规范化；项目页 state、workspace 请求和 toast DOM 均在上述完整报告中无差异。网络请求仍保留当前 loader/documentURL 范围，不通过删除端点消除差异。

**分支 gate 状态：通过（Phase 1 完成）。** 按原样运行 `scripts/ui-compare/gate.sh`：构建 11/11 packages 成功，`check-undef` 检查 1125 个 renderer 源文件通过；首次比较发现差异后自动完成第二次全量比较。报告：

- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T12-17-07-400Z/report.json`
- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T12-35-17-837Z/report.json`

本轮一次性 flake（第二次同页同通道均通过）：

- `skill-community`：第一次 DOM 差异 41 项，第二次通过。
- `ws-chat-skill`：第一次 pixel 差异 40 个 raw 像素、28 个 TOL∩non-AA 像素（`pixelmatchNonAA` 28），第二次通过。

没有同一页面在同一通道连续两次失败，gate 退出码为 0。第二份报告 40 页所有门禁通道均为 0；两份报告中 `ws-pdf` 均为 raw/non-AA/pixelmatch 0，网络、DOM、状态及新增错误也均为 0，因此先前右侧推荐卡片差异本轮未复现。此前 `ws-multi-angle` 的一次性像素差异也未在本轮出现；raw-only 信息差异为两轮均有 `ws-a` 5 像素和 `ws-code-editor` 7 像素，non-AA 均为 0。

## 运行环境（Linux 云机，已验证）

- Node ≥ 24（用的 24.21.0，经 nvm），pnpm 9.3.0，`pnpm install --frozen-lockfile`。
- Xvfb：`xvfb-run`。窗口必须可见，隐藏窗口截图会超时。
- Electron：`ELECTRON_OVERRIDE_DIST_PATH` 指向一份 Linux 版 Electron 43.7.0 的 dist 目录（和 `app/desktop` 的版本一致），并设 `ELECTRON_DISABLE_SANDBOX=1`。
- OpenCode：`OPENCODE_BIN` 指向 opencode 可执行文件（用的 `~/.cache/opencode-v1.18.18/opencode`）。
- `scripts/ui-compare/fixture/config.json` 不存在时，gate.sh 会写一个占位 api_key，不需要真凭据。

### 命令

```bash
source "$HOME/.nvm/nvm.sh"
export GOLDEN="$PWD/.probe/ui-golden"
export ELECTRON_DISABLE_SANDBOX=1
export ELECTRON_OVERRIDE_DIST_PATH="$HOME/ov-electron-dist"
export OPENCODE_BIN="$HOME/.cache/opencode-v1.18.18/opencode"

# 全量对比（构建产物 vs 基线）；只跑几页：ONLY=ws-pdf,ws-chat-input
xvfb-run -a node scripts/ui-compare/compare.mjs
# 录基线：加 --record
xvfb-run -a node scripts/ui-compare/compare.mjs --record

# 完整门禁：构建 + check-undef + 全量对比 + 校验报告
scripts/ui-compare/gate.sh [基线目录]     # 可选 SKIP_BUILD=1 / SKIP_CHECK_UNDEF=1
```

### 基线怎么录

基线必须用 **441a06b**（aee54ac 之前最后一个能正常跑的版本）录，用当前分支的对比脚本：

```bash
git worktree add ~/ov-golden 441a06b
cp -r scripts/ui-compare ~/ov-golden/scripts/   # 只复制，不在 worktree 里提交
cd ~/ov-golden && pnpm install --frozen-lockfile && pnpm turbo run build
GOLDEN=<本仓库>/.probe/ui-golden xvfb-run -a node scripts/ui-compare/compare.mjs --record   # 其余环境变量同上
```

改了对比脚本或 fixture 之后，要把 `scripts/ui-compare` 重新复制过去并重录。

### 对比的已知坑

- 首页卡片封面是 CDN 上的 mp4，解码时机不定，已在采集时挡掉 `*cdn.hailuoai.com*`。
- 全局搜索里「x 分钟前」随时间变，对比时只在这一页把 `Date.now` 固定到最近工作区时间之后 4 分 30 秒。
- 文件列表按 mtime 排序，复制 fixture 后统一改 mtime。
- 历史上 `ws-select-image` / `ws-relight` 自比较有过 ≤0.001% 的抖动，修完视口问题后没再出现。
- Batch 1 的 `ws-add-node`、此前 `ws-pdf`，以及 Batch 2 补充全量第二轮中的 `ws-zoom` / `ws-audio` pixel 差异（raw 1467 / non-AA 958）具有相同的 diff PNG（SHA-256 `e38baa7dd90ae5c3151ef05be533ae577241177343deb18cda0a06806a24e6af`），对应不同页面上的 recurring alternate recommendation-card state。后续 Harness A 已定位共享 RNG 调用顺序差异并在 harness 中按 `pickRecommendationBatch` 重置；全量自比较结果见下文。

## 还剩的工作

### 1. vendor.js 内联包候选与摸底记录（历史候选表；完成状态见下文）

下表是 Batch 2 完成后的历史候选快照：当时 `vendor.js` 为 3,577,639 bytes（约 3.6MB），尚有 27 个候选；后续完成状态见 Batch 3 与各批次结果记录。

```
@base-ui/utils@0.2.6  @base-ui/react@1.3.0
@floating-ui/react@0.27.20  hast-util-to-html@9.0.5  @shikijs/core@3.23.0
@shikijs/engine-oniguruma@4.4.3  @shikijs/primitive@4.0.2  seroval@1.5.6  seroval-plugins@1.5.6
@tiptap/extension-blockquote@3.27.3  @tiptap/extension-bold@3.31.3
@tiptap/extension-code-block@3.30.2  @tiptap/extension-floating-menu@3.30.2  zustand@5.0.15
@xyflow/react@12.10.2  entities@6.0.1  mediabunny@1.52.3  decode-named-character-reference@1.3.0
regex@6.1.0  regex-recursion@6.0.2  parse5@8.0.1  unist-util-visit@5.1.0
hls.js@1.7.3  inline-style-parser@0.2.4  style-to-object@1.0.11  style-to-js@1.1.21
@tanstack/form-core@1.33.5
```

**单包摸底**：每个候选均从干净 `bf13e36` 单独运行 `ONLY=<pkg> node scripts/decompile/swap-current.mjs`，随后恢复 `vendor.js`、renderer `package.json` 和根 `package.json`。39 个包都未能单独换入；每次 `vendor.js` 删减均为 0 bytes，大小始终为 3,748,669 bytes。

| 包@版本 | 单包结果 / 失败原因 | 删减字节 |
|---|---|---:|
| `@base-ui/utils@0.2.6` | 失败：8 处导出冲突，如 `fastComponent`、`formatErrorMessage`、`useTimeout` | 0 |
| `@base-ui/react@1.3.0` | 失败：196 处冲突；vendor 其他语句给其对象挂属性，且 `useRefWithInit` 等不是公开导出 | 0 |
| `@marijn/find-cluster-break@1.0.4` | vendor 中无匹配代码 | 0 |
| `@codemirror/language@6.12.4` | 失败：9 处导出冲突，如 `cutFragments`、`requestIdle` | 0 |
| `@codemirror/autocomplete@6.20.3` | 失败：3 处导出冲突，如 `ActiveSnippet`、`Snippet` | 0 |
| `@codemirror/lang-javascript@6.2.5` | 失败：7 处导出冲突，如 `dontComplete`、`jsxSublanguage` | 0 |
| `@codemirror/lang-html@6.4.12` | 失败：9 处导出冲突，如 `completeCloseTag`、`completeTag` | 0 |
| `@codemirror/lang-markdown@6.5.2` | 失败：12 处导出冲突，如 `indentUnit`、`countColumn` | 0 |
| `@codemirror/search@6.7.2` | 失败：5 处导出冲突，如 `validRegExp`、`StringQuery` | 0 |
| `@lezer/javascript@1.5.4` | 失败：17 处导出冲突，如 `ExternalTokenizer`、`descendant` | 0 |
| `@lezer/css@1.3.4` | 失败：5 处导出冲突，如 `space`、`descendant` | 0 |
| `@lezer/markdown@1.7.2` | 失败：22 处导出冲突，如 `Type`、`isBulletList` | 0 |
| `@floating-ui/react@0.27.20` | 失败：5 处导出冲突，如 `ownerDocument`、`getDelay` | 0 |
| `hast-util-to-html@9.0.5` | 失败：4 处冲突，包括 `whitespace`、`closing` 非公开导出及引用别的包的 `stringifyEntities` | 0 |
| `@shikijs/core@3.23.0` | 失败：引用不属于此包的 `hastToHtml` | 0 |
| `@shikijs/engine-oniguruma@4.4.3` | 失败：1 处导出冲突，`ShikiError$1` 不是公开导出 | 0 |
| `@shikijs/primitive@4.0.2` | 失败：2 处导出冲突，均涉及 `ShikiError` | 0 |
| `seroval@1.5.6` | vendor 中无匹配代码 | 0 |
| `seroval-plugins@1.5.6` | vendor 中无匹配代码 | 0 |
| `@tiptap/extension-blockquote@3.27.3` | vendor 中无匹配代码 | 0 |
| `@tiptap/extension-bold@3.31.3` | vendor 中无匹配代码 | 0 |
| `@tiptap/extension-bubble-menu@3.31.3` | 失败：`FloatingMenuPlugin` 不是公开导出 | 0 |
| `@tiptap/extension-code-block@3.30.2` | vendor 中无匹配代码 | 0 |
| `@tiptap/extension-floating-menu@3.30.2` | 失败：`BubbleMenuPlugin` 不是公开导出 | 0 |
| `zustand@5.0.15` | vendor 中无匹配代码 | 0 |
| `@xyflow/react@12.10.2` | 失败：33 处导出冲突，如 `useStoreWithEqualityFn`、`StoreContext` | 0 |
| `entities@6.0.1` | 失败：`EntryType` 不是公开导出 | 0 |
| `mediabunny@1.52.3` | 失败：47 处导出冲突，如 `promiseWithResolvers`、`KILOBIT_RATES` | 0 |
| `decode-named-character-reference@1.3.0` | vendor 中无匹配代码 | 0 |
| `regex@6.1.0` | vendor 中无匹配代码 | 0 |
| `regex-recursion@6.0.2` | vendor 中无匹配代码 | 0 |
| `parse5@8.0.1` | 失败：2 处导出冲突，`TokenType`、`getTagID` 不是公开导出 | 0 |
| `unist-util-visit@5.1.0` | vendor 中无匹配代码 | 0 |
| `rehype-harden@1.1.8` | 失败：5 处导出冲突，包括 `empty`、`toResult`、`SKIP`、`createVisitor` | 0 |
| `hls.js@1.7.3` | 失败：识别出的语句在冲突检查中全部被剔除 | 0 |
| `inline-style-parser@0.2.4` | vendor 中无匹配代码 | 0 |
| `style-to-object@1.0.11` | vendor 中无匹配代码 | 0 |
| `style-to-js@1.1.21` | vendor 中无匹配代码 | 0 |
| `@tanstack/form-core@1.33.5` | 失败：`resolveClassName`、`resolveStyle` 不是公开导出 | 0 |

**无匹配包的源文件分类**：逐包在 `app/renderer/src`（包含 `vendor-inline`）检索了以下 npm dist 标识符。`serialize`、`parse` 等通用词不单独作为命中证据。

| 包 | Dist 标识符 / 字符串 | 分类 |
|---|---|---|
| `@marijn/find-cluster-break` | `findClusterBreak`、`isExtendingChar`、`includeExtending` | 无独立实现；`findClusterBreak` 由 `@codemirror/state` 公共 import 提供，另两个标识符 absent |
| `seroval` | `SerovalNode`、`createReference`、`getCrossReferenceHeader` | absent（not bundled；VS Code 的 `deserialize` 是另一套实现） |
| `seroval-plugins` | `AbortSignalPlugin`、`BlobPlugin`、`URLSearchParamsPlugin` | absent（not bundled） |
| `@tiptap/extension-blockquote` | `Blockquote`、`inputRegex`、`setBlockquote` | absent（not bundled；旧 `base-theme.js` 的 CodeMirror 语法节点已随 Batch 2 删除） |
| `@tiptap/extension-bold` | `Bold`、`starInputRegex`、`underscoreInputRegex` | absent（not bundled；`Bold` 在 vendor 中仅命中 Lucide 图标） |
| `@tiptap/extension-code-block` | `CodeBlock`、`exitCode`、`languageClassPrefix` | absent（not bundled；旧 `base-theme.js` 的 CodeMirror 语法节点已随 Batch 2 删除，`exitCode` 来自 ProseMirror commands） |
| `zustand` | `createStoreImpl`、`subscribeWithSelector`、`createJSONStorage` | `createStoreImpl` 位于 `app/renderer/src/vendor.js` |
| `decode-named-character-reference` | `decodeNamedCharacterReference`、`notin`、`NotEqualTilde` | 位于 `app/renderer/src/vendor.js` |
| `regex` | `RegexTag`、`RawTemplate`、`InterpolatedValue` | absent（not bundled） |
| `regex-recursion` | `recursion`、`captureTransfers`、`hiddenCaptures` | absent（not bundled） |
| `unist-util-visit` | `visitParents`、`SKIP`、`CONTINUE` | 位于 `app/renderer/src/vendor.js`；`visitParents` 另由 `app/renderer/src/vendor-inline/minified/s2.js` 使用 |
| `inline-style-parser` | `COMMENT_REGEX`、`PROPERTY_REGEX`、`TYPE_DECLARATION` | 位于 `app/renderer/src/vendor.js:64079-64092` |
| `style-to-object` | `StyleToObject`、`cjs$2.default` | 位于 `app/renderer/src/vendor.js:64228-64230` |
| `style-to-js` | `StyleToJS`、`cjs` | 位于 `app/renderer/src/vendor.js:64309-64322` |

**Batch 1 联合试验与最终状态**：批准的 8 包联合 `ONLY=` 试验后，6 个包仍有包间内部符号冲突。已手动换入 `@tiptap/extension-bubble-menu@3.31.3`（使用公开 `BubbleMenuPlugin`，保留 vendor 导出名）；`rehype-harden@1.1.8` 也改为公开 `harden` / `BlockPolicy` API，并从 vendor 删除旧实现及仅供该实现使用的内部 helper。`qs.jsx` 原先使用这些内部 helper，现改为直接调用包的公开 `harden`，行为与包公开实现一致。`FloatingMenu` 保留内联：精确候选 `3.30.2` 与现有 `@tiptap/react` / core `3.31.3` 不兼容，加入会引入第二个 Floating Menu 版本。

延期包及理由：`hast-util-to-html@9.0.5` 仍有 `whitespace`、`closing` 非公开导出及 `stringifyEntities` 交叉引用；`entities@6.0.1` 的 `EntryType` 被 parse5 的 `FormattingElementList` 使用；`parse5@8.0.1` 需要非公开 `TokenType`、`getTagID`；`@tanstack/form-core@1.33.5` 的 `resolveClassName` / `resolveStyle` 仍被 `useRenderElementProps` 消费；`hls.js@1.7.3` 的识别语句全部在冲突检查中被剔除。以上均留在 vendor，未复制内部实现到 app 代码。Batch 结果为 2 个替换、6 个延期。

`vendor.js` 从 3,748,669 bytes 减至 3,727,360 bytes（净减 21,309 bytes）。renderer 解析闭包在变更前后均只有既定的 5 组多版本包：`@floating-ui/utils` 0.2.11/0.2.12、`@floating-ui/dom` 1.7.6/1.8.0、`@tanstack/history` 1.162.0/1.162.1、`@tanstack/router-core` 1.171.13/1.171.27、`@shikijs/types` 3.23.0/4.0.2；没有新增多版本包。

**Batch 验收结果**：`pnpm install` 成功；renderer 闭包的变更前后重复版本均与既定基线完全一致，没有新增多版本包。`node scripts/desource/check-undef.mjs` 检查 1125 个 renderer 源文件通过；`scripts/ui-compare/gate.sh` 的 build 为 11/11 packages 成功，双轮 40 页 gate 通过。报告：

- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T13-16-10-088Z/report.json`
- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T13-34-21-576Z/report.json`

第一次仅 `ws-add-node` pixel 通道失败（raw 1467、TOL∩non-AA 958，`pixelmatchNonAA=958`）；第二次同页全部为 0，因此按双轮规则记为一次性 flake，不阻断 gate。其余页面两轮所有门禁通道均为 0；`ws-a` raw-only 均为 5，`ws-code-editor` raw-only 分别为 11 和 7，non-AA 均为 0。网络、DOM、状态及新增错误两轮均为 0。

剩余内联实现检查：Bubble Menu 的 `BubbleMenuView`、`combineDOMRects` 等旧实现已不在 `vendor.js` / renderer 源码，vendor 保留原导出名并由 `@tiptap/extension-bubble-menu@3.31.3` 的公开 `BubbleMenuPlugin` 提供。rehype-harden 的旧 `createVisitor`、`stripNullChildren`、URL-policy helper 等已删除；`visitParents` / `SKIP` 仍由 `vendor-inline/minified/s2.js` 使用，所以保留其 unist 实现。rehype 调用点已改用公开 `harden` API，没有把包内部实现复制到 app。

注意版本：`package.json` 里 `@xyflow/react` 是 12.11.6，它依赖 `@xyflow/system@0.0.82`，但直接依赖钉的是 0.0.76。直接升到 0.0.82 会构建失败（缺 `devWarn` 导出），已退回。换 xyflow 时要一起理顺。

**Batch 2 CodeMirror/Lezer 闭包**：一次联合 `ONLY=` 换入以下 14 个精确版本：`@lezer/common@1.5.2`、`@lezer/highlight@1.2.3`、`@lezer/lr@1.4.10`、`@codemirror/language@6.12.4`、`@codemirror/autocomplete@6.20.3`、`@lezer/javascript@1.5.4`、`@codemirror/lang-javascript@6.2.5`、`@lezer/html@1.3.13`、`@lezer/css@1.3.4`、`@codemirror/lang-css@6.3.1`、`@codemirror/lang-html@6.4.12`、`@lezer/markdown@1.7.2`、`@codemirror/lang-markdown@6.5.2`、`@codemirror/search@6.7.2`。其中 `@lezer/css@1.3.4` 通过根 `pnpm.overrides` 固定，并保留为 renderer 直接依赖；该版本匹配内联实现且满足 `@codemirror/lang-css@6.3.1` 的 `^1.1.7` 范围。

联合工具报告无独立内联语句的 7 个闭包成员：`@codemirror/state@6.7.5`、`@codemirror/view@6.43.6`、`@codemirror/commands@6.10.4`、`@marijn/find-cluster-break@1.0.4`、`crelt@1.0.7`、`style-mod@4.1.4`、`w3c-keyname@2.2.8`。前 3 个及其余已安装依赖继续从 npm 闭包使用；没有为它们保留单独的 vendor 实现。`vendor-inline/codemirror/` 中复制的解析器、语言和搜索实现被替换为 npm 公共 API wrapper；selection bridge 与 Markdown preview 保留为 app 自有逻辑。`swap-current.mjs` 的显式 `ONLY=` 现在也会尝试 renderer 清单中的直接依赖，以覆盖此类内联拷贝。

`vendor.js` 从 3,727,360 bytes 减至 3,577,639 bytes（净减 149,721）；`vendor-inline/codemirror/` 从 306,780 bytes 减至 12,216 bytes。renderer 闭包的多版本差异仍只有既定 5 组：`@floating-ui/utils` 0.2.11/0.2.12、`@floating-ui/dom` 1.7.6/1.8.0、`@tanstack/history` 1.162.0/1.162.1、`@tanstack/router-core` 1.171.13/1.171.27、`@shikijs/types` 3.23.0/4.0.2；没有新增重复包。

剩余实现 grep 命中仅为 `vendor.js` 从 `@lezer/lr` 的 npm import/export `ExternalTokenizer`，以及其他 vendor 库的 `isParent` 子串（XYFlow）；CodeMirror/Lezer 内联实现与 prototype patch 均已移除。构建产物 `app/desktop/out/recovered-ui/assets/index-CFRbujhi.js` 中的单例标记各出现一次：state `Cyclic dependency between fields and/or facets`、view `Mark decorations may not be empty`、common `This node type doesn't define a deserialize function`。`check-undef` 检查 1120 个 renderer 源文件通过。

**Batch 2 gate 与双轮交互验收**：原样运行 `scripts/ui-compare/gate.sh` 对仓库 `.probe/ui-golden` 比较，build 11/11 packages 与 `check-undef` 均通过，首轮 40 页所有阻断通道通过；gate 按设计在首轮无失败时不再自动启动第二轮。报告：

- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T14-11-09-761Z/report.json`

为满足 CodeMirror 交互场景必须两轮通过的要求，另以 `ONLY` unset、相同 golden 和运行环境执行完整第二轮 compare。该独立 compare runner 退出码为 1，仅因下述非目标页 pixel 差异：

- `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T14-31-41-782Z/report.json`

`ws-markdown`、`ws-text-editor`、`ws-code-editor` 两份报告的 net/DOM/state/新增错误均为 0；pixel 的 TOL∩non-AA 也均为 0（`ws-code-editor` 两轮各有 7 个 raw-only 像素）。补充第二轮在首次报告通过的 `ws-b` 出现一次 raw 642 / TOL∩non-AA 408 的 pixel 差异；`ws-zoom` 与 `ws-audio` 各出现 raw 1467 / TOL∩non-AA 958，diff PNG 与上述推荐卡片 flake 的 SHA 相同。三页的 net/DOM/state/新增错误均为 0；与首轮对照均非同页重复失败，不构成可复现回归，未做 app 逻辑修改或包级 bisect。

### 2. `vendor-inline/`（约 2MB）

| 目录 | 内容 | 大小 |
|---|---|---|
| `codemirror/` | npm public-API wrappers and app-owned selection/Markdown logic | 12K |
| `immer/` | 实为 mutative（`make-creator.js` 等） | 56K |
| `minified/` | `ct.js` / `h.js` / `s2.js`，含 travels（撤销 / 重做）等 | 84K |
| `tanstack-table/` | table-core | 120K |
| `mediabunny/` | 含内联 worker | 1.4M |
| `vscode-base/` | VS Code base 工具函数，可能没有对应 npm 包，需要改写成可读源码 | 80K |

注意：库代码和业务代码在还原树里有混在同一文件的情况（例如 `infra/shallow-copy.js` 里有 mutative 内部函数），换包要跨文件处理。

### 3. 带哈希的产物块

`pdf.worker.min-yatZIOMy.mjs`（换成 `pdfjs-dist/build/pdf.worker.min.mjs?url`）、`wasm-DDgzZJey.js`（shiki 的内联 wasm）、`highlighted-body-OFNGDK62-D2hkhc6K.js`、`decode-worker-DBC09hCG.js`、`error-card-fixtures-GXqelGnw.js`、`__vite-browser-external-2Ng8QIWW.js`。库的换成 npm，自己的改成正常文件名。

### 4. 压缩文件名（17 个）

`canvas/{it,ot,w,we}.js`、`chat/{ae,at,co,fo,nn,pe,qs,st,te}.jsx`、`chat/{xn,yt}.js`、`media-editing/wt.js`、`workspace/q.js`。需要一个确定性的改名工具：同时改静态 import/export、动态 `import()`、`new URL(..., import.meta.url)`，一次性原子应用。

### 5. 业务代码的压缩变量名（约 337 个文件）

用基于 Babel 作用域绑定的工具改名：只改声明和它的引用，跨文件同步 import/export，检测重名冲突，JSX 组件保持首字母大写，标出依赖 `.name` / `constructor.name` / 字符串反射的风险点。改名前后要校验 alpha 等价（只改名字、结构完全一致）。按目录分批，每批过门禁。

### 建议顺序

完成功能对比的验收 → 1 → 2 → 3 → 4 → 5。每一批单独提交，过 `gate.sh` 才继续。

## Batch 3：Shiki/HAST 闭包与声明体残留审计

一次性替换 Shiki、HAST 序列化闭包及 `@tiptap/react/menus` 的 React 菜单子路径。换入或使用的准确版本：

- Shiki：`@shikijs/core@3.23.0`、`@shikijs/engine-oniguruma@4.4.3`、`@shikijs/primitive@4.0.2`、`@shikijs/types@3.23.0`、`@shikijs/types@4.0.2`、`@shikijs/types@4.4.3`、`@shikijs/vscode-textmate@10.0.2`。
- HAST：`hast-util-to-html@9.0.5`、`hast-util-whitespace@3.0.0`、`ccount@2.0.1`、`comma-separated-tokens@2.0.3`、`space-separated-tokens@2.0.2`、`property-information@7.1.0`、`html-void-elements@3.0.0`、`stringify-entities@4.0.4`、`character-entities@2.0.2`、`character-entities-html4@2.1.0`、`character-entities-legacy@3.0.0`、`zwitch@2.0.4`。
- 菜单：`@tiptap/react/menus@3.31.3`，通过已安装的 `@tiptap/react@3.31.3` 子路径导入；保留 vendor 的导出名。
- 同一构建继续使用既有 `@shikijs/engine-javascript@4.0.2`、`@shikijs/langs@3.23.0`、`@shikijs/themes@3.23.0` 与 `oniguruma-to-es@4.3.6`。没有找到需要再单独替换的 `regex` / `regex-recursion` 内联实现。

`@shikijs/engine-oniguruma@4.4.3` 精确依赖 `@shikijs/types@4.4.3`，所以按原始 bundle 的版本映射保留此第三版本，没有 override 到不兼容版本。原始内联代码的三份 `ShikiError` 分别是 `ShikiError$2`（`@shikijs/types@3.23.0`，Shiki core）、`ShikiError$1`（`@shikijs/types@4.0.2`，primitive）和 `ShikiError3`（`@shikijs/engine-oniguruma@4.4.3` 自有类）。替换后构建资产 `index-5pYNPjYJ.js` 仍恰有三处 `this.name = "ShikiError"`：两份 types 类及一份 engine-oniguruma 类。此第三版本是原 bundle 已存在重复的忠实保留。

旧 `wasm-DDgzZJey.js` 删除，改为 `@shikijs/engine-oniguruma/wasm-inlined`。构建输出中与 oniguruma 包源一致的 wasm payload 恰有一份：解码后 466,610 bytes，SHA-256 `fd885c2d12e5951e59d761ebd4a006e06254b1491fd6f530c92b69fb4d8d77d9`。主 bundle 另有一个不同用途、不同 hash 的 wasm payload，不是第二份 oniguruma wasm。`highlighted-body-OFNGDK62-D2hkhc6K.js` 是 app-owned Streamdown 内容组件而非库代码，已改名为 `app/renderer/src/chat/highlighted-code-block-body.js` 并更新 importer。React 菜单子路径的旧 FloatingMenu helpers/component 已删除；单独的 `@tiptap/extension-floating-menu@3.30.2` 插件实现保留内联，因为它与 renderer 的 Tiptap `3.31.3` 不同，替换会改变现有直接依赖版本。

`vendor.js` 从 Batch 3 前的 **3,577,639 bytes** 降至 **3,387,339 bytes**，净减 **190,300 bytes**。

### Batch 1–3 声明体审计结论

按用户指定范围，解析 35 个已替换包/版本的 ESM entry module graph，对 `vendor.js` 和 `vendor-inline/` 的顶层 function/class/const 声明逐个检查；声明名匹配 `$N` 后缀，声明体按空白及标识符归一化。共比较 128 个包声明名—本地声明对（涉及 98 个本地声明）；其中 32 对声明体归一化后相同，96 对不同。32 对相同项都是短 helper/常量的跨包同形实现；逐条按周边调用点归属后，均属于未替换包或 app 自有代码，不是已替换包的残留。另对 `@tiptap/react/menus@3.31.3` 的单一 ESM entry 单独扫描了 27 个顶层声明；仅 2 个 `useIsomorphicLayoutEffect` 名称命中，声明体均不同，未发现菜单实现残留。Batch 1–3 swapped-package residue：**none**。React FloatingMenu helper/component 区块已移除；保留的 `FloatingMenuView` 属于未替换的 `@tiptap/extension-floating-menu@3.30.2` 插件。

| 命中 | 实际归属 | 处置 / 判定 |
|---|---|---|
| `src_default$1 = Placeholder` 与 Bubble Menu 的短默认别名；`cache$1` 的 `Map` 初值 | Tiptap Placeholder 扩展；`getFormatter` 的 locale formatter cache（Base UI） | 仅是短赋值/通用初值归一碰撞；React BubbleMenu 实现已由 `@tiptap/react/menus` 提供。不是 BubbleMenu 或 CodeMirror 副本。 |
| `emptyOptions$5` | Unicode identifier-name validator 附近的默认 options | 通用空对象常量；调用点不属于 swapped HAST/CodeMirror 包。 |
| `cap` | 未替换的 `hast-util-to-jsx-runtime` 组件/属性转换代码 | `property-information` 中存在同形短 helper；本地调用链属于 JSX runtime，不属于已替换包。 |
| `emptyOptions$4`、`emptyOptions$3`、`emptyOptions$2`；`own$9`、`own$8`、`own$7`、`own$6`、`own$4` | 分别位于 `hast-util-to-text`、`mdast-util-to-hast`、`remark-gfm`、`decode-named-character-reference`、`mdast-util-from-markdown`、`unified`、`rehype-sanitize` 的本地调用段 | 通用空对象 / `hasOwnProperty` 引用；对应 owner 均未在 Batch 1–3 替换，按其后续 batch 留存。 |
| `emptyOptions`、`own$1`、`own`，以及 `__defProp` | `hast-util-to-parse5`/parse5 adapter；相邻 `__defProp$2` 属于 Tiptap Placeholder 上下文 | 这些 parse5/Tiptap 实现未在本批替换；不是 Shiki、HAST serializer 或 BubbleMenu 菜单实现。 |
| `__defProp$1` | `vendor-inline/vscode-base/vs-buffer.js` 的 app-owned VS Code Buffer 模块 | 通用 Object.defineProperty helper；不是 Shiki engine 副本。 |
| CodeMirror 的 `closedBracket`、Lezer LR 的 `verbose` | Batch 2 已确认的非公开旧实现 | 两项声明及 vendor 导出已删除；`indentString` 改为从 `@codemirror/language` 导入并保留 vendor 名称。`@codemirror/lang-javascript` 的 `cache$1` 命中属于 formatter cache，不是语言包。 |
| `parse$2` 与旧 React FloatingMenu 组件/helpers | Batch 3 两项已替换实现 | `parse$2` 改用 `comma-separated-tokens` 的公开 `parse`；旧 React 菜单实现已删。`rehype-harden` / `@lezer/common` 等其余 swapped package 未检出相同实现残留。 |
| 名称命中但 body 不同：`Tag`、`comment`、`heading`、`space`、`lt`、`endTag`、`properties`、`S`、`html`、`Type`、`Table`、`empty`、`search`、`re` 等 CodeMirror/Lezer 名称 | 对应本地声明与 npm ESM 声明归一化后不同；另有 `S$6` 在 `vendor-inline/immer/make-creator.js`、`count$1` 在 `vendor-inline/tanstack-table/column-filtering.js`、`lt$2` 在 `vendor-inline/minified/ct.js` | 是其他语法/HTML 适配器或已知未替换 inline 包的同名声明；不是 CodeMirror/Lezer 实现残留。 |
| 名称命中但 body 不同：`one`、`all`、`handle`、`unknown`、`doctype`、`element`、`p`、`dt`、`tr`、`raw`、`text`、`root`、`aria`、`create`、`normalize`、`Info`、`mergeObjects`、`basename`、`toArray` | 本地函数体均不匹配对应 serializer/property-information/Shiki dist 声明；调用点位于 HAST/parse5 adapters、其他 HAST utilities 或 app/UI modules | 归类到仍延期的 HAST/parse5 closure、Base UI formatter 或 app 自有逻辑；同名不等于复制实现。 |

因此 Batch 1、Batch 2、Batch 3 的 swapped package 声明体残留均为 **none**。`@tiptap/extension-floating-menu@3.30.2`、parse5 及其他表列 owner 是明确延期的未替换实现，不计作已替换包残留。

补充边界：`infra/from-vendor.js` 的兼容导出表还保留 `descendantOp`、`VariableName` 等 CSS grammar token 数字；它们只是 app bridge 导出的 token IDs，不含 parser、`NodeProp`、class 或 prototype 实现，在 app 源码中没有除 vendor export/import bridge 以外的消费者。按要求范围它们不属于 `vendor.js` / `vendor-inline/` 声明审计。

### Batch 3 验收

- renderer 闭包相对既定基线没有其他变化：`@floating-ui/utils` 0.2.11/0.2.12、`@floating-ui/dom` 1.7.6/1.8.0、`@tanstack/history` 1.162.0/1.162.1、`@tanstack/router-core` 1.171.13/1.171.27 均保持；唯一新增版本为已按三份原始 `ShikiError` 证据批准的 `@shikijs/types@4.4.3`。
- `check-undef` 通过；renderer build 11/11 packages 通过。Streamdown 高亮场景 `ws-chat-input` 两轮通过；`ws-markdown`、`ws-text-editor`、`ws-code-editor` 的 net/DOM/state/新增错误通道两轮均为 0。
- `scripts/ui-compare/gate.sh` 两轮完整 40 页流程通过。第一轮 `project-assets` DOM 有 41 项差异，第二轮通过；第二轮 `ws-zoom` raw 1467 / non-AA 958 的一次性 pixel 差异与既往 `ws-pdf`、`ws-audio`、`ws-add-node` 右侧推荐卡片区域相同，diff PNG SHA-256 为 `e38baa7dd90ae5c3151ef05be533ae577241177343deb18cda0a06806a24e6af`。该批次当时未修复，后续 harness RNG 修复见下文。
- 报告：`/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T15-31-47-663Z/report.json`、`/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T15-50-00-844Z/report.json`。
- gate 前后均确认没有 compare、Electron、Xvfb、OpenCode 或 Gateway 残留进程；端口 9360–9362 空闲。

## Harness A：推荐卡片 RNG 与 41 项 DOM 状态

`OV_RANDOM_TRACE=1` 的 pre-fix 跨页 trace（`2026-10-12T16-37-05-396Z`、`2026-10-12T16-40-18-576Z`）显示：各 workspace 的推荐候选池 ID/内容一致，但 `pickRecommendationBatch` 的执行次序因 `showcaseBatch` 与 `skillBatch` 各自的 React effect 而异。它们共享一个 `Math.random` 序列；因此，一个批次此前是否被另一个批次消耗随机数会改变最终卡片。组件的两处 effect 和 `handleRefresh` 都调用 `pickRecommendationBatch`（`app/renderer/src/chat/empty-chat-recommendations.jsx`）；这不是候选池内容变化，也不需要改 app 行为。

`scripts/ui-compare/compare.mjs` 现在只在 harness 中识别候选数组进入 `pickRecommendationBatch` 的过滤步骤，并在该批次第一次调用 `Math.random` 时重置到同一 seed。每批次仍使用相同 PRNG 和原选择算法，所以相同 pool 与 RNG stream 仍产生相同卡片；没有遮罩卡片区域。post-fix trace（`2026-10-12T16-45-39-559Z`）覆盖 `ws-a`、`ws-add-node`、`ws-audio`、`ws-pdf`、`ws-zoom`：虽各页批次调用顺序仍不同，最终可见卡片文本一致，trace 均记录批次 reset，message input 存在且无 runtime reconnect 文案。

`project-assets` 的历史 41 项 DOM 差异是短暂的 runtime reconnect 文案占据 composer 位置。workspace 截图和 `project-assets` 现在在 harness 等待 message input 出现且 reconnect 文案消失后再采集；不隐藏页面内容。`skill-community` 的历史 41 项差异不是同一瞬时 runtime 状态：旧 golden 的 18 个开关与恢复页面状态相反，旧 sidecar 无响应体，无法再还原 golden 当时权限数据的具体来源；已有 `/api/skills`、市场请求、列表及 `base.json` readiness 等待，不据此猜测或改数据。新录制 golden 曾与两次恢复一致，最新自比较中这两页的 DOM 差异均为 0。

A 要求的 `~/ov-golden`（HEAD `441a06b`）全量自比较报告：`/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T16-48-14-428Z/report.json`。40 页均为 `diffPixels=0`、`diffPixelsNonAA=0`，net/DOM/state/newErrors 总数均为 0；仅 `pixelmatchNonAA` 信息计数合计 16（`home` 2、`home-skill-inspiration` 7、`workflows` 7），不构成 pixel 差异。截图 runner 在 `ws-a`、`ws-select-image`、`ws-layout` 各重拍 8 次后使用最后一张，但上述页面最终比较仍全通过；没有复现右侧卡片 flake。

## Batch 4：parse5/entities 闭包

将候选 `parse5` 版本逐个与内联声明做归一化函数体比较，命中数为：`7.0.0: 164`、`7.1.0: 166`、`7.1.1: 166`、`7.1.2: 168`、`7.2.0: 185`、`7.2.1: 185`、`7.3.0: 191`。`8.0.1` 也命中 191 个且名字集合相同；但它不符合相邻内联包的依赖约束。`hast-util-raw@9.1.0` 声明 `parse5 ^7.0.0`，而内联 `EntityDecoder` 与 `entities@6.0.1` 匹配（parse5 7.3.0 依赖 entities 6.x），故将 `npm-packages.json` 中的版本改为 `parse5@7.3.0`。

整闭包换入：`parse5@7.3.0`、`entities@6.0.1`、`hast-util-raw@9.1.0`、`hast-util-from-parse5@8.0.3`、`hast-util-to-parse5@8.0.1`、`rehype-raw@7.0.0`、`web-namespaces@2.0.1`、`hastscript@9.0.1`、`devlop@1.1.0`。`vendor.js` 通过 npm imports 保留原有 vendor 导出别名，删除了对应的 parse5/raw/adapter 内联实现。

`vendor.js` 从 **3,387,339 bytes** 降至 **3,080,967 bytes**。renderer 闭包的多版本包仍为原基线中的五组（`@floating-ui/utils`、`@floating-ui/dom`、`@tanstack/history`、`@tanstack/router-core`、`@shikijs/types`），本批没有新增重复版本。构建 **11/11 packages** 和 `check-undef`（1120 个 renderer 文件）此前均通过；不要将这两项误写为 `SKIP_BUILD=1` 的 gate 子步骤。

完整 40 页 UI gate 双轮通过。第一轮报告：`/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T19-15-24-053Z/report.json`；第二轮报告：`/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-12T19-33-47-521Z/report.json`。两轮阻断通道均通过；第二轮 `ws-a` 有 5 个 raw-only 像素、non-AA 为 0，其余页面像素阻断差异为 0；40 页网络、DOM、状态和新增错误均通过。

## Batch 5：Base UI/Floating UI 闭包延期

未做部分 swap。`.probe/desource/base-ui-map.json` 保存了全部 **209** 个冲突名（`@base-ui/react: 196`、`@base-ui/utils: 8`、`@floating-ui/react: 5`）及消费者语句/行号、导出映射或删除理由。分类计数：公开 API（a）**73**、仅闭包内部引用（b）**4**、闭包外消费者/尚无等价公共映射（c）**132**。`fastComponent` 的属性赋值位于闭包函数体中，归为 b；不是外部修改。13 个 app consumer 的候选映射中，Progress 和 Avatar 部件与 dist 实现已对比；Popover、Select、Separator 的等价性未独立验证，map 将其保留为未解决项。整批延期后，所有临时 app-only 改动均已还原，未留下对未安装依赖的引用。

整批候选版本为 `@base-ui/react@1.3.0`、`@base-ui/utils@0.2.6`、`@floating-ui/react@0.27.20`。按闭包整体执行时，swap 工具仍报告 `@base-ui/utils` 7 处、`@base-ui/react` 188 处、`@floating-ui/react` 5 处冲突；新增的 all-or-nothing guard 阻止任何依赖清单或 `vendor.js` 写入。消费者表显示 132 个非公开冲突名仍有闭包外引用，尚未为它们逐一证明行为相同的公共替代 API。例如 vendor 内联 `DialogRoot` 使用 `useDialogRoot({ store, actionsRef, parentContext })`，而 `@base-ui/react@1.3.0` dist 还传入 `onOpenChange`、`triggerIdProp`；不能在未验证语义前直接将这一整套组件别名改指向 npm part。按“全换或整批延期”规则，整个 Base UI/Floating UI 家族延期。

`@floating-ui/react-dom`、`tabbable` 在 vendor 中是 npm imports，未发现对应独立内联声明，因此没有纳入本批。`clsx` 的内联定义归于 `class-variance-authority@0.7.1`，不归于 Base UI；`@tanstack/form-core@1.33.5` 也未纳入，`resolveClassName`、`resolveStyle`、`useRenderElementProps` 属于 Base UI dist。未运行 Batch 5 的安装、closure diff、`check-undef` 或 UI gate。Batch 5 没有改变 `vendor.js`；仍为 **3,080,967 bytes**。

## Batch 6：TanStack Table 闭包

对照 Vite 实际解析的 ESM `exports["."].import` 入口，版本扫描最佳为 `@tanstack/table-core@8.21.3`（46/60 个唯一归一化声明体）和 `@tanstack/react-table@8.21.3`（4/5）。`.probe/desource/semantic-diff.mjs` 对 15 个 map 标记的差异做 alpha 归一化及最小 AST 节点比较；`.probe/desource/tanstack-table-semantic.json` 与更新后的 map 保存具体差异。分类 **N 15 / B 0**，因此未打 patch，直接换入 npm 包：

| 声明 | N 类具体差异 |
|---|---|
| `Headers$1` | dist 为 16 个 memo 调用增加第三参数调试标签，例如 `getHeaderGroups`、`getLeafHeaders`。 |
| `buildHeaderGroups` | 对象属性简写展开；`void 0` 与未遮蔽的全局 `undefined` 等价。 |
| `createRow` | 对象属性简写展开；`void 0` 与全局 `undefined` 等价。 |
| `ColumnOrdering` | dist 增加 memo 调试键 `getIndex`、`_getOrderColumnsFn`。 |
| `ColumnPinning` | dist 为可见 cell 与 leaf-column getter 增加 6 个 memo 调试标签。 |
| `ColumnSizing` | dist 增加 memo 调试键 `getStart`、`getAfter`。 |
| `ColumnVisibility` | dist 增加 `_getAllVisibleCells`、`getVisibleCells`、`key` memo 标签。 |
| `RowPagination` | dist 增加 `getPageOptions` memo 标签。 |
| `RowPinning` | 对象属性简写及等价的 `void 0`/`undefined` 语法形式。 |
| `RowSelection` | dist 为 selected、filtered-selected、grouped-selected row model 增加 memo 调试标签。 |
| `createTable$1` | dist 添加 `NODE_ENV` 守卫的建表日志、缺失 row 错误分支及 memo 调试标签；Vite production 构建会裁掉诊断分支。 |
| `createCell$1` | 对象属性简写展开，cell 值与控制流不变。 |
| `getMemoOptions` | dist 的 `key` 为 `NODE_ENV === "development" && key`；production 常量折叠结果与 inline 的 `false` 相同。 |
| `createColumn` | dist 添加 production 下不可达的 warning/error 分支及两个 memo 调试标签；其余为对象简写和 `void 0`/`undefined` 语法差异。 |
| `isExoticComponent` | alpha 归一化后 AST 完全一致。 |

删除三个 `vendor-inline/tanstack-table/` 文件，合计 **113,724 bytes**；另移除 `infra/shallow-copy.js` 中不再被引用的 TanStack `testFalsey`/`equals` helper。`create-column.jsx` 保留 app UI 代码，并将原库 helper 名称 re-export 到 `@tanstack/table-core`；`table-editor-inner.jsx` 改为从两个 npm 包导入 core 与 React adapter。六个受影响源文件相对 HEAD 净减 **122,932 bytes**。残留审计见 `.probe/desource/tanstack-table-residue.json`：没有旧路径引用、内联文件或本地实现体。`vendor.js` 保持 **3,068,053 bytes**。renderer 依赖清单新增 `@tanstack/react-table@8.21.3` 和 `@tanstack/table-core@8.21.3`；`pnpm-lock.yaml` 的 `app/renderer` importer 与两个包解析变更均归本闭包，`npm-packages.json` 同步记录两个候选版本。

`check-undef` 检查 1117 个 renderer 文件通过；全 workspace build 为 **11/11 packages** 成功。task 67 查明此前 scoped 比较使用了过期的 repo 内 `.probe/ui-golden`，不作为 gate 证据。`scripts/ui-compare/gate.sh` 已改为默认使用 `$HOME/ov-golden/.probe/ui-golden`，并在 golden 目录缺失时立即报错退出。

用默认路径、未设置 `GOLDEN`，完成两次完整 40 页 gate compare：

- 第一轮：`.probe/ui-compare/2026-10-12T22-28-28-007Z/report.json`
- 第二轮：`.probe/ui-compare/2026-10-12T22-46-39-129Z/report.json`

两轮 40 页的 non-AA pixel、net、DOM、state、新增错误阻断通道均为 0；TanStack 重点页 `ws-table-node`、`ws-text-editor`、`ws-table-edit` 两轮全通过。第一轮 `ws-a` 有 5 个 raw-only 像素（non-AA 为 0），第二轮 raw/non-AA 均为 0。第一轮跑了 build、`check-undef`；第二轮跳过未变更源码对应的 build/check 步骤，但仍完整比较 40 页。两轮结束均确认 compare/Electron/Xvfb 退出、端口 9360–9362 空闲。旧的定向报告 `22-20-18-076Z`、`22-22-44-608Z` 对应过期 golden，不计入验收。

## Mutative / Travels 闭包

`.probe/desource/mutative-travels-esm-version-scores.json` 按 Vite production 的 ESM 入口扫描了 Mutative **33** 个已发布版本（包含 0.x 与 1.x）及 Travels **24** 个版本；另扫描 `use-travel` 41 个版本作相似库比较。最佳候选是 `mutative@1.3.0` **40/45** 个唯一归一化函数体、`travels@2.2.0` **39/51**；`use-travel@2.2.0` 为 37/51。

`.probe/desource/mutative-travels-semantic.json` 将差异归类为 **N 117 / B 2**。B 项为：

| 声明 | 具体差异 |
|---|---|
| `makeCreator` | 1.3.0 dist 在调用时立即检查 options 是对象，否则抛 `Invalid options`；inline 实现不做此校验。 |
| `checkReadable` | inline 条件为 `true`，1.3.0 dist 条件为 `!readable`。 |

按以上两个 B 行为添加的依赖补丁为 `patches/mutative@1.3.0.patch`。应用代码从混合的 `infra/shallow-copy.js` 移至 `canvas/placeholder-card-size.js` 和 `shared/use-device-pixel-ratio.js`，并更新调用点；Mutative/Travels inline 实现文件已删除，`ct.js` 保留 `Travels as Ct$2` 兼容导出。

两轮完整 40 页报告中，`ws-canvas-ops`、`ws-text-editor` 的 net/DOM/state 均为 0：

- `.probe/ui-compare/2026-10-12T23-44-21-768Z/report.json`
- `.probe/ui-compare/2026-10-13T00-02-39-949Z/report.json`

非目标页异常不相同：第一轮 `skill-community` 有 41 项 DOM 差异；第二轮 `creations` 有 25 个 non-AA 像素差异（`pixelmatchNonAA` 36）。目标页两轮通过，但这两份全量报告并非所有页面都完全无差异。

旧诊断 `.probe/desource/mutative-travels-map.json` 使用不同扫描口径且仍写着 `deferred-no-clean-dist-match`，与已完成的语义分类、patch 和闭包替换冲突，已标记为过时；后续应以 version-scores 与 semantic 报告为准。

## 规矩（摘自 `remaining-work.md` 与用户要求）

- 中文沟通、中文提交信息、中文注释（只写「为什么」）。
- 代码、注释、测试名里不写「官方 / official / MiniMax」，出处只写在 `docs/`。
- `reference/` 只作对照，不进运行时。
- **不要再跑 `scripts/decompile/gen-renderer.mjs`**：它会覆盖整个手工维护的 `app/renderer/src`。
- 仓库保持私有，不提交凭据。

## Mediabunny 联合闭包

`mediabunny`、`@mediabunny/aac-encoder`、`@mediabunny/mp3-encoder` 均固定为 `1.44.2`。从 `vendor.js` 删除 629 个映射声明（core 621、AAC 4、MP3 4），65 个公开名称改为从 `mediabunny` re-export。`vendor.js` 从 3,068,053 bytes 减至 **2,013,670 bytes**。最终审计 `.probe/desource/mediabunny-final-audit.json` 为 629/629 映射声明、39 个语义项均 0 mismatch；75 个私有名检查结果为剩余 private exports 0、应用 importer 0，移除集合外未解析引用 0。

仅保留确认的行为 patch：

| Patch | 大小 | 文件变更 | 行为 |
|---|---:|---|---|
| `patches/mediabunny@1.44.2.patch` | 2,829 bytes | `codec-data.js` +1/−1；`isobmff-boxes.js` +0/−3；`ogg-muxer.js` +1/−1；`source.js` +0/−1 | 移除 `skipHevcHrdParameters` 的 `commonInfPresentFlag` 守卫；移除 `variableUnsignedInt` 的 `byteLength--`；`setInt64` 删除第四个 `true` 参数；`PREFETCH_PROFILES` 删除可达的 `none` 项。 |
| `patches/@mediabunny__mp3-encoder@1.44.2.patch` | 1,037 bytes | `mediabunny-mp3-encoder.mjs` +0/−4 | `readMp3FrameHeader` 移除 `remainingBytes` 早退及返回对象的 `lowSamplingFrequency` 字段。 |
| **合计** | **3,866 bytes** | **+2/−10** | AAC 无 patch。 |

### AST 中和规则及逐声明触发清单

规则在 alpha-normalization 前应用；两侧 AST 均先 rewrite、generate、reparse，再重建 Babel binding IDs。`declarationValidation.neutralRuleFirings` 在 `.probe/desource/mediabunny-final-audit.json` 记录全部 612 条事件，含声明、侧别和规则。下表列出每个声明/规则组合及事件数（`inline/dist`）；总计 40 个组合：

| 规则 | 触发声明及次数 |
|---|---|
| `normalizeSingleStatementBody`（554） | `FlacDemuxer` 18/18；`Id3V2Writer` 14/14；`IsobmffBoxWriter` 3/1；`MatroskaDemuxer` 81/81；`MatroskaMuxer` 47/47；`MpegTsDemuxer` 51/51；`WaveMuxer` 19/19；`__addDisposableResource` 2/2；`__disposeResources` 2/2；`addQuickTimeMetadataTagBoxes` 5/5；`createVorbisComments` 8/8；`extractAv1CodecInfoFromPacket` 17/17；`fromAlaw` 2/2；`generateMetadataPairs` 9/9。 |
| `removeEmptyOrCommentOnlyBlock`（17） | `Id3V2Writer` dist 2；`MatroskaDemuxer` dist 6；`MatroskaMuxer` dist 2；`WaveMuxer` dist 2；`addQuickTimeMetadataTagBoxes` dist 2；`createVorbisComments` dist 1；`generateMetadataPairs` dist 2。 |
| `removeEmptyOrBreakOnlyDefault`（3） | `FlacDemuxer` dist 1；`MatroskaDemuxer` dist 2。 |
| `normalizeEmptyIfBranch`（19） | `Conversion` dist 2；`HlsDemuxer` dist 1；`IsobmffDemuxer` dist 5；`IsobmffMuxer` inline 1/dist 3；`MatroskaDemuxer` dist 4；`PacketReadingContext` dist 1；`ReadOrchestrator` dist 1；`Target` dist 1。 |
| `removeUnusedPureConst`（8） | `MpegTsDemuxer` dist 8。 |
| `unusedConstCallToExpression`（2） | `MpegTsDemuxer` dist 1；`extractAv1CodecInfoFromPacket` dist 1。 |
| `foldConstantNumericExpression`（2） | `fromAlaw` dist 1；`fromUlaw` dist 1。 |
| `removeModuleTopLevelThisFallback`（4） | `__addDisposableResource` dist 2；`__disposeResources` dist 2。 |
| `normalizeViteWorkerLoader`（2） | 两个 inline loader，见下方逐 firing 证据。 |
| `normalizeOmittedMp3RemainingBytes`（1） | `Mp3Encoder` dist 1，见下方调用点证据。 |

### `normalizeViteWorkerLoader`：两次 inline firing

包清单的 `exports.import` 均指向各自 `dist/bundles/*.mjs`，`browser.worker_threads` 为 `false`。两条 inline 调用链分别是：

| Inline firing | Dist 对应项 | Worker payload |
|---|---|---|
| `inline-worker.js:inlineWorker$1` → `worker2.js:Worker2$1` → `AacEncoder` | `mediabunny-aac-encoder.mjs:inlineWorker` | inline/dist 提取 payload 均 818,566 bytes，SHA-256 `59f673a4d526671ec606ae0bd8addc3100db81713a64e152be15565614723efb`，逐字节相同。 |
| `aac-encoder.js:inlineWorker` → `Mp3Encoder:Worker2` | `mediabunny-mp3-encoder.mjs:inlineWorker` | inline/dist 提取 payload 均 305,719 bytes，SHA-256 `b293c7b698703278b1bdb8c3056334fa5767e850927500535840ebb8ddb20b07`，逐字节相同。 |

两次 firing 中需要归一化的 inline/dist 表达式对分别是：

```js
// inline（两个文件均为此 Vite shim 包装）
Worker3 = (
  await (async () => {
    const { Worker: Worker4 } = await import("../../__vite-browser-external-2Ng8QIWW.js");
    return { Worker: Worker4 };
  })()
).Worker;

// 对应的 dist loader（AAC 与 MP3 包均如此）
Worker3 = (await import("worker_threads")).Worker;
```

被归一化的是 Node fallback 分支中的模块导入表达式；两侧浏览器分支保持相同，均用 `new Blob([scriptText], { type: "text/javascript" })`、`URL.createObjectURL`，再以 `new Worker(url, { type: typeof Deno !== "undefined" ? "module" : void 0 })` 加载同一份 payload。Node 分支的构造选项也相同：`new Worker3(scriptText, { eval: true })`。目标 Electron/Chromium renderer 走浏览器分支（全局 `Worker` 存在且 `Bun` 未定义），所以 shim 导入归一化不改变当前 renderer 路径。Vite shim 文件本身只导出空 default 对象；此规则不声称在没有浏览器 `Worker` 的 Node 环境中两种 fallback 可互换。

### `normalizeOmittedMp3RemainingBytes`：单次 firing

```js
// inline: app/renderer/src/vendor-inline/mediabunny/aac-encoder.js，Mp3Encoder
const header = readMp3FrameHeader(word).header;

// dist: @mediabunny/mp3-encoder/dist/bundles/mediabunny-mp3-encoder.mjs，Mp3Encoder
const header = readMp3FrameHeader(word, null).header;
```

这是 `Mp3Encoder` 的唯一 inline 调用点：省略参数，因此 `remainingBytes === undefined`。对照 `dist` 的调用点清单：应用选中的 `dist/bundles/mediabunny-mp3-encoder.mjs` 传 `null`；同目录未选中的 `.js` bundle 与未选中的 `dist/modules/src/index.js` 也各有一处调用，均传 `null`。包的 `exports.import`、`main` 均解析到已 patch 的 `.mjs` bundle。patch 后该 helper 中 `remainingBytes` 仅保留在形参表，没有任何读取或分支；因此选中路径上的 `undefined` 与 `null` 不影响 header 结果。

### 安装、构建、单例与 UI gate

删除后的 clean frozen install、`check-undef`（1,112 renderer 文件）及 workspace build（11/11）通过。built-output 审计见 `.probe/desource/mediabunny-final-audit.json`：从当前 `index.html` 入口追踪了 331 个可达 JavaScript 资产；入口为 `assets/index-BgDrJ6QD.js`，其中只有一个 `Output` 实现（第 190050 行）和一个共享 `registerEncoder` binding（第 177918 行）。AAC/MP3 各有一个注册函数、一次通过该 binding 的注册调用和一次顶层注册调用（分别在第 286114/286544 行和 286552/286553 行）。未引用的旧资产 `index-CHwm6v03.js` 曾使全目录扫描误报重复 binding；确认它不在当前入口的 import 图后，最终审计仅覆盖可达资产。

最终新 golden 的两次自比较分别为 `/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-13T13-36-23-526Z/report.json`、`/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-13T13-54-41-687Z/report.json`；两次均无 non-AA、网络、DOM、状态或错误差异，仅有容许的 AA-only 像素（第一轮 `ws-b` 5 个，第二轮 `ws-a` 5 个）。重录是因为 live changelog 已从 3.0.21 更新为 4.0.0，且 branch 与 baseline 都呈现相同 4.0.0 内容；并非重新发现文字渲染环境漂移。保留的 golden 备份：

- `/home/ubuntu/ov-golden/.probe/ui-golden.bak-before-env-rerecord-1791881988`
- `/home/ubuntu/ov-golden/.probe/ui-golden.bak-first-rerecord-1791884326`
- `/home/ubuntu/ov-golden/.probe/ui-golden.bak-before-changelog-rerecord-1791897471`

更早的 tofu 中文行 AA 漂移仍未解释：两边都显示 tofu 方框，但旧比较出现了彩色次像素 AA 与灰度 AA 差异；`fc-list :lang=zh` 为 0，检查 fontconfig、Xvfb、Electron/dist 与 Chromium 参数后未找到可恢复的具体变化。重录后的自比较稳定通过。分支 gate 使用仓库脚本 `scripts/ui-compare/gate.sh`，不使用旧 `~/ov-gate.sh`：

| Gate 调用 | 报告 | 结果 |
|---|---|---|
| 第一次 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T14-13-07-080Z/report.json` | 40 页通过。 |
| 第二次 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T14-32-43-893Z/report.json`、`/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T14-50-55-851Z/report.json` | 40 页；首次比较的 `project-assets` 有一次瞬态 41 项 DOM diff（页面显示“正在重连运行时”），复比较干净，repo gate 将其归类为一次性不稳定并通过。 |

两次 gate 的 `creations`、`global-search`、`ws-video`、`ws-audio` 均为 0 net/DOM/state/non-AA；其余目标页也无新增错误。第二次 gate 的首次 `project-assets` DOM 波动未在复比较重现，不是 text-AA 环境漂移。

## Base UI 闭包：从 `vendor.js` 改为 npm

### 版本、映射与依赖闭包

- 本次依赖为 `@base-ui/react@1.3.0` 和 `@base-ui/utils@0.2.6`；后者是 React 1.3.0 固定依赖的版本。
- `analysis/baseui-hls/mapping-baseui-top1.json` 共 763 项：713 identical、35 neutral、15 diff。限定到本次 `vendor.js` 的 744 项为 697 exact、35 normalized、12 diff。15 个 diff 中，3 个是同名 app 函数误匹配，12 个是已逐调用点核实的 build-time 优化；不需要行为 patch。
- 所有原有 Base UI `vendor.js` 导出名均保留并转由 npm 提供。`@base-ui/react` 的 pnpm patch 仅修改 package.json 的 `exports`，增加 `./esm/*` import/default 通配路径，以支持下表中的内部模块 deep path；`@base-ui/utils` 已有通配 exports，无需 patch。此前为 `hooks.push` 增加的 shim 已在应用文件迁移时移除，见下文。
- 根 `pnpm.overrides` 固定 `@floating-ui/dom@1.7.6` 与 `@floating-ui/utils@0.2.11`。`@floating-ui/react-dom@2.1.9` 声明 dom `^1.8.0`；覆盖为 1.7.6 是为保留原内联代码使用的 Floating UI 配对，而不是升级该实现。解析后 `@floating-ui/core@1.7.5`、dom 1.7.6、utils 0.2.11 各只有一个版本；`@floating-ui/react-dom@2.1.9`、`tabbable@6.4.0`、`reselect@5.2.0`、`use-sync-external-store@1.7.0` 也与原 renderer 基线一致。

### 内部符号 deep-path re-export

下列 11 个应用所需的内部符号从 React 包的精确模块重新导出。公开组件仍通过包 barrel 或公开 subpath 导入。

| 符号 | npm 模块 |
|---|---|
| `AvatarRootContext`、`useAvatarRootContext` | `@base-ui/react/esm/avatar/root/AvatarRootContext.js` |
| `ProgressRootContext` | `@base-ui/react/esm/progress/root/ProgressRootContext.js` |
| `SelectGroupContext`、`useSelectGroupContext` | `@base-ui/react/esm/select/group/SelectGroupContext.js` |
| `avatarStateAttributesMapping` | `@base-ui/react/esm/avatar/root/stateAttributesMapping.js` |
| `progressStateAttributesMapping` | `@base-ui/react/esm/progress/root/stateAttributesMapping.js` |
| `useBaseUiId` | `@base-ui/react/esm/utils/useBaseUiId.js` |
| `usePopoverRootContext` | `@base-ui/react/esm/popover/root/PopoverRootContext.js` |
| `useRenderElement` | `@base-ui/react/esm/utils/useRenderElement.js` |
| `valueToPercent` | `@base-ui/react/esm/utils/valueToPercent.js` |

### 实施与验收

- 从 `vendor.js` 移除了 744 条 Base UI 声明；文件从 **2,013,670 bytes** 变为 **1,344,768 bytes**，净减少 **668,902 bytes**。转换候选报告的 1,344,743 bytes 尚未包含恢复的 i18next `noop$1`；最终文件保留这条声明，避免改变 i18next fallback。
- residual 审计：744 条映射中没有 Base UI 声明残留。仅 mapping row 649（`noop$1`）仍按名称/形状匹配；它属于 i18next 区块，i18next 源码中的空回调有 4 个引用，vendor 中对应 binding 也有 4 个引用，因此明确归类为 Base UI false positive。
- `pnpm install --frozen-lockfile`、`node scripts/desource/check-undef.mjs`（1,112 个 renderer 源文件）及 `pnpm -w turbo run build`（11/11 packages）通过。built-output AST 审计从 `index.html` 遍历了 331 个可达 JavaScript assets：`useDialogRoot`、`Store`、Base UI 自带的 `useFloating` 与 `useFloatingRootContext`、`useFloatingTree`、`useFloatingNodeId` 各一份；`computePosition` 这个通用标识符出现 3 次，其中恰有 1 个是 `@floating-ui/dom@1.7.6` 的 wrapper（调用 core 实现），另外两处不是该 wrapper。审计结果保存在 `.probe/desource/baseui-built-audit.json`。
- 上表的 11 个内部符号在可达输出中各有一个声明。`AvatarRootContext`、`DialogRootContext`、`PopoverRootContext`、`ProgressRootContext`、`SelectGroupContext` 各只创建一个 context；hook 与 Provider 均引用相同 lexical binding。
- `fastHooks` 中只有一个空 `hooks` array（built 名 `hooks`）；npm `register` 与 `FastComponent` 共用并操作该 array，应用的两个注册调用都解析到同一个 `register` binding。应用已直接从 `@base-ui/utils/fastHooks` 导入 `register`，`vendor.js` 兼容 shim 已删除。

两轮均使用 `GOLDEN="$HOME/ov-golden/.probe/ui-golden" bash scripts/ui-compare/gate.sh`，golden 未改动。报告及逐页结果：

| 轮次 | 报告 | 页数及结果 |
|---|---|---|
| 1 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T16-22-48-192Z/report.json` | 40/40 页通过；net、DOM、state、non-AA 像素及新增错误差异均为 0。`ws-a` 有 5 个 raw AA-only 像素差异（5/0）。 |
| 2 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T16-41-27-917Z/report.json` | 40/40 页通过；net、DOM、state、non-AA 像素及新增错误差异均为 0。 |

两轮的比较器均提示 `ws-a`、`ws-chat-skill`、`ws-layout` 重拍 8 次后仍有帧不稳定并采用最后一帧；这些页最终均没有 net/DOM/state/non-AA 差异。

### 待办：留在应用文件里的 Base UI 代码（等改名 PR 合入后替换为 npm 导入）——已完成

以下 16 条 mapping 记录在 PR #5/#6 合入后按声明重新定位，并与 `@base-ui/react@1.3.0` / `@base-ui/utils@0.2.6` 的 `npmFile` 做了 AST 比较。可迁移项已改为 npm import；没有导出的模块私有符号和 app-owned 误匹配保留不动。

| 应用文件（相对 `app/renderer/src`） | 当前声明 / mapping 项 | 结论与实际 npm 导入路径 |
|---|---|---|
| `canvas/popover-title.jsx` | `BasePopoverTitle`（`PopoverTitle$1`） | 已迁移：`@base-ui/react/popover` 的 `Popover.Title` |
| `canvas/popover-title.jsx` | `BasePopoverDescription`（`PopoverDescription$1`） | 已迁移：`@base-ui/react/popover` 的 `Popover.Description` |
| `canvas/separator.jsx` | `Separator` | 已迁移：`@base-ui/react/separator` |
| `generation/select-content.jsx` | `SelectGroupPrimitive`（`SelectGroup$1`） | 已迁移：`@base-ui/react/select` 的 `Select.Group` |
| `generation/select-content.jsx` | `SelectGroupLabel` | 已迁移：`@base-ui/react/select` 的 `Select.GroupLabel` |
| `generation/use-model-catalog-scope-key.js` | `useProgressRootContext` | 已迁移：`@base-ui/react/esm/progress/root/ProgressRootContext.js` |
| `infra/create-recently-added-store.js` | `register` | 已迁移：直接从 `@base-ui/utils/fastHooks` 导入；`register({...})` 调用保留 |
| `infra/create-recently-added-store.js` | hook 注册表达式（mapping 的 `useStore.js`） | 已迁移：`useStore` 直接从 `@base-ui/utils/store` 导入，注册表达式使用 npm `register` |
| `infra/dialog-content.jsx` | `Input` | 已迁移：`@base-ui/react/input` |
| `infra/from-vendor.js` | `stateAttributesMapping$a` | 保留误匹配：目标 `SelectValue.js` 中的同名声明不是模块导出，不能从 npm 导入 |
| `infra/from-vendor.js` | `clamp$a` | 已迁移：`@base-ui/react/esm/utils/clamp.js` |
| `infra/inline-rename-input.jsx` | `AvatarRoot` | 已迁移：`@base-ui/react/avatar` 的 `Avatar.Root` |
| `infra/inline-rename-input.jsx` | `AvatarFallbackPrimitive`（`AvatarFallback$1`） | 已迁移：`@base-ui/react/avatar` 的 `Avatar.Fallback` |
| `media-editing/keep-tag-in-canvas.js` | `counter` | 保留误匹配：本地 `uid()` 使用递增取模计数、时间戳和不同 ID 格式，npm 的同名计数器私有且行为不同 |
| `team/team-management-detail-loading.jsx` | `ProgressTrackPrimitive`（`ProgressTrack$1`） | 已迁移：`@base-ui/react/progress` 的 `Progress.Track` |
| `team/team-management-detail-loading.jsx` | `ProgressIndicatorPrimitive`（`ProgressIndicator$1`） | 已迁移：`@base-ui/react/progress` 的 `Progress.Indicator` |

本轮误匹配清单共 5 项：`stopEvent`（`canvas/node-shell-inner.jsx`）是与 Floating UI 同名但实现不同的 app 函数；`clamp$b`（`infra/from-vendor.js`）是 app-owned clamp 变体，与 npm `clamp` 行为不同，故仅迁移另一条 `clamp$a`；`formatNumber`（`text-editor/collect-video-rows.js`）是文本编辑器的本地格式化逻辑，与 npm 声明 AST/行为不同；`counter`（`media-editing/keep-tag-in-canvas.js`）是本地 `uid()` 的计数器，与 npm 私有计数器只是同名；`stateAttributesMapping$a`（`infra/from-vendor.js`）对应 npm `SelectValue.js` 的私有变量，没有可导入的 binding。

`@base-ui/utils` 已有 `./*` exports，因此 `fastHooks`、`store` 无需新增 patch。已确认 `create-recently-added-store.js` 是 `vendor.js` hooks shim 的唯一 importer；它现在直接使用 npm `register`，并且 shim 与 `registerFastHook` 导入已删除。`useProgressRootContext` 和 `clamp$a` 通过 `vendor.js` 与应用的 deep-path 导入都指向同一 npm 文件。

PDF.js worker 已改为 `pdfjs-dist/build/pdf.worker.min.mjs?url`；源 npm worker 与原 hashed app worker 均为 1,375,838 bytes，SHA-256 为 `1baa1844c89c80a5b2797c916e75ab29254be46d8e9cb53cb6364d7aad84be36`。最后一次干净的 renderer build 产物仅有一份 PDF worker，字节与 npm 源文件一致；Vite 生成的文件名仍为 `pdf.worker.min-yatZIOMy.mjs`。检查全工作区构建后的输出目录时曾暂时看到两份同字节 worker；直接运行 renderer build（`emptyOutDir: true`）清理并重建后，输出目录只剩当前构建的一份 worker。两轮 gate 的 `ws-pdf` 页面均无网络差异。

#### PR #5/#6 合入后的 app-file 与 worker 验收

- `pnpm install --frozen-lockfile`、`node scripts/desource/check-undef.mjs`（1,112 个 renderer 源文件）、`pnpm test:desource-rename`（5 files / 35 tests）、`pnpm -w turbo run build`（11/11）均通过。gate 自带的 workspace build 与 `check-undef` 也通过。
- app-file Base UI 迁移后，`vendor.js` 从 **1,344,740 bytes** 变为 **1,344,485 bytes**（移除 `hooks` shim，减少 255 bytes）。重新干净构建后，`.probe/desource/baseui-built-audit.json` 对 `index.html` 可达的 331 个 JavaScript assets 检查通过：`Store`、`useDialogRoot`、Base UI `useFloating` fork/helper 及 11 个内部 deep-path 符号各一份；5 个内部 context 仅创建一次，hook、Provider 与创建处共用同一 binding；`fastHooks` 只有一个 `hooks` array，`register` 与 `FastComponent` 共用它，两个注册调用均解析到同一 `register`；built 中 `computePosition` 同名声明共 3 个，其中 `@floating-ui/dom@1.7.6` wrapper 恰好 1 个。
- 两轮均使用 `GOLDEN="$HOME/ov-golden/.probe/ui-golden" bash scripts/ui-compare/gate.sh`，golden 和 gate 均未修改：

| 轮次 | 报告 | 结论 |
|---|---|---|
| 1 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T19-08-46-118Z/report.json` | 40/40 页通过；net、DOM、state、新增错误及 non-AA 像素差异均为 0。`ws-a` 有 5 个 raw-only 像素。 |
| 2 | `/home/ubuntu/repos/ovaijisuandesign/.probe/ui-compare/2026-10-13T19-27-10-625Z/report.json` | 40/40 页通过；net、DOM、state、新增错误及 non-AA 像素差异均为 0。`ws-a` 有 5 个 raw-only 像素。 |

两轮的 `ws-pdf` 均为 `netDiff=[]`；`ws-chat-skill` 与 `ws-layout` 重拍 8 次后仍提示帧不稳定，使用最后一帧，结果没有阻断差异。首次 gate 尝试（`2026-10-13T19-00-14-346Z`）在 `ws-a` 等待工作区聊天 runtime 恢复时超时且未生成报告；随后完整重跑通过，故该次不计为一轮。
