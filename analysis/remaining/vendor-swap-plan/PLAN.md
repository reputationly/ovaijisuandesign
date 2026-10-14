# vendor.js 剩余第三方库换包执行计划

本文件只定执行计划。不改 `app/renderer/src/vendor.js`，不改依赖，不跑 `scripts/desource/gen-renderer.mjs`，不改 UI 门禁，不合 `main`。

依据是 `origin/devin/analysis-remaining-artifacts` @ `17686e0` 的：

- `analysis/remaining/vendor-residual/REPORT.md`
- `analysis/remaining/vendor-residual/TABLES.md`
- `analysis/remaining/vendor-residual/decls-final.json`

工具是同一提交里的 `analysis/remaining/tools/`（`xcanon.mjs`、`xmatch.mjs`，以及打分时用过的 `t3-index.mjs`、`vr-match.mjs`、`vr-cjs.mjs`）。没有把分析分支合进来。逐声明删除表在同目录 [`DELETIONS.md`](DELETIONS.md)。

分析对象是本分支基线 `43d2cf7c` 的 `app/renderer/src/vendor.js`（与 `17686e0` 所分析的 `b0e2f291` 相比，抽查过的行号一致：jszip 在 15038，lucide 的 `Plus$1` 在 10488，shiki 目录在 29661）。

## 1. 版本怎么定

每个包的版本来自 decls-final 的逐声明形状打分，再对未闭合的差异读了 npm 包源码。不采用 `scripts/decompile/npm-packages.json` 当结论。那份清单的问题和这次打分的差别：

| 清单里的写法 | 逐声明打分 |
|---|---|
| 只有 `lucide-react@1.42.0` | 内联图标本体是 `0.468.0`（266 个声明） |
| 没有 jszip、qr.js、shiki、wavesurfer.js | 分别是 3.10.1、0.0.0、3.23.0、7.12.2–7.12.7 |
| `html-void-elements@3.0.0` | 内联的是另一个包 `void-elements@3.1.0` |
| `inline-style-parser@0.2.4`、`style-to-object@1.0.11` | 这两条和打分一致；已装的 0.2.7 / 1.0.14 不能照单全收 |

打分规则（REPORT 的方法，这里复述执行时要守的标准）：

1. 每个顶层声明做 α 归一化后算形状哈希，对上 pnpm 里已装的包和补装的候选版本。短于 150 字符、或同一形状撞上 5 个以上包时，要求相邻声明是同一个包。
2. Rollup 的 `requireX` 包装不按顶层声明比，去掉守卫后做词元相似度（标识符都记成 `I`）。
3. 没有形状命中、但同名且夹在同一个包的已匹配声明之间的，标 `mismatch-inferred`。这种归属没有逐声明证明，执行时用 `xcanon.mjs` 再对一次，对上了才删。
4. 一个版本要「全部已匹配声明都一致」才当精确版本。只是多数声明一致的版本不能拿来换。

## 2. 三批

不含 xyflow，也不含 `@dagrejs/graphlib`。

### 第一批：① 加 ①′（14 个包）

已装且版本一致。① 的声明可以直接换成 npm。①′ 有声明对不上，分类见第 4 节，这一批里没有要新写的 pnpm patch。

| 包 | 精确版本 | 声明 | 字节 | 状态 |
|---|---|---:|---:|---|
| travels | 2.2.0 | 12 | 3,886 | ① 形状一致 |
| class-variance-authority | 0.7.1 | 2 | 2,056 | ① 形状一致 |
| react-i18next | 15.7.4 | 2 | 889 | ①；其中 `voidElementsExports` 是误配，见该包 |
| extend | 3.0.2 | 3 | 3,034 | ① CJS 词元 99.68% |
| style-to-js | 1.1.21 | 6 | 2,060 | ① CJS 96.60% / 99.63% |
| void-elements | 3.1.0 | 3 | 449 | ① CJS 98.36% |
| i18next | 25.10.10 | 55 | 81,524 | ①′ 54 一致，1 个对不上 |
| react-day-picker | 9.14.0 | 126 | 72,689 | ①′ 115 一致，11 个推断 |
| sonner | 2.0.7 | 35 | 40,828 | ①′ 34 一致，1 个对不上 |
| mediabunny | 1.44.2 | 66 | 14,325 | ①′ 65 一致，1 个对不上 |
| @tanstack/store | 0.9.3 | 17 | 11,428 | ①′ 16 一致，1 个对不上 |
| @date-fns/tz | 1.5.0 | 12 | 7,700 | ①′ 10 一致，2 个推断 |
| @dnd-kit/sortable | 10.0.0 | 11 | 7,185 | ①′ 10 一致，1 个推断 |
| vfile | 6.0.3 | 9 | 6,508 | ①′ 8 一致，1 个推断 |

① 的 6 个包合计 28 个声明、12,374 字节；①′ 的 8 个包合计 331 个声明、242,187 字节。和交接文档 6.3 的汇总一致。

### 第二批

