# 第二批、第三批 vendor.js 声明锚点

工作副本 `devin/vendor-swap-anchors`，HEAD `4b80e7ae`。只读计划是 `analysis/remaining/vendor-swap-plan/PLAN.md` 和 `DELETIONS.md`。逐声明名单来自 `origin/devin/analysis-remaining-artifacts` @ `17686e0` 的 `analysis/remaining/vendor-residual/decls-final.json`，用 `git show` 读取，没有 checkout 那个分支。

当前 `app/renderer/src/vendor.js`：828241 字节，23763 行。DELETIONS.md 的行号是更早那份文件上的，这里全部作废。下面的行号、结束行和字节数都来自这一份文件。

第一批换包随后合进了工作分支（`f8188c52`），`vendor.js` 变成 568125 字节。本文件里的行号因此又过时了。执行第二批、第三批时按声明名定位，不要用这里的行号删代码。抽查过的名字在合入后的文件里还在：`requireJszip_min`、`bundledLanguagesInfo`、`E$4`、`Plus$1`、`createLucideIcon`、`withIconCompositing`、`Table$2`、`Markdown$1`、`requireLib`。

## 定位方法

用 `@babel/parser` 解析 `vendor.js` 的 `Program.body`。每个顶层 `function`、`class`、`var` / `let` / `const` 绑定记一条。一条语句里有多个声明符时，按声明符切开：第一条从语句关键字算起，后面的从该声明符算起，区间首尾相接，字节数相加等于整句。字节数是该区间源码的 UTF-8 长度，紧跟的分号算在内。

当前文件的顶层声明名没有重名（1380 个有名字的绑定，重名 0）。所以 `t`、`e`、`r`、`o` 这种短名字各自只有一个顶层绑定。

抽查锚点：`requireJszip_min` 起始行 8241，`bundledLanguagesInfo` 起始行 22201。

调用方只扫 `app/` 里除 `vendor.js` 以外的源码。`app/gateway` 有 117 个 TypeScript 文件因装饰器没能解析；这些文件里没有 `vendor.js`，也没有 `lucide-react`。decls-final 的包名单和 DELETIONS.md 的表内名字一致，没有只出现在一边的名字。

## 汇总

| 批次 | 包 | 版本 | 表内找到 | 表内找不到 | 表内字节 | 正文另点名 |
| --- | --- | --- | --- | --- | ---: | --- |
| 第二批 | jszip | 3.10.1 | 3 | 无 | 170042 | 无 |
| 第二批 | lucide-react | 0.468.0 | 488 | 无 | 96684 | 无。另有 23 个同形包装不在表里 |
| 第二批 | wavesurfer.js | 7.12.7 | 23 | 无 | 43145 | `E$4` 14573 字节 |
| 第二批 | @tiptap/extension-table | 3.31.3 | 9 | 无 | 13500 | 无 |
| 第三批 | shiki | 3.23.0 | 7 | 无 | 33683 | 无 |
| 第三批 | qr.js | 0.0.0 | 27 | 无 | 28091 | 无 |
| 第三批 | @speed-highlight/core | 1.2.22 | 119 | 无 | 24788 | 无 |
| 第三批 | react-qr-code | 2.0.21 | 6 | 无 | 6357 | 无 |
| 第三批 | react-markdown | 10.1.0 | 10 | 无 | 5419 | 无 |
| 第三批 | inline-style-parser | 0.2.4 | 3 | 无 | 3973 | 无 |
| 第三批 | prop-types | 15.8.1 | 9 | 无 | 2292 | 无 |
| 第三批 | style-to-object | 保持已装 1.0.14 | 3 | 无 | 1144 | 无 |
| 第三批 | streamdown 高亮插件 | 不改已装 2.5.0 | 7 | 无 | 659 | 6 个，见该节 |

lucide 表内 488 字节合计 96684。其中要换成 0.468.0 的本体 265 个、81875 字节；`Plus$1` 302 字节留下；表内包装 222 个、14507 字节留下。旧删除表的字节是另一份排版，短声明现在多了换行，所以有的字节数比旧表大几十字节。`requireJszip_min` 仍是 169983 字节。

## lucide 三条修正

计划第 5 节写的是 npm alias，让 `lucide-react@1.42.0` 和 `lucide-react@0.468.0` 共存。以这一节为准，换包时改掉那个做法。

### 图标本体是 0.468.0，renderer 直接依赖这一版

当前依赖：

- `app/renderer/package.json` 写的是 `"lucide-react": "1.42.0"`。
- `app/desktop/package.json` 写的是 `"lucide-react": "0.468.0"`。
- 根 `pnpm-lock.yaml` 同时有 `lucide-react@0.468.0` 和 `lucide-react@1.42.0`。

应用文件没有 `from "lucide-react"`。桌面端有 34 个文件写了 `from "lucide-react"`。

`vendor.js` 自己有一处深路径，原先的「renderer 导入数是 0」没把它算进去：

```js
import { mergeClasses } from "lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs";
```

这条路径在 `lucide-react@1.42.0` 里存在，在 `0.468.0` 里不存在。0.468.0 把同名函数放在 `dist/esm/shared/src/utils.js`，而且包没有 `exports` 字段把这条内部路径公开。`mergeClasses` 只被内联的 `Icon` 使用（`className: mergeClasses("lucide", className)` 那两处）。删图标本体时把这行 import 一起删掉，改成从 `lucide-react@0.468.0` 的公开入口拿 `Icon` 和 `createLucideIcon`。不要为了这条深路径把 renderer 留在 1.42.0，也不要改去引用 0.468.0 的内部文件。

renderer 里出现 `lucide-react` 这串字的地方都不是 import：

- `app/renderer/package.json` 的依赖行。
- `app/renderer/src/main.jsx`、`debug-panel/debug-panel-dialog.jsx` 里的许可证注释，写的是 v0.468.0。
- `debug-panel/project-icon-catalog.jsx` 和 `debug-panel/icon-opacity-preview-section.jsx` 的 `source: "lucide-react"` 字段。图标组件本身仍从 `vendor.js` 导入。

所以 1.42.0 没有源码直接引用。换包时 renderer 的直接依赖写成 `lucide-react@0.468.0`，不要用 npm alias 把这份没人用的 1.42.0 留下。桌面端已经是 0.468.0，pnpm 应该只剩这一个实例。

要删的是下面「本体」表里的 265 个声明（81875 字节），含 `toKebabCase`、`defaultAttributes$1`、`Icon$1`、`createLucideIcon` 和 261 个 `createLucideIcon(...)` 图标。`createLucideIcon` 在 1173–1185 行。另有一个 `createLucideIcon$1` 在 379–421 行，不在删除表里，不要把它当成 0.468.0 的 `createLucideIcon` 删掉。

### withIconCompositing 包装留下

`function withIconCompositing` 在 621–691 行，2562 字节。它不在删除表里。

顶层、初始值是 `withIconCompositing(...)` 的声明：

| 位置 | 个数 | 行 | 字节 | 处置 |
| --- | ---: | --- | ---: | --- |
| DELETIONS.md 标成 1.42.0 的那一段 | 222 | 4673–4894 | 14507 | 保留 |
| 删除表没有、同形的包装 | 23 | 852–874 | 1484 | 保留 |
| vendor.js 以外 | 83 次调用 | `media-editing/package.jsx` 82 次，`canvas/diagnostic-history-tools.js` 1 次 |  | 保留 |

`vendor.js` 文本里 `withIconCompositing(` 出现 246 次：245 次是上面的顶层包装，1 次是函数声明本身。删除表里的 222 个名字，当前每一个的初始值都是 `withIconCompositing(...)`，没有一个是 1.42.0 的图标实现。

这 222 个继续包住从 0.468.0 导入的组件。表外那 23 个同样不要删。`package.jsx` 和 `diagnostic-history-tools.js` 已经 import 了 `withIconCompositing`，换包后也继续包住新的导入。

表外 23 个：

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `Brain$2` | 852 | 852 | 60 |
| `Check$2` | 853 | 853 | 60 |
| `ChevronDown$2` | 854 | 854 | 72 |
| `CircleAlert$2` | 855 | 855 | 72 |
| `Clapperboard$2` | 856 | 856 | 74 |
| `Download$2` | 857 | 857 | 66 |
| `ExternalLink$2` | 858 | 858 | 74 |
| `Eye$2` | 859 | 859 | 56 |
| `File$3` | 860 | 860 | 58 |
| `Film$2` | 861 | 861 | 58 |
| `FolderInput$2` | 862 | 862 | 72 |
| `Headphones$2` | 863 | 863 | 70 |
| `Megaphone$2` | 864 | 864 | 68 |
| `Music$2` | 865 | 865 | 60 |
| `Package$2` | 866 | 866 | 64 |
| `Plus$2` | 867 | 867 | 58 |
| `Search$2` | 868 | 868 | 62 |
| `Share2$2` | 869 | 869 | 62 |
| `ShoppingBag$2` | 870 | 870 | 72 |
| `Square$2` | 871 | 871 | 62 |
| `Trash2$2` | 872 | 872 | 62 |
| `Video$2` | 873 | 873 | 60 |
| `Wrench$2` | 874 | 874 | 62 |

### Plus$1 留在应用里

`Plus$1` 在 3687–3703 行，302 字节。初始值是 `createLucideIcon("Plus", …)`，键名是 `ov-plus-v`、`ov-plus-h`、`ov-plus-top`、`ov-plus-bottom`。不要打进 lucide 补丁。

```js
const Plus$1 = createLucideIcon("Plus", [["path", {
  d: "M12 5.5v13",
  key: "ov-plus-v"
}], ["path", {
  d: "M5.5 12h13",
  key: "ov-plus-h"
}], ["circle", {
  cx: "12",
  cy: "5.5",
  r: "1.7",
  key: "ov-plus-top"
}], ["circle", {
  cx: "12",
  cy: "18.5",
  r: "1.7",
  key: "ov-plus-bottom"
}]]);
```

外部 import：340 个声明被 `vendor.js` 以外的文件用到，和计划里的 340 一致。其中包装 222 个、`Plus$1` 1 个、本体 117 个。`createLucideIcon` 的调用方是 `media-editing/package.jsx` 和 `debug-panel/debug-panel-dialog.jsx`。其余本体声明只在 `vendor.js` 内部被包装引用。

## 各包


### jszip 3.10.1

第二批。三个声明挨在一起。`requireJszip_min` 的自由绑定只有 `commonjsGlobal`（361 行）、`commonjsRequire`（8234 行）、`jszip_min`、`hasRequiredJszip_min`。比较脚本 `scripts/desource/compare-jszip-entries.mjs` 只抽这几段执行，不 import 整份 `vendor.js`。

在本工作副本跑过一次（还没有 node_modules，所以没有 3.10.1，也没有 3.10.2）。内联副本 `generateAsync({ type: "uint8array" })` 再 `loadAsync`，同一组输入得到 747 字节、7 个条目：

| 条目 | 目录 | 压缩方法 | uncompressedSize | 未压缩长度 | 相等 |
| --- | --- | --- | ---: | ---: | --- |
| blob.bin | 否 | STORE | 4 | 4 | 是 |
| bytes.bin | 否 | STORE | 6 | 6 | 是 |
| empty-dir/ | 是 | 无 | 无 | 0 | 否 |
| hello.txt | 否 | STORE | 15 | 15 | 是 |
| nested/ | 是 | 无 | 无 | 0 | 否 |
| nested/path/ | 是 | 无 | 无 | 0 | 否 |
| nested/path/file.txt | 否 | STORE | 18 | 18 | 是 |

四个文件条目的 `file._data.uncompressedSize` 等于未压缩长度。三个目录条目的 `_data` 在 `loadAsync` 之后仍是 Promise，没有 `uncompressedSize`。`media-editing/pdf-viewer.jsx` 1308 行写的是 `internal._data?.uncompressedSize ?? 0`，目录会显示成 0。这组输入都比较短，压缩方法是 STORE。Node 没有 `FileReader`，脚本补了一个只调用 `blob.arrayBuffer()` 的垫片，否则内联副本不会把 Blob 读成字节。脚本因缺少 3.10.1 退出，退出码 1。3.10.1 要等第二批钉版本后再比。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `jszip_min` | 8237 | 8239 | 34 |
| `hasRequiredJszip_min` | 8240 | 8240 | 25 |
| `requireJszip_min` | 8241 | 11486 | 169983 |

调用方：

