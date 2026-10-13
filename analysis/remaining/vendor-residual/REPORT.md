# vendor.js 剩余清单报告（只读分析）

- 分析对象：`devin/1791701596-renderer-desource` @ `b0e2f291617d2da849034fc313e9a04fdec9ca87`，`app/renderer/src/vendor.js`
  - 文件大小 1,059,484 字节（UTF-16 长度 1,058,934；下文字节数均按源码字符偏移计，与字节相差不到 0.1%）。
  - 顶层声明 1639 个，共 1,002,700。
  - 其余是 import 22,376、export 14,224、表达式语句 7,992、其它 490。
- 完整表格：`TABLES.md`。逐声明结果：`decls-final.json`，字段为 `pkg`、`versions`、`status`、`inferred`、`cjs`、`category`。汇总数据：`final-summary.json`。

## 方法

1. **形状哈希匹配**（`tools/t3-index.mjs`、`tools/vr-match.mjs`）
   - 对 vendor.js 每个顶层声明（含 var 常量）做 α 归一化，自由引用全部打码后算形状哈希。比较对象是：
     - pnpm store 里的所有包（含间接依赖）；
     - `~/ana/sddeps`；
     - `~/ana/pkgs` 里为本次补装的 npm 包，共 1044 个包目录、32,057 个文件、205,369 个声明。
   - 声明短于 150 字符，或同一形状撞到 5 个以上的包时，要求相邻声明命中同一个包。
   - 多包都能对上的声明，用 ±12 范围内已定锚声明的包投票决定归属。
   - 新增一条规则：rollup 互操作 `const React = getDefaultExportFromCjs(reactExports)` 视同 `reactExports`。加上之后 react-day-picker、sonner 的 `React.createElement` 写法也能对上。
2. **CJS 包装**（`tools/vr-cjs.mjs`）
   - rollup commonjs 生成的 `function requireX(){ if (hasRequiredX) return X; … }` 无法按顶层声明比较。
   - 改为去掉守卫后，与候选 npm 文件做词元相似度比较：标识符统一记为 `I`，其余词元保留。结果在 `cjs-compare.txt`。
3. **无匹配声明的归属推断**（`tools/vr-near.mjs`、`tools/vr-final.mjs`）
   - npm 中有同名声明，并且 ±40 个声明内有同包的已匹配声明；或者前后 5 个声明内夹在同一个包之间：这两种情况归到该包，标为“推断归属”。
   - 剩下的就是③，再按源码特征做启发式分类。

**补装到 `~/ana/pkgs` 的包**：

- 本身未装：shiki@3.23.0、@speed-highlight/core（1.2.22–2.1.0）、@dagrejs/graphlib（3.0.4–4.0.5）、react-markdown（9.0.0–10.1.0）、qr.js@0.0.0、react-qr-code（2.0.19–2.2.0）、prop-types@15.8.1、@tiptap/extension-table（3.27.3、3.31.3）、jszip@3.10.1、hls.js、seroval 等 decompile 清单中缺的包。
- 已装但要看相邻版本：wavesurfer.js（7.12.2–8.0.2）、sonner（2.0.1–2.0.8）、react-day-picker（9.13.1–10.0.2）、@xyflow/react@12.10.2、@xyflow/system@0.0.76、zustand@4.5.7。

没有改动仓库依赖。

## 结论：按状态合计（不含 xyflow）

| 状态 | 包数 | 声明 | 字节 |
|---|---|---|---|
| ① 已装、版本一致，可直接换（形状全部一致） | 3 | 16 | 6,831 |
| ① 已装、版本一致（CJS 包装，词元相似度 ≥96%） | 3 | 12 | 5,543 |
| ①′ 已装版本一致，但有少量声明对不上 | 8 | 331 | 242,187 |
| ② 对不上任何已装版本（含未安装的包） | 14 | 754 | 444,092 |
| ③ 没有匹配，推断是 app 代码 | — | 303 | 92,610 |
| xyflow 一族（单列） | 4 | 223 | 211,437 |

### ① 可直接换