| 包 | 要装的精确版本 | 说明 |
|---|---|---|
| jszip | **3.10.1** | 已装 3.10.2。用根 `pnpm.overrides` 钉成 3.10.1，全仓库一个实例 |
| lucide-react | **0.468.0**（alias）同时保留 **1.42.0** | 外形不同，两套共存。见第 5 节 |
| wavesurfer.js | **7.12.7** | 已装的 7.12.12 对不上。7.12.7 是「全部已匹配声明都一致」的最新一版 |
| @tiptap/extension-table | **3.31.3** | 未装。7 个已匹配声明只在 3.31.3 全部一致（3.27.3 只有 2 个） |

### 第三批

| 包 | 精确版本 | 说明 |
|---|---|---|
| shiki | 3.23.0 | 未装。目录和已装的 `@shikijs/langs`、`@shikijs/themes` 3.23.0 对齐。见第 6 节 |
| qr.js | 0.0.0 | 未装。react-qr-code 的依赖，一起换 |
| @speed-highlight/core | 1.2.22 | 未装。112 个已匹配声明只在 1.2.22 全部一致（1.2.23 剩 106） |
| react-qr-code | 2.0.21 | 未装。2.0.19–2.0.21 的 CJS 相似度 98–99%；2.1.0 起降到 67%。取这个范围内最新的 2.0.21 |
| react-markdown | 10.1.0 | 未装。8 个已匹配声明在 10.0.0、10.0.1、10.1.0 都一致。取最新的 10.1.0 |
| inline-style-parser | 0.2.4 | 已装 0.2.7。钉 0.2.4 |
| prop-types | 15.8.1 | 未装。react-qr-code 会把它带进来 |
| style-to-object | 1.0.11（执行时用已装的 1.0.14） | 两版 `cjs/index.js` 字节相同，不降级、不补丁 |
| streamdown 残余 | 不改已装的 2.5.0 | 残余是 1.6 高亮插件，不是第二份 streamdown。跟 shiki 一起处理 |

## 3. 不进执行批次

- **xyflow**（`@xyflow/react`、`@xyflow/system`、zustand、classcat，行 960–7771，223 个声明，211,437 字节）走交接文档 6.4 的方案 2，做成仓库里的 fork。本计划不删、不换、不打补丁。
- **`@dagrejs/graphlib@4.0.1`**（40 个声明，18,691 字节，行 20367–20972）并入 canvas 内联 dagre 换包。版本依据：源码常量 `pn = "4.0.1"`；37 个已匹配声明在 4.0.1 全部一致，4.0.3 只剩 35，4.0.5 只剩 23。调用方是 `canvas/dagre-layout.js`、`canvas/grid-slot-layout.js`、`canvas/it.js`、`canvas/layout-category-lanes.js`、`canvas/we.js`（导入 `p$4`、`R$4`）。删除表仍列在 `DELETIONS.md` 文末，避免 dagre 那批漏删。

## 4. 对不上的声明分三类

只给后两类写 pnpm patch：上游版本差异、应用改过的行为。构建期等价改写不打补丁。补丁必须是 dist 原格式的最小 hunk。

**这一版计划没有必须新写的 pnpm patch。** 已有的 `patches/mediabunny@1.44.2.patch` 保持不动，不在这一批里加 hunk。

