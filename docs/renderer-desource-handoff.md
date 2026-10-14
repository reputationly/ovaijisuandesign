# 界面源码还原 · 交接文档（可操作版）

写给接手的 agent。按顺序读完第 0~3 节就能开工。第 6 节是待办，每一项都写了步骤和验收标准。第 8 节是最终验收清单，交付时逐条对照。

- 本文写于 2026-10-14，基线是工作分支 `devin/1791701596-renderer-desource` @ `b0e2f29`。
- 历史流水记录（每批换包的详细依据、报告路径）在 [`handoff-renderer-desource.md`](handoff-renderer-desource.md)。两份文档冲突时，**以本文为准**；本文数字和代码冲突时，以代码为准，先实测再动手。

---

## 0. 一页纸总览

**目标**：`app/renderer/src` 是从参照应用（MiniMax Design）的界面 bundle 拆出来的。要把里面剩下的编译产物还原成可维护的源码。编译产物包括：内联的第三方库、`vendor.js`、压缩变量名、压缩文件名、带构建哈希的文件名。

**用户的硬要求**：外观、功能、交互都要和还原前一致，不能只看截图。网络请求、WebSocket 帧、DOM 状态、localStorage 和 `.hilo/` 持久化都要一致。

**当前进度（b0e2f29）**：

| 项 | 最初 | 现在 |
|---|---|---|
| `vendor.js` | 3,748,669 B | 1,059,484 B（-72%） |
| 已换成 npm 的库 | 0 | 约 55 个包：markdown/hast/parse5/entities、CodeMirror/Lezer、Shiki、Tiptap、TanStack Table、mutative/travels、mediabunny、Base UI/Floating UI、Streamdown/remend 等 |
| 应用文件的局部压缩变量名 | 约 640 个文件 | 5 个目录组全部完成，约 1.9 万条改名，都经过独立复核 |
| 导出名、文件名、哈希文件名 | — | **只有映射草稿，未执行**（见 6.1） |
| `vendor.js` 剩余部分 | — | 已出清单，**未换**（见 6.2~6.5） |

**还剩**（估计 2.5~3 个工作日）：统一改名（6.1）、canvas 内联 dagre 换包（6.2）、`vendor.js` 剩余库换包（6.3）、xyflow 方案 2（6.4）、`vendor-inline/` 收尾（6.5）、`vendor.js` 里的应用代码拆成命名模块（6.6）、最终门禁与开 PR（6.7）。

**绝对不能做的事**（违反任何一条都验收不过）：

1. 不跑 `scripts/decompile/gen-renderer.mjs`：它会整目录覆盖手工还原的 `app/renderer/src`。
2. 不改门禁逻辑或阈值，不把页面加进 `DISABLED_PAGES`，不加 `NET_VOLATILE` 来让门禁通过。不用工作分支代码改 golden 基线。
3. 不把被应用改过的第三方代码直接换成未改的 npm 包。改过的地方要用补丁或可读 fork 保留。
4. 不凭短名巧合认定库的归属。必须做逐声明 AST 比对。
5. 不合并到 main/master，不 force push。
6. 代码、注释、测试名里不写「官方 / official / MiniMax」。注释和提交信息用中文，注释只写「为什么」。仓库保持私有，不提交凭据。

---

## 1. 仓库、分支、PR

- 仓库：`reputationly/ovaijisuandesign`，本地路径 `~/repos/ovaijisuandesign`。
- 工作分支：`devin/1791701596-renderer-desource`（基于 main 的 `aee54ac`，238 个提交，**未开总 PR**）。所有工作都提交到这个分支，或从它切子分支再合回。
- 已合进工作分支的 PR：#1 改名工具；#2 其余目录；#3 chat+debug-panel；#4 assets/generation/workspace；#5 canvas；#6 media-editing。都是局部改名。

关键提交：

| 提交 | 内容 |
|---|---|
| `035c14a` | mediabunny 1.44.2 换包（含 2 份补丁） |
| `12e8ef4` | 合入 PR #1 改名工具 |
| `6185398` | Base UI 1.3.0 换包 |
| `1c5ed54` | 合入 #2/#3/#4 |
| `b7f7270` | 合入 #5/#6；应用文件里残留的 Base UI 代码迁走；PDF worker 改用 npm |
| `b0e2f29` | Streamdown/remend 一族换成 npm（**当前 HEAD**） |

只读分析分支（不合入，只取证据和工具）：

| 分支 @ 提交 | 内容 |
|---|---|
| `devin/analysis-remaining-artifacts` @ `17686e0` | `analysis/remaining/`：`REPORT.md`（s2/streamdown/全量扫描/哈希文件）；`vendor-residual/`（**`vendor.js` 剩余清单，6.3 的依据**）；`tools/`（xcanon/xmatch 等跨模块逐声明比对工具） |
| `devin/analysis-xyflow-artifacts` @ `517b84f` | `analysis/xyflow/`：17 处应用改动分析、`mapping.tsv`、两份 npm 补丁、比对与补丁生成工具（**6.4 的依据**） |
| `devin/analysis-baseui-artifacts` @ `193f50f` | `analysis/baseui-hls/`：Base UI 打分与映射（已用完，供参考做法） |

取分析文件的方法：`git show origin/devin/analysis-remaining-artifacts:analysis/remaining/vendor-residual/REPORT.md`；也可以 `git worktree add ~/ana-remaining origin/devin/analysis-remaining-artifacts`。