1 个文件、1 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/media-editing/pdf-viewer.jsx`：`requireJszip_min`

### lucide-react 0.468.0

第二批。表内 488 个全部找到。本体 265 个在 1140–4672 行（`Plus$1` 夹在中间）。222 个包装在 4673–4894 行。处置见上面的修正，这里把三张表都列全。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

本体（换包时删除，265 个，81875 字节）：

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `toKebabCase` | 1140 | 1140 | 92 |
| `defaultAttributes$1` | 1141 | 1151 | 232 |
| `Icon$1` | 1152 | 1172 | 653 |
| `createLucideIcon` | 1173 | 1185 | 357 |
| `Activity` | 1186 | 1189 | 210 |
| `AlignCenter$1` | 1190 | 1199 | 199 |
| `AlignLeft$1` | 1200 | 1209 | 195 |
| `AlignRight$1` | 1210 | 1219 | 197 |
| `AppWindow$1` | 1220 | 1236 | 285 |
| `Archive$1` | 1237 | 1250 | 268 |
| `ArrowDownToLine$1` | 1251 | 1260 | 213 |
| `ArrowDown$1` | 1261 | 1267 | 154 |
| `ArrowLeftRight$1` | 1268 | 1280 | 263 |
| `ArrowLeftToLine$1` | 1281 | 1290 | 212 |
| `ArrowLeft$1` | 1291 | 1297 | 154 |
| `ArrowRightToLine$1` | 1298 | 1307 | 216 |
| `ArrowRight$1` | 1308 | 1314 | 155 |
| `ArrowUpDown$1` | 1315 | 1327 | 257 |
| `ArrowUpFromLine$1` | 1328 | 1337 | 213 |
| `ArrowUpRight$1` | 1338 | 1344 | 158 |
| `ArrowUpToLine$1` | 1345 | 1354 | 209 |
| `ArrowUp$1` | 1355 | 1361 | 149 |
| `AtSign$1` | 1362 | 1370 | 193 |
| `AudioLines$1` | 1371 | 1389 | 339 |
| `AudioWaveform$2` | 1390 | 1393 | 202 |
| `BadgeCheck$1` | 1394 | 1400 | 306 |
| `BadgeInfo$1` | 1401 | 1416 | 410 |
| `Ban$1` | 1417 | 1425 | 166 |
| `BellRing$1` | 1426 | 1438 | 407 |
| `Bell$1` | 1439 | 1445 | 275 |
| `Blocks$1` | 1446 | 1456 | 269 |
| `Bold$2` | 1457 | 1460 | 151 |
| `BookOpen$1` | 1461 | 1467 | 267 |
| `BookUser$1` | 1468 | 1479 | 302 |
| `Bookmark$1` | 1480 | 1483 | 141 |
| `Bot$1` | 1484 | 1506 | 372 |
| `Box$1` | 1507 | 1516 | 305 |
| `Boxes$1` | 1517 | 1553 | 947 |
| `Brain$1` | 1554 | 1581 | 797 |
| `Brush$1` | 1582 | 1588 | 306 |
| `Bug$1` | 1589 | 1622 | 749 |
| `Building2$1` | 1623 | 1644 | 483 |
| `Cable$1` | 1645 | 1660 | 447 |
| `Calculator$1` | 1661 | 1701 | 649 |
| `CalendarDays$1` | 1702 | 1736 | 590 |
| `Camera$1` | 1737 | 1745 | 243 |
| `CaseSensitive$1` | 1746 | 1760 | 274 |
| `ChartNoAxesCombined$1` | 1761 | 1779 | 421 |
| `CheckCheck$1` | 1780 | 1786 | 169 |
| `Check$1` | 1787 | 1790 | 99 |
| `ChevronDown$1` | 1791 | 1794 | 108 |
| `ChevronLeft$1` | 1795 | 1798 | 110 |
| `ChevronRight$2` | 1799 | 1802 | 111 |
| `ChevronUp$1` | 1803 | 1806 | 106 |
| `Chrome$1` | 1807 | 1835 | 434 |
| `CircleAlert$1` | 1836 | 1853 | 284 |
| `CircleArrowUp$1` | 1854 | 1865 | 230 |
| `CircleCheck` | 1866 | 1874 | 175 |
| `CircleHelp$1` | 1875 | 1886 | 248 |
| `CircleMinus$1` | 1887 | 1895 | 171 |
| `CirclePlus` | 1896 | 1907 | 214 |
| `CircleUserRound$1` | 1908 | 1921 | 260 |
| `CircleX$1` | 1922 | 1933 | 213 |
| `Circle$1` | 1934 | 1939 | 114 |
| `Clapperboard$1` | 1940 | 1952 | 361 |
| `ClipboardList$1` | 1953 | 1976 | 468 |
| `ClipboardPaste$1` | 1977 | 1986 | 351 |
| `Clipboard` | 1987 | 1998 | 264 |
| `Clock3$1` | 1999 | 2007 | 181 |
| `Clock$1` | 2008 | 2016 | 177 |
| `CloudDownload$1` | 2017 | 2026 | 265 |
| `CloudOff$1` | 2027 | 2036 | 302 |
| `CloudUpload$1` | 2037 | 2046 | 253 |
| `Cloud$1` | 2047 | 2050 | 135 |
| `Code$2` | 2051 | 2057 | 169 |
| `Cog$1` | 2058 | 2100 | 826 |
| `Command$1` | 2101 | 2104 | 159 |
| `Compass$1` | 2105 | 2113 | 247 |
| `CopyPlus$1` | 2114 | 2137 | 407 |
| `Copy$1` | 2138 | 2149 | 241 |
| `CornerDownRight$1` | 2150 | 2156 | 193 |
| `CreditCard$1` | 2157 | 2170 | 225 |
| `Crosshair$1` | 2171 | 2200 | 432 |
| `Crown$1` | 2201 | 2207 | 348 |
| `Download$1` | 2208 | 2220 | 274 |
| `Droplet$1` | 2221 | 2224 | 189 |
| `Earth` | 2225 | 2239 | 407 |
| `Ellipsis$1` | 2240 | 2255 | 250 |
| `Expand$1` | 2256 | 2268 | 315 |
| `ExternalLink$1` | 2269 | 2278 | 254 |
| `EyeOff$1` | 2279 | 2291 | 438 |
| `Eye$1` | 2292 | 2300 | 248 |
| `FileArchive$1` | 2301 | 2321 | 442 |
| `FileAudio$1` | 2322 | 2331 | 331 |
| `FileClock$1` | 2332 | 2346 | 328 |
| `FileCode$1` | 2347 | 2359 | 330 |
| `FileDiff$1` | 2360 | 2372 | 290 |
| `FileImage$1` | 2373 | 2387 | 367 |
| `FileInput$1` | 2388 | 2400 | 303 |
| `FileJson2$1` | 2401 | 2413 | 414 |
| `FilePlus2$1` | 2414 | 2426 | 296 |
| `FileText$1` | 2427 | 2442 | 354 |
| `FileVideo$1` | 2443 | 2452 | 271 |
| `FileWarning$1` | 2453 | 2462 | 251 |
| `Files$1` | 2463 | 2472 | 283 |
| `Film$1` | 2473 | 2501 | 474 |
| `Flag$1` | 2502 | 2511 | 216 |
| `FolderClock$1` | 2512 | 2523 | 315 |
| `FolderClosed$1` | 2524 | 2530 | 264 |
| `FolderInput$1` | 2531 | 2540 | 316 |
| `FolderKey$1` | 2541 | 2555 | 366 |
| `FolderMinus$1` | 2556 | 2562 | 261 |
| `FolderOpen$1` | 2563 | 2566 | 271 |
| `FolderPlus$1` | 2567 | 2576 | 307 |
| `FolderUp$1` | 2577 | 2586 | 309 |
| `FolderX$1` | 2587 | 2596 | 313 |
| `Folder$1` | 2597 | 2600 | 204 |
| `Gauge$1` | 2601 | 2607 | 162 |
| `Gift` | 2608 | 2624 | 377 |
| `GitCompare$1` | 2625 | 2641 | 313 |
| `Globe$1` | 2642 | 2653 | 247 |
| `GraduationCap$1` | 2654 | 2663 | 336 |
| `Grid2x2Plus$1` | 2664 | 2673 | 282 |
| `Grid2x2` | 2674 | 2687 | 234 |
| `Grid3x3` | 2688 | 2707 | 329 |
| `GripHorizontal` | 2708 | 2738 | 457 |
| `GripVertical$1` | 2739 | 2769 | 455 |
| `Hand$1` | 2770 | 2782 | 413 |
| `HardDrive$1` | 2783 | 2804 | 438 |
| `Headphones$1` | 2805 | 2808 | 217 |
| `History$1` | 2809 | 2818 | 236 |
| `House` | 2819 | 2825 | 273 |
| `ImagePlus$1` | 2826 | 2843 | 393 |
| `Import$1` | 2844 | 2853 | 260 |
| `Inbox$1` | 2854 | 2860 | 272 |
| `Info$2` | 2861 | 2872 | 208 |
| `Italic$2` | 2873 | 2891 | 278 |
| `KeyRound$1` | 2892 | 2901 | 355 |
| `Keyboard$1` | 2902 | 2933 | 535 |
| `Languages$1` | 2934 | 2952 | 350 |
| `Layers2$1` | 2953 | 2959 | 320 |
| `Layers$1` | 2960 | 2969 | 419 |
| `LayoutGrid$1` | 2970 | 2998 | 422 |
| `LayoutList$1` | 2999 | 3025 | 427 |
| `LayoutTemplate$1` | 3026 | 3047 | 339 |
| `Library$1` | 3048 | 3060 | 240 |
| `Lightbulb$1` | 3061 | 3070 | 287 |
| `Link2$1` | 3071 | 3083 | 250 |
| `ListChecks$1` | 3084 | 3099 | 302 |
| `List$1` | 3100 | 3118 | 331 |
| `LoaderCircle$1` | 3119 | 3122 | 125 |
| `LockKeyhole$1` | 3123 | 3138 | 281 |
| `Lock$1` | 3139 | 3150 | 211 |
| `LogOut$1` | 3151 | 3163 | 268 |
| `Mail$1` | 3164 | 3174 | 216 |
| `MapPin$1` | 3175 | 3183 | 253 |
| `Map$2` | 3184 | 3193 | 420 |
| `Maximize2$1` | 3194 | 3212 | 334 |
| `Maximize$1` | 3213 | 3225 | 304 |
| `Megaphone$1` | 3226 | 3232 | 182 |
| `MessageCircleMore$1` | 3233 | 3245 | 287 |
| `MessageCircle$1` | 3246 | 3249 | 130 |
| `MessageSquareMore$1` | 3250 | 3262 | 318 |
| `MessageSquarePlus$1` | 3263 | 3272 | 263 |
| `MessageSquareQuote$1` | 3273 | 3282 | 299 |
| `MessageSquare$1` | 3283 | 3286 | 161 |
| `Mic$1` | 3287 | 3299 | 277 |
| `Minimize2$1` | 3300 | 3318 | 338 |
| `Minus$1` | 3319 | 3322 | 92 |
| `MonitorUp$1` | 3323 | 3342 | 341 |
| `Monitor$1` | 3343 | 3362 | 298 |
| `Moon$1` | 3363 | 3366 | 116 |
| `MousePointer2$1` | 3367 | 3370 | 232 |
| `Music2$1` | 3371 | 3379 | 164 |
| `Music$1` | 3380 | 3393 | 232 |
| `Network$1` | 3394 | 3421 | 453 |
| `Newspaper$1` | 3422 | 3434 | 354 |
| `NotebookPen$1` | 3435 | 3453 | 511 |
| `OctagonX` | 3454 | 3463 | 419 |
| `PackageSearch$1` | 3464 | 3487 | 542 |
| `Palette$1` | 3488 | 3515 | 684 |
| `PanelBottomClose$1` | 3516 | 3529 | 260 |
| `PanelLeftClose$1` | 3530 | 3543 | 256 |
| `PanelLeftOpen$1` | 3544 | 3557 | 253 |
| `PanelRightClose$1` | 3558 | 3571 | 257 |
| `PanelRightOpen$1` | 3572 | 3585 | 257 |
| `PanelsTopLeft$1` | 3586 | 3599 | 247 |
| `Paperclip$1` | 3600 | 3606 | 290 |
| `PenLine$1` | 3607 | 3613 | 265 |
| `PencilLine$1` | 3614 | 3623 | 320 |
| `PencilRuler$1` | 3624 | 3642 | 593 |
| `Pencil$1` | 3643 | 3649 | 263 |
| `Phone$1` | 3650 | 3653 | 369 |
| `PinOff$1` | 3654 | 3666 | 342 |
| `Pin$1` | 3667 | 3673 | 330 |
| `Plug$1` | 3674 | 3686 | 265 |
| `Podcast$1` | 3704 | 3718 | 325 |
| `Power$1` | 3719 | 3725 | 159 |
| `Puzzle$1` | 3726 | 3729 | 547 |
| `ReceiptText$1` | 3730 | 3742 | 310 |
| `Redo2$1` | 3743 | 3749 | 192 |
| `Regex$1` | 3750 | 3762 | 318 |
| `Repeat2$1` | 3763 | 3775 | 282 |
| `ReplaceAll$1` | 3776 | 3807 | 651 |
| `Replace$1` | 3808 | 3833 | 492 |
| `RotateCcw$1` | 3834 | 3840 | 189 |
| `RotateCw$1` | 3841 | 3847 | 189 |
| `Save$1` | 3848 | 3857 | 323 |
| `Scan$1` | 3858 | 3870 | 296 |
| `Scissors$1` | 3871 | 3890 | 349 |
| `ScrollText$1` | 3891 | 3903 | 361 |
| `Search$1` | 3904 | 3912 | 167 |
| `Send$1` | 3913 | 3919 | 275 |
| `ServerOff$1` | 3920 | 3938 | 480 |
| `Server` | 3939 | 3967 | 409 |
| `Settings2$1` | 3968 | 3984 | 280 |
| `Settings$1` | 3985 | 3993 | 722 |
| `Share2$1` | 3994 | 4021 | 424 |
| `ShieldAlert$1` | 4022 | 4031 | 355 |
| `ShieldCheck$1` | 4032 | 4038 | 311 |
| `ShieldOff$1` | 4039 | 4048 | 400 |
| `ShoppingBag$1` | 4049 | 4058 | 253 |
| `Shuffle$1` | 4059 | 4074 | 404 |
| `Slash$1` | 4075 | 4078 | 94 |
| `SlidersHorizontal$1` | 4079 | 4133 | 767 |
| `Smartphone$1` | 4134 | 4145 | 208 |
| `Sparkles$1` | 4146 | 4161 | 530 |
| `Speech$1` | 4162 | 4171 | 357 |
| `Split$1` | 4172 | 4184 | 267 |
| `Sprout$1` | 4185 | 4197 | 410 |
| `SquareDashed$1` | 4198 | 4234 | 670 |
| `SquareMousePointer$1` | 4235 | 4241 | 336 |
| `Stamp$1` | 4242 | 4251 | 362 |
| `StickyNote$1` | 4252 | 4258 | 215 |
| `Sun$1` | 4259 | 4288 | 541 |
| `SwatchBook$1` | 4289 | 4301 | 400 |
| `Tag$2` | 4302 | 4311 | 322 |
| `ThumbsDown$1` | 4312 | 4318 | 293 |
| `ThumbsUp$1` | 4319 | 4325 | 290 |
| `Trash2$1` | 4326 | 4347 | 401 |
| `TrendingUp$1` | 4348 | 4354 | 195 |
| `TriangleAlert$1` | 4355 | 4364 | 269 |
| `Tv$1` | 4365 | 4376 | 204 |
| `Type$2` | 4377 | 4392 | 264 |
| `Underline$2` | 4393 | 4402 | 193 |
| `Undo2$1` | 4403 | 4409 | 193 |
| `Upload$1` | 4410 | 4422 | 267 |
| `UserRoundPlus$1` | 4423 | 4437 | 287 |
| `UserRound$1` | 4438 | 4446 | 179 |
| `User$1` | 4447 | 4455 | 189 |
| `Users$1` | 4456 | 4470 | 320 |
| `VideoOff$1` | 4471 | 4480 | 300 |
| `Video$1` | 4481 | 4491 | 250 |
| `Volume2$1` | 4492 | 4501 | 388 |
| `VolumeX$1` | 4502 | 4517 | 412 |
| `WandSparkles$1` | 4518 | 4542 | 571 |
| `WholeWord$1` | 4543 | 4562 | 361 |
| `WifiOff$1` | 4563 | 4584 | 502 |
| `Wifi` | 4585 | 4597 | 285 |
| `Workflow$1` | 4598 | 4615 | 297 |
| `Wrench$1` | 4616 | 4619 | 238 |
| `X$8` | 4620 | 4626 | 136 |
| `Zap$1` | 4627 | 4630 | 235 |
| `ZoomIn$1` | 4631 | 4654 | 354 |
| `ZoomOut$1` | 4655 | 4672 | 278 |

`Plus$1`（留下，302 字节）：

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `Plus$1` | 3687 | 3703 | 302 |

表内包装（留下，222 个，14507 字节）：

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `ActivityIcon` | 4673 | 4673 | 66 |
| `AlertCircle` | 4674 | 4674 | 70 |
| `AlertTriangle` | 4675 | 4675 | 74 |
| `AlertTriangleIcon` | 4676 | 4676 | 78 |
| `AppWindow` | 4677 | 4677 | 66 |
| `Archive` | 4678 | 4678 | 62 |
| `ArrowDown` | 4679 | 4679 | 66 |
| `ArrowDownToLine` | 4680 | 4680 | 78 |
| `ArrowLeft` | 4681 | 4681 | 66 |
| `ArrowLeftRight` | 4682 | 4682 | 76 |
| `ArrowLeftToLine` | 4683 | 4683 | 78 |
| `ArrowRight` | 4684 | 4684 | 68 |
| `ArrowRightToLine` | 4685 | 4685 | 80 |
| `ArrowUp` | 4686 | 4686 | 62 |
| `ArrowUpDown` | 4687 | 4687 | 70 |
| `ArrowUpFromLine` | 4688 | 4688 | 78 |
| `ArrowUpRight` | 4689 | 4689 | 72 |
| `ArrowUpToLine` | 4690 | 4690 | 74 |
| `AtSign` | 4691 | 4691 | 60 |
| `AudioLines` | 4692 | 4692 | 68 |
| `AudioWaveform$1` | 4693 | 4693 | 76 |
| `BadgeCheck` | 4694 | 4694 | 68 |
| `BadgeInfo` | 4695 | 4695 | 66 |
| `Bell` | 4696 | 4696 | 56 |
| `BellRing` | 4697 | 4697 | 64 |
| `Bold$1` | 4698 | 4698 | 58 |
| `BookUser` | 4699 | 4699 | 64 |
| `Bot` | 4700 | 4700 | 54 |
| `Box` | 4701 | 4701 | 54 |
| `Boxes` | 4702 | 4702 | 58 |
| `BoxSelect` | 4703 | 4703 | 69 |
| `Bug` | 4704 | 4704 | 54 |
| `Calculator` | 4705 | 4705 | 68 |
| `ChartNoAxesCombined` | 4706 | 4706 | 86 |
| `Check` | 4707 | 4707 | 58 |
| `CheckCheck` | 4708 | 4708 | 68 |
| `CheckCircle2` | 4709 | 4709 | 69 |
| `CheckCircle2Icon` | 4710 | 4710 | 73 |
| `ChevronDown` | 4711 | 4711 | 70 |
| `ChevronDownIcon$1` | 4712 | 4712 | 76 |
| `ChevronLeft` | 4713 | 4713 | 70 |
| `ChevronLeftIcon` | 4714 | 4714 | 74 |
| `ChevronRight$1` | 4715 | 4715 | 74 |
| `ChevronRightIcon` | 4716 | 4716 | 76 |
| `ChevronUp` | 4717 | 4717 | 66 |
| `ChevronUpIcon` | 4718 | 4718 | 70 |
| `CircleAlert` | 4719 | 4719 | 70 |
| `CircleArrowUp` | 4720 | 4720 | 74 |
| `CircleCheckIcon` | 4721 | 4721 | 72 |
| `CircleIcon` | 4722 | 4722 | 64 |
| `CircleMinus` | 4723 | 4723 | 70 |
| `CircleX` | 4724 | 4724 | 62 |
| `ClipboardIcon` | 4725 | 4725 | 68 |
| `ClipboardList` | 4726 | 4726 | 74 |
| `Cloud` | 4727 | 4727 | 58 |
| `CloudDownload` | 4728 | 4728 | 74 |
| `CloudIcon` | 4729 | 4729 | 62 |
| `CloudUpload` | 4730 | 4730 | 70 |
| `Code$1` | 4731 | 4731 | 58 |
| `Cog` | 4732 | 4732 | 54 |
| `Command` | 4733 | 4733 | 62 |
| `Compass` | 4734 | 4734 | 62 |
| `Copy` | 4735 | 4735 | 56 |
| `CopyPlus` | 4736 | 4736 | 64 |
| `CreditCard` | 4737 | 4737 | 68 |
| `Crosshair` | 4738 | 4738 | 66 |
| `Crown` | 4739 | 4739 | 58 |
| `DownloadIcon` | 4740 | 4740 | 68 |
| `Ellipsis` | 4741 | 4741 | 64 |
| `ExternalLink` | 4742 | 4742 | 72 |
| `Eye` | 4743 | 4743 | 54 |
| `EyeIcon$1` | 4744 | 4744 | 60 |
| `EyeOff` | 4745 | 4745 | 60 |
| `EyeOffIcon$1` | 4746 | 4746 | 66 |
| `FileImage` | 4747 | 4747 | 66 |
| `FilePlus2` | 4748 | 4748 | 66 |
| `Film` | 4749 | 4749 | 56 |
| `FolderClock` | 4750 | 4750 | 70 |
| `FolderClosed` | 4751 | 4751 | 72 |
| `FolderInput` | 4752 | 4752 | 70 |
| `FolderMinus` | 4753 | 4753 | 70 |
| `FolderOpenIcon` | 4754 | 4754 | 72 |
| `FolderPlus` | 4755 | 4755 | 68 |
| `FolderUp` | 4756 | 4756 | 64 |
| `FolderX` | 4757 | 4757 | 62 |
| `Gauge` | 4758 | 4758 | 58 |
| `GiftIcon` | 4759 | 4759 | 58 |
| `GitCompare` | 4760 | 4760 | 68 |
| `Globe` | 4761 | 4761 | 58 |
| `Globe2` | 4762 | 4762 | 57 |
| `GraduationCap` | 4763 | 4763 | 74 |
| `Grid2X2` | 4764 | 4764 | 60 |
| `Grid2x2Plus` | 4765 | 4765 | 70 |
| `Grid3X3` | 4766 | 4766 | 60 |
| `GripHorizontalIcon` | 4767 | 4767 | 78 |
| `GripVertical` | 4768 | 4768 | 72 |
| `Hand` | 4769 | 4769 | 56 |
| `Headphones` | 4770 | 4770 | 68 |
| `HistoryIcon` | 4771 | 4771 | 66 |
| `Home` | 4772 | 4772 | 55 |
| `ImagePlus` | 4773 | 4773 | 66 |
| `Import` | 4774 | 4774 | 60 |
| `Inbox` | 4775 | 4775 | 58 |
| `Info$1` | 4776 | 4776 | 58 |
| `InfoIcon$1` | 4777 | 4777 | 62 |
| `Italic$1` | 4778 | 4778 | 62 |
| `KeyRound` | 4779 | 4779 | 64 |
| `Keyboard` | 4780 | 4780 | 64 |
| `Languages` | 4781 | 4781 | 66 |
| `Layers` | 4782 | 4782 | 60 |
| `Layers2` | 4783 | 4783 | 62 |
| `Layers3` | 4784 | 4784 | 61 |
| `LayoutGrid` | 4785 | 4785 | 68 |
| `LayoutList` | 4786 | 4786 | 68 |
| `LayoutTemplate` | 4787 | 4787 | 76 |
| `Library` | 4788 | 4788 | 62 |
| `Lightbulb` | 4789 | 4789 | 66 |
| `Link2` | 4790 | 4790 | 58 |
| `ListChecks` | 4791 | 4791 | 68 |
| `Loader2` | 4792 | 4792 | 67 |
| `Loader2Icon` | 4793 | 4793 | 71 |
| `LoaderCircle` | 4794 | 4794 | 72 |
| `Lock` | 4795 | 4795 | 56 |
| `LockKeyhole` | 4796 | 4796 | 70 |
| `Mail` | 4797 | 4797 | 56 |
| `Map$1` | 4798 | 4798 | 56 |
| `MapPin` | 4799 | 4799 | 60 |
| `Maximize` | 4800 | 4800 | 64 |
| `MessageCircle` | 4801 | 4801 | 74 |
| `MessageCircleMore` | 4802 | 4802 | 82 |
| `MessageSquareMore` | 4803 | 4803 | 82 |
| `Minus` | 4804 | 4804 | 58 |
| `MinusIcon` | 4805 | 4805 | 62 |
| `Monitor` | 4806 | 4806 | 62 |
| `MonitorUp` | 4807 | 4807 | 66 |
| `MoreHorizontal` | 4808 | 4808 | 70 |
| `Music` | 4809 | 4809 | 58 |
| `Music2` | 4810 | 4810 | 60 |
| `Network` | 4811 | 4811 | 62 |
| `Newspaper` | 4812 | 4812 | 66 |
| `NotebookPen` | 4813 | 4813 | 70 |
| `OctagonXIcon` | 4814 | 4814 | 66 |
| `PackageSearch` | 4815 | 4815 | 74 |
| `Palette` | 4816 | 4816 | 62 |
| `PanelBottomClose` | 4817 | 4817 | 80 |
| `PanelLeftClose` | 4818 | 4818 | 76 |
| `PanelLeftOpen` | 4819 | 4819 | 74 |
| `PanelRightClose` | 4820 | 4820 | 78 |
| `PanelRightOpen` | 4821 | 4821 | 76 |
| `PanelsTopLeft` | 4822 | 4822 | 74 |
| `Pencil` | 4823 | 4823 | 60 |
| `PencilRuler` | 4824 | 4824 | 70 |
| `Phone` | 4825 | 4825 | 58 |
| `Pin` | 4826 | 4826 | 54 |
| `PinIcon` | 4827 | 4827 | 58 |
| `PinOff` | 4828 | 4828 | 60 |
| `Plus` | 4829 | 4829 | 56 |
| `PlusCircle` | 4830 | 4830 | 66 |
| `Podcast` | 4831 | 4831 | 62 |
| `Power` | 4832 | 4832 | 58 |
| `Redo2` | 4833 | 4833 | 58 |
| `Regex` | 4834 | 4834 | 58 |
| `Repeat2` | 4835 | 4835 | 62 |
| `RotateCcw` | 4836 | 4836 | 66 |
| `RotateCw` | 4837 | 4837 | 64 |
| `Save` | 4838 | 4838 | 56 |
| `Scan` | 4839 | 4839 | 56 |
| `Scissors` | 4840 | 4840 | 64 |
| `ScrollText` | 4841 | 4841 | 68 |
| `Search` | 4842 | 4842 | 60 |
| `SearchIcon` | 4843 | 4843 | 64 |
| `Send` | 4844 | 4844 | 56 |
| `ServerIcon` | 4845 | 4845 | 62 |
| `ServerOff` | 4846 | 4846 | 66 |
| `Share2` | 4847 | 4847 | 60 |
| `ShieldAlert` | 4848 | 4848 | 70 |
| `ShieldCheck` | 4849 | 4849 | 70 |
| `ShieldCheckIcon` | 4850 | 4850 | 74 |
| `ShieldOff` | 4851 | 4851 | 66 |
| `Shuffle` | 4852 | 4852 | 62 |
| `Slash` | 4853 | 4853 | 58 |
| `Smartphone` | 4854 | 4854 | 68 |
| `Speech` | 4855 | 4855 | 60 |
| `Split` | 4856 | 4856 | 58 |
| `SquareDashed` | 4857 | 4857 | 72 |
| `SquareMousePointer` | 4858 | 4858 | 84 |
| `StickyNote` | 4859 | 4859 | 68 |
| `Sun` | 4860 | 4860 | 54 |
| `SwatchBook` | 4861 | 4861 | 68 |
| `Tag$1` | 4862 | 4862 | 56 |
| `ThumbsDown` | 4863 | 4863 | 68 |
| `ThumbsUp` | 4864 | 4864 | 64 |
| `Trash2Icon` | 4865 | 4865 | 64 |
| `TrendingUp` | 4866 | 4866 | 68 |
| `TriangleAlert` | 4867 | 4867 | 74 |
| `TriangleAlertIcon` | 4868 | 4868 | 78 |
| `Tv` | 4869 | 4869 | 52 |
| `Underline$1` | 4870 | 4870 | 68 |
| `Undo2` | 4871 | 4871 | 58 |
| `UploadIcon$1` | 4872 | 4872 | 66 |
| `User` | 4873 | 4873 | 56 |
| `UserRound` | 4874 | 4874 | 66 |
| `UserRoundPlus` | 4875 | 4875 | 74 |
| `UsersIcon` | 4876 | 4876 | 62 |
| `Video` | 4877 | 4877 | 58 |
| `VideoOff` | 4878 | 4878 | 64 |
| `Volume2` | 4879 | 4879 | 62 |
| `Volume2Icon` | 4880 | 4880 | 66 |
| `VolumeXIcon` | 4881 | 4881 | 66 |
| `Wand2` | 4882 | 4882 | 65 |
| `WandSparkles` | 4883 | 4883 | 72 |
| `WholeWord` | 4884 | 4884 | 66 |
| `WifiIcon` | 4885 | 4885 | 58 |
| `WifiOff` | 4886 | 4886 | 62 |
| `WifiOffIcon` | 4887 | 4887 | 66 |
| `Workflow` | 4888 | 4888 | 64 |
| `Wrench` | 4889 | 4889 | 60 |
| `X$7` | 4890 | 4890 | 52 |
| `XIcon` | 4891 | 4891 | 54 |
| `Zap` | 4892 | 4892 | 54 |
| `ZoomIn` | 4893 | 4893 | 60 |
| `ZoomOut` | 4894 | 4894 | 62 |

调用方：

322 个文件、340 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/assets/add-entity-dialog.jsx`：`AtSign`、`ChevronDown`、`Loader2`
- `app/renderer/src/assets/asset-center-page.jsx`：`ArrowLeft`、`Check`、`CheckCircle2` as `CheckCircle`、`ChevronDown`、`ChevronUp`、`LayoutGrid`、`Loader2`、`Plus`、`Search`、`ShieldAlert`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/asset-center-panel.jsx`：`ChevronRight$1` as `ChevronRight`、`Loader2`、`Search`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/asset-context-menu-content.jsx`：`Copy`、`Crosshair`、`ExternalLink`、`FolderInput`、`FolderPlus`、`LayoutGrid`、`LayoutList`、`Plus`
- `app/renderer/src/assets/asset-empty-area-menu-content.jsx`：`FolderPlus`、`LayoutGrid`、`LayoutList`
- `app/renderer/src/assets/asset-grid-item-impl.jsx`：`AlertTriangle`
- `app/renderer/src/assets/asset-panel-overlay-host.jsx`：`AlertTriangle`、`ChevronDown`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Crosshair`、`Network`、`Volume2` as `Volume`
- `app/renderer/src/assets/asset-picker-dialog.jsx`：`ChevronDown`、`LayoutGrid`、`LayoutList`、`Loader2`、`MonitorUp`、`Search`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/assets-dropzone-empty.jsx`：`FolderUp`
- `app/renderer/src/assets/attachment-row.jsx`：`Loader2`、`Plus`
- `app/renderer/src/assets/attachment-upload-zone.jsx`：`FolderUp`、`Scan`、`Video`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/close-button.jsx`：`X$7` as `CloseIcon`
- `app/renderer/src/assets/entity-card.jsx`：`FolderInput`、`Library`
- `app/renderer/src/assets/entity-delete-confirm.jsx`：`Loader2`、`ShieldAlert`
- `app/renderer/src/assets/entity-edit-dialog.jsx`：`AtSign`、`ChevronDown`、`FolderInput`、`Loader2`
- `app/renderer/src/assets/entity-list-row.jsx`：`FolderInput`、`Library`
- `app/renderer/src/assets/entity-row.jsx`：`Plus`
- `app/renderer/src/assets/file-explorer-search-bar.jsx`：`Search`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/folder-drill-down-picker.jsx`：`Check`、`ChevronDown`、`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/assets/general-section.jsx`：`AlertCircle`、`AlertTriangle`、`ArrowUpRight`、`Bell`、`ChevronLeftIcon`、`CircleArrowUp`、`Globe`、`Library`、`Loader2`、`Monitor`、`Pencil`、`Plus`、`ServerIcon`、`ShieldAlert`、`Smartphone`、`Sun`、`XIcon`
- `app/renderer/src/assets/image-lightbox.jsx`：`Minus`、`Plus`
- `app/renderer/src/assets/local-assets-sidebar-panel.jsx`：`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`FolderInput`、`FolderPlus`
- `app/renderer/src/assets/materialize-workspace-dialog.jsx`：`CheckCircle2` as `CheckCircle`、`Loader2`、`ShieldAlert`
- `app/renderer/src/assets/missing-candidate-actions.jsx`：`Check`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/preset-tags.jsx`：`ChevronRight$1` as `ChevronRight`、`Plus`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/promote-to-asset-form.jsx`：`AtSign`、`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`Loader2`、`ShieldAlert`
- `app/renderer/src/assets/scrollable-asset-view.jsx`：`AudioLines`、`FileImage`、`Film`、`Tag$1` as `Tag`
- `app/renderer/src/assets/staged-row.jsx`：`Loader2`、`Scan`、`Video`、`X$7` as `CloseIcon`
- `app/renderer/src/assets/team-assets-sidebar-panel.jsx`：`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`FolderInput`、`FolderPlus`、`LoaderCircle`
- `app/renderer/src/assets/text-preview.jsx`：`Loader2`、`Music2`
- `app/renderer/src/assets/tree-item.jsx`：`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`Crosshair`
- `app/renderer/src/assets/use-canvas-asset-promotion.jsx`：`FolderInput`、`Library`
- `app/renderer/src/canvas/assets-tab-panel.jsx`：`Check`、`ChevronDown`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Info$1` as `Info`、`LayoutGrid`、`LayoutList`、`Library`、`Plus`
- `app/renderer/src/canvas/canvas-area.jsx`：`FolderClosed`
- `app/renderer/src/canvas/canvas-command-panel-content.jsx`：`ChevronDown`、`ChevronUp`、`Eye`、`EyeOff`
- `app/renderer/src/canvas/canvas-global-tag-manager.jsx`：`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`CircleX`、`Ellipsis`、`Loader2`、`Music2`、`Video`、`X$7` as `XIcon`
- `app/renderer/src/canvas/canvas-tag-manager-panel.jsx`：`Loader2`、`Plus`
- `app/renderer/src/canvas/canvas-tag-picker-panel.jsx`：`Check`、`Minus`、`Plus`
- `app/renderer/src/canvas/canvas-toolbar.jsx`：`Plus`、`X$7` as `XIcon`
- `app/renderer/src/canvas/canvas-view-controls.jsx`：`ChevronRight$1` as `ChevronRight`、`Grid2X2`、`LayoutTemplate`、`Library`、`Map$1` as `MapIcon`、`Workflow`、`X$7` as `XIcon`
- `app/renderer/src/canvas/canvas-view-inner.jsx`：`Check`、`ChevronDown`、`Loader2Icon`
- `app/renderer/src/canvas/edge-interaction-layer.jsx`：`Scissors`
- `app/renderer/src/canvas/empty-viewport-toast.jsx`：`X$7` as `XIcon`
- `app/renderer/src/canvas/file-missing-icon.jsx`：`Pencil`、`Speech`
- `app/renderer/src/canvas/fullscreen-icon.jsx`：`PencilRuler`
- `app/renderer/src/canvas/node-header-inner.jsx`：`X$7` as `XIcon`
- `app/renderer/src/canvas/node-shell-inner.jsx`：`Loader2Icon`、`X$7` as `XIcon`
- `app/renderer/src/canvas/selection-toolbar-inner.jsx`：`LayoutTemplate`
- `app/renderer/src/canvas/sortable-tag-row.jsx`：`X$7` as `XIcon`
- `app/renderer/src/canvas/tool-mode-split-button.jsx`：`Check`、`ChevronUp`、`Hand`
- `app/renderer/src/canvas/transfers-button.jsx`：`ArrowDownToLine`、`ArrowUpFromLine`、`CloudUpload`、`LoaderCircle`、`X$7` as `XIcon`
- `app/renderer/src/canvas/uploading-assets.jsx`：`Cloud`、`CloudDownload`
- `app/renderer/src/chat/assistant-message-actions.jsx`：`Check`、`Copy`
- `app/renderer/src/chat/chat-history-loading-state.jsx`：`Loader2`
- `app/renderer/src/chat/chat-panel.jsx`：`Loader2`
- `app/renderer/src/chat/chat-rating-controls.jsx`：`RotateCcw`、`ThumbsDown`、`ThumbsUp`、`X$7` as `CloseIcon`
- `app/renderer/src/chat/document-edit-review-bar.jsx`：`ChevronDown`、`ChevronUp`、`Eye` as `EyeIcon`
- `app/renderer/src/chat/loop-guard-ask-dock.jsx`：`ArrowRight`、`CheckCheck`、`Repeat2`
- `app/renderer/src/chat/mention-popover.jsx`：`Workflow`
- `app/renderer/src/chat/mention-ref-chip.js`：`Workflow`、`X$7` as `CloseIcon`
- `app/renderer/src/chat/message-input-base.jsx`：`ArrowUp`
- `app/renderer/src/chat/message-turn.jsx`：`Check`、`Copy`、`Split`
- `app/renderer/src/chat/mode-selector.jsx`：`BellRing`、`Check`、`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`Hand`
- `app/renderer/src/chat/promo-banner.jsx`：`X$7` as `CloseIcon`
- `app/renderer/src/chat/question-dock.jsx`：`Check`、`ChevronDown`
- `app/renderer/src/chat/session-history.jsx`：`DownloadIcon`、`EyeIcon$1` as `EyeIcon`、`EyeOffIcon$1` as `EyeOffIcon`、`HistoryIcon`、`PinIcon`、`SearchIcon`
- `app/renderer/src/chat/session-tab-strip.jsx`：`CircleAlert`、`GripVertical`、`NotebookPen`、`Pencil`、`PencilRuler`、`Plus`、`Scissors`、`X$7` as `CloseIcon`
- `app/renderer/src/chat/sortable-queued-row.jsx`：`Loader2`
- `app/renderer/src/chat/sub-agent-group.jsx`：`Bot`、`Check`、`ChevronDown`、`Copy`、`LoaderCircle`、`NotebookPen`、`RotateCcw`、`Save`、`Scissors`、`ShieldOff`
- `app/renderer/src/chat/use-composer-placeholder-actions.jsx`：`Music`、`Video`
- `app/renderer/src/chat/use-copy.jsx`：`ArrowDown`
- `app/renderer/src/creations/index.jsx`：`Plus`
- `app/renderer/src/debug-panel/debug-panel-dialog.jsx`：`createLucideIcon`、`ArrowUpRight$1` as `ArrowUpRight`、`Brain$1` as `Brain`、`Zap$1` as `Zap`、`FileText$1` as `FileText`、`Search$1` as `Search`、`PencilRuler$1` as `PencilRuler`、`Video$1` as `Video`、`AudioLines$1` as `AudioLines`、`CircleAlert$1` as `CircleAlert`、`SquareMousePointer$1` as `SquareMousePointer`、`Sparkles$1` as `Sparkles`、`Cog$1` as `Cog`、`Loader2`、`Plus`、`AlertCircle`、`Plus$1` as `PlusIcon`、`Trash2$1` as `Trash2`、`Check$1` as `Check`、`RotateCcw$1` as `RotateCcw`、`ArrowRight$1` as `ArrowRight`、`House`、`ArrowUp$1` as `ArrowUp`、`Smartphone$1` as `Smartphone`、`Users$1` as `Users`、`LoaderCircle$1` as `LoaderCircle`、`TriangleAlert$1` as `TriangleAlert`、`UserRound$1` as `UserRound`、`ChevronRight$2` as `ChevronRight`、`X$8` as `X`、`Clock3$1` as `Clock3`、`Crown$1` as `Crown`、`ShieldCheck$1` as `ShieldCheck`、`CircleCheck`、`CircleX$1` as `CircleX`、`Settings2$1` as `Settings2`、`Link2$1` as `Link2`、`Copy$1` as `Copy`、`ChevronLeft$1` as `ChevronLeft`、`CircleUserRound$1` as `CircleUserRound`、`Bell$1` as `Bell`、`Wrench$1` as `Wrench`、`Activity`、`Eye$1` as `Eye`、`History$1` as `History`、`Megaphone$1` as `Megaphone`、`ShieldAlert$1` as `ShieldAlert`、`Clipboard`、`Upload$1` as `Upload`、`Network$1` as `Network`、`WifiOff$1` as `WifiOff`、`Bug$1` as `Bug`
- `app/renderer/src/debug-panel/icon-opacity-preview-section.jsx`：`LoaderCircle$1` as `LoaderCircle`、`CloudOff$1` as `CloudOff`、`Minus`、`Globe`、`Pin`、`Smartphone`、`Globe2`、`ArrowLeft`、`RotateCw`、`Settings2$1` as `Settings2`、`Users$1` as `Users`、`FolderOpen$1` as `FolderOpen`、`Folder$1` as `Folder`、`ChevronDown$1` as `ChevronDown`、`ChevronRight$2` as `ChevronRight`、`ArrowUpRight$1` as `ArrowUpRight`、`Plus$1` as `Plus`、`Library$1` as `Library`、`Workflow$1` as `Workflow`、`Pin$1` as `PinnedIcon`、`Search$1` as `Search`、`Copy$1` as `Copy`、`ThumbsUp$1` as `ThumbsUp`
- `app/renderer/src/debug-panel/project-icon-catalog.jsx`：`ActivityIcon`、`AlertCircle`、`AlertTriangle`、`AlertTriangleIcon`、`AppWindow`、`Archive`、`ArrowDown`、`ArrowDownToLine`、`ArrowLeft`、`ArrowLeftRight`、`ArrowLeftToLine`、`ArrowRight`、`ArrowRightToLine`、`ArrowUp`、`ArrowUpDown`、`ArrowUpFromLine`、`ArrowUpRight`、`ArrowUpToLine`、`AtSign`、`AudioLines`、`AudioWaveform$1` as `AudioWaveform`、`BadgeCheck`、`BadgeInfo`、`Bell`、`BellRing`、`Bold$1` as `Bold`、`BookUser`、`Bot`、`Box`、`Boxes`、`BoxSelect`、`Bug`、`Calculator`、`ChartNoAxesCombined`、`Check`、`CheckCheck`、`CheckCircle2`、`CheckCircle2Icon`、`ChevronDown`、`ChevronDownIcon$1` as `ChevronDownIcon`、`ChevronLeft`、`ChevronLeftIcon`、`ChevronRight$1` as `ChevronRight`、`ChevronRightIcon`、`ChevronUp`、`ChevronUpIcon`、`CircleAlert`、`CircleArrowUp`、`CircleCheckIcon`、`CircleIcon`、`CircleMinus`、`CircleX`、`ClipboardIcon`、`ClipboardList`、`Cloud`、`CloudDownload`、`CloudIcon`、`CloudUpload`、`Code$1` as `Code`、`Cog`、`Command`、`Compass`、`Copy`、`CopyPlus`、`CreditCard`、`Crosshair`、`Crown`、`DownloadIcon`、`Ellipsis`、`ExternalLink`、`Eye`、`EyeIcon$1` as `EyeIcon`、`EyeOff`、`EyeOffIcon$1` as `EyeOffIcon`、`FileImage`、`FilePlus2`、`Film`、`FolderClock`、`FolderClosed`、`FolderInput`、`FolderMinus`、`FolderOpenIcon`、`FolderPlus`、`FolderUp`、`FolderX`、`Gauge`、`GiftIcon`、`GitCompare`、`Globe`、`Globe2`、`GraduationCap`、`Grid2X2`、`Grid2x2Plus`、`Grid3X3`、`GripHorizontalIcon`、`GripVertical`、`Hand`、`Headphones`、`HistoryIcon`、`Home`、`ImagePlus`、`Import`、`Inbox`、`Info$1` as `Info`、`InfoIcon$1` as `InfoIcon`、`Italic$1` as `Italic`、`Keyboard`、`KeyRound`、`Languages`、`Layers`、`Layers2`、`Layers3`、`LayoutGrid`、`LayoutList`、`LayoutTemplate`、`Library`、`Lightbulb`、`Link2`、`ListChecks`、`Loader2`、`Loader2Icon`、`LoaderCircle`、`Lock`、`LockKeyhole`、`Mail`、`Map$1` as `Map`、`MapPin`、`Maximize`、`MessageCircle`、`MessageCircleMore`、`MessageSquareMore`、`Minus`、`MinusIcon`、`Monitor`、`MonitorUp`、`MoreHorizontal`、`Music`、`Music2`、`Network`、`Newspaper`、`NotebookPen`、`OctagonXIcon`、`PackageSearch`、`Palette`、`PanelBottomClose`、`PanelLeftClose`、`PanelLeftOpen`、`PanelRightClose`、`PanelRightOpen`、`PanelsTopLeft`、`Pencil`、`PencilRuler`、`Phone`、`Pin`、`PinIcon`、`PinOff`、`Plus`、`PlusCircle`、`Podcast`、`Power`、`Redo2`、`Regex`、`Repeat2`、`RotateCcw`、`RotateCw`、`Save`、`Scan`、`Scissors`、`ScrollText`、`Search`、`SearchIcon`、`Send`、`ServerIcon`、`ServerOff`、`Share2`、`ShieldAlert`、`ShieldCheck`、`ShieldCheckIcon`、`ShieldOff`、`Shuffle`、`Slash`、`Smartphone`、`Speech`、`Split`、`SquareDashed`、`SquareMousePointer`、`StickyNote`、`Sun`、`SwatchBook`、`Tag$1` as `Tag`、`ThumbsDown`、`ThumbsUp`、`Trash2Icon`、`TrendingUp`、`TriangleAlert`、`TriangleAlertIcon`、`Tv`、`Underline$1` as `Underline`、`Undo2`、`UploadIcon$1` as `UploadIcon`、`User`、`UserRound`、`UserRoundPlus`、`UsersIcon`、`Video`、`VideoOff`、`Volume2`、`Volume2Icon`、`VolumeXIcon`、`Wand2`、`WandSparkles`、`WholeWord`、`WifiIcon`、`WifiOff`、`WifiOffIcon`、`Workflow`、`Wrench`、`X$7` as `X`、`XIcon`、`Zap`、`ZoomIn`、`ZoomOut`
- `app/renderer/src/generation/artifact-asset-card.jsx`：`Copy`、`Video`
- `app/renderer/src/generation/attachment-bar.jsx`：`Plus`
- `app/renderer/src/generation/chat-toolbar.jsx`：`Box`、`Plus`
- `app/renderer/src/generation/domestic-param-labels.jsx`：`AudioLines`、`Music`、`Scissors`、`Video`
- `app/renderer/src/generation/editable-param-chip.jsx`：`Info$1` as `Info`
- `app/renderer/src/generation/file-chip.jsx`：`Crosshair`
- `app/renderer/src/generation/file-explorer.jsx`：`LayoutGrid`、`LayoutList`
- `app/renderer/src/generation/filter-trigger.jsx`：`Check`、`ChevronDown`、`X$7` as `CloseIcon`
- `app/renderer/src/generation/markdown-link.jsx`：`ArrowUpRight`、`Copy`、`Crosshair`、`ExternalLink`、`Globe`、`Video`、`VideoOff`
- `app/renderer/src/generation/media-error-card.jsx`：`Check`、`CircleAlert`、`Loader2`、`TriangleAlert`、`X$7` as `CloseIcon`
- `app/renderer/src/generation/media-model-selector.jsx`：`ArrowUpRight`、`Bot`、`Check`、`Music`、`Video`
- `app/renderer/src/generation/mention-chip-node-view.jsx`：`Music`、`Video`、`X$7` as `CloseIcon`
- `app/renderer/src/generation/mention-picker-popover.jsx`：`ChevronRight$1` as `ChevronRight`、`Loader2Icon`、`Music`、`Video`
- `app/renderer/src/generation/model-chip.jsx`：`Bot`、`Music`、`ScrollText`、`Video`
- `app/renderer/src/generation/model-param-select.jsx`：`Copy`
- `app/renderer/src/generation/param-field.jsx`：`Check`、`ChevronDown`
- `app/renderer/src/generation/prompt-font-size-control.jsx`：`Check`、`Copy`、`RotateCcw`
- `app/renderer/src/generation/prompt-placeholder.jsx`：`ArrowUpRight`
- `app/renderer/src/generation/reference-media-strip.jsx`：`AudioLines`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Loader2`
- `app/renderer/src/generation/reference-switch-popover.jsx`：`Check`、`ChevronRight$1` as `ChevronRight`、`Music`、`Video`
- `app/renderer/src/generation/render-cost-disclosure.jsx`：`Info$1` as `Info`
- `app/renderer/src/generation/select-content.jsx`：`ChevronDownIcon$1` as `ChevronDownIcon`、`ChevronUpIcon`
- `app/renderer/src/generation/tool-confirm-card.jsx`：`AlertTriangle`、`Loader2`
- `app/renderer/src/generation/txt-popover-inner.jsx`：`ChevronDown`、`Lock`、`X$7` as `CloseIcon`
- `app/renderer/src/global-search/index.jsx`：`Search`
- `app/renderer/src/global-search/result-visuals.jsx`：`Search`、`LayoutGrid`、`Command`、`PackageSearch`、`FolderPlus`、`Music`、`Video`
- `app/renderer/src/home/media-showcase.jsx`：`LoaderCircle`、`Volume2`、`BadgeCheck`
- `app/renderer/src/home/promotion.jsx`：`ArrowRight`
- `app/renderer/src/home/prompt-picker.jsx`：`Plus`、`X$7` as `X`、`FolderMinus`、`ChevronDown`
- `app/renderer/src/home/toolbar.jsx`：`Plus`、`X$7` as `X`、`RotateCcw`
- `app/renderer/src/home/whats-new.jsx`：`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/infra/bundle-error-screen.jsx`：`AlertTriangle`、`ChevronDown`、`Info$1` as `Info`
- `app/renderer/src/infra/dialog-content.jsx`：`Check`、`Loader2Icon`、`XIcon`
- `app/renderer/src/infra/error-fallback-ui.jsx`：`AlertTriangle`
- `app/renderer/src/infra/media-preview.jsx`：`ChevronDown`、`Copy`、`Maximize`、`Pencil`、`Search`、`Tag$1` as `Tag`、`Volume2`
- `app/renderer/src/infra/parse-page-state-preview-schema.js`：`X$7` as `X`
- `app/renderer/src/infra/remote-tool-dialog.jsx`：`X$7` as `X`
- `app/renderer/src/infra/select-content.jsx`：`ChevronDownIcon$1` as `ChevronDownIcon`、`ChevronUpIcon`
- `app/renderer/src/media-editing/action-list-section.jsx`：`Bold$1` as `Bold`、`CircleAlert`、`Copy`、`Info$1` as `Info`、`Italic$1` as `Italic`、`Search`、`Trash2Icon`、`Underline$1` as `Underline`
- `app/renderer/src/media-editing/audio-preview-player.jsx`：`Loader2`、`Volume2`
- `app/renderer/src/media-editing/build-video-thumb-base.jsx`：`Maximize`、`Volume2`
- `app/renderer/src/media-editing/canvas-sticker-assets.jsx`：`X$7` as `X`
- `app/renderer/src/media-editing/color-adjust-dialog.jsx`：`Loader2`
- `app/renderer/src/media-editing/comfy-ui-plugin-launcher.jsx`：`Check`、`CircleAlert`、`LoaderCircle`、`Search`、`Workflow`
- `app/renderer/src/media-editing/customize-toolbar-dialog.jsx`：`Pin`、`PinOff`、`RotateCcw`、`X$7` as `X`
- `app/renderer/src/media-editing/html-viewer-inner.jsx`：`X$7` as `X`
- `app/renderer/src/media-editing/image-inplace-edit-toolbar-inner.jsx`：`BoxSelect`、`Check`、`ChevronDown`、`Hand`、`Pencil`、`Redo2`、`Slash`、`Tag$1` as `Tag`、`Undo2`
- `app/renderer/src/media-editing/image-lightbox.jsx`：`Archive`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Crown`、`ExternalLink`、`Minus`、`Plus`
- `app/renderer/src/media-editing/image-slot-list.jsx`：`Loader2`、`Plus`
- `app/renderer/src/media-editing/image-tool-meta.jsx`：`Layers3`
- `app/renderer/src/media-editing/layer-decompose-prompt.jsx`：`Layers3`
- `app/renderer/src/media-editing/markdown-audio.jsx`：`Crosshair`
- `app/renderer/src/media-editing/media-clip-panel-inner.jsx`：`Undo2`
- `app/renderer/src/media-editing/media-gen-detail.jsx`：`Check`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`CircleAlert`、`Copy`、`Crosshair`
- `app/renderer/src/media-editing/media-hover-preview.jsx`：`Crosshair`、`Maximize`
- `app/renderer/src/media-editing/message-list-props-equal.jsx`：`ChevronDownIcon$1` as `ChevronDownIcon`、`ChevronUpIcon`
- `app/renderer/src/media-editing/multi-angle-editor.jsx`：`X$7` as `X`
- `app/renderer/src/media-editing/package.jsx`：`AlignCenter$1` as `AlignCenterIcon`、`AlignLeft$1` as `AlignLeftIcon`、`AlignRight$1` as `AlignRightIcon`、`Ban$1` as `BanIcon`、`Blocks$1` as `BlocksIcon`、`Bookmark$1` as `BookmarkIcon`、`BookOpen$1` as `BookOpenIcon`、`Brain$1` as `BrainIcon`、`Brush$1` as `BrushIcon`、`Building2$1` as `Building2Icon`、`Cable$1` as `CableIcon`、`CalendarDays$1` as `CalendarDaysIcon`、`Camera$1` as `CameraIcon`、`CaseSensitive$1` as `CaseSensitiveIcon`、`Check$1` as `Check`、`Chrome$1` as `ChromeIcon`、`Circle$1` as `CircleIcon`、`CircleHelp$1` as `CircleHelpIcon`、`CircleUserRound$1` as `CircleUserRoundIcon`、`Clapperboard$1` as `ClapperboardIcon`、`ClipboardPaste$1` as `ClipboardPasteIcon`、`Clock$1` as `ClockIcon`、`Clock3$1` as `Clock3Icon`、`CloudOff$1` as `CloudOffIcon`、`CornerDownRight$1` as `CornerDownRightIcon`、`createLucideIcon`、`Download$1` as `DownloadIcon`、`Droplet$1` as `DropletIcon`、`Expand$1` as `ExpandIcon`、`FileArchive$1` as `FileArchiveIcon`、`FileAudio$1` as `FileAudioIcon`、`FileClock$1` as `FileClockIcon`、`FileCode$1` as `FileCodeIcon`、`FileDiff$1` as `FileDiffIcon`、`FileInput$1` as `FileInputIcon`、`FileJson2$1` as `FileJson2Icon`、`Files$1` as `FilesIcon`、`FileText$1` as `FileTextIcon`、`FileVideo$1` as `FileVideoIcon`、`FileWarning$1` as `FileWarningIcon`、`Flag$1` as `FlagIcon`、`Folder$1` as `FolderIcon`、`FolderKey$1` as `FolderKeyIcon`、`FolderOpen$1` as `FolderOpenIcon`、`HardDrive$1` as `HardDriveIcon`、`History$1` as `HistoryIcon`、`List$1` as `ListIcon`、`LogOut$1` as `LogOutIcon`、`Maximize2$1` as `Maximize2Icon`、`Megaphone$1` as `MegaphoneIcon`、`MessageSquare$1` as `MessageSquareIcon`、`MessageSquarePlus$1` as `MessageSquarePlusIcon`、`MessageSquareQuote$1` as `MessageSquareQuoteIcon`、`Mic$1` as `MicIcon`、`Minimize2$1` as `Minimize2Icon`、`Moon$1` as `MoonIcon`、`MousePointer2$1` as `MousePointer2Icon`、`Paperclip$1` as `PaperclipIcon`、`PencilLine$1` as `PencilLineIcon`、`PenLine$1` as `PenLineIcon`、`Plug$1` as `PlugIcon`、`Puzzle$1` as `PuzzleIcon`、`ReceiptText$1` as `ReceiptTextIcon`、`Replace$1` as `ReplaceIcon`、`ReplaceAll$1` as `ReplaceAllIcon`、`Settings$1` as `SettingsIcon`、`Settings2$1` as `Settings2Icon`、`ShoppingBag$1` as `ShoppingBagIcon`、`SlidersHorizontal$1` as `SlidersHorizontalIcon`、`Sparkles$1` as `SparklesIcon`、`Sprout$1` as `SproutIcon`、`Stamp$1` as `StampIcon`、`Trash2$1` as `Trash2Icon`、`Type$2` as `TypeIcon`、`Upload$1` as `UploadIcon`、`Users$1` as `UsersIcon`、`VolumeX$1` as `VolumeXIcon`
- `app/renderer/src/media-editing/panorama-generation-panel.jsx`：`ArrowUp`、`X$7` as `X`
- `app/renderer/src/media-editing/panorama-node.jsx`：`Grid2X2`、`Grid3X3`、`Power`
- `app/renderer/src/media-editing/panorama-viewer.jsx`：`Maximize`、`RotateCw`、`X$7` as `X`、`ZoomIn`、`ZoomOut`
- `app/renderer/src/media-editing/plugin-launcher.jsx`：`Layers`、`MoreHorizontal`
- `app/renderer/src/media-editing/ready-sub-image-card.jsx`：`X$7` as `X`
- `app/renderer/src/media-editing/reference-thumbnail-overlay.jsx`：`AtSign`
- `app/renderer/src/media-editing/relight-editor.jsx`：`Loader2`
- `app/renderer/src/media-editing/relight-popover.jsx`：`X$7` as `X`
- `app/renderer/src/media-editing/sticker-node-toolbar.jsx`：`ChevronDown`、`ChevronUp`、`CopyPlus`
- `app/renderer/src/media-editing/storyboard-grid-editor.jsx`：`Plus`、`X$7` as `X`
- `app/renderer/src/media-editing/text-node-inner.jsx`：`ClipboardList`
- `app/renderer/src/media-editing/thumb-chip.jsx`：`CircleAlert`、`Scissors`、`X$7` as `X`
- `app/renderer/src/media-editing/timeline-item.jsx`：`ChevronDown`、`ClipboardList`、`SquareMousePointer`
- `app/renderer/src/media-editing/turn-artifact-strip.jsx`：`AudioLines`、`ChevronDown`、`CircleAlert`、`ClipboardList`、`Cog`、`Search`、`SquareMousePointer`、`Video`、`Zap`
- `app/renderer/src/media-editing/use-lightbox-media-actions.jsx`：`Archive`、`Copy`
- `app/renderer/src/media-editing/use-preview-text.jsx`：`XIcon`
- `app/renderer/src/media-editing/video-lightbox.jsx`：`Archive`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/media-editing/watermark-popover.jsx`：`X$7` as `X`
- `app/renderer/src/project-detail/assets-common.jsx`：`Search`、`X$7` as `X`、`LayoutGrid`、`AlertTriangle`、`Inbox`、`Loader2`
- `app/renderer/src/project-detail/cloud/cloud-assets-panel.jsx`：`FolderPlus`、`Bug`
- `app/renderer/src/project-detail/cloud/cloud-node.jsx`：`ChevronRight$1` as `ChevronRight`、`FolderInput`
- `app/renderer/src/project-detail/cloud/debug-dump-view.jsx`：`Copy`
- `app/renderer/src/project-detail/index.jsx`：`ChevronRight$1` as `ChevronRight`、`ArrowLeft`、`UserRoundPlus`、`Plus`、`Info$1` as `Info`
- `app/renderer/src/project-detail/invite.jsx`：`BadgeInfo`、`Check`、`Link2`、`ChevronDown`
- `app/renderer/src/project-detail/local/local-assets-panel.jsx`：`FolderPlus`
- `app/renderer/src/project-detail/local/local-node.jsx`：`ChevronRight$1` as `ChevronRight`、`FolderInput`、`ExternalLink`
- `app/renderer/src/projects/cloud-debug.jsx`：`CloudDownload`
- `app/renderer/src/projects/index.jsx`：`Plus`、`CloudUpload`、`ChevronDown`
- `app/renderer/src/projects/project-member-summary.jsx`：`ChevronDown`
- `app/renderer/src/routes/chat-case.jsx`：`MessageCircleMore`、`Check`
- `app/renderer/src/settings/asset-center-migrate-dialog.jsx`：`ArrowRight`、`FolderInput`、`Loader2`、`ShieldAlert`
- `app/renderer/src/settings/attach-native-toast-surface.jsx`：`CircleCheckIcon`、`InfoIcon$1` as `InfoIcon`、`Loader2Icon`、`OctagonXIcon`、`TriangleAlertIcon`
- `app/renderer/src/settings/canvas-help-button.jsx`：`ChevronRight$1` as `ChevronRight`、`Keyboard`、`Lightbulb`
- `app/renderer/src/settings/changelog-detail-dialog.jsx`：`CircleArrowUp`、`X$7` as `X`
- `app/renderer/src/settings/changelog-table.jsx`：`XIcon`
- `app/renderer/src/settings/compact-rewrite-flow.jsx`：`ChevronLeft`、`LoaderCircle`
- `app/renderer/src/settings/connector-api-key-section.jsx`：`ArrowUpRight`
- `app/renderer/src/settings/connector-capability-card.jsx`：`LoaderCircle$1` as `LoaderCircle`
- `app/renderer/src/settings/connector-cli-auth-section.jsx`：`ArrowUpRight`
- `app/renderer/src/settings/connector-dialog-frame.jsx`：`XIcon`
- `app/renderer/src/settings/connector-manual-credential-section.jsx`：`ArrowUpRight`
- `app/renderer/src/settings/connector-prompt-action.jsx`：`Link2`、`Loader2`、`MessageCircle`
- `app/renderer/src/settings/connector-relationship-graphic.jsx`：`Link2`、`ShieldAlert`、`X$7` as `X`
- `app/renderer/src/settings/connector-summary-action.jsx`：`KeyRound`、`Link2`、`Loader2`、`MessageCircle`
- `app/renderer/src/settings/custom-connector-dialog.jsx`：`ChevronDown`
- `app/renderer/src/settings/custom-provider-form.jsx`：`ChevronDown`、`Eye`、`EyeOff`、`Plus`、`RotateCcw`、`X$7` as `X`
- `app/renderer/src/settings/data-directory-settings.jsx`：`AlertTriangle`、`ArrowRight`、`FolderInput`、`Loader2`、`ShieldAlert`
- `app/renderer/src/settings/diagnostics-status-button.jsx`：`ActivityIcon`、`AlertTriangleIcon`、`CheckCircle2Icon`、`ClipboardIcon`、`CloudIcon`、`DownloadIcon`、`FolderOpenIcon`、`ServerIcon`、`ShieldCheckIcon`、`UploadIcon$1` as `UploadIcon`、`UsersIcon`、`WifiIcon`、`WifiOffIcon`
- `app/renderer/src/settings/feature-popup.jsx`：`GiftIcon`、`Volume2Icon`、`VolumeXIcon`、`XIcon`
- `app/renderer/src/settings/feedback-dialog.jsx`：`X$7` as `X`
- `app/renderer/src/settings/folder-whitelist-section.jsx`：`FolderPlus`、`X$7` as `X`
- `app/renderer/src/settings/forced-update-dialog.jsx`：`CircleArrowUp`、`Loader2`、`RotateCw`
- `app/renderer/src/settings/im-bridge-manager.jsx`：`ArrowUpRight`、`Info$1` as `Info`
- `app/renderer/src/settings/integration-status-pill.jsx`：`InfoIcon$1` as `InfoIcon`
- `app/renderer/src/settings/local-connector-setup-content.jsx`：`Check`、`CircleAlert`、`Loader2`
- `app/renderer/src/settings/make-async-image-task.jsx`：`ShieldCheck`
- `app/renderer/src/settings/memory-manager.jsx`：`LoaderCircle`、`Plus`、`RotateCcw`、`Search`、`Undo2`、`WandSparkles`
- `app/renderer/src/settings/migration-popup.jsx`：`InfoIcon$1` as `InfoIcon`
- `app/renderer/src/settings/qr-card.jsx`：`LoaderCircle`
- `app/renderer/src/settings/recent-project-group-header.jsx`：`ArrowUpDown`、`ArrowUpRight`、`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`Pin`、`Plus`
- `app/renderer/src/settings/restart-banner.jsx`：`AlertCircle`
- `app/renderer/src/settings/search-button.jsx`：`Search`
- `app/renderer/src/settings/server-driven-popup-orchestrator.jsx`：`ChevronLeftIcon`、`XIcon`
- `app/renderer/src/settings/software-update-section-content.jsx`：`AlertCircle`
- `app/renderer/src/settings/step-indicator.jsx`：`Check`
- `app/renderer/src/settings/trial-granted-popup.jsx`：`XIcon`
- `app/renderer/src/settings/tutorial-button.jsx`：`ArrowUpRight`、`Bot`
- `app/renderer/src/settings/update-banner.jsx`：`CircleArrowUp`、`RotateCw`、`X$7` as `X`
- `app/renderer/src/settings/update-sidebar-widget-inner.jsx`：`AlertTriangle`、`LoaderCircle`、`RotateCw`
- `app/renderer/src/settings/use-direct-feedback.jsx`：`Check`、`Loader2`
- `app/renderer/src/settings/version-row.jsx`：`CircleArrowUp`
- `app/renderer/src/settings/window-close-dialog-content.jsx`：`PanelBottomClose`
- `app/renderer/src/shared/page-search-input.jsx`：`Search`、`X$7` as `X`
- `app/renderer/src/skills/auto-update-banner.jsx`：`X$7` as `X`
- `app/renderer/src/skills/community-tab.jsx`：`Loader2`
- `app/renderer/src/skills/connectors/browser-connector.jsx`：`Boxes`、`ScrollText`
- `app/renderer/src/skills/connectors/connector-catalog-data.jsx`：`Globe`、`Cloud`、`ChartNoAxesCombined`、`Box`
- `app/renderer/src/skills/connectors/connectors-tab.jsx`：`Plus`、`Search`、`ChevronDown`
- `app/renderer/src/skills/creator-plan/dialog.jsx`：`X$7` as `X`、`Info$1` as `Info`、`CheckCircle2`、`ImagePlus`、`Video`
- `app/renderer/src/skills/creator-plan/form-parts.jsx`：`X$7` as `X`
- `app/renderer/src/skills/creator-plan/invite-card.jsx`：`Plus`
- `app/renderer/src/skills/index.jsx`：`Plus`、`Link2`、`Import`、`ExternalLink`
- `app/renderer/src/skills/my-skills/my-skills-view.jsx`：`MoreHorizontal`
- `app/renderer/src/skills/my-skills/skill-cards.jsx`：`MessageCircle`、`Loader2`、`BadgeCheck`
- `app/renderer/src/skills/operations/category-weight-editor.jsx`：`Plus`、`GripVertical`
- `app/renderer/src/skills/operations/operations-view.jsx`：`Plus`、`X$7` as `X`、`Loader2`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Check`
- `app/renderer/src/skills/operations/published-panel.jsx`：`X$7` as `X`、`Loader2`、`Save`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/skills/operations/review-lists.jsx`：`Loader2`
- `app/renderer/src/skills/page-parts.jsx`：`Info$1` as `Info`、`Loader2`
- `app/renderer/src/skills/plugins/plugin-market-card.jsx`：`BadgeCheck`、`Eye`、`Workflow`
- `app/renderer/src/skills/plugins/plugin-market-detail.jsx`：`Loader2`
- `app/renderer/src/skills/plugins/plugin-market-tab.jsx`：`Loader2`
- `app/renderer/src/skills/skill-detail/dialog.jsx`：`X$7` as `X`、`Loader2`、`BadgeCheck`、`UserRound`、`Share2`
- `app/renderer/src/skills/skill-detail/showcase.jsx`：`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Volume2`、`ListChecks`、`ArrowUpRight`
- `app/renderer/src/skills/skill-import-dialog.jsx`：`CheckCircle2`、`Loader2`、`AlertCircle`、`FilePlus2`
- `app/renderer/src/team/account-switcher-row-surface.jsx`：`Check`、`UserRound`
- `app/renderer/src/team/account-switcher-view.jsx`：`ChevronLeft`、`Plus`
- `app/renderer/src/team/activity-group.jsx`：`ChevronRight$1` as `ChevronRight`、`Globe`、`Wrench`
- `app/renderer/src/team/billing-insufficient-card.jsx`：`CircleAlert`
- `app/renderer/src/team/calendar.jsx`：`ChevronDownIcon$1` as `ChevronDownIcon`、`ChevronLeftIcon`、`ChevronRightIcon`
- `app/renderer/src/team/copy-icon-button.jsx`：`AlertTriangle`、`Check`、`Copy`
- `app/renderer/src/team/create-invite-link-page.jsx`：`AlertTriangle`、`Copy`、`Link2`
- `app/renderer/src/team/create-team-dialog.jsx`：`Info$1` as `Info`
- `app/renderer/src/team/credit-details-dialog.jsx`：`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Info$1` as `Info`
- `app/renderer/src/team/credit-reminder-settings.jsx`：`ArrowLeft`
- `app/renderer/src/team/credit-threshold-reminder-card.jsx`：`CircleAlert`
- `app/renderer/src/team/delete-account-confirm-dialog.jsx`：`AlertTriangle`
- `app/renderer/src/team/dissolve-team-dialog.jsx`：`AlertTriangle`
- `app/renderer/src/team/error-message.jsx`：`AlertCircle`、`CreditCard`、`ExternalLink`、`KeyRound`、`ServerOff`、`ShieldAlert`、`WifiOff`、`Zap`
- `app/renderer/src/team/hailuo-credit-row.jsx`：`ArrowRight`、`ChevronRight$1` as `ChevronRight`、`Info$1` as `Info`
- `app/renderer/src/team/invite-members-page.jsx`：`X$7` as `X`
- `app/renderer/src/team/past-team-members-panel.jsx`：`Search`、`UserRoundPlus`、`X$7` as `X`
- `app/renderer/src/team/streaming-label.jsx`：`ChevronDown`、`ChevronUp`
- `app/renderer/src/team/team-account-summary.jsx`：`ArrowLeftRight`、`ChevronRight$1` as `ChevronRight`、`UserRound`
- `app/renderer/src/team/team-credit-history-section.jsx`：`Info$1` as `Info`
- `app/renderer/src/team/team-credit-summary-surface.jsx`：`Info$1` as `Info`
- `app/renderer/src/team/team-invite-deep-link-dialog.jsx`：`Loader2`、`ShieldCheck`、`UserRound`
- `app/renderer/src/team/team-ledger-filters.jsx`：`ChevronDown`
- `app/renderer/src/team/team-management-detail-loading.jsx`：`Inbox`、`Info$1` as `Info`
- `app/renderer/src/team/team-management-dialog.jsx`：`ArrowLeftRight`、`Copy`、`CreditCard`、`Plus`、`Search`
- `app/renderer/src/team/team-member-combobox.jsx`：`Check`、`ChevronDown`、`Search`
- `app/renderer/src/team/team-member-quota-usage-cell.jsx`：`CircleAlert`
- `app/renderer/src/team/team-panel-error.jsx`：`AlertCircle`、`LockKeyhole`
- `app/renderer/src/team/team-panel-stale.jsx`：`Loader2`、`TriangleAlert`
- `app/renderer/src/team/transfer-credit-form.jsx`：`AlertTriangle`
- `app/renderer/src/team/use-team-transactions-feed-query.jsx`：`Loader2Icon`
- `app/renderer/src/text-editor/attachment-preview.jsx`：`AlertCircle`、`AtSign`、`Loader2`、`X$7` as `X`
- `app/renderer/src/text-editor/browser-annotation-editor.jsx`：`Check`、`LoaderCircle`、`Send`、`X$7` as `X`
- `app/renderer/src/text-editor/creation-guide-placeholder.jsx`：`ArrowUpRight`
- `app/renderer/src/text-editor/editor-history-controls.jsx`：`Redo2`、`Undo2`
- `app/renderer/src/text-editor/error-block.jsx`：`AlertCircle`、`ChevronDown`
- `app/renderer/src/text-editor/find-bar.jsx`：`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`ChevronUp`、`Regex`、`Search`、`WholeWord`、`X$7` as `X`
- `app/renderer/src/text-editor/image-annotation-dialog.jsx`：`ArrowUpRight`、`ChevronDown`、`Grid3X3`、`Minus`、`Redo2`、`Tag$1` as `Tag`、`Undo2`、`X$7` as `X`
- `app/renderer/src/text-editor/markdown-fullscreen.jsx`：`Grid2x2Plus`
- `app/renderer/src/text-editor/node-context-menu.jsx`：`Copy`、`CopyPlus`、`FolderInput`、`Library`、`Save`、`Tag$1` as `Tag`
- `app/renderer/src/text-editor/pending-annotation-list.jsx`：`X$7` as `X`
- `app/renderer/src/text-editor/production-plan-timeline.jsx`：`Check`、`ChevronDown`、`CircleAlert`、`ClipboardList`、`Crosshair`、`Loader2`
- `app/renderer/src/text-editor/question-tool-card.jsx`：`Check`、`ChevronDown`
- `app/renderer/src/text-editor/skill-reload-dock.jsx`：`ArrowRight`、`Crosshair`、`X$7` as `X`
- `app/renderer/src/text-editor/source-text-fullscreen.jsx`：`Redo2`、`Undo2`
- `app/renderer/src/text-editor/table-ops.jsx`：`ArrowDownToLine`、`ArrowLeftToLine`、`ArrowRightToLine`、`ArrowUpToLine`
- `app/renderer/src/text-editor/use-source-diff-review.jsx`：`ChevronDown`、`ChevronUp`
- `app/renderer/src/text-editor/use-text-conflict-resolver.jsx`：`ChevronDown`、`ChevronUp`
- `app/renderer/src/text-editor/use-text-version-panel.jsx`：`Pencil`、`Save`
- `app/renderer/src/text-editor/use-text-version-preview.jsx`：`ArrowLeft`、`ChevronLeft`、`ChevronRight$1` as `ChevronRight`、`Copy`、`GitCompare`、`RotateCcw`
- `app/renderer/src/workflows/attribution.jsx`：`ExternalLink`
- `app/renderer/src/workflows/compatibility-comparison.jsx`：`CheckCircle2`、`CircleX`、`Gauge`、`CircleMinus`
- `app/renderer/src/workflows/download-confirm-dialog.jsx`：`ShieldCheck`、`ExternalLink`
- `app/renderer/src/workflows/download-section.jsx`：`X$7` as `X`、`CircleAlert`、`ShieldCheck`
- `app/renderer/src/workflows/index.jsx`：`X$7` as `X`、`Plus`、`Loader2`、`ChevronRight$1` as `ChevronRight`、`Workflow`
- `app/renderer/src/workflows/tutorial-dialog.jsx`：`ExternalLink`
- `app/renderer/src/workflows/use-menu.jsx`：`PanelsTopLeft`、`Plus`、`FolderClock`
- `app/renderer/src/workflows/user-workflow-item.jsx`：`PanelsTopLeft`
- `app/renderer/src/workflows/workflow-card.jsx`：`PanelsTopLeft`
- `app/renderer/src/workflows/workflow-detail.jsx`：`Layers3`、`ArrowLeft`
- `app/renderer/src/workspace/add-to-project-sub-menu.jsx`：`Check`、`Search`
- `app/renderer/src/workspace/browser-bookmarks.jsx`：`ChevronDown`、`Globe2`、`Palette`、`Shuffle`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/browser-error-card.jsx`：`AlertCircle`、`ExternalLink`
- `app/renderer/src/workspace/browser-search-history.jsx`：`Search`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/browser-tab-overview.jsx`：`Check`、`ChevronDown`、`Globe`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/canvas-sidebar-overlay.jsx`：`X$7` as `CloseIcon`
- `app/renderer/src/workspace/coach-mark-popup.jsx`：`Loader2`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/context-menu-content.jsx`：`ChevronRightIcon`
- `app/renderer/src/workspace/create-project-dialog.jsx`：`BadgeInfo`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/home-sidebar.jsx`：`ArrowUpRight`、`ChevronDown`、`ChevronRight$1` as `ChevronRight`、`Library`、`Plus`
- `app/renderer/src/workspace/home-widget-host.jsx`：`X$7` as `CloseIcon`
- `app/renderer/src/workspace/icon-button.jsx`：`Globe`
- `app/renderer/src/workspace/interest-option-grid.jsx`：`Film`、`GraduationCap`、`Music`
- `app/renderer/src/workspace/new-workspace-dialog.jsx`：`AlertTriangle`、`ChevronDown`、`Plus`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/recent-project-row.jsx`：`Check`、`CircleAlert`、`CircleX`、`Copy`、`FolderX`、`Pin`
- `app/renderer/src/workspace/recent-projects-header-actions.jsx`：`ArrowUpDown`、`Plus`
- `app/renderer/src/workspace/save-to-project-assets-dialog.jsx`：`FolderPlus`、`Loader2`
- `app/renderer/src/workspace/scenarios.jsx`：`Plus`
- `app/renderer/src/workspace/scene-categories.js`：`Film`、`Palette`
- `app/renderer/src/workspace/shortcut-categories.jsx`：`X$7` as `CloseIcon`
- `app/renderer/src/workspace/shortcut-hint.jsx`：`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/workspace/skill-filter-bar.jsx`：`ChevronDown`
- `app/renderer/src/workspace/slash-command-popover-content.jsx`：`ChevronLeft`、`ChevronRight$1` as `ChevronRight`
- `app/renderer/src/workspace/stage-prompt-editor-card.jsx`：`Check`、`Loader2`、`RotateCcw`
- `app/renderer/src/workspace/text-editor-skill-categories.jsx`：`Info$1` as `Info`
- `app/renderer/src/workspace/topbar-search-dialog-lazy.jsx`：`AlertTriangle`
- `app/renderer/src/workspace/use-folder-permission-gate.jsx`：`ShieldCheck`
- `app/renderer/src/workspace/use-home-quick-start-config.js`：`Film`、`Palette`
- `app/renderer/src/workspace/use-new-workspace-dialog.jsx`：`AlertTriangle`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/user-avatar-menu.jsx`：`ChevronRight$1` as `ChevronRight`、`Monitor`、`Palette`、`Smartphone`、`Sun`、`SwatchBook`、`Wrench`
- `app/renderer/src/workspace/workspace-browser.jsx`：`ArrowLeft`、`ArrowRight`、`ArrowUpRight`、`Globe`、`MoreHorizontal`、`Plus`、`RotateCw`、`X$7` as `CloseIcon`
- `app/renderer/src/workspace/workspace-card.jsx`：`SquareDashed`、`FolderX`
- `app/renderer/src/workspace/workspace-content.jsx`：`ChevronDown`
- `app/renderer/src/workspace/workspace-view-switch.jsx`：`Globe`、`PanelsTopLeft`

### wavesurfer.js 7.12.7

第二批。表内 23 个在 20404–21688 行。`c$2`、`y$4`、`C$4`、`S$3` 在删除表里是推断归属。正文另外点了 `E$4`，紧接在 `P$3` 后面。这次只定位，没有对 7.12.7 再跑 xcanon。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `t` | 20404 | 20428 | 535 |
| `e` | 20430 | 20458 | 716 |
| `i$1` | 20459 | 20503 | 1478 |
| `n` | 20504 | 20508 | 516 |
| `s$3` | 20509 | 20512 | 105 |
| `r$4` | 20513 | 20517 | 85 |
| `o$3` | 20518 | 20547 | 981 |
| `a` | 20548 | 20563 | 318 |
| `l$2` | 20564 | 20575 | 257 |
| `h$3` | 20576 | 20585 | 230 |
| `c$2` | 20586 | 20720 | 4785 |
| `u$2` | 20721 | 20735 | 305 |
| `d$2` | 20736 | 20744 | 175 |
| `p$3` | 20745 | 20749 | 119 |
| `m$3` | 20750 | 20752 | 79 |
| `g$1` | 20753 | 20758 | 172 |
| `v$3` | 20759 | 20768 | 186 |
| `f$2` | 20769 | 20772 | 81 |
| `b$3` | 20773 | 20820 | 1078 |
| `y$4` | 20821 | 21534 | 25418 |
| `C$4` | 21535 | 21553 | 533 |
| `S$3` | 21554 | 21676 | 4778 |
| `P$3` | 21677 | 21688 | 215 |

正文点名、不在上表里的顶层声明：

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `E$4` | 21689 | 22083 | 14573 |

调用方：

1 个文件、1 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/assets/asset-panel-overlay-host.jsx`：`E$4` as `WaveSurfer`