| 声明 | 包 | 分类 | 处理 |
|---|---|---|---|
| `getSupportNoticeShown`（行 23285，365 字节） | i18next@25.10.10 | 构建期等价 | 上游是 `process.env.NODE_ENV === "production"`。内联被折成常量 `true`，生产构建下通知同样不出现。不补丁 |
| `setMonth`、`setYear`（行 24329、24340） | 位置归到 react-day-picker，函数体是 date-fns | 构建期打进来的依赖 | `toDate(date, options?.in)` 是 date-fns 的签名，不是 day-picker 的导出。应用日历已经 `import { DayPicker } from "react-day-picker"`。不给 day-picker 打补丁 |
| `components`、`defaultFormatters`、`defaultLabels`、`getLabels`、`useAnimation`、`useFocus`、`toZoneNoon`、`convertMatcher`、`convertMatchersToTimeZone` | react-day-picker@9.14.0 | 推断归属，无应用引用 | 这 11 个都是 `mismatch-inferred`。vendor 导出的 24 个 day-picker 名字，应用文件一个都没 import。整段删除。执行时若引用扫描发现区块外还在用，再用 xcanon 对 9.14.0，只有上游差异或应用改动才补丁 |
| `__insertCSS`（行 11848，365 字节） | sonner@2.0.7 | 构建期等价 | Vite 把 CSS 注入收成运行时插 `<style>`。调用方 `media-editing/use-lightbox-media-actions-effects.js` 把整段样式传进去。换成 `import "sonner/dist/styles.css"`。不补丁 |
| `setInt64`（行 13200，187 字节） | mediabunny@1.44.2 | 构建期等价 | 上游两个端序分支都在。内联只留 little-endian。已装包的 bundle 里唯一调用是 `setInt64(..., true)`。不新增补丁 |
| `createAtom`（行 21386，2700 字节） | @tanstack/store@0.9.3 | 构建期等价 | 上游 `options?.compare ?? Object.is`，内联写成 `Object.is`。两处调用都是 `createAtom(valueOrFn)`，不传 options。不补丁 |
| `TZDateMini`、`adjustToSystemTZ` | @date-fns/tz@1.5.0 | 推断归属，无应用引用 | 公开类型在 `./date/mini`。vendor 导出的 tz 符号没有应用文件 import。整段删除。不补丁 |
| `sortableKeyboardCoordinates`（行 18437，2871 字节） | @dnd-kit/sortable@10.0.0 | 推断归属 | 应用已经从包的公开入口导入同名函数（`canvas/canvas-tag-manager-panel.jsx`、`skills/operations/published-panel.jsx`）。vendor 这份导出没有被 import。删除内联副本。不补丁 |
| `normalizeString`（行 19310，1936 字节） | vfile@6.0.3 | 推断归属 | 是 vfile 自带的 `lib/minpath.browser.js`，不是应用函数。`vendor.js` 已经 `import { VFile } from "vfile"`。没有应用文件 import 这份内联函数。不补丁 |
| `Plus$1`（行 10488，295 字节） | lucide-react | **应用改过的行为** | 几何是加长的十字加四个端点圆，key 为 `ov-plus-*`。0.468.0 和 1.42.0 的 Plus 都是 `M5 12h14` / `M12 5v14`。**不要打进 lucide 补丁**：0.468.0 和桌面端是同一份包，打进去会改掉桌面端的 Plus。把 `Plus$1` 留在应用图标文件里 |
| `createCell`、`createTable` | @tiptap/extension-table@3.31.3 | 构建期等价 | 3.31.3 的 `createCell` 同样忽略 `cellContent`，直接 `createAndFill()`。内联 `createTable` 不再把 `cellContent` 传下去，可观察结果相同。不补丁 |
| `createFile`、`post` | react-markdown@10.1.0 | 构建期等价 | 10.1.0 的 `createFile` 对非字符串 children 调用 `unreachable`。内联删掉了这个开发期断言，字符串路径相同。不补丁 |
| jszip 整段 | jszip | 不采用 3.10.2 的上游差异 | 见第 7 节。钉 3.10.1，所以不把 3.10.2 打回 3.10.1 |
| `E$4`、`y$4`、`c$2`、`S$3`、`C$4` 以及 `i$1`、`r$4`、`o$3` | wavesurfer.js | 执行第二批时再定 | 已匹配的 16 个小声明在 7.12.2–7.12.7 都一致，7.12.12 对不上 `r$4`、`o$3`。四个大类没有形状命中。换之前用 xcanon 对 `wavesurfer.js@7.12.7` 的 `dist/wavesurfer.esm.js`。只有对出上游差异或应用改动才写补丁 |
| speed-highlight 的 7 个 `mismatch-inferred` | @speed-highlight/core@1.2.22 | 执行第三批时再定 | 112 个已匹配声明只在 1.2.22 全部一致。7 个推断声明先随包删除；xcanon 若证明是应用改动再补丁 |

CJS 包装（extend、style-to-js、void-elements、jszip、qr.js、react-qr-code、prop-types、inline-style-parser、style-to-object）的词元缺口是 Rollup 的 `hasRequiredX` 守卫和 `__importDefault`，归构建期等价。守卫删掉，改成从包入口 import。

## 5. lucide-react：必须两套共存

结论：**图标外形不同，两套必须共存，用 npm alias。不能用已装的 1.42.0 替换内联的 0.468.0。**

证据：

- decls-final 把 488 个声明分成不相交的两段：行 7941–11456 的 266 个声明只命中 `lucide-react@0.468.0`（80,317 字节）；行 11474–11695 的 222 个声明只命中 `1.42.0`（12,953 字节）。
- 266 个里面，262 个是 `createLucideIcon(名字, 节点)`。去掉 SVG 的 `key` 之后，和已装的 `lucide-react@0.468.0` 的 `dist/esm/icons/*.js` 比较：至少 81 个图标的节点几何与 0.468.0 相同、与 1.42.0 不同。这 81 个是：BadgeCheck、Ban、Blocks、BookOpen、Bookmark、Brain、Brush、Bug、Cable、CalendarDays、Camera、CaseSensitive、ChartNoAxesCombined、CircleCheck、CircleUserRound、Clapperboard、ClipboardPaste、Clock、CloudOff、Code、Cog、Compass、CornerDownRight、Download、Expand、FileArchive、FileClock、FileCode、FileDiff、FileImage、FileInput、FileText、Files、Flag、FolderClock、FolderKey、Gift、HardDrive、House、ListChecks、List、LogOut、Mail、Megaphone、MessageCircleMore、MessageCircle、MessageSquareMore、MessageSquarePlus、MessageSquareQuote、MessageSquare、Mic、Moon、Newspaper、PackageSearch、Palette、Paperclip、PenLine、PencilLine、Phone、Plug、ReceiptText、ReplaceAll、Replace、Search、Settings、ShoppingBag、SlidersHorizontal、Sparkles、Sprout、Stamp、StickyNote、ThumbsDown、ThumbsUp、TrendingUp、Tv、Type、Upload、Users、VolumeX、Wrench、Zap。
- `Chrome` 在 0.468.0 有 `icons/chrome.js`，1.42.0 的 `dist/esm/icons` 里没有 `chrome.mjs`。
- `Plus$1` 和两个版本都不同，见第 4 节，本地保留。
- 1.42.0 的 `Icon` 走 `useLucideContext` 和另一套属性组装；0.468.0 的 `Icon` 直接铺 `defaultAttributes`，类名带 `lucide` 和 `lucide-${kebab}`。即便路径相同，组件外壳也不一样。内联的 `Icon$1`、`createLucideIcon` 形状对的是 0.468.0。

