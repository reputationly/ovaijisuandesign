# 剩余内联产物分析报告（只读分析）

- 分析对象：`devin/1791701596-renderer-desource` @ `1c5ed54062823ce4b059fb562fdf7eb036f2c454`（只读 worktree，未改动任何文件）
- 工具：`tools/xcanon.mjs`（跨模块 α 归一化形状）、`tools/xmatch.mjs`（种子配对 + 沿引用传播 helper 配对）、各任务脚本见 `tools/README.md`
- 形状规则：局部绑定按出现位置改名 `_L<i>`；模块级引用替换成“配对后的对端声明”再比较；JSX 去糖成 `jsx()`；`!0/!1` → `true/false`；模板字符串按 cooked 值比较；`react` 的 default 导入成员 `reactExports.X` 视同具名导入 `X`。

---

## 任务 1：`vendor-inline/minified/s2.js`

### 结论（已验证）

s2.js 有 41 个顶层声明 + 1 条非声明语句（第 484 行 `be();`），**全部来自两个 npm 包，且全部一致**：

| 部分 | s2.js 中的声明 | 跨模块闭包 | 对应 npm | 结果 |
|---|---|---|---|---|
| remend（`$e$1` = remendMarkdown） | 30 个 | 88 个声明，散在 s2.js、`workspace/build-inspiration-media-showcase-collections.js`、`workspace/q.js`、`vendor.js`、`infra/from-vendor.js` | `remend@1.3.0` `dist/index.js` | 88 一致 / 0 差异 / 0 配对冲突 |
| createAnimatePlugin（`be`） | 11 个（`be Jn Xn qn Wn $n Fn Zn _n zn St`） | 11 个 + 外部 `visitParents`/`SKIP` | `streamdown@2.5.0` `dist/chunk-BO2N2NFS.js` | 11 一致 / 0 差异 |

相邻版本对照（同一工具）：

| 版本 | 一致 | 差异 | 冲突 |
|---|---|---|---|
| remend@1.2.2 | 79 | 4 | 1 |
| **remend@1.3.0** | **88** | **0** | 0 |
| remend@1.3.1 | 80 | 8 | 0 |
| remend@1.4.0 | 39 | 43 | 5 |
| streamdown@2.4.0（be 闭包） | 8 | 3 | 0 |
| **streamdown@2.5.0** | **11** | **0** | 0 |
| streamdown@2.6.0 | 5 | 7 | 2 |
| streamdown@2.7.0 | 5 | 9 | 4 |

对之前初步结论的修正：

- “和 remend@1.3.0 有 1 处差异”：这一处在 `ln$1`，是模板字符串里 src 写的是字面零宽空格、npm 写的是 `\u200B` 转义，**同一个字符串**，按 cooked 值比较后为 0 差异。
- “和 1.3.1 只差 3 处 helper 名”：helper 一一配对后，1.3.1 有 **8 个声明存在实质语义差异**，不只是名字不同。例如 `tn$1`↔`un` 的 `~` 转义回调多了偏移参数、`c2`↔`c` 的“是否在代码块内”判断在 1.3.1 改成了带缓存的 lookup。证据：`s2/remend-1.3.1.json`，可用 `node tools/showdiff.mjs s2/remend-1.3.1.json` 查看。
- 所以 remend 的版本是 **1.3.0**。它也正好是 `streamdown@2.5.0` 的 `dependencies.remend` 精确版本。

### side-effect import（已验证）

`main.jsx:544` 的 `import "./vendor-inline/minified/s2.js"` 没有导入任何绑定。执行 s2.js 的效果是：

1. 先求值它的依赖 `vendor.js`、`workspace/build-inspiration-media-showcase-collections.js`、`workspace/q.js`（这三个 main.jsx 本来就导入，例如第 497 行）；
2. 定义上述常量和函数（都是纯初始化）；
3. 执行第 484 行 `be();`。npm `chunk-BO2N2NFS.js` 里 `be` 定义之后也有这条顶层 `be()`，**是同一个模块副作用**：模块计数器 `Jn` +1，所以之后应用创建的第一个 animate 插件叫 `rehypeAnimate$1`。

换成 npm 后这个副作用由 streamdown 的 chunk 自己执行，main.jsx 这一行可以直接删除。

### 闭包外引用（已验证）

`s2/remend-closure-users.json`：remend 闭包的 88 个声明里，只有 `$e$1` 被闭包外使用（`chat/streamdown.jsx#Streamdown`）。其余 helper，包括 build-inspiration、q.js、vendor.js、from-vendor.js 里那 58 个，换包后都可以删除。