### @tiptap/extension-table 3.31.3

第二批。9 个声明在 12854–13305 行。`createCell`、`createTable` 是推断归属，应用文件不 import 它们。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `TableCell$1` | 12854 | 12893 | 806 |
| `TableHeader$1` | 12894 | 12933 | 817 |
| `TableRow$1` | 12934 | 12953 | 374 |
| `createCell` | 12954 | 12956 | 81 |
| `createTable` | 12957 | 12972 | 673 |
| `isCellSelection` | 12973 | 12975 | 76 |
| `deleteTableWhenAllCellsSelected` | 12976 | 12994 | 643 |
| `keepCursorInTable` | 12995 | 13003 | 533 |
| `Table$2` | 13004 | 13305 | 9497 |

调用方：

1 个文件、4 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/text-editor/markdown-fullscreen.jsx`：`Table$2` as `Table`、`TableCell$1` as `TableCell`、`TableHeader$1` as `TableHeader`、`TableRow$1` as `TableRow`

### shiki 3.23.0

第三批。7 个声明在 22201–23554 行。`createHighlighter` 是推断归属。应用文件不直接 import 这 7 个名字；紧接着的高亮插件在同一文件里调用 `createHighlighter`。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `bundledLanguagesInfo` | 22201 | 23215 | 23843 |
| `bundledLanguagesBase` | 23216 | 23216 | 100 |
| `bundledLanguagesAlias` | 23217 | 23217 | 131 |
| `bundledLanguages` | 23218 | 23221 | 83 |
| `bundledThemesInfo` | 23222 | 23547 | 9215 |
| `bundledThemes` | 23548 | 23548 | 90 |
| `createHighlighter` | 23550 | 23554 | 221 |

调用方：

应用源码里没有文件 import 这些声明。扫描范围是 `app/`，不含 `vendor.js`。

### qr.js 0.0.0

第三批。27 个 CJS 声明在 19181–19988 行。没有应用文件 import。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `ErrorCorrectLevel` | 19181 | 19181 | 22 |
| `hasRequiredErrorCorrectLevel` | 19182 | 19182 | 33 |
| `requireErrorCorrectLevel` | 19183 | 19193 | 233 |
| `mode` | 19194 | 19194 | 9 |
| `hasRequiredMode` | 19195 | 19195 | 20 |
| `requireMode` | 19196 | 19206 | 220 |
| `_8BitByte` | 19207 | 19207 | 14 |
| `hasRequired_8BitByte` | 19208 | 19208 | 25 |
| `require_8BitByte` | 19209 | 19229 | 529 |
| `RSBlock` | 19230 | 19230 | 12 |
| `hasRequiredRSBlock` | 19231 | 19231 | 23 |
| `requireRSBlock` | 19232 | 19355 | 5596 |
| `BitBuffer` | 19356 | 19356 | 14 |
| `hasRequiredBitBuffer` | 19357 | 19357 | 25 |
| `requireBitBuffer` | 19358 | 19391 | 906 |
| `math` | 19392 | 19392 | 9 |
| `hasRequiredMath` | 19393 | 19393 | 20 |
| `requireMath` | 19394 | 19427 | 852 |
| `Polynomial` | 19428 | 19428 | 15 |
| `hasRequiredPolynomial` | 19429 | 19429 | 26 |
| `requirePolynomial` | 19430 | 19480 | 1589 |
| `util` | 19481 | 19481 | 9 |
| `hasRequiredUtil` | 19482 | 19482 | 20 |
| `requireUtil` | 19483 | 19671 | 7130 |
| `QRCode_1` | 19672 | 19672 | 13 |
| `hasRequiredQRCode` | 19673 | 19673 | 22 |
| `requireQRCode` | 19674 | 19988 | 10705 |

调用方：

应用源码里没有文件 import 这些声明。扫描范围是 `app/`，不含 `vendor.js`。

### @speed-highlight/core 1.2.22

第三批。119 个声明在 7210–8233 行，紧挨在 jszip 前面。其中 `k$6`、`R$6`、`L$7`、`ut$2`、`D$7`、`Nt$1`、`$t$2` 是推断归属。很多名字挤在同一条 `var` 里，表里标了「同句」。这次只定位，没有再跑 xcanon。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 | 切分 |
| --- | --- | --- | --- | --- |
| `s$4` | 7210 | 7215 | 106 | 独立 |
| `P$7` | 7216 | 7216 | 13 | 独立 |
| `Wt$2` | 7220 | 7221 | 12 | 同句 |
| `F$6` | 7221 | 7246 | 460 | 同句 |
| `$$8` | 7247 | 7247 | 13 | 独立 |
| `M$7` | 7251 | 7252 | 11 | 同句 |
| `T$6` | 7252 | 7253 | 7 | 同句 |
| `f$4` | 7253 | 7285 | 932 | 同句 |
| `v$7` | 7286 | 7286 | 13 | 独立 |
| `jt$2` | 7290 | 7291 | 12 | 同句 |
| `B$7` | 7291 | 7305 | 248 | 同句 |
| `G$5` | 7306 | 7306 | 13 | 独立 |
| `Kt$1` | 7310 | 7311 | 12 | 同句 |
| `H$5` | 7311 | 7348 | 948 | 同句 |
| `_$5` | 7349 | 7349 | 13 | 独立 |
| `Vt$1` | 7353 | 7354 | 12 | 同句 |
| `k$6` | 7354 | 7395 | 910 | 同句 |
| `z$7` | 7396 | 7396 | 13 | 独立 |
| `qt$2` | 7400 | 7401 | 12 | 同句 |
| `Y$4` | 7401 | 7408 | 118 | 同句 |
| `Z$4` | 7409 | 7409 | 13 | 独立 |
| `I$5` | 7413 | 7414 | 11 | 同句 |
| `N$4` | 7414 | 7428 | 276 | 同句 |
| `X$6` | 7429 | 7429 | 13 | 独立 |
| `Qt$1` | 7433 | 7434 | 12 | 同句 |
| `W$7` | 7434 | 7440 | 228 | 同句 |
| `j$5` | 7441 | 7441 | 13 | 独立 |
| `Jt$2` | 7445 | 7446 | 12 | 同句 |
| `K$6` | 7446 | 7460 | 257 | 同句 |
| `V$6` | 7461 | 7461 | 13 | 独立 |
| `te$3` | 7465 | 7466 | 12 | 同句 |
| `q$5` | 7466 | 7487 | 582 | 同句 |
| `J$6` | 7488 | 7488 | 13 | 独立 |
| `Q$6` | 7495 | 7496 | 11 | 同句 |
| `ee$3` | 7496 | 7497 | 8 | 同句 |
| `u$4` | 7497 | 7498 | 7 | 同句 |
| `l$4` | 7498 | 7499 | 7 | 同句 |
| `o$5` | 7499 | 7500 | 7 | 同句 |
| `A$5` | 7500 | 7501 | 7 | 同句 |
| `R$6` | 7501 | 7549 | 1327 | 同句 |
| `tt$4` | 7550 | 7550 | 14 | 独立 |
| `ae$3` | 7554 | 7555 | 12 | 同句 |
| `et$4` | 7555 | 7589 | 888 | 同句 |
| `se$3` | 7590 | 7591 | 12 | 同句 |
| `E$7` | 7591 | 7592 | 7 | 同句 |
| `d$4` | 7592 | 7594 | 1807 | 同句 |
| `at$3` | 7595 | 7595 | 14 | 独立 |
| `pe$2` | 7599 | 7600 | 12 | 同句 |
| `st$3` | 7600 | 7622 | 451 | 同句 |
| `pt$2` | 7623 | 7623 | 14 | 独立 |
| `ne$4` | 7627 | 7628 | 12 | 同句 |
| `nt$4` | 7628 | 7645 | 312 | 同句 |
| `ct$3` | 7646 | 7646 | 14 | 独立 |
| `ce$3` | 7650 | 7651 | 12 | 同句 |
| `mt$2` | 7651 | 7672 | 791 | 同句 |
| `rt$3` | 7673 | 7673 | 14 | 独立 |
| `O$6` | 7677 | 7678 | 11 | 同句 |
| `L$7` | 7678 | 7714 | 1181 | 同句 |
| `ot$3` | 7715 | 7715 | 14 | 独立 |
| `me$1` | 7720 | 7721 | 12 | 同句 |
| `re$6` | 7721 | 7722 | 8 | 同句 |
| `ut$2` | 7722 | 7746 | 701 | 同句 |
| `lt$3` | 7747 | 7747 | 14 | 独立 |
| `x$8` | 7752 | 7753 | 11 | 同句 |
| `oe$3` | 7753 | 7754 | 8 | 同句 |
| `S$7` | 7754 | 7768 | 327 | 同句 |
| `Et$2` | 7769 | 7769 | 14 | 独立 |
| `ue$3` | 7774 | 7775 | 12 | 同句 |
| `le$3` | 7775 | 7776 | 8 | 同句 |
| `ht$2` | 7776 | 7788 | 245 | 同句 |
| `it$3` | 7789 | 7789 | 14 | 独立 |
| `Ee$3` | 7793 | 7794 | 12 | 同句 |
| `gt$2` | 7794 | 7809 | 308 | 同句 |
| `dt$4` | 7810 | 7810 | 14 | 独立 |
| `C$a` | 7814 | 7815 | 11 | 同句 |
| `D$7` | 7815 | 7853 | 789 | 同句 |
| `bt$3` | 7854 | 7854 | 14 | 独立 |
| `he$3` | 7858 | 7859 | 12 | 同句 |
| `yt$2` | 7859 | 7883 | 693 | 同句 |
| `Tt$2` | 7884 | 7884 | 14 | 独立 |
| `ie$4` | 7888 | 7889 | 12 | 同句 |
| `ft$3` | 7889 | 7910 | 470 | 同句 |
| `It$1` | 7911 | 7911 | 14 | 独立 |
| `ge$2` | 7915 | 7916 | 12 | 同句 |
| `Nt$1` | 7916 | 7937 | 522 | 同句 |
| `At$3` | 7938 | 7938 | 14 | 独立 |
| `de$4` | 7942 | 7943 | 12 | 同句 |
| `Rt$2` | 7943 | 7970 | 487 | 同句 |
| `Ot$2` | 7971 | 7971 | 14 | 独立 |
| `be$2` | 7975 | 7976 | 12 | 同句 |
| `Lt$1` | 7976 | 7995 | 571 | 同句 |
| `xt$2` | 7996 | 7996 | 14 | 独立 |
| `ye$2` | 8000 | 8001 | 12 | 同句 |
| `St$2` | 8001 | 8005 | 72 | 同句 |
| `Ct$3` | 8006 | 8006 | 14 | 独立 |
| `Te$3` | 8010 | 8011 | 12 | 同句 |
| `Dt$2` | 8011 | 8049 | 947 | 同句 |
| `wt$3` | 8050 | 8050 | 14 | 独立 |
| `fe$1` | 8055 | 8056 | 12 | 同句 |
| `Ie$2` | 8056 | 8057 | 8 | 同句 |
| `Ut$2` | 8057 | 8071 | 306 | 同句 |
| `Pt$2` | 8072 | 8072 | 14 | 独立 |
| `Ne$2` | 8076 | 8077 | 12 | 同句 |
| `Ft$2` | 8077 | 8098 | 710 | 同句 |
| `Mt$1` | 8099 | 8099 | 14 | 独立 |
| `Ae$3` | 8103 | 8104 | 12 | 同句 |
| `$t$2` | 8104 | 8129 | 3188 | 同句 |
| `vt$2` | 8130 | 8130 | 14 | 独立 |
| `Re$2` | 8134 | 8135 | 12 | 同句 |
| `Bt$1` | 8135 | 8162 | 520 | 同句 |
| `Gt$1` | 8163 | 8163 | 14 | 独立 |
| `Oe$3` | 8167 | 8168 | 12 | 同句 |
| `Ht$1` | 8168 | 8177 | 303 | 同句 |
| `_t$2` | 8178 | 8178 | 14 | 独立 |
| `Le$2` | 8182 | 8183 | 12 | 同句 |
| `kt$2` | 8183 | 8203 | 374 | 同句 |
| `zt$2` | 8204 | 8204 | 14 | 独立 |
| `xe$1` | 8208 | 8209 | 12 | 同句 |
| `Yt$2` | 8209 | 8233 | 446 | 同句 |

调用方：

1 个文件、70 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/media-editing/pdf-viewer.jsx`：`_$5` as `cssGrammarModule`、`_t$2` as `uriGrammarModule`、`$$8` as `bashGrammarModule`、`$t$2` as `initializeSqlGrammarModule`、`at$3` as `httpGrammarModule`、`At$3` as `makeGrammarModule`、`B$7` as `initializeBrainfuckGrammarModule`、`Bt$1` as `initializeTomlGrammarModule`、`bt$3` as `leanpubMarkdownGrammarModule`、`ct$3` as `javaGrammarModule`、`Ct$3` as `pythonGrammarModule`、`D$7` as `initializeMarkdownGrammarModule`、`Dt$2` as `initializePythonGrammarModule`、`dt$4` as `markdownGrammarModule`、`Et$2` as `jsdocGrammarModule`、`et$4` as `initializeHtmlGrammarModule`、`f$4` as `initializeBashGrammarModule`、`F$6` as `initializeAssemblyGrammarModule`、`Ft$2` as `initializeRustGrammarModule`、`ft$3` as `initializeLogGrammarModule`、`G$5` as `cGrammarModule`、`Gt$1` as `typescriptGrammarModule`、`gt$2` as `initializeJsonGrammarModule`、`H$5` as `initializeCGrammarModule`、`Ht$1` as `initializeTypeScriptGrammarModule`、`ht$2` as `initializeJsdocGrammarModule`、`It$1` as `luaGrammarModule`、`it$3` as `jsonGrammarModule`、`j$5` as `gitGrammarModule`、`J$6` as `xmlGrammarModule`、`k$6` as `initializeCssGrammarModule`、`K$6` as `initializeGitGrammarModule`、`kt$2` as `initializeUriGrammarModule`、`L$7` as `initializeJavaScriptGrammarModule`、`Lt$1` as `initializePerlGrammarModule`、`lt$3` as `todoGrammarModule`、`Mt$1` as `sqlGrammarModule`、`mt$2` as `initializeJavaGrammarModule`、`N$4` as `initializeDiffGrammarModule`、`Nt$1` as `initializeLuaGrammarModule`、`nt$4` as `initializeIniGrammarModule`、`Ot$2` as `perlGrammarModule`、`ot$3` as `javascriptTemplateLiteralsGrammarModule`、`P$7` as `assemblyGrammarModule`、`pt$2` as `iniGrammarModule`、`Pt$2` as `rustGrammarModule`、`q$5` as `initializeGoGrammarModule`、`R$6` as `initializeXmlGrammarModule`、`Rt$2` as `initializeMakeGrammarModule`、`rt$3` as `javascriptGrammarModule`、`S$7` as `initializeTodoGrammarModule`、`St$2` as `initializePlainTextGrammarModule`、`st$3` as `initializeHttpGrammarModule`、`Tt$2` as `logGrammarModule`、`tt$4` as `htmlGrammarModule`、`ut$2` as `initializeJavaScriptTemplateLiteralsGrammarModule`、`Ut$2` as `initializeRegexGrammarModule`、`V$6` as `goGrammarModule`、`v$7` as `brainfuckGrammarModule`、`vt$2` as `tomlGrammarModule`、`W$7` as `initializeDockerGrammarModule`、`wt$3` as `regexGrammarModule`、`X$6` as `dockerGrammarModule`、`xt$2` as `plainTextGrammarModule`、`Y$4` as `initializeCsvGrammarModule`、`yt$2` as `initializeLeanpubMarkdownGrammarModule`、`Yt$2` as `initializeYamlGrammarModule`、`Z$4` as `diffGrammarModule`、`z$7` as `csvGrammarModule`、`zt$2` as `yamlGrammarModule`