222 条「1.42.0 别名」是误配。它们的源码是 `const ActivityIcon = withIconCompositing(Activity)` 这种应用包装，约 59 字节。1.42.0 每个图标文件都有同形的短调用 `const Activity = createLucideIcon(__iconData)`，短声明再被相邻的 lucide 区块投票归过去。`withIconCompositing` 本身在行 620，decls-final 标成应用图标，不属 lucide。这 222 个声明**不删**，继续包住从 0.468.0 导入的组件。

两套怎么放：

- 桌面端 `app/desktop/package.json` 已经是 `lucide-react@0.468.0`，源码直接 `from "lucide-react"`。
- renderer 的 `package.json` 现在是 `lucide-react@1.42.0`，但 `app/renderer/src` 里没有 `from "lucide-react"`，图标都从 `vendor.js` 来。
- renderer 增加 alias，不要把依赖从 1.42.0 改成 0.468.0（那样桌面端和 renderer 会抢同一个包名，1.42.0 就没了）：

```json
{
  "lucide-react": "1.42.0",
  "lucide-react-0468": "npm:lucide-react@0.468.0"
}
```

- 内联图标改成 `import { Activity, createLucideIcon, Icon } from "lucide-react-0468"`。`createLucideIcon` 和 `Icon` 在 0.468.0 的 barrel 末尾是公开导出（`dist/esm/lucide-react.js`），不需要深路径。
- 1.42.0 继续叫 `lucide-react`，留给已经声明它的 renderer 依赖位。当前 renderer 源码不用它；保留是为了和 0.468.0 共存，避免换包时把桌面端的 0.468.0 和 renderer 的包名捏成一个版本。
- alias 和桌面端的 `lucide-react@0.468.0` 是同一个版本，pnpm 会把 0.468.0 收成一个物理实例。1.42.0 是第二个实例。换完后 `pnpm why lucide-react` 应正好是这两个版本。
- 门禁像素会看图标外形。第二批必须跑两轮门禁。本计划不跑。

要删的是行 7941–11456 里除 `Plus$1` 以外的声明（265 个，约 80,022 字节）。`Plus$1` 和 222 个包装留下。

应用调用方：340 个 lucide 导出名被 import。主要文件是 `media-editing/package.jsx`（再导出给画布）和 `debug-panel/debug-panel-dialog.jsx`、`debug-panel/icon-opacity-preview-section.jsx`。逐符号见换包时对 `DELETIONS.md` 的名字做 import 扫描；包装名（`ActivityIcon` 等）继续从应用模块导出，不改成 1.42.0 的 `ActivityIcon`。

## 6. shiki 残余：是另一个包，不是没删干净的副本

结论：**是未安装的 `shiki@3.23.0` 包本身，加上仍在使用的一段 streamdown 1.6 高亮插件。不是 `@shikijs/langs` 或 `@shikijs/themes` 没删干净。**

证据：

- 行 29661–31013：`bundledLanguagesInfo`（23,832 字节）、`bundledLanguagesBase`、`bundledLanguagesAlias`、`bundledLanguages`、`bundledThemesInfo`（9,204 字节）、`bundledThemes`、`createHighlighter`。
- 语言 id 235 个、主题 id 65 个，与 `shiki@3.23.0` 的 `dist/langs.mjs`、`dist/themes.mjs` 顺序和内容一致。动态 import 目标是 `@shikijs/langs/<id>`、`@shikijs/themes/<id>`，文法不在 vendor.js 里。
- 这两份 `@shikijs/*@3.23.0` 已经装上，并且 `vendor.js` 顶部已经从 `@shikijs/core` 导入 `createBundledHighlighter`，从 `@shikijs/engine-oniguruma`、`@shikijs/engine-javascript` 导入引擎。缺的是伞包 `shiki` 的目录和 `createHighlighter`。
- `createHighlighter` 是一行 `createBundledHighlighter({ langs, themes, engine })`。`shiki` 的公开入口 `"."` 导出它。不需要深路径。目录也可以从公开入口 `shiki/langs`、`shiki/themes` 拿；内联用的就是这两份导出。
- 装 `shiki@3.23.0` 时，它自己的依赖写的是 `@shikijs/engine-oniguruma@3.23.0` 和 `@shikijs/engine-javascript@3.23.0`。仓库里已经是 4.4.3 和 4.0.2。用根 overrides 继续钉住这两个已装版本，避免再引出一份 3.23.0 引擎。内联代码本来就把引擎从已装的 4.x 导入。

插件不是 streamdown@2.5.0 的残留副本：