### 可直接执行的替换方案

推荐和任务 2 一起做（方案 A）。

**方案 A（推荐）**：整体换成 `streamdown@2.5.0`，**不需要 patch**。

- `app/renderer/package.json` 加 `"streamdown": "2.5.0"`（精确钉版本）。它会带上 `remend@1.3.0`（精确依赖）。
- 删除 s2.js，删除 `main.jsx:544` 的 side-effect import。
- `chat/streamdown.jsx` 里所有调用方改为从 `"streamdown"` 导入（见任务 2）。
- `app/renderer/package.json` 里现有的直接依赖 `"remend": "1.3.1"` 在 renderer src 中没有任何 `from "remend"`，这个版本与内联代码不一致。建议删除，或改成 `1.3.0`。

**方案 B（只换 s2.js）**：

```js
import remendMarkdown from "remend";                 // remend@1.3.0（package.json 必须从 1.3.1 改为 1.3.0）
import { createAnimatePlugin } from "streamdown";     // streamdown@2.5.0，入口 index.js 导出 a as createAnimatePlugin，实现在 chunk-BO2N2NFS.js#be
```

方案 B 同样不需要 patch。

证据：`s2/remend-1.3.0.json`、`s2/streamdown-2.5.0.json`、`s2/summary.json`、`s2/DECLARATIONS.md`（逐声明表）、`tools/t1-s2.mjs`

---

## 任务 2：`chat/streamdown.jsx` 及其导入文件

### 结论（已验证）

这是**内联的 `streamdown@2.5.0`，不是应用自己写的**，也没有应用改动。

以 `chat/streamdown.jsx#Streamdown` ↔ `dist/index.js` 的 `Streamdown` 为种子，沿引用闭包把 helper 一一配对：

| 版本 | 一致 | 差异 | 冲突 | streamdown.jsx 67 个声明 |
|---|---|---|---|---|
| 2.3.0 | 72 | 12 | 9 | 21 一致 / 8 差异 / 38 未配对 |
| 2.4.0 | 159 | 17 | 0 | 62 / 4 / 1 |
| **2.5.0** | **176** | **3** | **0** | **65 / 2 / 0** |
| 2.6.0 | 125 | 49 | 28 | 50 / 17 |
| 2.7.0 | 114 | 54 | 51 | 50 / 17 |

2.5.0 的闭包共 179 个 src 声明，分布在 15 个文件：

- `chat/streamdown.jsx` 67、`vendor.js` 54、`media-editing/wt.js` 22、`chat/ae.jsx` 16、`vendor-inline/minified/s2.js` 12、`chat/nn.jsx` 6、`chat/at.jsx` 3、`chat/st.jsx` 3、`chat/co.jsx` 2、`chat/xn.js` 2
- `chat/te.jsx`、`chat/pe.jsx`、`chat/fo.jsx`、`chat/yt.js`、`chat/highlighted-code-block-body.js` 各 1

npm 侧只剩 `chunk-BO2N2NFS.js#Wr`（864 字节）没配上，src 侧不可达。

**3 处差异都是构建等价，不是语义改动**：

| src 声明 | npm | 差异 |
|---|---|---|
| `chat/streamdown.jsx#unicodeLetterPattern` | `chunk#is` | `/\p{L}/u` 被构建降级成 `new RegExp("\\p{L}", "u")` |
| `chat/streamdown.jsx#MermaidRenderer` | `chunk#os` | `lazy(() => import("./mermaid-GHXKKRXX.js"))` 因 chunk 合并被内联成 `Promise.resolve().then(() => mermaidGHXKKRXX)` |
| `chat/st.jsx#LazyHighlightedCodeBlockBody` | `chunk#cr` | `import("./highlighted-body-OFNGDK62.js")` 只是文件名被改成 `./highlighted-code-block-body.js`，外面多包了一层 IIFE |

其他检查：

- 27 条 `X.displayName = "..."` 语句与 npm 逐条同名同值。src 多出的 8 条是 vendor.js 里的 xyflow。
- `chat/mermaid-ghxkkrxx.js` 是 npm `dist/mermaid-GHXKKRXX.js`（`export { l as Mermaid } from "./chunk-BO2N2NFS.js"`）的构建产物，形式是冻结的 Module 命名空间对象，`Mermaid` 指向 `chat/nn.jsx#po`（= chunk `po`，一致）。
- `chat/highlighted-code-block-body.js#R` ↔ `dist/highlighted-body-OFNGDK62.js#R` 一致。