### react-qr-code 2.0.21

第三批。6 个声明。`lib` 在 19109 行，其余在 19989–20164 行，中间夹着 prop-types 和 qr.js。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `lib` | 19109 | 19109 | 13 |
| `QRCodeSvg` | 19989 | 19989 | 19 |
| `hasRequiredQRCodeSvg` | 19990 | 19990 | 25 |
| `requireQRCodeSvg` | 19991 | 20065 | 2682 |
| `hasRequiredLib` | 20066 | 20066 | 19 |
| `requireLib` | 20067 | 20164 | 3599 |

调用方：

1 个文件、1 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/settings/im-bridge-manager.jsx`：`requireLib`

### react-markdown 10.1.0

第三批。10 个声明在 12622–12789 行。`createFile`、`post` 是推断归属。应用只 import `Markdown$1`。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `changelog` | 12622 | 12622 | 86 |
| `emptyPlugins` | 12623 | 12623 | 24 |
| `emptyRemarkRehypeOptions` | 12624 | 12626 | 64 |
| `safeProtocol$1` | 12627 | 12627 | 55 |
| `deprecations` | 12628 | 12687 | 1369 |
| `Markdown$1` | 12688 | 12692 | 186 |
| `createProcessor` | 12693 | 12702 | 470 |
| `createFile` | 12703 | 12710 | 190 |
| `post` | 12711 | 12773 | 2370 |
| `defaultUrlTransform` | 12774 | 12789 | 605 |

调用方：

4 个文件、1 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/media-editing/text-node-inner.jsx`：`Markdown$1` as `Markdown`
- `app/renderer/src/settings/feature-popup.jsx`：`Markdown$1` as `Markdown`
- `app/renderer/src/settings/general-popup.jsx`：`Markdown$1` as `Markdown`
- `app/renderer/src/text-editor/use-text-version-preview.jsx`：`Markdown$1` as `Markdown`