---

## 2. 环境搭建（从零开始，Linux x64）

所有命令都能整段复制执行。已在 Ubuntu 云机上验证过。

### 2.1 系统依赖

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends xvfb xauth ripgrep unzip curl git build-essential
```

`gate.sh` 用到 `rg` 和 `ss`。`xvfb-run` 用来起可见窗口。**窗口必须可见，隐藏窗口截图会超时。**

### 2.2 Node 和 pnpm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source "$HOME/.nvm/nvm.sh"
nvm install 24.21.0 && nvm alias default 24.21.0
corepack enable && corepack prepare pnpm@9.3.0 --activate
node -v && pnpm -v   # 应为 v24.21.0 / 9.3.0
```

`gate.sh` 会 `source "$HOME/.nvm/nvm.sh"`，所以必须用 nvm 装 Node。

### 2.3 Electron dist（43.7.0，和 `app/desktop/package.json` 一致）

```bash
mkdir -p "$HOME/ov-electron-dist" && cd "$HOME/ov-electron-dist"
curl -fL -o electron.zip https://github.com/electron/electron/releases/download/v43.7.0/electron-v43.7.0-linux-x64.zip
unzip -q -o electron.zip && rm electron.zip && ls electron
```

### 2.4 OpenCode 1.18.18

```bash
cd ~/repos/ovaijisuandesign && source "$HOME/.nvm/nvm.sh"
node scripts/fetch-opencode.mjs
mkdir -p "$HOME/.cache/opencode-v1.18.18"
cp app/packages/service/bin/opencode "$HOME/.cache/opencode-v1.18.18/opencode"
"$HOME/.cache/opencode-v1.18.18/opencode" --version
```

脚本会把二进制放到 `app/packages/service/bin/`，`gate.sh` 默认读 `~/.cache/opencode-v1.18.18/opencode`。如果脚本落盘的文件名不同，以 `ls app/packages/service/bin/` 实际看到的为准。

### 2.5 安装与构建

```bash
cd ~/repos/ovaijisuandesign && source "$HOME/.nvm/nvm.sh"
git checkout devin/1791701596-renderer-desource && git pull
pnpm install --frozen-lockfile
pnpm -w turbo run build                 # 应 11/11 成功
node scripts/desource/check-undef.mjs   # 应输出 `Checked 1108 renderer source files; no unresolved names ...`
pnpm test:desource-rename               # 改名工具测试，应 35/35
```

每次合入带新依赖的改动后，都要重跑 `pnpm install --frozen-lockfile`。否则构建会报 `Rollup failed to resolve import`。

### 2.6 录门禁基线（golden）。新机器必须自己录，不能拷别人的

文字抗锯齿和字体环境依赖机器，**基线和对比必须在同一台机器上跑**。基线用 `441a06b` 录：这是 `aee54ac` 换包之前最后一个正常的版本，代表「还原前」的行为。对比脚本用工作分支当前的版本。

```bash
cd ~/repos/ovaijisuandesign && source "$HOME/.nvm/nvm.sh"
git worktree add "$HOME/ov-golden" 441a06b
rm -rf "$HOME/ov-golden/scripts/ui-compare" && cp -r scripts/ui-compare "$HOME/ov-golden/scripts/"
cd "$HOME/ov-golden" && pnpm install --frozen-lockfile && pnpm turbo run build
export ELECTRON_DISABLE_SANDBOX=1 ELECTRON_OVERRIDE_DIST_PATH="$HOME/ov-electron-dist" OPENCODE_BIN="$HOME/.cache/opencode-v1.18.18/opencode"
GOLDEN="$HOME/ov-golden/.probe/ui-golden" xvfb-run -a node scripts/ui-compare/compare.mjs --record
```

注意：

- 复制过去的 `scripts/ui-compare` 只是复制，**不要在 worktree 里提交**。
- 录完必须在 `~/ov-golden` 里做两次自比较（命令同上，去掉 `--record`），两次都通过才算基线可用：non-AA、网络、DOM、状态、新增报错都为 0。
- 改了对比脚本或 fixture 之后，要重新复制过去再重录。线上数据变了（比如更新日志页的版本号变了），也要重录。
- 录完要有 `~/ov-golden/.probe/ui-golden/errors.json`，否则 `gate.sh` 会拒绝运行。

---

## 3. 验证方法（门禁）

### 3.1 每批改动都要跑的检查

```bash
cd ~/repos/ovaijisuandesign && source "$HOME/.nvm/nvm.sh"
pnpm install --frozen-lockfile
node scripts/desource/check-undef.mjs
pnpm test:desource-rename
pnpm -w turbo run build
GOLDEN="$HOME/ov-golden/.probe/ui-golden" bash scripts/ui-compare/gate.sh
```

- **换包批次和最终合入：`gate.sh` 要连续跑两次，两次都通过。**
- 纯局部改名（`--mode local`，工具已验证 AST alpha 等价）可以不跑 UI 门禁，但 `check-undef`、构建、改名测试必须跑。
- 导出名或文件名改名要跑 UI 门禁，因为跨文件 import 和动态加载会受影响。

### 3.2 门禁检查什么

`scripts/ui-compare/compare.mjs` 起桌面应用，跑 40 个页面和场景，每页和基线比 5 个通道：