- 行 31015–31099 的 `S$1`、`C$1`、`r`、`B$1`、`c$1`、`p$1`、`s$1`、`o`、`v$1`、`x$1`、`P2`、`$$2`、`G$1` 是一个 `type: "code-highlighter"` 的插件。`P2` 的形状只命中 streamdown 1.6.0–1.6.7，不命中已装的 2.5.0。
- `generation/markdown-link.jsx` 把 `G$1` 放进 Markdown 的 `code` 插件。这段是活的。
- 聊天里的 streamdown 组件已经换成 2.5.0。不要把 streamdown 降回 1.6，也不要给 2.5.0 打补丁去模拟 1.6 的缓存键。
- 换法：装上 `shiki@3.23.0` 后，把 `$$2` 挪到应用模块（例如 `chat/` 或 `generation/` 下的命名文件），缓存逻辑留在应用侧，高亮调用改成 `shiki` 的公开 `createHighlighter`。`vendor.js` 里上述声明全部删掉。`c$1`/`p$1`/`s$1` 虽然形状也命中 2.5.0，它们只是 `new Map()`，跟着插件走，不单独当成 2.5.0 的残留。

## 7. jszip 3.10.1 和 3.10.2

结论：**内联是 3.10.1。换包钉 3.10.1，不用 3.10.2，不写补丁。导出 zip 的 UI 门禁没覆盖这条路径，第二批必须另写脚本比较 zip 条目。**

版本依据：

- 三个声明都在行 15038–18286：`jszip_min`（29 字节）、`hasRequiredJszip_min`（20 字节）、`requireJszip_min`（169,983 字节）。
- 去掉 CJS 守卫后，与 `jszip@3.10.1` 的 `dist/jszip.min.js` 词元相似度 99.33%。源码里的版本串是 `"3.10.1"`（`vendor.js` 行 15411，`n2.version = "3.10.1"`）。
- `scripts/decompile/npm-packages.json` 没有 jszip。

3.10.2 相对 3.10.1，`lib/` 里只有两个文件有行为差异（`support.js` 等其余文件相同）：

1. `lib/index.js`：`JSZip.version` 从 `"3.10.1"` 改成 `"3.10.2"`。
2. `lib/utils.js` 的 `getTypeOf`：`instanceof Uint8Array` / `instanceof ArrayBuffer` 改成 `Object.prototype.toString`。同一 realm 里结果相同；跨 realm 的类型化数组在 3.10.1 可能认错类型，3.10.2 认成二进制。这会改变写进 zip 的字节。
3. `lib/utils.js` 读 Blob：3.10.2 优先 `Blob.prototype.arrayBuffer()`，否则才用 `FileReader`。解出来的字节应相同，读取路径不同。类型定义里补了 `JSZip.defaults`，不影响运行时条目。

调用方：

- **renderer 直接调用内联副本的只有一处**：`media-editing/pdf-viewer.jsx` 导入 `requireJszip_min`，`JSZip.loadAsync` 读 zip，并用私有字段 `file._data.uncompressedSize` 显示大小（约行 1302–1311）。这是查看，不是打包。
- **已装的 3.10.2** 被 lockfile 里的 `docx-preview@0.3.7` 和 `mammoth` 依赖。renderer 源码直接 `import { renderAsync } from "docx-preview"` 的也是 `pdf-viewer.jsx`。所以这个文件今天同时碰两份 jszip。
- 桌面端项目归档（`app/desktop/src/main/project/archive-bundler.ts`）用的是 archiver 打包、yauzl 解包，**不走这份内联 jszip**。交接要求的「导出 zip」额外比较仍然要做：门禁不覆盖任何 zip 字节，docx 预览和 zip 查看都靠 jszip 读写条目。

换法：

- renderer 增加精确依赖 `jszip@3.10.1`。
- 根 `pnpm.overrides` 把 `jszip` 钉成 `3.10.1`。换完 `pnpm why jszip` 只能有一个版本、一个路径。
- `pdf-viewer.jsx` 改为 `import JSZip from "jszip"`。公开入口是包的 `main`（`./lib/index`，浏览器字段指向 `./dist/jszip.min.js`）。不需要深路径。不要再调用 `requireJszip_min`。
- 删除 vendor.js 行 15038 起的三个声明（170,032 字节）。

额外比较（第二批必做，不能用 UI 门禁代替）：

写一个不进门禁的脚本，对同一组输入分别用换包前的内联 `requireJszip_min` 和换包后的 `jszip@3.10.1` 调用 `generateAsync({ type: "uint8array" })`，再 `loadAsync` 读回来。输入至少包括：字符串条目、Uint8Array 条目、Blob 条目、空目录、带 `/` 的路径。比较：

- 条目名列表（含目录标记）
- 每个条目的未压缩内容
- 压缩方法
- `loadAsync` 之后 `file._data.uncompressedSize` 是否仍等于未压缩长度（ZipViewer 依赖这个私有字段）

3.10.1 对 3.10.1 必须一致。脚本里可以附带一组 3.10.2 的结果作记录：同一 realm 的条目内容预期相同，跨 realm 的 Uint8Array 允许不同。不把 3.10.2 装回去。