### inline-style-parser 0.2.4

第三批。3 个 CJS 声明在 11860–12001 行。没有应用文件直接 import。已装版本按计划是 0.2.7，执行时钉 0.2.4。这次不改依赖。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `cjs$1` | 11860 | 11860 | 10 |
| `hasRequiredCjs$2` | 11861 | 11861 | 21 |
| `requireCjs$2` | 11862 | 12001 | 3942 |

调用方：

应用源码里没有文件 import 这些声明。扫描范围是 `app/`，不含 `vendor.js`。

### prop-types 15.8.1

第三批。9 个声明在 19110–19180 行，夹在 react-qr-code 的 `lib` 和 qr.js 之间。没有应用文件直接 import。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `propTypes` | 19110 | 19112 | 34 |
| `ReactPropTypesSecret_1` | 19113 | 19113 | 27 |
| `hasRequiredReactPropTypesSecret` | 19114 | 19114 | 36 |
| `requireReactPropTypesSecret` | 19115 | 19121 | 310 |
| `factoryWithThrowingShims` | 19122 | 19122 | 29 |
| `hasRequiredFactoryWithThrowingShims` | 19123 | 19123 | 40 |
| `requireFactoryWithThrowingShims` | 19124 | 19171 | 1566 |
| `hasRequiredPropTypes` | 19172 | 19172 | 25 |
| `requirePropTypes` | 19173 | 19180 | 225 |