1. 像素：`diffPctNonAA` 必须为 0。只看「RGB 差 > 24」且「pixelmatch 判为非 AA」的交集。raw `diffPct` 只作信息，不判失败。
2. 网络：本机 HTTP 和 WebSocket，从导航开始采集。uuid、时间戳、端口、随机 ID 已归一化。
3. DOM：`data-action-ui-id`、`role`、`aria-*`、表单控件的值和文本。
4. 持久化状态：localStorage 全量，以及工作区 `.hilo/` 文件（如 canvas.json）。
5. 控制台报错：不得超出 `errors.json` 基线。

包含 8 个真操作场景：`ws-pdf`、`ws-chat-input`、`ws-code-editor`、`ws-markdown`、`ws-video`、`ws-audio`、`ws-table-edit`、`ws-canvas-ops`（拖动、缩放、连线、撤销/重做）。

`gate.sh` 的判定：第一次全量有差异时，自动再跑一次全量；**同一页、同一通道两次都失败**才阻断。只失败一次的记为「不稳定」，不阻断，但要在报告里写明。

### 3.3 怎么看结果

- 终端最后一行是结论。报告在 `.probe/ui-compare/<时间戳>/report.json`，同目录下有每页截图、`.diff.png` 和 `.non-aa.diff.png`。
- 一轮全量约 18 分钟。外层超时不要设成 900 秒，`gate.sh` 内部已经给每轮留了 2400 秒。
- 用 `ONLY=ws-pdf,ws-audio` 只跑几页，可以加快定位，**但不能当门禁证据**。
- 交付时要写明两轮的 `report.json` 路径、每轮 40/40，以及 raw-only 像素数（例如 `ws-a` 5 个）。

### 3.4 门禁常见问题与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| 39/40 页都有小像素差，集中在文字边缘 | 渲染环境漂移：彩色次像素 AA 变成灰度 AA（重装过依赖、换了机器） | 先在 `~/ov-golden` 跑一次自比较。自比较也失败，就是环境问题，重录基线；不是代码回归 |
| 「创作」页日期差一天 | 跨零点 | 已修：compare.mjs 注入固定时钟（2026-10-12T04:00Z 起）。再出现就查这段时钟逻辑是否被改 |
| 更新日志页整页不同 | 线上 changelog 版本变了（曾从 3.0.21 变成 4.0.0） | 两边都显示新内容就重录基线，并在文档里记一笔 |
| 跑到 `ws-a` 卡住，没有生成报告 | 工作区聊天 runtime 恢复超时 | 整轮重跑，没有报告的那轮不计数 |
| 提示「重拍 8 次后帧仍不稳定，用最后一帧」 | `ws-a`、`ws-chat-skill`、`ws-layout` 有动画 | 只要最终各通道为 0 就算通过 |
| `project-assets` 一次性出现 41 项 DOM 差异，页面显示「正在重连运行时」 | 时序波动 | 第二轮不复现就不阻断 |
| `Debug port 9360 is already occupied` | 上一轮的进程没退干净 | `pkill -f ov-electron-dist; pkill -f compare.mjs` 后重跑 |
| 全页 41 处 DOM/state 差异 | 指到了仓库里过时的 `.probe/ui-golden` | 必须显式传 `GOLDEN="$HOME/ov-golden/.probe/ui-golden"` |

### 3.5 门禁覆盖不到的，要补静态审计

门禁没覆盖导出、编码器注册、mermaid 等路径。换包后还要做**构建产物审计**：从 `app/desktop/out/recovered-ui/index.html` 遍历全部可达 JS（约 331 个），用 AST 确认以下几点。

- 同一个库只有一份运行时：比如 `Output`、`registerEncoder`、`Store`、Context 各只有一个 binding，React context 的创建、hook、Provider 引用同一个 binding。
- 没有不该出现的库：比如 mermaid 运行时。
- `pnpm why <包>` 只解析出一个版本。

历史审计脚本的输出在 `.probe/desource/*-audit.json`，`.probe/` 不进仓库，在原机器上。做法见 `handoff-renderer-desource.md` 的 Base UI、mediabunny、Streamdown 各节。

---

## 4. 方案（怎么还原）

### 4.1 第三方库：按依赖闭包整组换成 npm

1. **确定归属和版本**：把内联代码的每个顶层声明做 alpha 归一化，再和候选 npm 包各版本的 dist 逐声明比对打分。不能只信 `scripts/decompile/npm-packages.json`：它常常版本错误，还漏了 jszip、qr.js、shiki、wavesurfer 等。工具在 `analysis/remaining/tools/`（xcanon、xmatch、vr-*）。
2. **对不上的声明分三类**：
   - 构建期改写，行为等价。比如 Rollup 删掉了已知参数值或死分支。要统计 bundle 里的全部调用点来证明。
   - 上游版本差异。内联代码常是两个发布版之间的构建。
   - 应用改过的行为。
   后两类都用 **pnpm patch** 把 npm 包改回内联代码的写法。补丁必须是 dist 原格式下的最小 hunk，不能整类删掉换成一行压缩代码（mediabunny 第一版补丁 723KB，返工成 3.9KB）。验收标准：打完补丁后，所有声明和内联版本 AST 一致。