## 8. 逐包：导出、调用方、公开还是深路径

删除的每个声明（名字、行、字节、命中的版本）在 [`DELETIONS.md`](DELETIONS.md)。这里只写应用真正 import 的符号，以及该符号在 npm 上从哪进。

### 第一批

**travels@2.2.0。** 12 个声明行 18543–18630，全部 `installed-exact`，只命中 2.2.0。公开入口 `travels` 的默认导出。vendor 里 10 个名字被 export，应用文件没有 import 它们。`vendor-inline/minified/ct.js` 是指向 travels 的转发，换包时改成直接 `import` 后删掉那个转发（交接 6.1 第 3 条，可以跟这一批做）。内部符号不需要深路径。

**class-variance-authority@0.7.1。** `falsyToString`（行 11805，92 字节）、`cva`（行 11807，1,964 字节），都只命中 0.7.1。`cva` 是公开入口 `"."` 的具名导出。调用方：`canvas/node-shell-inner.jsx`、`debug-panel/icon-opacity-preview-section.jsx`、`infra/badge-variants.jsx`、`infra/dialog-content.jsx`、`infra/use-online.jsx`、`team/alert-variants.jsx`。`falsyToString` 没有应用 import，随包删除。renderer 的 package.json 目前没把它列为直接依赖，lockfile 里已有 0.7.1；换包时写成精确直接依赖。

**react-i18next@15.7.4。** 真正要删的是 `Trans`（行 7772，846 字节），只命中 15.7.4。公开入口 `"."` 的具名导出 `Trans`。调用方：`chat/chat-compliance-notice.jsx`、`settings/server-driven-popup-orchestrator.jsx`、`team/credit-details-dialog.jsx`、`team/team-management-dialog.jsx`、`text-editor/use-text-version-panel.jsx`、`workspace/move-workspace-dialog.jsx`。`vendor.js` 顶部已经从 `react-i18next` 导入了另一份 `Trans`（`Trans$1`），换完后调用方改用那份，避免两份 Trans。`voidElementsExports` 不是这个包的符号。

**extend@3.0.2。** `extend$1`、`hasRequiredExtend`、`requireExtend`（行 19067–19069）。CJS 包装，词元 99.68%。公开入口是包根的 `module.exports`。没有应用文件 import。谁在 vendor 内部用 `requireExtend()`，改成 `import extend from "extend"`。不需要深路径。

**style-to-js@1.1.21。** 行 18843–18886 的 `utilities` / `requireUtilities` / `cjs` / `requireCjs`。分别对应 `cjs/utilities.js`（99.63%）和 `cjs/index.js`（96.60%）。公开入口是包根。没有应用文件 import。`requireCjs` 内部用了 style-to-object，两个包同一批不用一起换也行，但 style-to-object 在第三批；第一批只删 style-to-js 时，保留它对 style-to-object 内联副本的调用，第三批再改成 npm。不需要深路径。

**void-elements@3.1.0。** 行 7747–7768 的三个 CJS 声明，词元 98.36%，加上误配的 `voidElementsExports`（行 7770）和紧接着的 `e$1 = getDefaultExportFromCjs(voidElementsExports)`（若它不在 decls-final 的包里，执行时一并删掉或改成 import）。公开入口是包根，默认导出一张标签表。没有应用文件 import 这些名字。不需要深路径。不要和已经装上的 `html-void-elements@3.0.0` 混成一个包。

**i18next@25.10.10。** 54 个声明行 21621–23810 形状只命中 25.10.10。应用 import 的是导出的 `instance`：`assets/credit-query-keys.jsx`、`chat/mention-ref-chip.js`、`generation/settle-operation.js`、`generation/use-mention-models.jsx`、`i18n/chinese-translations.js`、`infra/agent-http-client.js` 等。这是包的默认导出，公开入口 `i18next`。其余 53 个是内部实现，不深路径导出。`getSupportNoticeShown` 见第 4 节。

**react-day-picker@9.14.0。** 115 个声明形状在 9.13.1、9.13.2、9.14.0 上分别是 114、114、115，10.x 降到 103–104。精确版本是 9.14.0，也是已装版本。`DayPicker` 等 24 个名字虽然从 vendor export，应用没有 import。活的日历是 `team/calendar.jsx`：`import { DayPicker, getDefaultClassNames } from "react-day-picker"`，公开入口。换包就是删掉行 24329–26554 这一段内联副本，确认没有新的引用。不深路径。11 个推断声明见第 4 节。

**sonner@2.0.7。** 34 个声明只在 2.0.7 达到全部一致（2.0.6 是 32，2.0.8 是 25）。应用 import：`toast`（`infra/agent-http-client.js`、`media-editing/use-warn-missing-asset-meta.jsx`）、`Toaster$1`（`settings/attach-native-toast-surface.jsx`）、`__insertCSS`（见第 4 节）。`toast` 和 `Toaster` 都是公开入口的具名导出。`Toaster$1` 改名为从 `sonner` 导入的 `Toaster`。