调用方：

应用源码里没有文件 import 这些声明。扫描范围是 `app/`，不含 `vendor.js`。

### style-to-object 1.0.14

第三批。3 个 CJS 声明。`cjs$2` 在 11859 行，`hasRequiredCjs$1` 和 `requireCjs$1` 在 12002–12041 行，中间夹着 inline-style-parser。没有应用文件直接 import。

执行时保持已装的 1.0.14，不降到 1.0.11，不打补丁。本工作副本没有 node_modules，这次没有把 1.0.11 和 1.0.14 的 `cjs/index.js` 再对一遍字节。lockfile 里是 `style-to-object@1.0.14`。两版字节相同沿用计划，不在这里重测。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

| 声明 | 起始行 | 结束行 | 字节 |
| --- | --- | --- | --- |
| `cjs$2` | 11859 | 11859 | 15 |
| `hasRequiredCjs$1` | 12002 | 12002 | 21 |
| `requireCjs$1` | 12003 | 12041 | 1108 |

调用方：

应用源码里没有文件 import 这些声明。扫描范围是 `app/`，不含 `vendor.js`。

### streamdown 不改已装的 2.5.0

第三批。不改已装的 streamdown@2.5.0。要处理的是 shiki 目录后面的高亮插件，不是第二份 streamdown。