3. **整组删除**：主包、插件、互相引用内部实现的依赖要一次删干净。只删一半会出现双实例。实例：d3-transition 只给 npm 那份 d3-selection 打原型补丁，画布视口静默失效；mediabunny 编码器注册到了另一份上。
4. **内部符号**：应用用到包内未导出的符号时，给包加 patch，在 `package.json` 的 `exports` 开放深路径（如 `@base-ui/react` 的 `./esm/*`），不改代码逻辑。符号是模块私有、根本没有导出的，就保留在本地，例如 i18next 的 `EventEmitter`、Base UI 的 `stateAttributesMapping$a`。
5. **钉版本**：依赖写精确版本。传递依赖版本不对时，用根 `package.json` 的 `pnpm.overrides` 钉住（例如 `@floating-ui/dom@1.7.6`）。
6. **同名误匹配**：名字和库一样、行为不同的应用函数要保留，并在文档里列出。例如 `counter`、`stopEvent`、`clamp$b`、`formatNumber`。

现有补丁：`patches/@base-ui__react@1.3.0.patch`、`patches/mediabunny@1.44.2.patch`、`patches/@mediabunny__mp3-encoder@1.44.2.patch`、`patches/mutative@1.3.0.patch`。

### 4.2 改名：工具保证行为不变，人工保证名字对

工具在 `scripts/desource/rename/`，用法和**命名自审规则**见 README。

- `rename-identifiers.mjs --mode local|export`：按 binding 改名。改完会做 alpha 等价校验、作用域和遮蔽检查、保留字和全局名检查；任何一处不通过就整体不写入。
- `rename-files.mjs`：改文件名并改写所有 import。
- 动态依赖名字的地方不能改：`fn.name`、`.toString()`、`arguments`、`constructor.name`、`displayName`、字符串拼出来的路径。
- 常见错名（独立复核实测错名率 0.1%~1.2%）：
  - 事件参数类型取错（mouse、pointer、click 混用）；
  - `useState` 的 setter 没跟着改名；
  - `String.replace` 回调参数错位（`(match, p1, …, offset)`）；
  - 成组名字轮换错位；
  - 按调用方起名，不是按函数实际做的事起名；
  - 去重后缀没去干净（`node2`、`X$1`）。
- 浏览器全局名不能当新名：`event`、`status`、`model`、`prompt`、`name`、`top`、`length`、`find`、`close`、`document`、`history`、`fetch` 等。
- 纯小写的常规缩写（`err`、`ctx`、`pos`、`src`、`row`、`cn`、`id`、`url`）是源码原名，保留。Lucide 图标名（`Loader2` 等）、`x1/y1/x2/y2`、型号常量也保留。

**改名前先确认这个文件不是内联库。**`chat/qs.jsx` 改了 577 个名字，事后才查出它是 streamdown，整个文件被删掉了。

---

## 5. 遇到过的问题与解决办法（摘要）

| 问题 | 解决 |
|---|---|
| `aee54ac` 换包后白屏：`Placeholder` 没 import；PDF `getDocument` 变成 undefined（留下了空对象桩）；画布视口失效（d3 双实例） | 补 import；改从 `pdfjs-dist` 导入；d3 一族全部换成 npm。新增 `check-undef.mjs` 来抓未定义引用、空桩属性读取、丢失的原型补丁 |
| 门禁噪声：CDN 视频、随机推荐卡片、相对时间、文件 mtime、OPTIONS 预检乱序、跨零点日期 | 屏蔽外部 CDN；按 `pickRecommendationBatch` 重置 RNG；固定时钟；统一 mtime；比较时去掉 OPTIONS，非 GET 按 method+path 分组 |
| 文字 AA 环境漂移导致全页像素差 | golden 自比较判别后重录；门禁改为只看 non-AA 交集 |
| mediabunny 和 npm 任何版本都对不齐（601/629） | 用最接近的 1.44.2 加补丁改回内联写法，验收为 629/629 一致 |
| Base UI 映射数量对不上（763 和 744+19） | 只迁已确认的声明，保留应用自己的同名函数，记录误匹配清单 |
| Floating UI 装了两个版本 | 用根 overrides 钉住 dom 1.7.6、utils 0.2.11 |
| fastHooks 直接访问私有数组 | 改用公开的 `register`，确认唯一 importer 后删掉 shim |
| streamdown 带进 mermaid，mermaid 又带进 `marked@16.4.2` | 查明 streamdown dist 不 import mermaid，产物里只有一份 marked@17.0.6，不加 override |
| 子会话额度用完被暂停，sidekick 的工作停在未提交状态 | 接手后先 `git status`，由主会话检视后再提交 |
| Devin 附件直链下载返回 401 | 分析产物改用 git 分支传递 |

---

## 6. 剩余工作（按建议顺序）

每项完成后提交并推送到工作分支，提交信息用中文，在本文第 7 节「进度」表里更新状态和门禁报告路径。

### 6.1 统一改名：导出名、文件名、哈希文件名（**草稿已有，需修正后执行**）

草稿在 `scripts/desource/rename/names/`：

- `final-files.json`：48 条文件映射，含 18 个带哈希名的素材和 JS；
- `final-exports.json`：19 个文件的导出名映射；
- `final-locals.json`：4 条局部改名；
- `final-rationale.tsv`：每条映射的依据。

草稿由各组的 `proposals/*.json` 合并而来。已删除文件的提议已经去掉，但**未执行，也未经检视**。已知问题，执行前必须修正：