**mediabunny@1.44.2。** 65 个声明形状命中已装的、打过补丁的 1.44.2。应用从这 66 个里只 import `src_default$1`（`chat/message-input-base.jsx`、`chat/rich-prompt-input.jsx`、`text-editor/markdown-fullscreen.jsx`）。`vendor.js` 行 31223 已经从 `"mediabunny"` 再导出一批公开符号。`src_default$1` 改成那些公开导出里对应的符号（执行时对一下它的函数体再定名字），不要深路径。`setInt64` 见第 4 节。不要再打一份新补丁。

**@tanstack/store@0.9.3。** 16 个声明只命中 0.9.3，行 21091–21553。`createStore`、`Store` 一类是公开入口。vendor 导出的 store 名字没有应用文件直接 import。`createAtom` 见第 4 节，调用只在这段内部。公开入口 `"."` 够用；`createAtom` 若执行时发现仍被区块外引用，它在 `@tanstack/store` 的公开导出里，仍然不是深路径。

**@date-fns/tz@1.5.0。** 10 个声明只命中 1.5.0。`TZDate` 在公开子路径 `./date`（根入口也再导出）。`TZDateMini` 在公开子路径 `./date/mini`。当前没有应用文件 import vendor 里的这些名字，内联副本服务于同一文件里的 day-picker。day-picker 换走之后这一段应没有外部引用。若还有，从 `./date` 或 `./date/mini` 导入，这是包的公开 exports，不是临时深路径。

**@dnd-kit/sortable@10.0.0。** 10 个声明只命中 10.0.0。公开入口已经导出 `sortableKeyboardCoordinates`、`verticalListSortingStrategy`、`horizontalListSortingStrategy`、`useSortable`、`SortableContext`、`arrayMove`。应用里的 `canvas/sortable-tag-row.jsx`、`canvas/canvas-tag-manager-panel.jsx`、`chat/sortable-queued-row.jsx`、`media-editing/customize-toolbar-dialog.jsx`、`skills/operations/category-weight-editor.jsx`、`skills/operations/published-panel.jsx` 已经从包入口导入。vendor 这份 11 个声明的导出名没有被 import。删除即可。

**vfile@6.0.3。** 8 个声明只命中 6.0.3，加上推断的 `normalizeString`。公开导出是 `VFile`，`vendor.js` 第 44 行已经在用。内联的 `basename`、`dirname`、`join` 等是旧的路径垫片，没有应用 import。不深路径。

### 第二批

**jszip@3.10.1。** 见第 7 节。公开入口，调用方 `media-editing/pdf-viewer.jsx`。

**lucide-react@0.468.0。** 见第 5 节。公开 barrel，alias `lucide-react-0468`。

**wavesurfer.js@7.12.7。** 已匹配声明的版本分布：7.12.2–7.12.7 各 19 个，7.12.8–7.12.10 各 17 个，7.12.11 和已装的 7.12.12 各 16 个，8.x 各 9 个。`r$4`、`o$3` 从 7.12.8 起对不上，`i$1` 从 7.12.11 起对不上。精确版本取 7.12.7。renderer 的 package.json 没有直接依赖，lockfile 里是间接的 7.12.12；换包时写成直接依赖并 override 掉 7.12.12，保证一个实例。

公开入口 `"."` 的默认导出就是 `WaveSurfer`（`dist/wavesurfer.esm.js`）。调用方：`assets/asset-panel-overlay-host.jsx` 导入 `E$4 as WaveSurfer`，调用 `WaveSurfer.create(...)`。插件若用到，走公开子路径 `./plugins/*`，先看 `E$4` 的 import 列表再定，不要把 `dist/` 底下没进 exports 的文件当深路径。`E$4` 在 decls-final 里没归包，必须和 `y$4`（渲染器，行 28281，25,413 字节）、`c$2`、`S$3`、`C$4` 一起删。四个大类是否要补丁见第 4 节。

**@tiptap/extension-table@3.31.3。** 7 个已匹配声明只命中 3.31.3 的有：`TableCell$1`（行 19655，799）、`TableHeader$1`（行 19695，810）、`deleteTableWhenAllCellsSelected`（行 19777，636）、`keepCursorInTable`（行 19796，533）、`Table$2`（行 19805，9,490）。`TableRow$1` 和 `isCellSelection` 在 3.27.3 和 3.31.3 都命中。应用 import：`text-editor/markdown-fullscreen.jsx` 使用 `Table$2`、`TableCell$1`、`TableHeader$1`、`TableRow$1`。这些都是公开入口，也可以用公开子路径 `./table`、`./cell`、`./header`、`./row`。优先包根的具名导出，和现有 `@tiptap/extension-*` 的引法一致。`createCell`、`createTable` 不导出给应用，见第 4 节。

### 第三批

**shiki@3.23.0 和 streamdown 残余。** 见第 6 节。

**qr.js@0.0.0 和 react-qr-code@2.0.21。** qr.js 九个 CJS 模块（`lib/ErrorCorrectLevel.js` 到 `lib/QRCode.js`）词元相似度 95.24%–99.87%，行 26641–27134，共 27 个声明、28,001 字节。没有应用文件 import。它是 react-qr-code 的依赖（`qr.js@0.0.0`），装 react-qr-code 时带上，不要单独再包一层。