表内 7 个和正文点名的 `S$1`、`C$1`、`r`、`B$1` 是同一条 `var`（23555–23590）。`$$2` 在 23591–23638 行，`type` 为 `"code-highlighter"`。`G$1` 在 23639 行，是 `var G$1 = $$2();`。`r` 在当前文件只有这一个顶层绑定。

DELETIONS.md 里有、当前文件找不到的名字：无。DELETIONS.md 表里的名字在当前文件都有唯一的顶层声明。

高亮插件按源码顺序（表内 7 个加正文 6 个，2316 字节）：

| 声明 | 起始行 | 结束行 | 字节 | 出处 |
| --- | --- | --- | --- | --- |
| `S$1` | 23555 | 23558 | 68 | 正文，同句 |
| `C$1` | 23558 | 23562 | 156 | 正文，同句 |
| `r` | 23562 | 23563 | 46 | 正文，同句 |
| `B$1` | 23563 | 23568 | 113 | 正文，同句 |
| `c$1` | 23568 | 23569 | 34 | 表内，同句 |
| `p$1` | 23569 | 23570 | 34 | 表内，同句 |
| `s$1` | 23570 | 23571 | 34 | 表内，同句 |
| `o` | 23571 | 23575 | 111 | 表内，同句 |
| `v$1` | 23575 | 23576 | 53 | 表内，同句 |
| `x$1` | 23576 | 23581 | 175 | 表内，同句 |
| `P2` | 23581 | 23590 | 218 | 表内，同句 |
| `$$2` | 23591 | 23638 | 1258 | 正文 |
| `G$1` | 23639 | 23639 | 16 | 正文 |