1. `chat/ae.jsx`、`nn.jsx`、`at.jsx`、`st.jsx`、`fo.jsx`、`pe.jsx`、`te.jsx`、`co.jsx`、`yt.js`、`xn.js`：换掉 streamdown 后，这些文件只剩 9~234 字节的转发代码。**应把 importer 改成直接 import 目标，然后删掉这些文件**，不是改名。
2. `canvas/it.js`、`w.js`、`we.js`、`ot.js`、`grid-slot-layout.js`、`layout-category-lanes.js`、`dagre-layout.js`（约 108KB）是内联的 dagre/graphlib。从映射里去掉，按 6.2 处理。
3. `vendor-inline/minified/ct.js`（43 字节，travels 的转发）：改成直接从 `travels` import，然后删掉。
4. `infra/from-vendor.js` 的 `EventEmitter3`、`TableView2`、`WidgetType2`、`Bitstream2` 等是库符号的别名：去掉后缀前，先确认同文件里没有同名 binding。
5. 其余条目：逐条读声明，核对新名是否符合实际行为（按 4.2 的规则）。还要确认没有遗漏的短文件名，用下面的命令列，结果应只剩已说明原因的：

```bash
cd app/renderer/src && find . -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.mjs' \) | awk -F/ '{n=$NF; sub(/\.[^.]+$/,"",n); if (length(n)<=2) print}'
find . -type f | rg -- '-[A-Za-z0-9_-]{8}\.(png|svg|js|mjs|jpg|webp)$'
```

注意：Vite 哈希是 base64url，含 `_` 和 `-`，正则不能只用 `[[:alnum:]]`。

执行：导出名、文件名、哈希文件名分 3 个提交。

```bash
node scripts/desource/rename/rename-identifiers.mjs scripts/desource/rename/names/final-exports.json --mode export --dry-run
node scripts/desource/rename/rename-identifiers.mjs scripts/desource/rename/names/final-exports.json --mode export
node scripts/desource/rename/rename-files.mjs scripts/desource/rename/names/final-files.json --dry-run
node scripts/desource/rename/rename-files.mjs scripts/desource/rename/names/final-files.json
```

`vendor.js` 自己的导出名先不动，等 6.3~6.6 完成后再说。`i18n/en.js`、`zh.js` 如果有按文件名动态加载的地方，要先查清再改。

**验收**：

- dry-run 报告的 `files[].equivalence.status` 全部等价，`rejected` 为空；
- 3.1 的全部检查通过，`gate.sh` 跑两次；
- 交付时附上映射条数，以及丢弃项和冲突项清单。

### 6.2 canvas 内联 dagre 换成 npm

- `canvas/` 下 7 个文件（见 6.1 第 2 条），另加 `vendor.js` 里的 `@dagrejs/graphlib`（清单显示内联版本为 4.0.1，需复核）。改名会话曾对照 `@dagrejs/dagre` 的 sourcemap `sourcesContent` 恢复上游原名，可见确实是 dagre。
- 步骤：
  1. 用 4.1 第 1 步的方法给 `@dagrejs/dagre` 和 `@dagrejs/graphlib` 的各版本打分，定出精确版本；
  2. 列出应用的调用方（谁 import 这 7 个文件的导出）；
  3. 对不上的声明按 4.1 第 2 步分类，需要时写补丁；
  4. 整组删掉，改为从 npm import。
- **验收**：逐声明一致或打补丁后一致；全部检查通过，门禁两轮（`ws-layout`、`ws-canvas-ops` 必须 0 差异）；`pnpm why @dagrejs/graphlib` 只有一个版本。

### 6.3 `vendor.js` 剩余第三方库换包

依据：`analysis/remaining/vendor-residual/REPORT.md` 和 `TABLES.md`，逐声明数据在 `decls-final.json`。汇总（不含 xyflow）：

| 状态 | 包数 | 声明 | 字节 |
|---|---|---|---|
| ① 已装、版本一致，可直接换（travels 2.2.0、class-variance-authority 0.7.1、react-i18next 15.7.4、extend 3.0.2、style-to-js 1.1.21、void-elements 3.1.0） | 6 | 28 | 12,374 |
| ①′ 已装、版本一致，但有声明对不上（react-day-picker、sonner、mediabunny 残余等，见 TABLES.md） | 8 | 331 | 242,187 |
| ② 对不上已装版本，或仓库没装 | 14 | 754 | 444,092 |
| ③ 推断是应用代码（见 6.6） | — | 303 | 92,610 |

② 里的主要包：

- `jszip` 3.10.1：内联约 17 万字节，已装的是 3.10.2；
- `lucide-react` 0.468.0：266 个声明，约 8 万字节；已装的是 1.42.0，另有 222 个 1.42.0 的别名；
- `wavesurfer.js`：内联介于 7.12.2 和 7.12.7 之间，已装 7.12.12；
- `shiki` 3.23.0 残余；
- `@speed-highlight/core` 1.2.22；
- `@dagrejs/graphlib` 4.0.1（并入 6.2）；
- `@tiptap/extension-table` 3.31.3；
- `react-qr-code` 2.0.19~2.0.21，以及 `qr.js`；
- `react-markdown` 10.x；
- `prop-types` 15.8.1；
- `inline-style-parser` 0.2.4；
- `style-to-object` 1.0.11。

**先做的分析**（原来交给分析会话，它因额度用完只做了一半，需要重做）。产出放到 `analysis/remaining/vendor-swap-plan/`，提交到分析分支或工作分支的 `analysis/` 下：