react-qr-code 六个声明行 26569 和 27449–27527，对 2.0.19、2.0.20、2.0.21 的 `lib/index.js` 相似度 98.04%，`lib/QRCodeSvg/index.js` 99.19%。应用 import 的是 `requireLib`：`settings/im-bridge-manager.jsx`。这是 CJS 包装，换成公开默认导出 `import QRCode from "react-qr-code"`。包没有 `exports` 字段，`main` 是 `lib/index.js`。不深路径。prop-types 是它的依赖。

**@speed-highlight/core@1.2.22。** 119 个声明，行 14011–15010，24,198 字节。应用侧全部从 `media-editing/pdf-viewer.jsx` 导入，把 `./languages/bash.js` 这类路径映射到内联的语法模块（约行 197–219）。包的公开 exports 已经有 `"./languages/*.js"`，指向 `dist/languages/*.js`。换包后 loader 改成 `import(\`@speed-highlight/core/languages/${name}.js\`)`，或者保留映射但目标改成这些公开子路径。不要把语法对象从包内部私有路径抠出来。入口 `"."` 是高亮函数；pdf-viewer 要的是语言模块，所以用公开的 `./languages/*.js`，这是 exports 里写明的，不是临时深路径。7 个推断声明见第 4 节。

**react-markdown@10.1.0。** 8 个已匹配声明在 10.0.0、10.0.1、10.1.0 都一致；9.x 更少。应用 import `Markdown$1`：`media-editing/text-node-inner.jsx`、`settings/feature-popup.jsx`、`settings/general-popup.jsx`、`text-editor/use-text-version-preview.jsx`。公开默认导出，`exports` 是 `"./index.js"`。`createFile`、`post` 见第 4 节，不深路径。

**inline-style-parser@0.2.4。** 三个 CJS 声明行 18661–18663，对 0.2.4 词元 93.53%。已装 0.2.7 的 `cjs/index.js` 和 0.2.4 的差别是：0.2.7 删掉了 `errorsList`，`options.silent` 变成空语句。silent 模式下两边都不抛；0.2.4 把错误推进一个从不返回的数组。为对齐内联，override 到 0.2.4，不补丁。公开入口是包根。没有应用文件直接 import，调用在 style-to-js 的内联副本里。第三批和 style-to-js 的剩余调用一起改成 `import parse from "inline-style-parser"`。

**prop-types@15.8.1。** 九个声明行 26570–26633。`requireFactoryWithThrowingShims` 对生产垫片词元 96.73%。`requirePropTypes` 对完整 `index.js` 只有 34.78%，因为 npm 的 `index.js` 含开发分支，内联只留了生产分支（构建期死代码删除）。公开入口 `prop-types` 在生产 `NODE_ENV` 下走 `prop-types.js`。按生产入口导入，不深路径，不补丁。没有应用文件直接 import；react-qr-code 使用它。

**style-to-object@1.0.11 / 已装 1.0.14。** 三个 CJS 声明行 18660、18803–18804，对 1.0.11 词元 98.22%。已装 1.0.14 的 `cjs/index.js` 与 1.0.11 的 `cjs/index.js` 字节相同。执行时保持 1.0.14，不 override，不补丁。公开入口是包根。没有应用文件直接 import。

**streamdown。** 见第 6 节。不改 2.5.0 这个依赖。

## 9. 每批执行时要做的事

本提交不做这些。执行批次时：

1. 只改 `app/renderer/package.json` 和根 `package.json` 的 `pnpm.overrides`。依赖写精确版本。
2. `pnpm install`，把 lockfile 和源码改动一起提交。
3. 按 `DELETIONS.md` 删声明，改 import。`Plus$1`、222 个 `withIconCompositing`、xyflow、graphlib 不在对应批次里删。删完用同一份表对剩余声明，避免漏删或误删同名应用函数。
4. 跑交接文档 3.1 的检查。换包批次的 `gate.sh` 连续两轮。第二批的 jszip 另跑第 7 节的 zip 条目脚本。第三批若动到高亮插件，门禁里的代码页不够，要另看 `markdown-link.jsx` 的高亮结果是否还调用 `createHighlighter`。
5. 做交接文档 3.5 的构建产物审计：每个包 `pnpm why` 一个版本（lucide 例外，必须是 0.468.0 和 1.42.0 两套）；产物里对应的函数只有一份绑定。
6. 不跑 `gen-renderer.mjs`，不改 `scripts/ui-compare`，不合 `main`。

预期 `vendor.js` 大约下降：第一批 25.5 万字节，第二批 jszip 17.0 万 + lucide 本体约 8.0 万（不含 Plus 和 222 个包装）+ wavesurfer 约 5.8 万（含 `E$4`）+ tiptap table 1.3 万，第三批约 10.5 万（shiki 目录 3.4 万、qr.js 2.8 万、speed-highlight 2.4 万，其余较小，另加高亮插件未归包的约 1.6 千字节）。以 `DELETIONS.md` 的字节列为准，对账时把本文件写明「不删」的行减掉。