所以**不存在“应用改过的声明”**。

### 闭包外引用（已验证，换包时要改的调用方）

见 `streamdown/streamdown-closure-users.json`：

| src 声明 | 外部使用者 | npm 公开导出名 |
|---|---|---|
| `chat/streamdown.jsx#Streamdown` | `generation/markdown-link.jsx#MarkdownContent` | `Streamdown` |
| `chat/st.jsx#st` | `generation/markdown-link.jsx#DefaultCodeBlock` | `CodeBlock`（chunk `st` as `g`） |
| `chat/ae.jsx#Ae` | `markdown-link.jsx#DefaultCodeBlock`、`#FileReferenceCodeBlock` | `CodeBlockCopyButton`（`Ae` as `i`） |
| `chat/ae.jsx#ot` | `markdown-link.jsx#FileReferenceCodeBlock` | `CodeBlockContainer`（`ot` as `d`） |
| `chat/ae.jsx#rt` | 同上 | `CodeBlockHeader`（`rt` as `e`） |
| `media-editing/wt.js#tt` | `markdown-link.jsx#MarkdownCodeBlock` | `useIsCodeFenceIncomplete`（`tt` as `b`） |

其余闭包内声明只在闭包内部和 displayName 语句里使用，可以随整体替换一起删除。

### 建议形态

**npm `streamdown@2.5.0`，不需要 pnpm patch**。调用方改为 `import { Streamdown, CodeBlock, CodeBlockCopyButton, CodeBlockContainer, CodeBlockHeader, useIsCodeFenceIncomplete } from "streamdown"`，然后删除上面 15 个文件里的闭包声明（`chat/streamdown.jsx`、`chat/mermaid-ghxkkrxx.js`、`chat/highlighted-code-block-body.js`、s2.js 可以整文件删除）。

### 未验证 / 推断（单独列出）

- **streamdown 的 16 个外部依赖在 src 里是内联实现，本次只按名字对上了边界，没有逐声明比较它们的版本**。包括：`remend`、`rehype-sanitize`、`rehype-raw`、`tailwind-merge`（`twMerge`）、`marked`（`Lexer`）、`clsx`、`unist-util-visit`、`unist-util-visit-parents`、`hast-util-sanitize`（`defaultSchema`）、`remark-gfm`、`hast-util-to-jsx-runtime`、`unified`、`remark-parse`、`remark-rehype`、`html-url-attributes`（以及 `rehype-harden`，src 已从 npm 导入）。
  - 其中 `rehypeRaw`↔`rehype-raw@7.0.0`、`rehypeSanitize`↔`rehype-sanitize@6.0.0` 已在任务 3 中形状哈希一致；`remend` 见任务 1。
  - 换成 npm streamdown 后，这些包按 streamdown 的版本范围解析（如 `marked ^17.0.1`），**需要另外确认 vendor.js 里内联的版本并在 package.json/overrides 钉住**，否则可能出现版本漂移。
- `chunk#Wr` 没有配对，推断它属于 2.5.0 中 Streamdown 不可达的导出（chunk 导出名 `s`，经 index 导出为 `TableDownloadButton`）。可达性没有做运行时验证。
- 构建等价的判断基于源码比较，没有对 2.5.0 原包重新构建来复现这 3 处形态。

证据：`streamdown/streamdown-<各版本>.json`、`streamdown/summary.json`、`streamdown/DECLARATIONS.md`、`tools/t2-streamdown.mjs`、`tools/showdiff.mjs`

---

## 任务 3：全量扫描遗漏的内联第三方代码

### 方法

- src：`app/renderer/src` 下除 `vendor.js`、`vendor-inline/vscode-base/` 外的 1108 个 js/jsx/mjs 文件，共 8241 个顶层函数/类声明（含 `var x = function / 箭头函数 / class`）。
- npm：pnpm store 中 908 个包目录（含间接依赖），加上 `streamdown@2.5.0 + remend@1.3.0` 的完整依赖树（单独装在 `~/ana/sddeps`），共 27,491 个文件、81,966 个声明。
- 匹配：α 归一化后、自由引用全部打码，算形状哈希（精确）和粗哈希（再抹平字符串/数字字面量）。
  - 声明短于 150 字符，或同一形状撞到 5 个以上的包，视为通用声明，要求同文件 ±3 内的相邻声明命中同一个包才算数。
- 结果：命中 1276 条，接受 881 条，因短/通用被拒 395 条。被拒的没有一条 ≥300 字节，聚簇都是通用短函数，例如 `isRecord`、`diagnosticsXxxKey`。