1. 每个包定出精确版本。
2. 列出要从 `vendor.js` 删的每个声明（行号、字节数）。
3. 对不上的声明按 4.1 第 2 步分三类。
4. 列出 `vendor.js` 的导出和应用里的调用方。
5. 确认每个 npm 符号是公开导出，还是需要深路径。
6. lucide 的两个版本能否共存：图标外形不同就必须两套共存，用 npm alias，比如 `"lucide-react-0468": "npm:lucide-react@0.468.0"`。门禁像素会验证这一点。
7. shiki 残余是没删干净的副本，还是另一个包。
8. jszip 3.10.1 和 3.10.2 的差异，以及调用方。

然后分 2~3 批执行。每批：

- 改 `app/renderer/package.json`，需要时加 overrides；
- `pnpm install`，提交 lockfile；
- 删声明，改 import；
- 跑全部检查，门禁两轮；
- 做 3.5 的构建产物审计。

建议批次：第一批 ① 加 ①′；第二批 jszip、lucide、wavesurfer、tiptap table；第三批其余。

**验收**：每批 `vendor.js` 字节数下降，并与清单对得上；门禁两轮通过；涉及的包单实例；补丁是最小 hunk。导出 zip 走 jszip，门禁没覆盖导出路径，要额外用脚本调用导出函数，比较输出 zip 的条目列表和内容。

### 6.4 xyflow：方案 2（**用户已批准**）

用户已选定：以 npm `@xyflow/react@12.10.2` 和 `@xyflow/system@0.0.76` 的源码为底，作为**可读 fork 放进仓库**，打上应用的 17 处行为改动，直接 import 应用自己的 helper。不要用「npm 包加 2000 多行补丁」的方案，那样应用函数会复制一份。

依据：`analysis/xyflow/xyflow-vendor-analysis.md`（17 处改动：system 5 处、react 12 处，包括拖动吸附、框选预览、框选时自动平移、Shift 取消选中等），`mapping.tsv`（220 个声明），`patches/*.patch`（打补丁后 192 处一致、29 处无行为影响、0 处行为差异），`results/helper-check.json`（15 个 `infra/from-vendor.js` 里的 helper）。

步骤：

1. 新建目录，建议 `app/renderer/src/vendor-fork/xyflow/system/` 和 `.../react/`。放入 npm 包的可读 ESM 源码：用 dist 里的 `index.mjs` / `esm/index.js`，保持原格式；有 sourcemap 的就用 `sourcesContent` 恢复成源码。
2. 把两份分析补丁的改动应用进去。但凡补丁里内联了应用 helper 的地方，改成从 `../../infra/from-vendor.js` 或其拆出后的命名模块 import，不复制。
3. 新增 `vendor-fork/xyflow/CHANGES.md`：逐条列出 17 处改动，写清上游位置、改成了什么、为什么，方便以后升级对照。
4. `vendor.js` 第 800~7620 行一带的 xyflow 声明（共 223 个、约 21 万字节，以 `mapping.tsv` 为准）整组删掉，所有 import 改到 fork。`createStore$2` 和 `getInitialState$1` 属于 `@xyflow/react`，不是 zustand。
5. 依赖：zustand 4.5.7、classcat 5.0.5 用 npm。`package.json` 里的 `@xyflow/system` 依赖如果不再被用到就去掉，同时确认产物里没有第二份 xyflow。

**验收**：

- 用 `analysis/xyflow/tools/analyze.mjs` 对比 fork 和原内联代码：0 处行为差异；
- 全部检查通过，门禁两轮，其中 `ws-canvas-ops`、`ws-layout`、`ws-zoom`、`ws-add-node` 等画布页 0 差异；
- 产物里 xyflow 的 store 和 context 只有一份。

### 6.5 `vendor-inline/` 收尾（共约 97KB）

- `vendor-inline/vscode-base/`（4 个文件，约 72KB）：VS Code base 工具，没有对应的 npm 包，已经改过名。保留为可读源码，在文件头写明对应的 VS Code 源文件。剩下 3 个导出名在 6.1 里处理。
- `vendor-inline/codemirror/`（6 个文件，约 12KB）：先确认它们是不是 `@codemirror/*` 未导出的私有函数（比如 `deleteMarkupBackward`、`insertNewlineContinueMarkup` 属于 `@codemirror/lang-markdown`，这两个其实是公开导出的）。公开的就改成 npm import 并删掉文件；私有的保留，并注明来源。
- `vendor-inline/minified/ct.js`：见 6.1 第 3 条。
- **验收**：`vendor-inline/` 里只剩有明确理由保留的文件，每个文件头都注明来源；全部检查和门禁通过。

### 6.6 `vendor.js` 里的应用代码拆成命名模块

- 约 303 个声明、9 万字节，按清单分为连接器市场、画布 helper、常量与配置、图标定义、import 别名、构建 helper 等。这个分类**部分是启发式的**，拆之前要逐声明确认确实不是库代码。
- 按功能拆进对应目录的命名文件里（比如 `skills/connectors/…`、`canvas/…`），起语义化名字，并更新 import。等第三方库都删完后，`vendor.js` 应只剩下这部分。最终目标是删掉 `vendor.js`，或者只剩一个有说明的极小的 re-export 文件。`infra/from-vendor.js` 同样处理。
- **验收**：全部检查通过，门禁两轮；`vendor.js` 不存在，或者每个剩余导出都有说明。

### 6.7 最终收尾

1. 全量跑 3.1 的检查，门禁两轮，做构建产物审计。
2. 更新本文第 7 节和 `handoff-renderer-desource.md`。
3. 从工作分支向 `main` 开总 PR，**不合并**，等用户决定。
4. 跟进 CI，修掉本改动范围内的失败。