| 包@版本 | 声明 | 字节 | 判定依据 |
|---|---|---|---|
| travels@2.2.0 | 12 | 3,886 | 形状一致 |
| class-variance-authority@0.7.1 | 2 | 2,056 | 形状一致 |
| react-i18next@15.7.4 | 2 | 889 | 形状一致 |
| extend@3.0.2 | 3 | 3,034 | CJS 包装，99.68% |
| style-to-js@1.1.21 | 6 | 2,060 | CJS 包装，96.6% / 99.6% |
| void-elements@3.1.0 | 3 | 449 | CJS 包装，98.4% |

### ①′ 已装版本一致，另有声明对不上

对不上的声明可能是 app 改动或版本差异，未验证。

| 包@版本 | 一致声明 / 字节 | 对不上的声明 / 字节 | 对不上的声明 |
|---|---|---|---|
| i18next@25.10.10 | 54 / 81,159 | 1 / 365 | `getSupportNoticeShown` |
| react-day-picker@9.14.0 | 115 / 61,752 | 11 / 10,937 | `useAnimation`、`setMonth`、`setYear`、`components`、`defaultFormatters`、`defaultLabels`、`getLabels`、`useFocus` 等 |
| sonner@2.0.7 | 34 / 40,463 | 1 / 365 | `__insertCSS` |
| mediabunny@1.44.2 | 65 / 14,138 | 1 / 187 | `setInt64` |
| @tanstack/store@0.9.3 | 16 / 8,728 | 1 / 2,700 | `createAtom` |
| @date-fns/tz@1.5.0 | 10 / 3,788 | 2 / 3,912 | `TZDateMini`、`adjustToSystemTZ` |
| @dnd-kit/sortable@10.0.0 | 10 / 4,314 | 1 / 2,871 | `sortableKeyboardCoordinates` |
| vfile@6.0.3 | 8 / 4,572 | 1 / 1,936 | `normalizeString` |

### ② 对不上任何已装版本

| 包 | 内联版本（全部已匹配声明都一致的版本） | 已装版本 | 声明 | 字节 |
|---|---|---|---|---|
| jszip | **3.10.1**（源码含版本串，CJS 相似度 99.33%） | 3.10.2 | 3 | 170,032 |
| lucide-react | 两套：0.468.0 一套 266 个声明 80,317 字节（行 7941–11456，含 `createLucideIcon`、`Icon`）；1.42.0 一套 222 个声明 12,953 字节（行 11474–11695，全是 `XxxIcon` 别名） | 0.468.0、1.42.0（package.json 是 1.42.0） | 488 | 93,270 |
| wavesurfer.js | 7.12.2–7.12.7（不含 7.12.12） | 7.12.12（间接依赖，package.json 没有） | 23 | 43,099 |
| shiki | 3.23.0（`bundledLanguagesInfo`/`bundledThemesInfo` 等） | 未装（只装了 @shikijs/langs、themes 3.23.0） | 7 | 33,626 |
| qr.js | 0.0.0（9 个 CJS 模块，相似度 95–99.9%） | 未装 | 27 | 28,001 |
| @speed-highlight/core | 1.2.22 | 未装 | 119 | 24,198 |
| @dagrejs/graphlib | 4.0.1 | 未装 | 40 | 18,691 |
| @tiptap/extension-table | 3.31.3 | 未装 | 9 | 13,465 |
| react-qr-code | 2.0.19–2.0.21（CJS，98–99%；2.1.0 起只有 67%） | 未装 | 6 | 6,337 |
| react-markdown | 10.0.0–10.1.0 | 未装 | 10 | 5,380 |
| inline-style-parser | 0.2.4（CJS，93.5%） | 0.2.7 | 3 | 3,963 |
| prop-types | 15.8.1（CJS，只保留生产分支） | 未装 | 9 | 2,262 |
| style-to-object | 1.0.11（CJS，98.2%） | 1.0.14 | 3 | 1,134 |
| streamdown | 1.6.0–1.6.7 的 shiki 高亮缓存片段（`P2`/`x$1`/`v$1` 等） | 2.5.0 | 7 | 634 |

## xyflow 一族（单列，不分析改动）

- 行 960–7771，223 个声明，共 **211,437 字节**：
  - @xyflow/react 134,557
  - @xyflow/system 70,158
  - zustand 6,319
  - classcat 403