调用方：

1 个文件、1 个符号。只计静态 import / `export { … } from`，模块说明符指向 `vendor.js`。本地名和声明名不同时写成「声明 as 本地名」。

- `app/renderer/src/generation/markdown-link.jsx`：`G$1` as `codeHighlighterPlugin`

## 还没有把握的地方

- 内联 jszip 已经能抽出并生成条目，但本工作副本没有 `jszip@3.10.1`，3.10.1 对 3.10.1 的通过比较还没做。lockfile 里的 3.10.2 也没装在这个副本里，所以没有附带记录。
- 目录条目的 `_data` 在 `loadAsync` 之后是 Promise，同步读到的 `uncompressedSize` 是空的。文件条目则相等。和 3.10.1 比的时候要再看目录是不是一样。
- 这组输入的文件都走了 STORE。更长的内容会不会走 DEFLATE，这次没测。
- Node 里的 Blob 读取靠脚本补上的 FileReader 垫片，垫片内部是 `blob.arrayBuffer()`。浏览器里的 FileReader 路径没有再跑。
- style-to-object 1.0.11 和已装 1.0.14 的 cjs 字节相同，这次没有在本副本重测。
- wavesurfer 的四个大声明和 `E$4`，以及 speed-highlight 的 7 个推断声明，只记了位置，没有用 xcanon 对目标版本。补丁与否仍留到对应批次。
- `createLucideIcon$1`（379–421 行）和表外 23 个包装不在 DELETIONS.md 的 lucide 表里。按删除表删不会碰到它们；它们也不该删。