---

## 7. 进度表（接手后持续更新）

| 项 | 状态 | 提交 / 证据 |
|---|---|---|
| 门禁（40 页，5 通道） | 完成 | `scripts/ui-compare/` |
| 改名工具 | 完成 | PR #1，35 个测试 |
| 局部改名 5 组 + 独立复核 | 完成 | PR #2~#6 |
| 换包：markdown/hast、CodeMirror、Shiki、Tiptap、TanStack Table、mutative/travels、mediabunny、Base UI、PDF worker、Streamdown | 完成 | 见第 1 节；门禁报告路径见 `handoff-renderer-desource.md` |
| 6.1 统一改名 | 完成 | `13edf291`、`c71d3989`、`aaa614e1`、`28025a36`。同文件连续再导出的偏移、以及已改过的导入文件被重置，都在改名工具里修掉了。改名测试 37 个通过 |
| 6.2 dagre | 完成 | `b5d752c5`，合入 `70985e3d`。`@dagrejs/dagre@3.0.0`，传递依赖 `@dagrejs/graphlib@4.0.1`，只有这一版。没有补丁。当时 `vendor.js` 1,059,598 → 1,039,395 字节。`ws-layout`、`ws-canvas-ops` 在下面两轮门禁里非抗锯齿像素差是 0 |
| 6.3 剩余库换包 | 三批两轮门禁都已通过 | 计划在 `origin/devin/vendor-swap-plan` @ `fe63116a`。第一批 `7657ae9d` 合入 `f8188c52`，`vendor.js` 828,241 → 568,125 字节，顶层声明少 360 个，没有新补丁，14 个包都是单实例。`src_default$1` 是 Tiptap 的 Placeholder，没有误换成 mediabunny。第二批 `6b4e19b6` 已快进合入，`vendor.js` 568,125 → 246,415 字节。jszip 3.10.1、lucide-react 0.468.0、wavesurfer.js 7.12.7、`@tiptap/extension-table` 3.31.3 各一个实例，没有新补丁。`Plus$1` 和 245 个图标包装留下。第三批 `23845cbf` 合入 `a7c894fb`，`vendor.js` 246,415 → 135,927 字节，没有新补丁 |
| 6.4 xyflow 方案 2 | 完成 | `6454e65e`，合入 `5f2d2c8c`。可读副本在 `app/renderer/src/vendor-fork/xyflow/`，`CHANGES.md` 记了 17 处行为改动。zustand 4.5.7、classcat 5.0.5 来自 npm。renderer 不再依赖 `@xyflow/system`、`@xyflow/react`。画布页两轮门禁非抗锯齿像素差是 0 |
| 6.5 vendor-inline 收尾 | 完成 | `ab5156f2`，合入 `34c1e62a`。四个纯再导出改成直接引用 `@codemirror/state@6.7.5`、`@codemirror/view@6.43.6`、`@codemirror/language@6.12.4`、`@codemirror/lang-markdown@6.5.2`。留下 `delete-markup-backward.js`、`line2.js` 和四份带来源说明的 vscode-base |
| 6.6 应用代码拆分 | 两轮门禁都已通过 | 474 个确认的应用声明按名字拆进现有目录，提交 `91bd10f6`、`c2fa8c68`。zustand 副本改走 4.5.7 的公开入口。`vendor.js` 135,927 → 7,641 字节，只留还没对上包的声明，文件头写了原因。`from-vendor.js` 里确认是应用的声明已拆开；表格、选择器和打包垫片还留在原文件，并写了原因。两轮 `gate.sh` 见下面的拆分表 |
| 6.7 总 PR | 门禁和产物审计已完成，向 main 开 PR 且不合并 | 两轮 `gate.sh` 都是退出码 0，加载 `index-CQH314Qo.js`（23,222.44 kB）。没有 raw-only 像素差。产物审计：入口包只有一个 `class Output`，`registerEncoder` 只有一份绑定，AAC 和 MP3 各注册一次。`mermaid-C9Q6ykpW.js` 是 Shiki 的 Mermaid 语法，不是 mermaid 运行时；`mermaidAPI`、`flowchartDiagram`、`flowchart-elk`、`FlowDB` 都不在产物里。`pnpm why` 里 zustand 4.5.7、lucide-react 0.468.0、jszip 3.10.1、wavesurfer.js 7.12.7、`@tiptap/extension-table` 3.31.3、shiki 3.23.0、react-markdown 10.1.0、`@dagrejs/dagre` 3.0.0、`@dagrejs/graphlib` 4.0.1、mediabunny 1.44.2、marked 17.0.6、streamdown 2.5.0、pdfjs-dist 4.10.38 都只有一个版本。mermaid 11.17.2 只出现在 streamdown 的依赖树上，应用没有 import。`@xyflow/react` 和 `@xyflow/system` 没有装上。PDF worker 只有 `pdf.worker.min-yatZIOMy.mjs` |

下面两轮覆盖的是第一批换包之前的树（当时 HEAD `39c51e5f`，`vendor.js` 828,241 字节），退出码都是 0。raw 像素在通过的报告里是 0，没有 raw-only 差异。

第一批合入后的两轮 `gate.sh` 也退出码 0，加载的都是 `index-B5CyuA28.js`。raw 像素是 0。中间有一次加载了缓存里的旧包 `index-DtIY8I0F.js`（报告 `2026-10-14T06-39-37-940Z` 和 `2026-10-14T06-58-11-819Z`），不计入。

