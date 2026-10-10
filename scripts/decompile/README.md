# 界面源码还原工具

把参照渲染层（`reference/<版本>/app/out/renderer`）还原成可维护的源码，放在 `app/renderer`。计划和进度见 `docs/remaining-work.md`。

> **还原已完成，这里的脚本只作记录。** 2026-10-10 起界面直接用 `app/renderer` 的源码，参照渲染层
> `reference/*/app/out/renderer` 和对比基准 `app/official-ui` 都已删除；要重跑这些脚本得先从 git 历史里把它们取回来。
> `gen-renderer.mjs` 会整个覆盖 `app/renderer/src`，**不要再跑**。界面改动的验收见 `scripts/ui-compare/compare.mjs`（和录好的基线截图比）。

先装依赖：`cd scripts/decompile && npm install`（不在 pnpm 工作区里）。

## 阶段 0：可构建的源码基线

```
node scripts/decompile/gen-renderer.mjs      # 生成 app/renderer/src（会覆盖）
pnpm --filter @ov/renderer build             # 构建到 app/desktop/out/recovered-ui
node app/official-ui/build.mjs --raw         # 参照原样（不打补丁），对比基准
pnpm --filter @ov/desktop build
node scripts/ui-compare/compare.mjs          # official-raw ↔ recovered 逐屏对比
```

`OV_UI=recovered` 启动桌面端就是用还原版界面。

逐屏对比在后台隐藏窗口里跑（`OV_DEV_HIDDEN_WINDOW=1`），不抢焦点；测试数据里预先把引导提示标成已看过。

## 阶段 1：第三方库和参照代码分开

先跑一遍归类（`bash scripts/decompile/run-all.sh`，产出 `.probe/decompile/classified.json`），再跑 `gen-renderer.mjs`，
主 bundle 就拆成两份：

- `src/vendor.js`：第三方库，原样，末尾 `export` 出 main 用到的名字；
- `src/main.jsx`：参照自己的代码，JSX 已还原，开头从 `./vendor.js` 导入。

拆分规则在 `split.mjs`：vendor 不能引用 main、main 不能给 vendor 的变量赋值、模块初始化时给库对象挂属性的语句和库待在同一边；
有锚点（逐字比对确认过）的语句说了算，没把握的一律留在 main。`split-report.mjs` 按包汇总 vendor 的内容，
之后按这个清单逐个换成 npm 包（`07-versions.mjs` 反推版本），每换一个都构建 + 逐屏对比。

- `gen-renderer.mjs`：主 bundle 去掉预加载包装、拆 vendor / main、main 还原 JSX；JSX 通过 `__jsx` 适配函数调回原来的 `jsx` / `jsxs` 运行时。
- `jsx-lib.mjs`：`jsxRuntimeExports.jsx(...)` → JSX 的转换。

## 阶段 1 起用到的分析工具

| 脚本 | 作用 |
|---|---|
| `01-toplevel.mjs` | 列出主 bundle 的每条顶层语句（名字、行号） |
| `02-classify.mjs` / `02b-verify.mjs` / `02c-anchor.mjs` | 按名字、内容、"形状"判断每条语句属于第三方库还是参照自己的代码 |
| `04-extract.mjs` / `05-refine.mjs` / `06-check.mjs` | 抽出参照自己的代码；按"只能用库导出名""库不依赖参照代码"两条规则收敛归类 |
| `07-versions.mjs` | 反推参照用的第三方库版本（下载候选版本，比谁的代码吻合度最高） |
| `run-all.sh` | 串起 01～06 |

分析用的第三方包缓存（`libs/`、`pkg-cache/`）放在 `.probe/decompile/`，不进仓库。
