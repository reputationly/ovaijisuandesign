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

**状态**：`DISABLED_PAGES` 为空；`NET_VOLATILE` 仅有 GET `/api/v1/home/showcase-assets/`。`BLOCKED_URLS` 只屏蔽外部展示素材 host `cdn.hailuoai.com`（封面视频）与 `cdn.hailuoai.video`（打光缩略图）。正式 40 页 golden 已重录；本次重录后的唯一一次全量自比较中，`ws-relight` 为 raw / non-AA `0/0`。

**最新验证状态：40 页 branch gate 仍未验证通过。** 441a06b 的 40 页 golden 已按当前 harness 重录；随后只完成一次全量自比较，未完成第二次自比较，也未在 ProseMirror override 后运行 branch gate。最新全量报告为 `/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T00-27-29-626Z/report.json`。本次无新增控制台错误，大部分页面的 raw/non-AA 像素差为 0；但仍有以下未解决的自比较问题，不能据此声称 40 页 gate 通过：

- `skill-community` 有 41 项 DOM 差异，网络和持久化状态差均为 0；社区列表开关在 golden 中为开启、恢复运行中为关闭。现有加载条件只应用于 `skills`，尚未确认这是加载时序还是服务数据变化。
- `ws-chat-input` raw 差异 3932 像素，交集 non-AA 差异 2223（pixelmatch threshold-0 non-AA 计数 2382）；网络、DOM、状态差均为 0。截图中的远端响应错误内容一轮为 “Invalid token”，另一轮为 “Bad Gateway”。
- `ws-pdf` 有 4 项网络差异：golden 记录 6 个非 GET 请求，恢复运行记录 5 个；缺少一个 `/api/canvas` 请求，已有的本机网络 idle 等待仍未消除此差异。
- `ws-table-edit` 及后续画布 / 项目页有 3 项状态差异，涉及随机生成的 `.htable` 路径和表格文件内容；表格内容 GET 路径也随之不同。部分后续页另有 DOM 差异，恢复运行出现 `Notifications alt+T` 区域，而 golden 没有。
- `project-created`、`ws-canvas-ops` 等页出现额外 GET 请求和不同 workspace hash。导航范围过滤是否仍捕获了前一文档请求尚未证实，不能通过删 endpoint 来消除。
- 单页 `ONLY` 运行跳过了完整页面序列中的前置交互，导致共享 UI 状态不同；`/home/ubuntu/ov-golden/.probe/ui-compare/2026-10-12T00-22-08-977Z/report.json` 是一次 focused 诊断，不能作为有效的完整自比较结果。

本轮确认 `ws-b` raw 5 / non-AA 0（按当前交集规则不失败），`ws-relight` raw / non-AA 为 0/0。没有新增 `NET_VOLATILE` 项、状态掩码或像素容差。`ws-select-image` 的历史 ProseMirror 双实例错误按已确认的 swap 回归处理：根 `pnpm.overrides` 已加入 `prosemirror-model: 1.25.11`，锁文件已更新；当前安装目录只含 `prosemirror-model@1.25.11`。运行时是否已修复仍待 branch gate 验证。

下一步应先解决上述自比较差异并完成两次全量 40 页自比较，再运行 `scripts/ui-compare/gate.sh`；当前不能声称 branch gate 通过。

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

## 还剩的工作

### 1. vendor.js 里还没换成 npm 的库（约 40 个候选）

`vendor.js` 现约 3.7MB。和 `scripts/decompile/npm-packages.json` 对比，剩下的候选：

```
@base-ui/utils@0.2.6  @base-ui/react@1.3.0  @marijn/find-cluster-break@1.0.4
@codemirror/language@6.12.4  @codemirror/autocomplete@6.20.3  @codemirror/lang-javascript@6.2.5
@codemirror/lang-html@6.4.12  @codemirror/lang-markdown@6.5.2  @codemirror/search@6.7.2
@lezer/javascript@1.5.4  @lezer/css@1.3.4  @lezer/markdown@1.7.2
@floating-ui/react@0.27.20  hast-util-to-html@9.0.5  @shikijs/core@3.23.0
@shikijs/engine-oniguruma@4.4.3  @shikijs/primitive@4.0.2  seroval@1.5.6  seroval-plugins@1.5.6
@tiptap/extension-blockquote@3.27.3  @tiptap/extension-bold@3.31.3  @tiptap/extension-bubble-menu@3.31.3
@tiptap/extension-code-block@3.30.2  @tiptap/extension-floating-menu@3.30.2  zustand@5.0.15
@xyflow/react@12.10.2  entities@6.0.1  mediabunny@1.52.3  decode-named-character-reference@1.3.0
regex@6.1.0  regex-recursion@6.0.2  parse5@8.0.1  unist-util-visit@5.1.0  rehype-harden@1.1.8
hls.js@1.7.3  inline-style-parser@0.2.4  style-to-object@1.0.11  style-to-js@1.1.21
@tanstack/form-core@1.33.5
```

有些包在 vendor 里可能根本没有代码（旧交接文档里提到 zustand、seroval 等），先 grep 确认。

注意版本：`package.json` 里 `@xyflow/react` 是 12.11.6，它依赖 `@xyflow/system@0.0.82`，但直接依赖钉的是 0.0.76。直接升到 0.0.82 会构建失败（缺 `devWarn` 导出），已退回。换 xyflow 时要一起理顺。

### 2. `vendor-inline/`（约 2MB）

| 目录 | 内容 | 大小 |
|---|---|---|
| `codemirror/` | CodeMirror 6 | 328K |
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

## 规矩（摘自 `remaining-work.md` 与用户要求）

- 中文沟通、中文提交信息、中文注释（只写「为什么」）。
- 代码、注释、测试名里不写「官方 / official / MiniMax」，出处只写在 `docs/`。
- `reference/` 只作对照，不进运行时。
- **不要再跑 `scripts/decompile/gen-renderer.mjs`**：它会覆盖整个手工维护的 `app/renderer/src`。
- 仓库保持私有，不提交凭据。