| 轮次 | 报告 | 结果 |
|---|---|---|
| 第一轮 `gate.sh` | `.probe/ui-compare/2026-10-14T06-20-37-154Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |
| 第二轮 `gate.sh` | `.probe/ui-compare/2026-10-14T07-44-30-137Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |

第二批合入后的两轮 `gate.sh` 退出码都是 0，加载的都是 `index-DAh8pD22.js`（23,242.07 kB）。控制台堆栈在两遍比较里都指向这个哈希。没有 raw-only 像素差。

| 轮次 | 报告 | 结果 |
|---|---|---|
| 第一轮 `gate.sh` | `.probe/ui-compare/2026-10-14T08-05-10-499Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |
| 第二轮 `gate.sh` | `.probe/ui-compare/2026-10-14T08-24-11-302Z/report.json`，以及自动第二遍 `.probe/ui-compare/2026-10-14T08-42-48-089Z/report.json` | 第二遍 40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0。不稳定、不阻断：`home-skill-inspiration` 第一遍非抗锯齿 2613 像素（0.0638%），raw 2654 像素（0.065%），是一张封面卡片；第二遍通过 |

第三批合入后的两轮 `gate.sh` 退出码都是 0，各一次比较即通过，加载的都是 `index-Cf0gQmYZ.js`（23,225.15 kB）。控制台堆栈指向这个哈希。没有 raw-only 像素差。

| 轮次 | 报告 | 结果 |
|---|---|---|
| 第一轮 `gate.sh` | `.probe/ui-compare/2026-10-14T09-04-26-687Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |
| 第二轮 `gate.sh` | `.probe/ui-compare/2026-10-14T09-23-40-892Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |

应用代码拆分后的第一轮 `gate.sh` 退出码是 0，加载的是 `index-CQH314Qo.js`（23,222.44 kB）。`recovered-ui/index.html` 指向这个哈希，这次构建在门禁里是缓存命中。更早一次比较在写出报告前就停了（`.probe/ui-compare/2026-10-14T10-11-15-433Z`，等不到界面页面），不计入。没有 raw-only 像素差。

| 轮次 | 报告 | 结果 |
|---|---|---|
| 第一轮 `gate.sh` | `.probe/ui-compare/2026-10-14T10-12-57-788Z/report.json`，以及自动第二遍 `.probe/ui-compare/2026-10-14T10-31-42-244Z/report.json` | 第二遍 40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0。不稳定、不阻断：`home` 和 `project-assets` 第一遍只有网络通道。`home` 的差异是请求里的屏幕宽高（1728×1117 对 1496×967）。`project-assets` 第一遍 GET 请求数是 37 对 25。像素、DOM、状态、新增报错第一遍也是 0。第二遍通过 |
| 第二轮 `gate.sh` | `.probe/ui-compare/2026-10-14T10-52-01-621Z/report.json`，以及自动第二遍 `.probe/ui-compare/2026-10-14T11-10-38-942Z/report.json` | 第二遍 40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0。不稳定、不阻断：`projects-new-local`、`creations`、`workflows`、`skills`、`skills-connectors`、`skills-mine`、`skill-community`、`changelog`、`user-menu` 第一遍只有网络通道，差异是请求里的屏幕宽高（1728×1117 对 1496×967）。像素、DOM、状态、新增报错第一遍也是 0。第二遍通过 |

第一批换包之前的两轮（HEAD `39c51e5f`，`vendor.js` 828,241 字节）：

| 轮次 | 报告 | 结果 |
|---|---|---|
| 第一轮 `gate.sh` | `.probe/ui-compare/2026-10-14T05-00-13-875Z/report.json`，以及自动第二遍 `.probe/ui-compare/2026-10-14T05-18-52-426Z/report.json` | 第二遍 40 页像素、DOM、状态、新增报错都是 0。不稳定、不阻断：`user-menu`、`settings-platform` 第一遍是网络通道，第二遍通过 |
| 第二轮 `gate.sh` | `.probe/ui-compare/2026-10-14T05-38-08-948Z/report.json` | 一次比较即通过。40 页像素原始/非抗锯齿都是 0/0，网络、DOM、状态、新增报错都是 0 |

---

## 8. 验收清单（交付时逐条对照，我会按此验收）

1. 每项改动都是独立提交，已推送到工作分支，提交信息用中文。
2. 第 7 节进度表已更新：每批的 `vendor.js` 前后字节数、两轮门禁的 `report.json` 路径、raw-only 像素数。
3. 换包批次要附：
   - 版本判定依据（逐声明打分结果）；
   - 删掉的声明数量；
   - 补丁内容说明（每个 hunk 对应哪个声明、为什么改）；
   - 单实例审计结果；
   - 同名误匹配清单。
4. 改名批次要附：
   - dry-run 等价报告；
   - 丢弃项和冲突项；
   - 剩余短名或哈希名清单为空，或逐个写明原因。
5. 第 0 节的「绝对不能做的事」一条都没违反：门禁未改、golden 未动、`gen-renderer.mjs` 没跑、没有合进 main。
6. 我会独立复核：抽查 diff（重点看补丁和 fork 的改动是否最小、名字是否和函数体一致），重跑 `check-undef`、构建和一轮门禁。门禁结果和交付报告不一致的，打回重做。
