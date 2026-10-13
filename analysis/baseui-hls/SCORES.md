# 分数表（第 6 版，Babel AST 逐声明）

口径：闭包内每条顶层声明，对候选版本中**同名**声明比较。
- exact：A 形状一致（Babel 解析 → 去注释/空白/引号 → 生产分支折叠 → React namespace/具名导入统一 → JSX 脱糖 → 局部变量 α 重命名后打印相同）
- norm：A 不同但 N 形状一致（再加构建器改写规则 R2–R14，见 REPORT.md §3）
- diff：该版本有同名声明，但 A、N 都不同
- missing：该版本没有这个名字
- total：该版本包名下应有的闭包声明数（按“任一版本中属于该包”归属）

## Base UI 一族（组合打分：@base-ui/react × @base-ui/utils，闭包 763 条）

| 排名 | react | utils | total | exact | norm | diff | missing |
|---|---|---|---|---|---|---|---|
| 1 | 1.3.0 | 0.2.6 | 763 | 713 | 35 | 15 | 0 |
| 2 | 1.3.0 | 0.2.7 | 763 | 712 | 35 | 16 | 0 |
| 2 | 1.3.0 | 0.2.8 | 763 | 712 | 35 | 16 | 0 |
| 4 | 1.3.0 | 0.2.5 | 763 | 711 | 35 | 16 | 1 |
| 5 | 1.3.0 | 0.2.9 | 763 | 709 | 35 | 19 | 0 |
| — | 1.2.0（最佳搭配 0.2.6） | | 763 | 627 | 21 | 79 | 36 |
| — | 1.4.0（最佳搭配 0.2.6） | | 763 | 583 | 6 | 165 | 9 |
| — | @base-ui-components/react 1.0.0-rc.0 + utils 0.2.2（旧包名最佳） | | 692 | 513 | 7 | 169 | 3 |
| 验证 | 1.3.0 + 补丁 | 0.2.6 + 补丁 | 763 | 720 | 39 | 4* | 0 |

\* 打补丁后剩下的 4 条：3 条是应用自有的同名函数（不属于库，见 REPORT §2.3），1 条 `Store` 是 Rollup 撞名改写 `let Store$1 = class Store`，按 R13 还原后 A 形状完全一致（tools/storecheck.mjs）。所以**全部一致**。

第一名与第二名：react 版本都是 1.3.0；utils 0.2.6 比 0.2.7/0.2.8 多 1 条 exact（`preventScrollInsetScrollbars` 直接调用 `win.addEventListener`，是 0.2.6 的写法，0.2.7 起改成辅助函数）。react 版本的第二名是 1.2.0，exact 少 86 条，diff 多 64 条。0.2.6 也正是 1.3.0 的 package.json 里写死的依赖版本（`"@base-ui/utils": "0.2.6"`）。

## 单包分数（每包前三，total/exact/norm/diff/missing）

| 包 | 下载的版本数 | 第 1 | 第 2 | 第 3 |
|---|---|---|---|---|
| @base-ui/react（含 beta/rc） | 13 | 1.3.0: 674/623/34/16/1 | 1.2.0: 674/537/20/80/37 | 1.4.0: 674/493/5/166/10 |
| @base-ui/utils | 13 | 0.2.6: 105/91/1/3/10 | 0.2.7: 105/91/1/4/9 | 0.2.8: 105/91/1/4/9 |
| @base-ui-components/react | 14 | 1.0.0-rc.0: 682/443/6/163/70 | 1.0.0-beta.7: 682/440/5/165/72 | 1.0.0-beta.5: 682/424/5/165/88 |
| @base-ui-components/utils | 7 | 0.2.2: 82/71/1/10/0 | 0.2.1: 82/67/1/10/4 | 0.2.0: 82/62/1/15/4 |
| @floating-ui/react | 84 | 0.27.19: 124/50/1/72/1 | 0.27.20: 124/50/1/72/1 | 0.27.8: 124/48/1/70/5 |
| tabbable | 12 | 全部 1/0/0/1/0（重名 isFocusable） | | |
| reselect | 13 | 全部 0~1 条 | | |

单包表里 react 的 missing/diff 包含属于 utils 的声明，utils 的 missing 包含属于 react 的声明，所以以组合表为准。@floating-ui/react 那 50 条 exact 全都同时命中 Base UI 自带的 fork（`esm/floating-ui-react/`），**只在 @floating-ui/react 命中、在任何 Base UI 版本都不命中的声明有 0 条**，说明打进去的不是 @floating-ui/react。

## hls.js（62 个版本：1.5.x–1.7.x，含 alpha/beta/rc）

| 版本 | total | exact | norm | diff | missing |
|---|---|---|---|---|---|
| 1.7.0 / 1.7.0-beta.1 / -beta.2 / -rc.1（并列最高） | 5 | 4 | 0 | 1 | 0 |
| 最低（1.7.0-alpha.1 等） | 5 | 2 | 0 | — | — |

能匹配上的 5 条都是通用名：`getDefaultExportFromCjs`（Rollup CJS 辅助）、`identity`×2、`clamp`、`AC3_SAMPLES_PER_FRAME`（mediabunny 有同名常量）。hls.js 特有的声明一条都没命中（Hls 类、各 Controller、`hlsDefaultConfig`、`fragLoadPolicy`、`abrEwmaFastLive`、`MANIFEST_PARSED` 等在整个 app/renderer/src 中都是 0 处）。**结论：没有内联 hls.js，所以没有版本可定。**