### 命中（人工复核后，已排除 xyflow/Base UI/vscode-base）

| 文件 | 声明 | 匹配包@版本 | 是否一致 | 字节 | 说明 |
|---|---|---|---|---|---|
| `pdf.worker.min-yatZIOMy.mjs` | 整文件（755 个声明） | pdfjs-dist@4.10.38 `build/pdf.worker.min.mjs` | **整文件字节一致**（cmp） | 1,375,838 | package.json 已有 `pdfjs-dist 4.10.38`；handoff 已计划换成 `pdfjs-dist/build/pdf.worker.min.mjs?url`。pdf-parse 的命中是它内置的同源 pdf.js，忽略 |
| `infra/from-vendor.js` | `Bitstream2` | mediabunny@1.44.2 `Bitstream` | 一致 | 1485 | 被 vendor.js 导入 |
| `infra/from-vendor.js` | `WidgetType2` | @codemirror/view@6.43.6 `WidgetType` | 一致 | 2295 | 被 vendor.js 导入 |
| `infra/from-vendor.js` | `getCssSelector` | @tanstack/router-core@**1.168.9** | 一致 | 283 | **package.json 是 1.171.13**，已安装的 1.171.13/1.171.27 都不一致 |
| `infra/from-vendor.js` | `CatchBoundaryImpl` | @tanstack/react-router@**1.168.10** | 一致 | 841 | **package.json 是 1.170.32**，1.170.32 不一致 |
| `infra/from-vendor.js` | `isCtrlEvent` | @tanstack/react-router@1.168.10 | 一致 | 127 | 短声明，相邻声明命中同包 |
| `infra/from-vendor.js` | `EventEmitter3` | i18next@25.10.10 `EventEmitter` | 一致 | 1142 | vendor.js 的 `ResourceStore`/`Translator`/`Connector`/`I18n` 继承它，说明 vendor.js 里仍有内联的 i18next |
| `team/calendar.jsx` | `getDefaultClassNames` | react-day-picker@9.14.0 `dist/esm/helpers/getDefaultClassNames.js` | 一致 | 452 | 公开导出（`helpers/index.js` → `index.js` `export *`），可改为 `import { getDefaultClassNames } from "react-day-picker"` |
| `workspace/build-inspiration-media-showcase-collections.js` | `rehypeRaw` | rehype-raw@7.0.0 | 一致 | 202 | 短声明，靠 streamdown 闭包上下文确认；rehype-raw 未安装 |
| `settings/request-prompt-prefill.jsx` | `rehypeSanitize` | rehype-sanitize@6.0.0 | 一致 | 158 | 同上 |
| 12 个文件 | 59 个声明 | streamdown@2.5.0 | 一致 | 77,756 | 即任务 2 |
| s2.js、build-inspiration、q.js | 54 个声明 | remend@1.3.0 | 一致 | 24,851 | 即任务 1 |

**假阳性（已人工剔除）**：

- hono（3 条，`canvas/use-persist.js`、`settings/settings-select.jsx` 里的 `XxxError extends Error`）
- effect（1 条，`team/create-invite-link-page.jsx#optionClass`）
- @xyflow/react（2 条，通用 hook 形状）

这 6 条都只是粗哈希相同（字面量不同），属于通用结构。

### 按包汇总（人工复核后）

| 包@版本 | 声明数 | 字节 | 文件 |
|---|---|---|---|
| pdfjs-dist@4.10.38 | 整文件 | 1,375,838 | `pdf.worker.min-yatZIOMy.mjs` |
| streamdown@2.5.0 | 59 | 77,756 | 12 |
| remend@1.3.0 | 54 | 24,851 | 3 |
| @codemirror/view@6.43.6 | 1 | 2295 | `infra/from-vendor.js` |
| mediabunny@1.44.2 | 1 | 1485 | 同上 |
| i18next@25.10.10 | 1 | 1142 | 同上 |
| @tanstack/react-router@1.168.10 | 2 | 968 | 同上 |
| @tanstack/router-core@1.168.9 | 1 | 283 | 同上 |
| react-day-picker@9.14.0 | 1 | 452 | `team/calendar.jsx` |
| rehype-raw@7.0.0 | 1 | 202 | `workspace/build-inspiration-media-showcase-collections.js` |
| rehype-sanitize@6.0.0 | 1 | 158 | `settings/request-prompt-prefill.jsx` |

机器原始结果（未扣除假阳性）：`scan/summary-by-package.json`、`scan/TABLE.md`。

