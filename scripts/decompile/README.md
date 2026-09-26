# 界面源码还原工具

把参照渲染层（`reference/<版本>/app/out/renderer`）还原成可维护的源码，放在 `app/renderer`。计划和进度见 `docs/remaining-work.md`。

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

- `gen-renderer.mjs`：主 bundle 还原 JSX、去掉预加载包装，JSX 通过 `__jsx` 适配函数调回原来的 `jsx` / `jsxs` 运行时。
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