- 其中 94,064 字节是无匹配、按位置或同名归到 xyflow 的，包括 `XYDrag`、`XYPanZoom`、`Pane`、`ReactFlow`、`NodeWrapper`、`createStore$2` 等。17 处 app 改动在这部分里。
- 已匹配部分：
  - @xyflow/react 只与 **12.10.2** 全部一致（已装的是 12.11.6）；
  - @xyflow/system 与已装的 **0.0.76** 一致；
  - zustand 声明分属 4.5.7 和 5.0.8。

## ③ 无匹配部分按功能归类（启发式，字节为估算）

| 类别 | 声明 | 字节 | 例子 / 说明 |
|---|---|---|---|
| 工具函数 / hook | 82 | 35,076 | 连接器市场相关（`buildHcpCatalogEntries`、`findConnectorMentions`、`isDynamicallyDeliverable`）、画布与文件类型工具（`classifyFileType`、`findConnectionTarget`、`orderTidyNodes`）、日志（`makeLogger`、`workspaceLog`） |
| 常量 / 配置 | 62 | 26,090 | `TONES`、`ICON_CLASS_FILTERS`、`SPECIAL_CONNECTORS`、MIME 表（`BODY`/`FOLD`/`ARCHIVE_ZIPPER`/`JPEG`，曾被误配成 unplugin），以及若干图标别名 |
| 图标 | 46 | 17,819 | 行 378–620 另有一套 lucide 风格图标（`createLucideIcon$1`、`Brain$3` 等，同名但形状对不上任何已装 lucide 版本）；`withIconCompositing`、`CompositedSvg`、播放按钮图标 |
| 导入别名 / 再导出 | 91 | 3,715 | 行 178–260 的 `AccordionHeader = …` 等 Base UI 组件别名 |
| 构建器运行时 helper | 6 | 3,264 | `__ovVitePreload`、`_mergeNamespaces`、`commonjsGlobal`、`getDefaultExportFromCjs$1`、`requireReact` |
| React 组件 / hook | 4 | 2,517 | `ClientOnly`、`scriptRel` 等 |
| 路由 | 3 | 1,507 | `createFileRoute`、`FileRoute`、`lazyRouteComponent`（与已装 @tanstack/react-router 1.168.10/1.170.32 同名但对不上，可能是 router 的残片） |
| API 客户端 / 请求 | 3 | 1,063 | `SPECIAL_CONNECTORS`、`FIGMA_DESKTOP_MCP`、`matchesRemoteConnectorServer` |
| i18n 文案 / 资源 | 2 | 792 | `browserImageEditPrompt`、`localizedI18nText`；**vendor.js 里没有成块的 i18n 资源** |
| store / context | 4 | 767 | `usePromptFontSizeStore` 等 |

拆分建议：③ 里真正属于应用、值得拆成命名模块的大约 **60–70 KB**，是连接器/市场、画布工具、常量表、图标这四块。其余是别名和 helper，跟着对应库一起处理即可。

## 未验证 / 推断（单独列出）

- **“推断归属”**（`decls-final.json` 中 `inferred: true`）只靠同名和位置判断，没有逐声明证明来自该包。这部分共约 23.3 万字节，其中 xyflow 94,064、wavesurfer 35,494、react-day-picker 10,937、@dagrejs/graphlib 9,959、@speed-highlight/core 8,569 等。它们对不上，原因可能是 app 改动、版本不同或构建差异，没有区分。
- **CJS 包装的判定是词元相似度**（标识符统一记为 `I`），不是逐声明 AST 等价。jszip、qr.js、react-qr-code 等的版本结论建立在高相似度和版本串上。
- **lucide-react 有两套或三套的结论是推断**。依据是 266 个声明只与 0.468.0 一致、222 个只与 1.42.0 一致，两组没有交集。为什么会内联两份，还没查依赖来源；lockfile 里有 `lucide-react@0.468.0`，没查是谁依赖了它。
- **③ 的功能分类是按名字和源码特征的启发式**，字节数只能作为量级参考。部分图标别名被归进了“常量”。
- wavesurfer 的 4 个大类（`y$4`、`E$4`、`S$3`、`c$2`，约 35KB）可能是插件或另一种构建产物，没有找到对应文件。
- 只比较了已装和已下载的版本。① 里“可直接换”仅指这些声明与已装版本一致，没有构建验证，也没有做 UI 对比。