### 未验证 / 推断

- 只能发现**与已安装版本形状一致或仅字面量不同**的声明。被应用改过结构的库代码，或对应包根本没装（例如 marked、unified 只在 `~/ana/sddeps` 里有最新范围版本），可能漏掉。
- 只扫描了函数/类声明。纯数据常量（例如 `twMerge = createTailwindMerge(getDefaultConfig)`）不在范围内。
- `infra/from-vendor.js` 的 6 条推断是从 vendor.js 搬出时误判为第一方的库代码残片。它们的原包在 vendor.js 内的其余部分不在本次范围内（vendor.js 被排除）。
- tanstack 版本不一致（内联来自 1.168.x，package.json 钉的是 1.170.32/1.171.13）：只确认了这几个声明，没有确认 vendor.js 里的 tanstack 主体是哪个版本。

---

## 任务 4：带哈希名的文件

### 清单

给定的 `find` 命中 109 个文件。人工判定：

- **20 个是真哈希**：16 张图、`decode-worker-DBC09hCG.js`、`error-card-fixtures-GXqelGnw.js`、`chat/mermaid-ghxkkrxx.js`，以及 **`pdf.worker.min-yatZIOMy.mjs`（第三方，见任务 3）**。
- 其余 89 个是语义后缀，例如 `read-envelope.js`、`use-settings.js`、`delete-markup-backward.js`、`file-explorer.jsx`。

**`find` 的正则漏掉了 4 张图**，因为它们的构建哈希含 `_` 或 `-`：

- `empty-light-BIA_9y_3.svg`
- `featured-skill-C1bqOHc_.png`
- `sticker-approved-Cvm_nH-W.png`
- `sticker-thumbs-up-DL9-hU6T.png`

用 `-[A-Za-z0-9_-]{8}\.` 复查过，src 下没有其它漏网文件。所以静态图片实际是 **20 张，不是 16 张**。

`hash-files.json` 共 24 条（20 图 + 3 个应用 JS + pdf worker）：

- 新名一般是去掉哈希；`BG-…png` → `update-bg.png`（导出名 `updateBg`）；`mac-…png` → `mac-local-folder-icon.png`（变量名 `macLocalFolderIcon`）；`chat/mermaid-ghxkkrxx.js` → `chat/mermaid-module.js`。
- 已验证：没有和现有文件重名（含大小写不敏感），映射内也没有重复。

### 用改名工具实测（已验证）

在 `~/ana/rncheck`（src+scripts 的 git 副本，不是工作分支）上实际执行：

```bash
node scripts/desource/rename/rename-files.mjs <hash-files.json> --root <副本>
```

结果：改名 24 个文件，改写引用 25 处，涉及 12 个文件。报告见 `hash-files-dryrun-report.json`。

改完后旧哈希只剩两处：`chat/mermaid-module.js` 头注释，以及导出名 `mermaidGHXKKRXX`。这两处都不是路径，可以另外改名。

### 运行时依赖（已验证部分）

- 所有引用都是**字面量**：静态 `import`（`error-card-fixtures`、`mermaid-ghxkkrxx`），或 `"" + new URL("../xxx", import.meta.url).href`（图片、`decode-worker` 用于 `new Worker`、`pdf.worker` 用于 workerSrc）。
- git grep 所有哈希片段：除这些引用和 `docs/handoff-renderer-desource.md:280` 外没有其它出现。**没有拼接出来的文件名**。
- `rename-files` 能识别 `new URL(字面量, import.meta.url)`，实测已全部改写。

### 运行时依赖（推断，未验证）

- `vite.config.ts` 设置了 `base: "./"`、`assetsInlineLimit: 0`，资源以 `[name]-[hash]` 输出，所以改源文件名会改变构建产物的 URL（例如 `assets/BG-DBIf81Iw-<h>.png` → `assets/update-bg-<h>.png`）。
- `scripts/ui-compare/compare.mjs:140-160` 的网络快照记录所有 GET 请求的 `pathname+search`，并且只有 `/api/v1/home/showcase-assets/` 列为 volatile。因此**推断 golden 的网络快照会出现这些资源路径差异**，改名后需要重录 golden，或在比较时把资源文件名归一化。
- golden（`.probe/ui-golden`、`~/ov-golden`）不在本机，**未能直接核对 golden 内容**。
- `pdf.worker.min-yatZIOMy.mjs` 建议直接换成 npm 的 `?url` 引入，而不是改名。映射里保留了它，方便不换包时也能统一处理。
